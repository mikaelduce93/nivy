-- 111_realityfix_onboarding_progress_rls.sql
--
-- #55 (Pilier J) — onboarding_progress was protected by a single always-true
-- policy ("Allow anonymous onboarding access", FOR ALL, USING/ WITH CHECK true)
-- applying to PUBLIC (anon + authenticated). Combined with the default Supabase
-- grants (anon: SELECT; authenticated: SELECT/INSERT/UPDATE/DELETE) this is a
-- cross-tenant IDOR: any browser anon key could read every row (form_data,
-- user_type, synced_to_teen_id), and any authenticated user could rewrite/
-- delete any row.
--
-- The official path never touches the table directly — the server actions call
-- SECURITY DEFINER RPCs (init/record/get/sync_onboarding_*, all confirmed
-- prosecdef=true with EXECUTE to anon+authenticated). Those bypass RLS, so
-- locking the table down does NOT break onboarding; it only removes the abusive
-- direct PostgREST access.
--
-- Fix:
--   1) Revoke direct PostgREST access (anon: all; authenticated: writes). Keep
--      authenticated SELECT so the scoped read policy below is enforceable.
--   2) Drop the always-true policy; add a deny-by-default scoped SELECT policy
--      for authenticated. synced_to_teen_id = teens.id (NOT auth.uid()), so the
--      owner link is teens.parent_id = auth.uid(). No anon policy — anonymous
--      pre-account access goes exclusively through the SECURITY DEFINER RPCs.
--   3) RPC EXECUTE grants are left untouched.
--
-- Idempotent: guarded DROP/CREATE POLICY + REVOKE are re-runnable.

-- 1) Lock down direct table access. service_role keeps full access (bypasses
--    RLS natively for server-side admin ops).
REVOKE ALL ON public.onboarding_progress FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.onboarding_progress FROM authenticated;
-- (authenticated keeps SELECT; the scoped policy below filters it.)

-- 2) Replace the always-true policy with a scoped SELECT policy.
DROP POLICY IF EXISTS "Allow anonymous onboarding access" ON public.onboarding_progress;
DROP POLICY IF EXISTS "onboarding_progress_parent_scoped_read" ON public.onboarding_progress;

CREATE POLICY "onboarding_progress_parent_scoped_read"
  ON public.onboarding_progress
  FOR SELECT
  TO authenticated
  USING (
    synced_to_teen_id IN (
      SELECT id FROM public.teens WHERE parent_id = (SELECT auth.uid())
    )
  );

-- No INSERT/UPDATE/DELETE policy for authenticated → deny by default. Writes
-- and anonymous pre-account reads go through the SECURITY DEFINER RPCs only.
