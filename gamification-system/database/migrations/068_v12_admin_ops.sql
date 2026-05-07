-- Wave V1.2-E — Admin Ops support
--
-- Adds:
--   1. data_deletion_requests.anonymized          → boolean flag (admin anonymize)
--   2. data_deletion_requests.anonymized_at       → audit timestamp
--   3. data_deletion_requests.anonymized_by       → admin user_id
--   4. admin_audit_logs.action / target_type indexes for filtered queries
--   5. admin_audit_logs.created_at index for date-range scans
--
-- Idempotent. Safe to re-run.

-- 1. Anonymize columns ----------------------------------------------------------
ALTER TABLE public.data_deletion_requests
  ADD COLUMN IF NOT EXISTS anonymized       BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS anonymized_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS anonymized_by    UUID;

-- 2. Audit log indexes ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_admin_audit_action_time
  ON public.admin_audit_logs (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_target
  ON public.admin_audit_logs (target_type, target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at
  ON public.admin_audit_logs (created_at DESC);
