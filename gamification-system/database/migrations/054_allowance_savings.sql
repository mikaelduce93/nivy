-- 054_allowance_savings.sql
-- Wave 2.2 — Allowance + savings goals
-- Per docs/vision/allowance-savings.md and whitepaper §19.4.5
--
-- Tables:
--   parent_allowances           — recurring parent → teen top-up schedules
--   allowance_disbursements     — audit trail per cron firing
--   savings_goals               — teen-defined named savings target
--   savings_contributions       — per-lock / per-match audit
--
-- View:
--   user_coins_spendable        — balance minus active goal locks
--
-- RPCs:
--   disburse_allowance(uuid)    — invoked by cron; idempotent on next_disbursement_at
--   lock_to_goal(uuid,uuid,int) — teen reserves coins toward a goal
--   release_from_goal(uuid,text)— release locks on cancel / expire
--
-- Trigger:
--   savings_contributions_match_trigger — auto-matches teen_lock with parent funds

BEGIN;

-- ========================================================================
-- 1. parent_allowances
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.parent_allowances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  teen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_dh NUMERIC(10,2) NOT NULL CHECK (amount_dh > 0),
  cadence TEXT NOT NULL CHECK (cadence IN ('weekly','biweekly','monthly','custom_dates')),
  cadence_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  conditional BOOLEAN NOT NULL DEFAULT FALSE,
  condition_type TEXT CHECK (condition_type IN ('streak_min','quest_completion_rate','chore_checklist','custom')),
  condition_threshold INTEGER,
  condition_config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  next_disbursement_at TIMESTAMPTZ NOT NULL,
  paused_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parent_allowances_parent ON public.parent_allowances(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_allowances_teen ON public.parent_allowances(teen_id);
CREATE INDEX IF NOT EXISTS idx_parent_allowances_due
  ON public.parent_allowances(next_disbursement_at)
  WHERE is_active = TRUE;

ALTER TABLE public.parent_allowances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allowance_select ON public.parent_allowances;
CREATE POLICY allowance_select ON public.parent_allowances
  FOR SELECT USING (parent_id = auth.uid() OR teen_id = auth.uid());

DROP POLICY IF EXISTS allowance_insert ON public.parent_allowances;
CREATE POLICY allowance_insert ON public.parent_allowances
  FOR INSERT WITH CHECK (parent_id = auth.uid());

DROP POLICY IF EXISTS allowance_update ON public.parent_allowances;
CREATE POLICY allowance_update ON public.parent_allowances
  FOR UPDATE USING (parent_id = auth.uid()) WITH CHECK (parent_id = auth.uid());

DROP POLICY IF EXISTS allowance_delete ON public.parent_allowances;
CREATE POLICY allowance_delete ON public.parent_allowances
  FOR DELETE USING (parent_id = auth.uid());

-- ========================================================================
-- 2. allowance_disbursements
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.allowance_disbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allowance_id UUID NOT NULL REFERENCES parent_allowances(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  amount_dh NUMERIC(10,2) NOT NULL,
  payment_transaction_id UUID,
  escrow_ledger_id UUID,
  coin_transaction_id UUID,
  status TEXT NOT NULL CHECK (status IN ('pending','succeeded','skipped','failed')),
  condition_met BOOLEAN,
  skip_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_allowance_disb_allowance ON public.allowance_disbursements(allowance_id);
CREATE INDEX IF NOT EXISTS idx_allowance_disb_scheduled ON public.allowance_disbursements(scheduled_at);

ALTER TABLE public.allowance_disbursements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allowance_disb_select ON public.allowance_disbursements;
CREATE POLICY allowance_disb_select ON public.allowance_disbursements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_allowances pa
      WHERE pa.id = allowance_disbursements.allowance_id
        AND (pa.parent_id = auth.uid() OR pa.teen_id = auth.uid())
    )
  );

