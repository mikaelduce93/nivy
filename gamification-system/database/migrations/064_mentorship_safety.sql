-- =========================================================================
-- Migration 064 — Mentorship Safety Pipeline (V1.1 P2.5)
-- Date: 2026-05-07
-- Source: docs/vision/audit-prelaunch/PRE_LAUNCH_AUDIT.md
--         docs/vision/mentorship-career.md
--
-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  PENDING FOUNDER REVIEW — DO NOT APPLY UNTIL CNDP STORAGE DECISION    ║
-- ║  IS MADE.                                                             ║
-- ║                                                                       ║
-- ║  This migration creates `mentor_session_recordings`, which holds      ║
-- ║  pointers to audio/video of minor-adult interactions. Recordings are  ║
-- ║  CNDP-sensitive personal data (Loi 09-08, art. 1 §1) and trigger      ║
-- ║  additional consent + retention obligations. The retention helper     ║
-- ║  RPC `prune_expired_mentor_recordings()` is included but NOT wired.   ║
-- ║                                                                       ║
-- ║  Founder must confirm:                                                ║
-- ║    1. The private storage bucket name (`mentor-recordings` proposed). ║
-- ║    2. The 90-day retention window (T+90d hardcoded; see col default). ║
-- ║    3. Whether mentee/mentor explicit recorded-consent UI is shipped   ║
-- ║       BEFORE this migration applies (consent_recorded must default    ║
-- ║       to FALSE and be set TRUE only after both parties tap consent).  ║
-- ║    4. Storage RLS — currently service-role only on writes; reads      ║
-- ║       limited to session participants (mentor + mentee + linked       ║
-- ║       parent + admin). Founder may want stricter (admin-only).        ║
-- ╚═══════════════════════════════════════════════════════════════════════╝
--
-- Scope:
--   1. mentor_strikes table + auto-suspend trigger
--   2. mentor_session_recordings table (with 90-day expires_at)
--   3. RPC prune_expired_mentor_recordings()
--   4. RPC mentor_can_dm_teen(p_mentor_id, p_teen_id)
--   5. RLS for both tables
--   6. Private storage bucket `mentor-recordings` (writes service-role only)
--
-- Invariants honoured:
--   §29.5  auth.users.id is the canonical user identifier
--   §29.6  CNDP-sensitive media stays in PRIVATE buckets
--   §29.7  every public table has explicit RLS
--   §29.14 monetary cols NUMERIC(10,2) (n/a here)
-- =========================================================================

BEGIN;

