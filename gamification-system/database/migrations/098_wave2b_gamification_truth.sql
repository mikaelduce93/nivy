-- =============================================================================
-- Wave 2B — Gamification Truth (2026-05-09)
-- Source: docs/canon/gamification.locked.md §4 + §10 + docs/compliance/16-implementation-roadmap.md GAME-FIX-1
--
-- Goals:
--   1. savings_goals.status CHECK accepts the canonical 'withdrawn' terminal state.
--   2. Canonical SECURITY DEFINER RPC `withdraw_from_goal(p_goal_id, p_destination, p_metadata)`
--      that returns locked coins to user_coins_spendable on `status='achieved'`.
--   3. teen_physical_challenge_progress.validated_by audit column + index for the
--      Wave 2B no-fake-success moderation flow.
--
-- Idempotent. Safe to re-run.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. savings_goals.status — extend CHECK to include 'withdrawn'
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_check_name text;
BEGIN
  -- Drop any existing status CHECK constraint (idempotent across naming conventions).
  FOR v_check_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'savings_goals'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.savings_goals DROP CONSTRAINT %I', v_check_name);
  END LOOP;

  ALTER TABLE public.savings_goals
    ADD CONSTRAINT savings_goals_status_check
    CHECK (status IN ('active', 'achieved', 'cancelled', 'expired', 'withdrawn'));
END
$$;

-- -----------------------------------------------------------------------------
-- 2. withdraw_from_goal — terminal redemption.
--    Returns locked coins from a goal to the teen's spendable balance.
--    Caller must own the goal (auth.uid() = goal.teen_id) OR be an admin.
--
--    Args:
--      p_goal_id     uuid    REQUIRED — savings_goals.id
--      p_destination text    'spendable' (only — shop_purchase deferred)
--      p_metadata    jsonb   optional audit metadata
--
--    Result jsonb { success bool, coins_released int, balance_after int, error? text }
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.withdraw_from_goal(
  p_goal_id     uuid,
  p_destination text DEFAULT 'spendable',
  p_metadata    jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller    uuid := auth.uid();
  v_goal      public.savings_goals%ROWTYPE;
  v_locked    int := 0;
  v_now       timestamptz := now();
  v_is_admin  boolean := false;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;

  IF p_destination IS NULL OR p_destination NOT IN ('spendable') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'destination must be ''spendable'' (shop_purchase deferred)'
    );
  END IF;

  -- Lock the goal row. Lock prevents concurrent withdrawals/release racing.
  SELECT *
    INTO v_goal
    FROM public.savings_goals
   WHERE id = p_goal_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'goal_not_found');
  END IF;

  -- Owner OR admin only.
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles WHERE profile_id = v_caller
  ) INTO v_is_admin;

  IF v_goal.teen_id <> v_caller AND NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  -- Only an achieved goal can be withdrawn (the canonical terminal-redeem path).
  IF v_goal.status <> 'achieved' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'goal_not_achieved',
      'status', v_goal.status
    );
  END IF;

  v_locked := COALESCE(v_goal.current_saved_coins, 0);

  -- Flip to terminal 'withdrawn' state. Locked coins automatically become
  -- spendable because user_coins_spendable subtracts only goals where
  -- status='active'.
  UPDATE public.savings_goals
     SET status = 'withdrawn',
         updated_at = v_now
   WHERE id = p_goal_id;

  -- Audit trail (best-effort — audit_log canonical per Wave 1C).
  BEGIN
    INSERT INTO public.audit_log (
      actor_id, action, resource_type, resource_id, metadata
    ) VALUES (
      v_caller,
      'savings.withdraw',
      'savings_goal',
      p_goal_id,
      jsonb_build_object(
        'coins_released', v_locked,
        'destination', p_destination,
        'metadata', COALESCE(p_metadata, '{}'::jsonb)
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Don't block the withdrawal if audit_log is unavailable; the savings
    -- update is the source of truth.
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'coins_released', v_locked,
    'destination', p_destination
  );
END
$$;

REVOKE EXECUTE ON FUNCTION public.withdraw_from_goal(uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_from_goal(uuid, text, jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.withdraw_from_goal(uuid, text, jsonb) IS
  'Wave 2B canon: terminal savings redemption. Achieved goal → status=withdrawn; locked coins return to spendable.';

-- -----------------------------------------------------------------------------
-- 3. teen_physical_challenge_progress — moderation audit columns
--    (idempotent; older deployments may have these already).
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'teen_physical_challenge_progress'
       AND column_name = 'validated_by'
  ) THEN
    ALTER TABLE public.teen_physical_challenge_progress
      ADD COLUMN validated_by uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'teen_physical_challenge_progress'
       AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE public.teen_physical_challenge_progress
      ADD COLUMN rejection_reason text;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_phys_challenge_pending_validation
  ON public.teen_physical_challenge_progress (validated, completed)
  WHERE completed = true AND validated = false;

COMMIT;
