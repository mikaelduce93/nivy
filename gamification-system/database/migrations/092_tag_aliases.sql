-- =========================================================================
-- Migration 092 — tag_aliases (admin review queue for unmapped free-text tags)
-- Polish-E / TICKET — Tag-normalize unmapped queue admin UI
-- Date: 2026-05-08
--
-- Context
-- -----------------------------------------------------------------------
-- The `tag-normalize` cron (W-D.11 / TICKET-040, see
-- app/api/cron/tag-normalize/route.ts) drops any free-text tag from
-- educational_quizzes / mission_templates / partner_offers that isn't
-- present in the canonical 50-entry `interest_taxonomy`. Each run writes
-- a single row to `admin_audit_logs` (action = 'cron.tag_normalize') with
-- a per-table `unmapped_sample` (top-50 alias→count). Until now, admins
-- had no UI to act on those samples.
--
-- This migration adds `tag_aliases`:
--   * an alias (free text) → canonical tag (must exist in
--     `interest_taxonomy.tag`) mapping, with an admin moderation lifecycle
--     (pending / approved / rejected);
--   * the tag-normalize cron consults it: rows whose `status = 'approved'`
--     cause the matching alias to be substituted by `canonical_tag`
--     instead of being dropped.
--
-- Notes
-- -----------------------------------------------------------------------
--   * DOES NOT touch the existing 50-tag `interest_taxonomy` seed.
--   * RLS: admin/super_admin/moderator only — same gate as
--     /admin/proofs and /admin/marketplace.
--   * Idempotent: safe to re-run. We use IF NOT EXISTS / DROP POLICY IF
--     EXISTS guards.
-- =========================================================================

BEGIN;

-- 1. Table -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tag_aliases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias           TEXT NOT NULL,
  canonical_tag   TEXT NOT NULL
                    REFERENCES public.interest_taxonomy(tag)
                    ON UPDATE CASCADE
                    ON DELETE RESTRICT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at      TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- An alias is unique (one canonical destination at a time).
CREATE UNIQUE INDEX IF NOT EXISTS tag_aliases_alias_uniq
  ON public.tag_aliases (alias);

CREATE INDEX IF NOT EXISTS tag_aliases_status_idx
  ON public.tag_aliases (status);

CREATE INDEX IF NOT EXISTS tag_aliases_canonical_idx
  ON public.tag_aliases (canonical_tag);

-- updated_at trigger ------------------------------------------------------
CREATE OR REPLACE FUNCTION public._tag_aliases_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tag_aliases_touch_updated_at ON public.tag_aliases;
CREATE TRIGGER tag_aliases_touch_updated_at
  BEFORE UPDATE ON public.tag_aliases
  FOR EACH ROW
  EXECUTE FUNCTION public._tag_aliases_touch_updated_at();

-- 2. RLS — admin only ------------------------------------------------------
ALTER TABLE public.tag_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tag_aliases_admin_select ON public.tag_aliases;
CREATE POLICY tag_aliases_admin_select
  ON public.tag_aliases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.profile_id = auth.uid()
        AND ar.role IN ('admin', 'super_admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS tag_aliases_admin_insert ON public.tag_aliases;
CREATE POLICY tag_aliases_admin_insert
  ON public.tag_aliases
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.profile_id = auth.uid()
        AND ar.role IN ('admin', 'super_admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS tag_aliases_admin_update ON public.tag_aliases;
CREATE POLICY tag_aliases_admin_update
  ON public.tag_aliases
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.profile_id = auth.uid()
        AND ar.role IN ('admin', 'super_admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.profile_id = auth.uid()
        AND ar.role IN ('admin', 'super_admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS tag_aliases_admin_delete ON public.tag_aliases;
CREATE POLICY tag_aliases_admin_delete
  ON public.tag_aliases
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.profile_id = auth.uid()
        AND ar.role IN ('admin', 'super_admin', 'moderator')
    )
  );

-- service_role bypasses RLS, so the cron + admin server actions read/write
-- without needing extra policies.

-- 3. Audit -----------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_audit_logs') THEN
    INSERT INTO public.admin_audit_logs (user_id, action, target_type, target_id, payload)
    VALUES (
      NULL,
      'migration.092_tag_aliases',
      'schema',
      NULL,
      jsonb_build_object(
        'migration', '092_tag_aliases',
        'note', 'tag_aliases table + admin RLS for tag-normalize unmapped queue'
      )
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

COMMIT;
