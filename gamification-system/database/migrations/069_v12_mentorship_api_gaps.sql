-- =========================================================================
-- Migration 069 — V1.2 Mentorship API Gaps (Wave γ flagged)
-- (Originally drafted as 065; renumbered to 069 because 065/066/067/068 were
--  applied by parallel V1.2 sub-agents while this migration was being built.)
-- Date: 2026-05-07
-- Source: docs/vision/mentorship-career.md + V1.2 sprint plan (Wave γ).
--
-- Scope:
--   1. mentor_session_reports table + RLS + indexes
--      (teen / parent submit, mentor self-read, admin moderate)
--   2. RPC mentor_complete_session(p_session_id) SECURITY DEFINER
--      - mentor marks session as completed
--      - sets completed_at = NOW()
--      - inserts a teen-side notification nudge for rating
--
-- Invariants honoured:
--   §29.5  auth.users.id is the canonical user identifier
--   §29.6  no public CIN exposure (n/a — no identity docs here)
--   §29.7  every public table has explicit RLS
--   §29.14 monetary cols NUMERIC(10,2) (n/a here)
--
-- Coordination: depends on `mentor_strikes` (migration 064) only at the
-- application layer (admin "resolve with strike" path). The 064 dependency
-- is handled in the API route via try/catch fallback.
-- =========================================================================

BEGIN;

-- =========================================================================
-- 1. mentor_session_reports
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.mentor_session_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID NOT NULL REFERENCES public.mentor_sessions(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporter_role    TEXT NOT NULL
                   CHECK (reporter_role IN ('teen','parent')),
  category         TEXT NOT NULL
                   CHECK (category IN ('inappropriate','late','no_show','safety')),
  description      TEXT,
  status           TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','dismissed','resolved_strike','resolved_no_action')),
  resolution_note  TEXT,
  resolved_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mentor_session_reports_session
  ON public.mentor_session_reports (session_id);
CREATE INDEX IF NOT EXISTS idx_mentor_session_reports_reporter
  ON public.mentor_session_reports (reporter_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentor_session_reports_open
  ON public.mentor_session_reports (status, created_at DESC) WHERE status = 'open';

-- =========================================================================
-- 2. RLS: mentor_session_reports
-- =========================================================================

ALTER TABLE public.mentor_session_reports ENABLE ROW LEVEL SECURITY;

-- SELECT: reporter self-read; mentor reads reports against their own
-- sessions; linked parent reads reports against their teen's sessions; admin
-- reads all.
DROP POLICY IF EXISTS mentor_session_reports_read ON public.mentor_session_reports;
CREATE POLICY mentor_session_reports_read ON public.mentor_session_reports
  FOR SELECT TO authenticated
  USING (
    reporter_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
        FROM public.mentor_sessions s
        JOIN public.mentors m ON m.id = s.mentor_id
       WHERE s.id = mentor_session_reports.session_id
         AND m.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
        FROM public.mentor_sessions s
        JOIN public.parent_teen_links l ON l.teen_id = s.mentee_user_id
       WHERE s.id = mentor_session_reports.session_id
         AND l.parent_id = auth.uid()
    )
    OR public.mentor_is_admin(auth.uid())
  );

-- INSERT: reporter must be themselves AND must be either the teen on the
-- session or a linked parent of that teen.
DROP POLICY IF EXISTS mentor_session_reports_insert ON public.mentor_session_reports;
CREATE POLICY mentor_session_reports_insert ON public.mentor_session_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    reporter_user_id = auth.uid()
    AND (
      (reporter_role = 'teen' AND EXISTS (
        SELECT 1 FROM public.mentor_sessions s
         WHERE s.id = mentor_session_reports.session_id
           AND s.mentee_user_id = auth.uid()
      ))
      OR
      (reporter_role = 'parent' AND EXISTS (
        SELECT 1
          FROM public.mentor_sessions s
          JOIN public.parent_teen_links l ON l.teen_id = s.mentee_user_id
         WHERE s.id = mentor_session_reports.session_id
           AND l.parent_id = auth.uid()
      ))
    )
  );

-- (no UPDATE/DELETE policy → only service-role / admin via RPC can mutate)

-- =========================================================================
-- 3. RPC mentor_complete_session(p_session_id)
-- =========================================================================
-- Mentor marks the session as completed.
--   - caller must be the mentor on the session (mentors.user_id = auth.uid())
--   - session must currently be in status 'approved' or 'dispatched'
--   - sets status='completed', completed_at=NOW()
--   - bumps mentors.sessions_count
--   - best-effort notification nudge for teen to leave a rating
-- Returns: jsonb { success, session_id, completed_at } on success.

CREATE OR REPLACE FUNCTION public.mentor_complete_session(
  p_session_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller     UUID := auth.uid();
  v_session    RECORD;
  v_mentor     RECORD;
  v_now        TIMESTAMPTZ := NOW();
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;

  SELECT s.* INTO v_session
    FROM public.mentor_sessions s
   WHERE s.id = p_session_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'session_not_found');
  END IF;

  SELECT m.* INTO v_mentor
    FROM public.mentors m
   WHERE m.id = v_session.mentor_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'mentor_not_found');
  END IF;

  IF v_mentor.user_id <> v_caller THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  IF v_session.status NOT IN ('approved','dispatched') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status',
      'current_status', v_session.status);
  END IF;

  UPDATE public.mentor_sessions
     SET status       = 'completed',
         completed_at = v_now
   WHERE id = p_session_id;

  UPDATE public.mentors
     SET sessions_count = COALESCE(sessions_count, 0) + 1
   WHERE id = v_session.mentor_id;

  -- Best-effort teen rating nudge (table from W2.4)
  BEGIN
    INSERT INTO public.user_notifications (user_id, title, body, priority, action_url, data)
    VALUES (
      v_session.mentee_user_id,
      'Note ta session avec ton mentor',
      'Ta session est terminée. Aide la communauté en laissant une évaluation.',
      'normal',
      '/teen/mentors/sessions/' || p_session_id || '/rate',
      jsonb_build_object('kind', 'mentor_session.rating_nudge', 'session_id', p_session_id)
    );
  EXCEPTION WHEN undefined_table THEN
    NULL;
  WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'completed_at', v_now
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.mentor_complete_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mentor_complete_session(uuid)
  TO authenticated, service_role;

COMMIT;

-- =========================================================================
-- END
-- =========================================================================