-- =========================================================================
-- 1. mentor_strikes
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.mentor_strikes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id       UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  reporter_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason          TEXT NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'medium'
                  CHECK (severity IN ('low','medium','high')),
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','expired','dismissed')),
  related_session UUID REFERENCES public.mentor_sessions(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '180 days'),
  resolved_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mentor_strikes_mentor
  ON public.mentor_strikes (mentor_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentor_strikes_active
  ON public.mentor_strikes (mentor_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_mentor_strikes_expiry
  ON public.mentor_strikes (expires_at) WHERE status = 'active';

-- Auto-suspend trigger: any new active strike that pushes the mentor's
-- ACTIVE strike count to >= 3 flips mentors.status to 'suspended'.
CREATE OR REPLACE FUNCTION public.mentor_strikes_autosuspend()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_count
    FROM public.mentor_strikes
   WHERE mentor_id = NEW.mentor_id
     AND status = 'active'
     AND expires_at > NOW();

  IF v_count >= 3 THEN
    UPDATE public.mentors
       SET status = 'suspended'
     WHERE id = NEW.mentor_id
       AND status NOT IN ('suspended','rejected');

    -- Best-effort audit (table from W2.4 / W3.1)
    BEGIN
      INSERT INTO public.admin_audit_logs (user_id, action, target_type, target_id, payload)
      VALUES (
        NEW.reporter_id,
        'mentor.auto_suspended',
        'mentor',
        NEW.mentor_id,
        jsonb_build_object(
          'strike_id', NEW.id,
          'severity', NEW.severity,
          'active_strike_count', v_count
        )
      );
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mentor_strikes_autosuspend ON public.mentor_strikes;
CREATE TRIGGER trg_mentor_strikes_autosuspend
  AFTER INSERT ON public.mentor_strikes
  FOR EACH ROW EXECUTE FUNCTION public.mentor_strikes_autosuspend();

-- =========================================================================
-- 2. mentor_session_recordings
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.mentor_session_recordings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES public.mentor_sessions(id) ON DELETE CASCADE,
  file_path         TEXT NOT NULL,        -- e.g. "<session_id>/<uuid>.webm" inside private bucket
  bucket            TEXT NOT NULL DEFAULT 'mentor-recordings',
  duration_seconds  INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  file_size_bytes   BIGINT CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
  mime_type         TEXT,
  consent_recorded  BOOLEAN NOT NULL DEFAULT FALSE,
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mentor_recordings_session
  ON public.mentor_session_recordings (session_id);
CREATE INDEX IF NOT EXISTS idx_mentor_recordings_expiry
  ON public.mentor_session_recordings (expires_at) WHERE deleted_at IS NULL;

-- =========================================================================
-- 3. RPC prune_expired_mentor_recordings()
-- =========================================================================
-- Hard-deletes the storage object (when storage.delete_object is available)
-- and the row itself for every recording past its 90-day window. Returns the
-- count of pruned recordings. Service-role only — wired from the cron route.

CREATE OR REPLACE FUNCTION public.prune_expired_mentor_recordings()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_pruned INTEGER := 0;
  r        RECORD;
BEGIN
  FOR r IN
    SELECT id, bucket, file_path
      FROM public.mentor_session_recordings
     WHERE expires_at < NOW()
       AND deleted_at IS NULL
     LIMIT 500
  LOOP
    -- Best-effort storage object purge. The Supabase storage extension
    -- exposes storage.delete_object(bucket, name) — guarded so this
    -- function still works on environments where it's missing.
    BEGIN
      PERFORM storage.delete_object(r.bucket, r.file_path);
    EXCEPTION WHEN undefined_function THEN
      NULL;
    WHEN OTHERS THEN
      NULL; -- never abort the prune for a single bad object
    END;

    DELETE FROM public.mentor_session_recordings WHERE id = r.id;
    v_pruned := v_pruned + 1;
  END LOOP;

  -- Audit (best effort)
  BEGIN
    IF v_pruned > 0 THEN
      INSERT INTO public.admin_audit_logs (user_id, action, target_type, target_id, payload)
      VALUES (NULL, 'mentor_recording.pruned', 'system', NULL,
              jsonb_build_object('pruned', v_pruned, 'at', NOW()));
    END IF;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  RETURN v_pruned;
END;
$$;

REVOKE ALL ON FUNCTION public.prune_expired_mentor_recordings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prune_expired_mentor_recordings() TO service_role;

-- =========================================================================
-- 4. RPC mentor_can_dm_teen(p_mentor_id, p_teen_id)
-- =========================================================================
-- Returns true when a DM between this mentor and teen is currently allowed.
-- Allowed iff:
--   (a) there is an approved-or-completed mentor_session created in the
--       last 7 days for this pair, OR
--   (b) there is a parental_approvals row of action_type='mentor_dm' with
--       status='approved' for this teen, naming this mentor in details.
-- All other cases return false. The mentor/teen UI and any messaging
-- transport must call this before delivering a DM.

CREATE OR REPLACE FUNCTION public.mentor_can_dm_teen(
  p_mentor_id UUID,
  p_teen_id   UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_recent_session BOOLEAN;
  v_parent_approved BOOLEAN;
BEGIN
  IF p_mentor_id IS NULL OR p_teen_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.mentor_sessions s
     WHERE s.mentor_id = p_mentor_id
       AND s.mentee_user_id = p_teen_id
       AND s.status IN ('approved','completed')
       AND s.created_at >= NOW() - INTERVAL '7 days'
  ) INTO v_recent_session;

  IF v_recent_session THEN
    RETURN TRUE;
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.parental_approvals pa
     WHERE pa.teen_id = p_teen_id
       AND pa.action_type = 'mentor_dm'
       AND pa.status = 'approved'
       AND (pa.expires_at IS NULL OR pa.expires_at > NOW())
       AND (pa.details ->> 'mentor_id')::uuid = p_mentor_id
  ) INTO v_parent_approved;

  RETURN COALESCE(v_parent_approved, FALSE);
END;
$$;

REVOKE ALL ON FUNCTION public.mentor_can_dm_teen(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mentor_can_dm_teen(UUID, UUID)
  TO authenticated, service_role;

-- =========================================================================
-- 5. RLS
-- =========================================================================

ALTER TABLE public.mentor_strikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_session_recordings ENABLE ROW LEVEL SECURITY;

-- mentor_strikes: mentor self-read + admin-read; writes service-role only.
DROP POLICY IF EXISTS mentor_strikes_self_read ON public.mentor_strikes;
CREATE POLICY mentor_strikes_self_read ON public.mentor_strikes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mentors m
       WHERE m.id = mentor_strikes.mentor_id
         AND m.user_id = auth.uid()
    )
    OR public.mentor_is_admin(auth.uid())
  );

-- (no INSERT/UPDATE/DELETE policy → service-role only via SECURITY DEFINER RPCs)

-- mentor_session_recordings: readable only by session participants
-- (mentee teen + linked parent + the mentor) and admins.
DROP POLICY IF EXISTS mentor_recordings_participants_read
  ON public.mentor_session_recordings;
CREATE POLICY mentor_recordings_participants_read
  ON public.mentor_session_recordings
  FOR SELECT TO authenticated
  USING (
    public.mentor_is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
        FROM public.mentor_sessions s
        LEFT JOIN public.mentors m ON m.id = s.mentor_id
        LEFT JOIN public.parent_teen_links l ON l.teen_id = s.mentee_user_id
       WHERE s.id = mentor_session_recordings.session_id
         AND (
              s.mentee_user_id = auth.uid()
           OR m.user_id = auth.uid()
           OR l.parent_id = auth.uid()
         )
    )
  );

-- (no INSERT/UPDATE/DELETE policy → service-role only)

-- =========================================================================
-- 6. Private storage bucket for recordings
-- =========================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('mentor-recordings', 'mentor-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: SELECT only for participants (mirrors the table policy by
-- pattern-matching the leading folder against the session_id). Writes /
-- deletes go through service-role.
DROP POLICY IF EXISTS mentor_recordings_storage_read ON storage.objects;
CREATE POLICY mentor_recordings_storage_read
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'mentor-recordings'
    AND EXISTS (
      SELECT 1
        FROM public.mentor_session_recordings r
        JOIN public.mentor_sessions s ON s.id = r.session_id
        LEFT JOIN public.mentors m ON m.id = s.mentor_id
        LEFT JOIN public.parent_teen_links l ON l.teen_id = s.mentee_user_id
       WHERE r.bucket = 'mentor-recordings'
         AND r.file_path = storage.objects.name
         AND r.deleted_at IS NULL
         AND (
              public.mentor_is_admin(auth.uid())
           OR s.mentee_user_id = auth.uid()
           OR m.user_id = auth.uid()
           OR l.parent_id = auth.uid()
         )
    )
  );

COMMIT;

-- =========================================================================
-- END — PENDING FOUNDER REVIEW
-- =========================================================================