-- ========================================================================
-- 3. savings_goals
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  target_coins INTEGER NOT NULL CHECK (target_coins > 0),
  current_saved_coins INTEGER NOT NULL DEFAULT 0 CHECK (current_saved_coins >= 0),
  target_date DATE,
  parent_match_pct NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (parent_match_pct >= 0 AND parent_match_pct <= 100),
  parent_match_cap_coins INTEGER,
  parent_match_contributed_coins INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','achieved','cancelled','expired')),
  achieved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_teen ON public.savings_goals(teen_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_parent ON public.savings_goals(parent_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_active
  ON public.savings_goals(teen_id) WHERE status = 'active';

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS savings_goal_select ON public.savings_goals;
CREATE POLICY savings_goal_select ON public.savings_goals
  FOR SELECT USING (teen_id = auth.uid() OR parent_id = auth.uid());

DROP POLICY IF EXISTS savings_goal_insert ON public.savings_goals;
CREATE POLICY savings_goal_insert ON public.savings_goals
  FOR INSERT WITH CHECK (teen_id = auth.uid());

DROP POLICY IF EXISTS savings_goal_update ON public.savings_goals;
CREATE POLICY savings_goal_update ON public.savings_goals
  FOR UPDATE USING (teen_id = auth.uid() OR parent_id = auth.uid())
  WITH CHECK (teen_id = auth.uid() OR parent_id = auth.uid());

-- ========================================================================
-- 4. savings_contributions
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.savings_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('teen_lock','parent_match','allowance_auto')),
  amount_coins INTEGER NOT NULL CHECK (amount_coins > 0),
  contributor_user_id UUID NOT NULL,
  coin_transaction_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_savings_contrib_goal ON public.savings_contributions(goal_id);

ALTER TABLE public.savings_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS savings_contrib_select ON public.savings_contributions;
CREATE POLICY savings_contrib_select ON public.savings_contributions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM savings_goals sg
      WHERE sg.id = savings_contributions.goal_id
        AND (sg.teen_id = auth.uid() OR sg.parent_id = auth.uid())
    )
  );

-- ========================================================================
-- 5. user_coins_spendable VIEW
-- ========================================================================
CREATE OR REPLACE VIEW public.user_coins_spendable AS
SELECT
  uc.teen_id,
  uc.balance AS total,
  COALESCE(
    (SELECT SUM(current_saved_coins)::int
       FROM savings_goals
      WHERE teen_id = uc.teen_id AND status = 'active'),
    0
  ) AS locked_in_goals,
  uc.balance - COALESCE(
    (SELECT SUM(current_saved_coins)::int
       FROM savings_goals
      WHERE teen_id = uc.teen_id AND status = 'active'),
    0
  ) AS spendable
FROM user_coins uc;

GRANT SELECT ON public.user_coins_spendable TO authenticated, service_role;

-- ========================================================================
-- 6. RPC: lock_to_goal
-- ========================================================================
CREATE OR REPLACE FUNCTION public.lock_to_goal(
  p_teen_id UUID,
  p_goal_id UUID,
  p_amount INTEGER
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_goal RECORD;
  v_balance INTEGER;
  v_locked INTEGER;
  v_spendable INTEGER;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_teen_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  SELECT * INTO v_goal FROM savings_goals WHERE id = p_goal_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'goal_not_found');
  END IF;
  IF v_goal.teen_id <> p_teen_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'goal_mismatch');
  END IF;
  IF v_goal.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'goal_not_active');
  END IF;

  -- Spendable balance check (balance minus all active goal locks).
  SELECT balance INTO v_balance FROM user_coins WHERE teen_id = p_teen_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_wallet');
  END IF;

  SELECT COALESCE(SUM(current_saved_coins), 0)::int INTO v_locked
    FROM savings_goals
   WHERE teen_id = p_teen_id AND status = 'active';

  v_spendable := v_balance - v_locked;
  IF p_amount > v_spendable THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_spendable',
      'spendable', v_spendable
    );
  END IF;

  UPDATE savings_goals
     SET current_saved_coins = current_saved_coins + p_amount
   WHERE id = p_goal_id;

  INSERT INTO savings_contributions (goal_id, source, amount_coins, contributor_user_id)
  VALUES (p_goal_id, 'teen_lock', p_amount, p_teen_id);

  -- Auto-achieve when target reached.
  IF (v_goal.current_saved_coins + p_amount) >= v_goal.target_coins THEN
    UPDATE savings_goals
       SET status = 'achieved', achieved_at = NOW()
     WHERE id = p_goal_id AND status = 'active';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'goal_id', p_goal_id,
    'locked', p_amount,
    'new_saved', v_goal.current_saved_coins + p_amount
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.lock_to_goal(UUID, UUID, INTEGER) TO authenticated, service_role;

