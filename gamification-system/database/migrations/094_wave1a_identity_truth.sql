-- ============================================================================
-- Migration 094 — Wave 1A — Identity Truth
-- ============================================================================
-- Implements canon enforcement per docs/canon/auth-onboarding.locked.md §2 +
-- docs/canon/roles-permissions.locked.md §1 (locked role enum) and the
-- §6 FORBIDDEN #9 rule that admin sub-roles MUST NOT live in profiles.role.
--
-- 1. Add a CHECK constraint on profiles.role pinning the canonical 7-value
--    enum: parent | teen | partner | mentor | driver | ambassador | admin.
-- 2. Defensive backfill: any rows with a non-canonical value (e.g. an admin
--    sub-role accidentally written into profiles.role) are migrated to
--    profiles.role='admin' AND a corresponding admin_roles row is upserted
--    so privileges are preserved.
-- 3. Ensure profiles.is_onboarded BOOLEAN exists (already added in earlier
--    migrations on prod but defensively guarded here for fresh installs).
-- 4. Ensure admin_roles.permissions JSONB exists (same defensive pattern).
-- 5. Index profiles.is_onboarded for the /auth/redirect cold path.
-- 6. Ensure parent_teen_links.status exists with a default 'active' so the
--    canonical validate-teen / parent-teens-create flows can write the
--    invariant the canon mandates without silent column drops.
-- 7. Create the singular `audit_log` table per the Wave 0 'audit_log singular
--    wins' founder ruling — this is identity-flow infrastructure.
-- ============================================================================

DO $$
DECLARE
  v_row RECORD;
  v_admin_subroles TEXT[] := ARRAY['admin','moderator','support','super_admin'];
BEGIN
  ----------------------------------------------------------------------------
  -- 1. Defensive backfill BEFORE we add the CHECK constraint.
  --    Any profile.role NOT IN canonical 7 set is migrated to a safe default.
  ----------------------------------------------------------------------------

  -- 1a. If a profile.role is one of the admin sub-role strings (and not just
  --     'admin'), migrate the row: ensure an admin_roles row exists carrying
  --     the sub-role, then flip profiles.role to 'admin'.
  FOR v_row IN
    SELECT id, role
    FROM public.profiles
    WHERE role = ANY(v_admin_subroles)
      AND role <> 'admin'
  LOOP
    -- Upsert admin_roles row preserving the sub-role.
    INSERT INTO public.admin_roles (profile_id, role)
    VALUES (v_row.id, v_row.role)
    ON CONFLICT (profile_id) DO UPDATE
      SET role = EXCLUDED.role;

    UPDATE public.profiles SET role = 'admin' WHERE id = v_row.id;

    RAISE NOTICE '094_wave1a: migrated profile % from sub-role % to canonical admin', v_row.id, v_row.role;
  END LOOP;

  -- 1b. Anything still non-canonical (typo, legacy, leftover) is logged and
  --     forced to 'parent' — the safe default per canon §2 (DEFAULT 'parent').
  --     Logged via NOTICE; never aborts.
  FOR v_row IN
    SELECT id, role
    FROM public.profiles
    WHERE role IS NULL
       OR role NOT IN ('parent','teen','partner','mentor','driver','ambassador','admin')
  LOOP
    UPDATE public.profiles SET role = 'parent' WHERE id = v_row.id;
    RAISE NOTICE '094_wave1a: profile % had non-canonical role % — defaulted to parent', v_row.id, v_row.role;
  END LOOP;

  ----------------------------------------------------------------------------
  -- 2. Drop any existing CHECK on profiles.role (defensive — re-runs).
  ----------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_role_chk' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_chk;
  END IF;

  ----------------------------------------------------------------------------
  -- 3. Add the canonical 7-value CHECK constraint.
  ----------------------------------------------------------------------------
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_chk
    CHECK (role IN ('parent','teen','partner','mentor','driver','ambassador','admin'));

  ----------------------------------------------------------------------------
  -- 4. is_onboarded — DEFAULT FALSE, NOT NULL.
  ----------------------------------------------------------------------------
  ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN NOT NULL DEFAULT false;

  ----------------------------------------------------------------------------
  -- 5. admin_roles.permissions — additive JSONB overrides, default empty.
  ----------------------------------------------------------------------------
  ALTER TABLE public.admin_roles
    ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}'::jsonb;

  ----------------------------------------------------------------------------
  -- 6. parent_teen_links.status — required by canon §3.3 parental link gate.
  ----------------------------------------------------------------------------
  ALTER TABLE public.parent_teen_links
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

  -- Tighten via CHECK (idempotent).
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'parent_teen_links_status_chk'
      AND conrelid = 'public.parent_teen_links'::regclass
  ) THEN
    ALTER TABLE public.parent_teen_links
      ADD CONSTRAINT parent_teen_links_status_chk
      CHECK (status IN ('active','pending','revoked'));
  END IF;

  ----------------------------------------------------------------------------
  -- 7. Singular audit_log table (Wave 0 founder ruling).
  --    Created defensively if missing — the canon expects this name.
  ----------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_log'
  ) THEN
    CREATE TABLE public.audit_log (
      id              BIGSERIAL PRIMARY KEY,
      actor_id        UUID,
      actor_role      TEXT,
      action          TEXT NOT NULL,
      resource_type   TEXT,
      resource_id     TEXT,
      target_user_id  UUID,
      description     TEXT,
      metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
      ip_address      TEXT,
      user_agent      TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX audit_log_actor_idx     ON public.audit_log (actor_id, created_at DESC);
    CREATE INDEX audit_log_target_idx    ON public.audit_log (target_user_id, created_at DESC);
    CREATE INDEX audit_log_resource_idx  ON public.audit_log (resource_type, resource_id);
    -- Service-role only writes; no anon/authenticated grants.
    ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
  END IF;
END$$;

----------------------------------------------------------------------------
-- 8. Index on is_onboarded for /auth/redirect cold path (lookup is one of
--    the most frequent reads in the system).
----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS profiles_is_onboarded_idx
  ON public.profiles (is_onboarded)
  WHERE is_onboarded = false;

-- ============================================================================
-- END migration 094_wave1a_identity_truth.sql
-- ============================================================================
