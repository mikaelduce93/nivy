-- 112_security_hardening_rpc_rls.sql
--
-- #56 (Pilier J) — RPC/RLS hardening. Idempotent, no feature removed: only
-- GRANTs are tightened, search_path is pinned, and policies are rewritten with
-- the same semantics. Companion to 060_wave_a_security_hardening.sql.
--
-- (Items already shipped: onboarding always-true policy → 111; the 10 anon-
-- readable SECURITY DEFINER views → 110.)
--
-- A) REVOKE EXECUTE on the sensitive monetary / parent / admin RPCs from
--    PUBLIC + anon + authenticated, GRANT to service_role. These take the
--    target identity (p_parent_id / p_admin_user_id / p_teen_id) as an
--    ARGUMENT and are SECURITY DEFINER, so an anon/authenticated caller could
--    impersonate any parent/admin. They are only ever invoked server-side via
--    the service-role client, so this closes the escalation vector without
--    breaking any legitimate path. All overloaded signatures are covered.
--
-- B) Pin search_path on every public function that lacks one (function_
--    search_path_mutable). `public, extensions, pg_temp` is a fixed,
--    breakage-safe value (covers pgcrypto/uuid-ossp in the extensions schema;
--    non-existent schemas in a search_path are simply ignored at resolution).
--
-- C) Wrap bare auth.uid() as (select auth.uid()) in every public policy that
--    has an unwrapped reference, so it is evaluated once per query (initplan)
--    instead of per row. Semantically identical; DROP+CREATE preserves the
--    policy's command, roles, permissive flag and expressions.
--
-- NOTE: a blanket anon REVOKE across all ~170 SECURITY DEFINER functions is
-- intentionally NOT done here. Beyond the identity-argument RPCs above, the
-- remaining definer functions derive identity from auth.uid() internally (anon
-- calls are inert), and a blanket revoke entangles the PUBLIC grant with
-- legitimate anon pre-auth flows (onboarding RPCs). Tracked as a follow-up.

-- ── A) Revoke sensitive identity-argument RPCs ──────────────────────────────
DO $do$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND p.proname IN (
        'top_up_teen','payout_chore_reward','verify_chore_completion',
        'spend_teen_coins','spend_tokens','transfer_tokens','claim_monthly_vip_coins',
        'lock_to_goal','release_from_goal','approve_ride','parent_approve_session',
        'parent_deny_session','admin_approve_mentor'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $do$;

-- ── B) Pin search_path on functions that lack one ───────────────────────────
DO $do$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND (p.proconfig IS NULL OR NOT EXISTS (
        SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'))
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions, pg_temp', r.sig);
  END LOOP;
END $do$;

-- ── C) Wrap bare auth.uid() in policies as (select auth.uid()) ──────────────
DO $do$
DECLARE r record; new_qual text; new_check text; ddl text; roles_csv text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual IS NOT NULL AND qual LIKE '%auth.uid()%'
           AND qual NOT LIKE '%(select auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid()%')
        OR (with_check IS NOT NULL AND with_check LIKE '%auth.uid()%'
           AND with_check NOT LIKE '%(select auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid()%')
      )
  LOOP
    new_qual  := r.qual;
    new_check := r.with_check;
    IF new_qual  IS NOT NULL THEN new_qual  := replace(new_qual,  'auth.uid()', '(select auth.uid())'); END IF;
    IF new_check IS NOT NULL THEN new_check := replace(new_check, 'auth.uid()', '(select auth.uid())'); END IF;

    SELECT string_agg(quote_ident(rn), ', ') INTO roles_csv FROM unnest(r.roles) rn;

    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);

    ddl := format('CREATE POLICY %I ON public.%I AS %s FOR %s TO %s',
                  r.policyname, r.tablename,
                  CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
                  r.cmd, roles_csv);
    IF new_qual  IS NOT NULL THEN ddl := ddl || format(' USING (%s)', new_qual); END IF;
    IF new_check IS NOT NULL THEN ddl := ddl || format(' WITH CHECK (%s)', new_check); END IF;
    EXECUTE ddl;
  END LOOP;
END $do$;