-- ========================================================================
-- 7. RPC: release_from_goal
-- ========================================================================
CREATE OR REPLACE FUNCTION public.release_from_goal(
  p_goal_id UUID,
  p_reason TEXT DEFAULT 'cancelled'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_goal RECORD;
  v_new_status TEXT;
BEGIN
  SELECT * INTO v_goal FROM savings_goals WHERE id = p_goal_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'goal_not_found');
  END IF;

  IF v_caller IS NOT NULL AND v_caller <> v_goal.teen_id AND v_caller <> v_goal.parent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  IF v_goal.status = 'achieved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'goal_already_achieved');
  END IF;

  v_new_status := CASE
    WHEN p_reason = 'expired' THEN 'expired'
    ELSE 'cancelled'
  END;

  UPDATE savings_goals
     SET status = v_new_status,
         current_saved_coins = 0
   WHERE id = p_goal_id;

  RETURN jsonb_build_object(
    'success', true,
    'goal_id', p_goal_id,
    'released_coins', v_goal.current_saved_coins,
    'new_status', v_new_status
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_from_goal(UUID, TEXT) TO authenticated, service_role;

-- ========================================================================
-- 8. Helper: advance_next_disbursement
-- ========================================================================
CREATE OR REPLACE FUNCTION public._advance_next_disbursement(
  p_current TIMESTAMPTZ,
  p_cadence TEXT,
  p_cadence_config JSONB
) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_next TIMESTAMPTZ;
BEGIN
  IF p_cadence = 'weekly' THEN
    v_next := p_current + INTERVAL '7 days';
  ELSIF p_cadence = 'biweekly' THEN
    v_next := p_current + INTERVAL '14 days';
  ELSIF p_cadence = 'monthly' THEN
    v_next := p_current + INTERVAL '1 month';
  ELSIF p_cadence = 'custom_dates' THEN
    -- Picks the next date > current from cadence_config.dates[]; falls back +30d.
    SELECT MIN((d::text)::timestamptz) INTO v_next
      FROM jsonb_array_elements_text(COALESCE(p_cadence_config->'dates','[]'::jsonb)) d
     WHERE (d::text)::timestamptz > p_current;
    IF v_next IS NULL THEN
      v_next := p_current + INTERVAL '30 days';
    END IF;
  ELSE
    v_next := p_current + INTERVAL '7 days';
  END IF;

  RETURN v_next;
END;
$$;

-- ========================================================================
-- 9. RPC: disburse_allowance
-- ========================================================================
CREATE OR REPLACE FUNCTION public.disburse_allowance(p_allowance_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  v_a RECORD;
  v_topup jsonb;
  v_disb_id UUID;
  v_payment_id UUID;
  v_condition_met BOOLEAN := TRUE;
  v_skip_reason TEXT := NULL;
  v_streak INTEGER;
  v_completed INTEGER;
  v_scheduled TIMESTAMPTZ;
  v_next TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_a FROM parent_allowances WHERE id = p_allowance_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'allowance_not_found');
  END IF;

  IF NOT v_a.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'allowance_inactive');
  END IF;

  IF v_a.paused_until IS NOT NULL AND v_a.paused_until > NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'allowance_paused');
  END IF;

  IF v_a.next_disbursement_at > NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_due', 'next_at', v_a.next_disbursement_at);
  END IF;

  v_scheduled := v_a.next_disbursement_at;

  -- Conditional evaluation.
  IF v_a.conditional THEN
    IF v_a.condition_type = 'streak_min' THEN
      SELECT COALESCE(current_streak, 0) INTO v_streak
        FROM user_streaks WHERE teen_id = v_a.teen_id LIMIT 1;
      v_streak := COALESCE(v_streak, 0);
      IF v_streak < COALESCE(v_a.condition_threshold, 0) THEN
        v_condition_met := FALSE;
        v_skip_reason := 'streak_below_threshold';
      END IF;
    ELSIF v_a.condition_type = 'quest_completion_rate' THEN
      SELECT COUNT(*) INTO v_completed
        FROM user_missions
       WHERE teen_id = v_a.teen_id
         AND status = 'completed'
         AND completed_at >= v_scheduled - INTERVAL '7 days';
      IF v_completed < COALESCE(v_a.condition_threshold, 0) THEN
        v_condition_met := FALSE;
        v_skip_reason := 'quests_below_threshold';
      END IF;
    END IF;
  END IF;

  -- Compute next slot once, used for both skip & success branches.
  v_next := public._advance_next_disbursement(v_scheduled, v_a.cadence, v_a.cadence_config);

  IF NOT v_condition_met THEN
    INSERT INTO allowance_disbursements (
      allowance_id, scheduled_at, executed_at, amount_dh, status, condition_met, skip_reason
    ) VALUES (
      p_allowance_id, v_scheduled, NOW(), v_a.amount_dh, 'skipped', FALSE, v_skip_reason
    ) RETURNING id INTO v_disb_id;

    UPDATE parent_allowances
       SET next_disbursement_at = v_next, updated_at = NOW()
     WHERE id = p_allowance_id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'skipped',
      'disbursement_id', v_disb_id,
      'skip_reason', v_skip_reason,
      'next_at', v_next
    );
  END IF;

  -- Call top_up_teen.
  v_topup := public.top_up_teen(v_a.parent_id, v_a.teen_id, v_a.amount_dh);

  IF NOT COALESCE((v_topup->>'success')::boolean, FALSE) THEN
    INSERT INTO allowance_disbursements (
      allowance_id, scheduled_at, executed_at, amount_dh, status, condition_met, skip_reason
    ) VALUES (
      p_allowance_id, v_scheduled, NOW(), v_a.amount_dh, 'failed', v_condition_met,
      COALESCE(v_topup->>'error', 'topup_failed')
    ) RETURNING id INTO v_disb_id;

    -- Don't advance next_disbursement_at on failure; alert via return.
    RETURN jsonb_build_object(
      'success', false,
      'status', 'failed',
      'disbursement_id', v_disb_id,
      'error', v_topup->>'error'
    );
  END IF;

  v_payment_id := (v_topup->>'payment_id')::uuid;

  INSERT INTO allowance_disbursements (
    allowance_id, scheduled_at, executed_at, amount_dh, payment_transaction_id,
    status, condition_met
  ) VALUES (
    p_allowance_id, v_scheduled, NOW(), v_a.amount_dh, v_payment_id,
    'succeeded', v_condition_met
  ) RETURNING id INTO v_disb_id;

  UPDATE parent_allowances
     SET next_disbursement_at = v_next, updated_at = NOW()
   WHERE id = p_allowance_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'succeeded',
    'disbursement_id', v_disb_id,
    'payment_id', v_payment_id,
    'amount_coins', v_topup->'amount_coins',
    'next_at', v_next
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.disburse_allowance(UUID) TO service_role;

