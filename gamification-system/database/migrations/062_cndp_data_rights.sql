-- Migration 062 — CNDP / Loi 09-08 data-subject rights
-- Date: 2026-05-07
-- Source: docs/vision/audit-prelaunch/PRE_LAUNCH_AUDIT.md (Wave D.10)
--
-- D.10.a  Add data_deletion_requests table (right-to-be-forgotten queue)
-- D.10.b  Add profiles.is_deletion_pending column (UI gate)
-- D.10.c  Create private user-exports storage bucket + RLS for data_exports
--
-- The actual erasure cron (which removes rows after the 30-day grace period)
-- is intentionally OUT OF SCOPE for this migration — wired in a later wave.

BEGIN;

-- =========================================================================
-- D.10.a — data_deletion_requests
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at    timestamptz NOT NULL DEFAULT now(),
  scheduled_for   timestamptz NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status = ANY (ARRAY[
                    'pending'::text,    -- waiting out grace period
                    'cancelled'::text,  -- user changed their mind
                    'processing'::text, -- erasure cron picked it up
                    'completed'::text,  -- data wiped
                    'failed'::text      -- erasure cron errored
                  ])),
  confirmed_via   text,                 -- email / in-app / support ticket
  cancelled_at    timestamptz,
  completed_at    timestamptz,
  ip_address      text,
  user_agent      text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ddr_user_id        ON public.data_deletion_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_ddr_status         ON public.data_deletion_requests (status);
CREATE INDEX IF NOT EXISTS idx_ddr_scheduled_for  ON public.data_deletion_requests (scheduled_for)
  WHERE status = 'pending';

-- One active request at a time per user
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ddr_active_per_user
  ON public.data_deletion_requests (user_id)
  WHERE status = 'pending';

ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ddr_self_select ON public.data_deletion_requests;
CREATE POLICY ddr_self_select
  ON public.data_deletion_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Inserts/updates go through the API (service-role) only — no client policy.

-- =========================================================================
-- D.10.b — profiles.is_deletion_pending  (UI gate)
-- =========================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_deletion_pending boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_deletion_pending
  ON public.profiles (is_deletion_pending)
  WHERE is_deletion_pending = true;

-- =========================================================================
-- D.10.c — RLS for data_exports (the existing log table)
-- =========================================================================

ALTER TABLE public.data_exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dex_self_select ON public.data_exports;
CREATE POLICY dex_self_select
  ON public.data_exports
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =========================================================================
-- D.10.d — Private storage bucket for export payloads (>1MB case)
-- =========================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('user-exports', 'user-exports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: a user can read ONLY objects under their own uid prefix.
DROP POLICY IF EXISTS user_exports_self_read ON storage.objects;
CREATE POLICY user_exports_self_read
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Inserts/updates/deletes only via service-role (no policy).

COMMIT;
