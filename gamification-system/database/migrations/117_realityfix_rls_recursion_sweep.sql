-- 117_realityfix_rls_recursion_sweep.sql
--
-- Follow-up to 116 (crew_members). A full scan of pg_policies for the same
-- "policy on table T whose USING clause runs `SELECT ... FROM T`" anti-pattern
-- found two more 42P17 recursion bombs, both on teen-facing social features:
--
--   1) challenge_participants  → "Users can view challenge participants" (SELECT)
--   2) circle_members          → "circle_members_select"                (SELECT)
--
-- circle_members_select also carried a logic bug: `cm.circle_id = cm.circle_id`
-- (a tautology) instead of scoping to the row's circle — so it leaked every
-- circle_member row to anyone who was an active member of ANY circle.
--
-- The SAME tautology (`circle_members.circle_id = circle_members.id`, comparing
-- circle_id to the membership row's own id) appears in the circles_select and
-- circles_update policies on `circles` (migration 023). It is effectively
-- always false, so private circles were never visible to their members and
-- owners/admins could never update — and the subquery still re-entered the
-- recursive circle_members policy. Rewritten here to the correct scope.
--
-- Fix: same SECURITY DEFINER membership-helper pattern as 116. Read policies
-- also let the row owner (user_id / teen_id = auth.uid()) see their own row.
--
-- Idempotent: CREATE OR REPLACE FUNCTION + guarded DROP/CREATE POLICY.

-- ── challenge_participants ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_challenge_participant(p_challenge_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.challenge_participants
    WHERE challenge_id = p_challenge_id
      AND user_id = p_user_id
  );
$$;

DROP POLICY IF EXISTS "Users can view challenge participants" ON public.challenge_participants;
CREATE POLICY "Users can view challenge participants" ON public.challenge_participants
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_challenge_participant(challenge_id, (SELECT auth.uid()))
  );

-- ── circle_members + circles ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_active_circle_member(p_circle_id uuid, p_teen_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.circle_members
    WHERE circle_id = p_circle_id
      AND teen_id = p_teen_id
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_circle_admin(p_circle_id uuid, p_teen_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.circle_members
    WHERE circle_id = p_circle_id
      AND teen_id = p_teen_id
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
$$;

DROP POLICY IF EXISTS "circle_members_select" ON public.circle_members;
CREATE POLICY "circle_members_select" ON public.circle_members
  FOR SELECT
  USING (
    teen_id = (SELECT auth.uid())
    OR public.is_active_circle_member(circle_id, (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "circles_select" ON public.circles;
CREATE POLICY "circles_select" ON public.circles
  FOR SELECT
  USING (
    is_active = true
    AND (
      circle_type = 'public'
      OR public.is_active_circle_member(id, (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "circles_update" ON public.circles;
CREATE POLICY "circles_update" ON public.circles
  FOR UPDATE
  USING (
    public.is_circle_admin(id, (SELECT auth.uid()))
  );
