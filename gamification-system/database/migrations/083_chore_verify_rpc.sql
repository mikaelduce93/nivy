-- Migration 083: verify_chore_completion RPC (TICKET-013, multi-parent verification)
--
-- Purpose
--   Allow ANY parent linked to the teen via parent_teen_links (not only the
--   chore's creator) to approve/reject a parent_chore_completion.
--   First-wins: once parent_verified is set (true OR rejection_reason set),
--   the row is immutable.
--
-- On approve: SET parent_verified=true and call payout_chore_reward with the
--   chore's actual parent_id (the creator) so the existing payout invariant
--   (p_verified_by must equal chore.parent_id) is preserved.
-- On reject: SET parent_verified=false and store rejection_reason.
--
-- Security: SECURITY DEFINER. The function validates that the calling parent
-- (auth.uid() OR p_parent_id when called from a service-role server route)
-- is linked to the teen via parent_teen_links.

CREATE OR REPLACE FUNCTION public.verify_chore_completion(
  p_completion_id uuid,
  p_parent_id uuid,
  p_action text,                  -- 'approve' | 'reject'
  p_rejection_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_completion RECORD;
  v_chore RECORD;
  v_link_exists boolean;
  v_payout jsonb;
BEGIN
  -- Caller integrity: when invoked under a JWT, the JWT subject must match
  -- p_parent_id. Service-role calls (auth.uid() = NULL) bypass this check.
  IF v_caller IS NOT NULL AND v_caller <> p_parent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  IF p_action NOT IN ('approve', 'reject') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_action');
  END IF;

  -- Lock the completion row.
  SELECT * INTO v_completion
  FROM parent_chore_completions
  WHERE id = p_completion_id
  FOR UPDATE;

  IF v_completion.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'completion_not_found');
  END IF;

  -- First-wins immutability: once verified or rejected, no overwrite.
  IF v_completion.parent_verified = true
     OR (v_completion.verified_at IS NOT NULL AND v_completion.parent_verified = false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_verified',
      'parent_verified', v_completion.parent_verified,
      'verified_by', v_completion.verified_by
    );
  END IF;

  SELECT * INTO v_chore
  FROM parent_chores
  WHERE id = v_completion.chore_id;

  IF v_chore.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'chore_not_found');
  END IF;

  -- Multi-parent rule: ANY parent linked to the teen who completed may verify.
  SELECT EXISTS (
    SELECT 1 FROM parent_teen_links
    WHERE parent_id = p_parent_id
      AND teen_id = v_completion.teen_id
  ) INTO v_link_exists;

  IF NOT v_link_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_linked_parent');
  END IF;

  -- Apply verification.
  IF p_action = 'approve' THEN
    UPDATE parent_chore_completions
    SET parent_verified = true,
        verified_at = NOW(),
        verified_by = p_parent_id,
        rejection_reason = NULL
    WHERE id = p_completion_id;

    -- Delegate payout. payout_chore_reward requires p_verified_by =
    -- chore.parent_id, so we always pass the chore's owner regardless of
    -- which linked parent triggered the verification.
    v_payout := payout_chore_reward(
      p_completion_id,
      v_chore.parent_id
    );

    RETURN jsonb_build_object(
      'success', true,
      'action', 'approved',
      'verified_by', p_parent_id,
      'payout', v_payout
    );
  ELSE
    UPDATE parent_chore_completions
    SET parent_verified = false,
        verified_at = NOW(),
        verified_by = p_parent_id,
        rejection_reason = COALESCE(NULLIF(p_rejection_reason, ''), 'Refusé par le parent')
    WHERE id = p_completion_id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'rejected',
      'verified_by', p_parent_id
    );
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_chore_completion(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_chore_completion(uuid, uuid, text, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.verify_chore_completion(uuid, uuid, text, text) IS
  'TICKET-013: any parent linked to a teen via parent_teen_links may verify a chore completion. First-wins immutability. On approve, delegates to payout_chore_reward.';