-- ========================================================================
-- 10. Trigger: parent match on teen_lock contributions
-- ========================================================================
CREATE OR REPLACE FUNCTION public._savings_match_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  v_goal RECORD;
  v_match_coins INTEGER;
  v_remaining_cap INTEGER;
  v_amount_dh NUMERIC(10,2);
  v_topup jsonb;
BEGIN
  IF NEW.source <> 'teen_lock' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_goal FROM savings_goals WHERE id = NEW.goal_id FOR UPDATE;
  IF v_goal.parent_id IS NULL OR v_goal.parent_match_pct IS NULL OR v_goal.parent_match_pct = 0 THEN
    RETURN NEW;
  END IF;

  v_match_coins := FLOOR(NEW.amount_coins * v_goal.parent_match_pct / 100.0)::int;
  IF v_match_coins <= 0 THEN
    RETURN NEW;
  END IF;

  -- Apply cap.
  IF v_goal.parent_match_cap_coins IS NOT NULL THEN
    v_remaining_cap := v_goal.parent_match_cap_coins - COALESCE(v_goal.parent_match_contributed_coins, 0);
    IF v_remaining_cap <= 0 THEN
      RETURN NEW;
    END IF;
    IF v_match_coins > v_remaining_cap THEN
      v_match_coins := v_remaining_cap;
    END IF;
  END IF;

  -- Convert coins back to DH (100 coins = 1 DH); guard fractional rounding.
  v_amount_dh := ROUND(v_match_coins::numeric / 100.0, 2);
  IF v_amount_dh <= 0 THEN
    RETURN NEW;
  END IF;

  -- Re-derive coin amount actually credited (top_up_teen recomputes from DH).
  v_match_coins := (v_amount_dh * 100)::int;

  v_topup := public.top_up_teen(v_goal.parent_id, v_goal.teen_id, v_amount_dh);
  IF NOT COALESCE((v_topup->>'success')::boolean, FALSE) THEN
    -- Skip silently — the teen lock still holds; parent match just didn't fund.
    RETURN NEW;
  END IF;

  -- Lock the matched coins to the same goal.
  UPDATE savings_goals
     SET current_saved_coins = current_saved_coins + v_match_coins,
         parent_match_contributed_coins = COALESCE(parent_match_contributed_coins, 0) + v_match_coins
   WHERE id = NEW.goal_id;

  INSERT INTO savings_contributions (goal_id, source, amount_coins, contributor_user_id)
  VALUES (NEW.goal_id, 'parent_match', v_match_coins, v_goal.parent_id);

  -- Auto-achieve check after match.
  IF (v_goal.current_saved_coins + NEW.amount_coins + v_match_coins) >= v_goal.target_coins THEN
    UPDATE savings_goals
       SET status = 'achieved', achieved_at = NOW()
     WHERE id = NEW.goal_id AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS savings_contributions_match_trigger ON public.savings_contributions;
CREATE TRIGGER savings_contributions_match_trigger
AFTER INSERT ON public.savings_contributions
FOR EACH ROW EXECUTE FUNCTION public._savings_match_trigger();

COMMIT;
