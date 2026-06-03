-- 116_realityfix_crew_members_rls_recursion.sql
--
-- BUG (Postgres 42P17): "infinite recursion detected in policy for relation
-- crew_members". Surfaced at runtime on every teen dashboard load as
-- `Error fetching user crew: infinite recursion detected in policy for
-- relation "crew_members"`.
--
-- Cause: the two RLS policies defined ON crew_members in 007_crews_system.sql
-- reference crew_members INSIDE their own USING clause:
--
--   crew_members_read  → EXISTS (SELECT 1 FROM crew_members cm WHERE ...)
--   crew_members_write → EXISTS (SELECT 1 FROM crew_members cm WHERE ... admin)
--
-- Evaluating the policy requires querying crew_members, which re-triggers the
-- same policy → unbounded recursion. (The cross-table policies on crews /
-- crew_invitations / crew_join_requests / crew_unlocked_achievements /
-- crew_activity_log also query crew_members, so they error transitively until
-- crew_members' own SELECT policy is non-recursive.)
--
-- Fix (canonical RLS self-reference pattern): move the membership lookup into
-- SECURITY DEFINER helper functions. A SECURITY DEFINER function runs as its
-- owner (the table owner, exempt from RLS unless FORCE ROW LEVEL SECURITY), so
-- the inner SELECT does NOT re-enter the policy → no recursion. The read policy
-- also lets a user always see their OWN membership row (any status), so a
-- freshly-created / pending membership is visible before it becomes 'active'.
--
-- Intent is preserved:
--   read  : members can see all members of crews they actively belong to.
--   write : crew owners/admins can mutate their crew's membership.
--
-- Idempotent: CREATE OR REPLACE FUNCTION + guarded DROP/CREATE POLICY.

-- ── Helper functions (RLS-safe membership checks) ──────────────────────────
-- search_path='' + fully-qualified names hardens against search_path injection
-- (Supabase security advisor requirement for SECURITY DEFINER functions).

CREATE OR REPLACE FUNCTION public.is_active_crew_member(p_crew_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.crew_members
    WHERE crew_id = p_crew_id
      AND user_id = p_user_id
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_crew_admin(p_crew_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.crew_members
    WHERE crew_id = p_crew_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
$$;

-- ── Non-recursive policies ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "crew_members_read" ON public.crew_members;
CREATE POLICY "crew_members_read" ON public.crew_members
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_active_crew_member(crew_id, (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "crew_members_write" ON public.crew_members;
CREATE POLICY "crew_members_write" ON public.crew_members
  FOR ALL
  USING (
    public.is_crew_admin(crew_id, (SELECT auth.uid()))
  );
