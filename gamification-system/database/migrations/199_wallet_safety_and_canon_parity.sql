-- ===========================================================================
-- Migration 199 — Wallet safety + canon parity
-- Date: 2026-07-13
-- Branch: fix/wallet-tables-and-cleanup
-- Source: docs/vision/audit-prelaunch/PRE_LAUNCH_AUDIT.md (wallet hardening)
--
-- WHY THIS MIGRATION EXISTS
-- ───────────────────────────────────────────────────────────────────────────
-- The pre-launch audit flagged several gaps in the wallet top-up & spend
-- pipeline. This migration closes them surgically (CREATE OR REPLACE only —
-- never DROP/recreate, which would lose grants from mig 112's loop):
--
--   F1  — top_up_teen (both overloads) lacked per-parent / per-teen advisory
--         locking, so two concurrent recharges could race the balance upsert.
--         Now serialized via pg_advisory_xact_lock (convention 182/183).
--   F2  — (psp_provider, psp_reference) idempotency relied on a SELECT-then-
--         INSERT race + a plain EXCEPTION WHEN OTHERS. We add:
--           F2.a  a partial UNIQUE index (WHERE psp_reference IS NOT NULL),
--           F2.b  a unique_violation retry in the 5-arg EXCEPTION block,
--           F2.c  move the two server-driven callers (disburse_allowance,
--                 _savings_match_trigger) onto the 5-arg overload so each
--                 carries a stable psp_reference (replay-safe), AND audit the
--                 savings-match failure instead of swallowing it silently.
--   F3.a — The 5-arg top_up_teen gains p_idempotency_key text so the client
--         idempotency key is attached ATOMICALLY inside the RPC (the route no
--         longer needs a post-RPC UPDATE that can race a retry). The NEW
--         signature needs an explicit GRANT (mig 112's loop ran once, by
--         proname, against the OLD signature).
--   F8  — Amount guards: reject sub-coin-precision (< 0.01 DH → 0 coins) and
--         > 10 000 DH hard cap, in BOTH overloads, right after coin compute.
--   M1  — parent_approve_session (059) debited the FULL balance without
--         subtracting savings locks (could drain a locked goal) and emitted
--         no escrow_ledger / no cashback. Canon-parity patch: spendable
--         check + RETURNING id + escrow_ledger + cashback via _cashback_pct
--         + enriched return.
--   I7  — complete_ride (061) had the same missing-locked-coins bug; only the
--         spendable check is added (its escrow + cashback were already canon).
--   I5  — spend_teen_coins (124) + complete_ride (061) each duplicated the
--         cashback ladder inline. Unified to call public._cashback_pct (175),
--         the single canonical resolver.
--   I4  — add_coins_to_user (060) was still EXECUTE-able by PUBLIC/anon/
--         authenticated — it credits coins from a (teen_id, amount) argument
--         under SECURITY DEFINER, a direct escalation vector. REVOKE.
--
-- IDEMPOTENT: CREATE OR REPLACE FUNCTION / CREATE [UNIQUE] INDEX IF NOT EXISTS.
-- No data migration, no drops. Live-DB pre-check (2026-07-13) via the PostgREST
-- API confirmed payment_transactions has 0 rows with psp_reference IS NOT
-- NULL, so the UNIQUE index applies cleanly (no duplicate-blocking error at
-- apply time). If duplicates ever existed, the index creation would fail at
-- apply — that is the SAFE failure mode (flagged here, not silently ignored).
-- ===========================================================================

BEGIN;

-- ===========================================================================
-- F2.a — Partial UNIQUE index on (psp_provider, psp_reference)
-- ---------------------------------------------------------------------------
-- Mig 197 created a NON-unique idx_payment_transactions_psp_lookup here. This
-- adds the UNIQUE variant (different name) constrained to rows that actually
-- carry a psp_reference. Multiple NULL psp_reference rows remain allowed
-- (manual 3-arg path, provider-only rails). The 5-arg overload + the two
-- server callers now always set a non-null psp_reference, so this index
-- becomes the hard dedupe gate for the entire top-up funnel.
-- ===========================================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_transactions_psp_ref
  ON public.payment_transactions (psp_provider, psp_reference)
  WHERE psp_reference IS NOT NULL;


-- ===========================================================================
-- F1 + F8 — top_up_teen (3-arg) with advisory lock + amount guards
-- ---------------------------------------------------------------------------
-- Recreated MOT POUR MOT from mig 179 (lines 141-250) with TWO additions:
--   * F1: pg_advisory_xact_lock on (parent, teen) at the very start of BEGIN.
--   * F8: amount-precision / hard-cap guards right after v_amount_coins.
-- All other logic (identity check, e-sig gate, F6 caps, paired escrow, ledger)
-- is preserved unchanged.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.top_up_teen(p_parent_id uuid, p_teen_id uuid, p_amount_dh numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_amount_coins integer;
  v_payment_id uuid;
  v_signature_id uuid;
  v_link_id uuid;
  v_new_balance integer;
  v_caps jsonb;
BEGIN
  -- F1 (mig 199): serialize concurrent top-ups per parent AND per teen so the
  -- user_coins upsert (balance += ...) cannot interleave between two recharges.
  PERFORM pg_advisory_xact_lock(hashtext('g4_topup:' || p_parent_id::text));
  PERFORM pg_advisory_xact_lock(hashtext('g4_topup_teen:' || p_teen_id::text));

  -- Identity check: when called from a user JWT, the caller must be the parent.
  -- Service-role calls (auth.uid() IS NULL) are trusted (server route already
  -- validated the role).
  IF v_caller IS NOT NULL AND v_caller <> p_parent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  IF p_amount_dh IS NULL OR p_amount_dh <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  -- Locked rate per whitepaper §5: 100 coins per DH.
  v_amount_coins := (p_amount_dh * 100)::integer;

  -- F8 (mig 199): guard below coin precision (e.g. 0.005 DH → 0 coins) and the
  -- hard cap (10 000 DH = 1 000 000 coins). Caps F6 below still apply on top.
  IF v_amount_coins <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount_below_coin_precision');
  END IF;
  IF p_amount_dh > 10000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'amount_exceeds_hard_cap');
  END IF;

  -- Verify parent-teen link is active.
  SELECT id INTO v_link_id
  FROM parent_teen_links
  WHERE parent_id = p_parent_id AND teen_id = p_teen_id
  LIMIT 1;

  IF v_link_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'teen_not_linked');
  END IF;

  -- Verify parent has signed CGU (e_signature gate). Whitepaper §10 invariant:
  -- "No coin debit happens without an active e_signatures.terms_accepted=true row."
  -- Top-ups also require this gate.
  SELECT id INTO v_signature_id
  FROM e_signatures
  WHERE parent_id = p_parent_id AND terms_accepted = true
  LIMIT 1;

  IF v_signature_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'requires_signature');
  END IF;

  -- F6 (mig 179): plafonds BAM — par opération, mensuel parent, agrégat ado.
  v_caps := public._check_topup_caps(p_parent_id, p_teen_id, p_amount_dh);
  IF NOT (v_caps->>'ok')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', v_caps->>'error',
      'cap_dh', v_caps->'cap_dh', 'mtd_dh', v_caps->'mtd_dh');
  END IF;

  -- 4. Create payment_transactions row (pending).
  INSERT INTO payment_transactions (
    parent_id, teen_id, amount_dh, amount_coins, status, psp_provider, psp_reference
  ) VALUES (
    p_parent_id, p_teen_id, p_amount_dh, v_amount_coins, 'pending', 'manual', NULL
  )
  RETURNING id INTO v_payment_id;

  -- 5. Mark succeeded (placeholder for PSP webhook in MVP).
  UPDATE payment_transactions
  SET status = 'succeeded', succeeded_at = NOW()
  WHERE id = v_payment_id;

  -- 6. Insert paired escrow_ledger row.
  INSERT INTO escrow_ledger (
    parent_id, teen_id, direction, amount_dh, amount_coins,
    related_payment_id, reason, created_by
  ) VALUES (
    p_parent_id, p_teen_id, 'top_up', p_amount_dh, v_amount_coins,
    v_payment_id, 'Parent top-up (manual MVP)', p_parent_id
  );

  -- 7. Upsert user_coins balance.
  INSERT INTO user_coins (teen_id, balance, lifetime_earned, updated_at)
  VALUES (p_teen_id, v_amount_coins, v_amount_coins, NOW())
  ON CONFLICT (teen_id) DO UPDATE
    SET balance = COALESCE(user_coins.balance, 0) + EXCLUDED.balance,
        lifetime_earned = COALESCE(user_coins.lifetime_earned, 0) + EXCLUDED.lifetime_earned,
        updated_at = NOW()
  RETURNING balance INTO v_new_balance;

  -- 8. Insert coin_transactions ledger row.
  INSERT INTO coin_transactions (
    teen_id, amount, transaction_type, source_type, source_id,
    description, balance_after
  ) VALUES (
    p_teen_id, v_amount_coins, 'topup', 'parent_topup', v_payment_id,
    format('Recharge parentale de %s DH (%s coins)', p_amount_dh, v_amount_coins),
    v_new_balance
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'amount_coins', v_amount_coins,
    'new_balance', v_new_balance
  );
EXCEPTION WHEN OTHERS THEN
  -- Whole transaction rolls back automatically.
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;


-- ===========================================================================
-- F1 + F2.b + F3.a + F8 — top_up_teen (5-arg → now 6-arg) with:
--   * advisory locks (F1),
--   * p_idempotency_key atomic insert (F3.a),
--   * unique_violation retry in EXCEPTION (F2.b),
--   * amount guards (F8).
-- ---------------------------------------------------------------------------
-- Recreated from mig 179 (lines 253-370) with the additions above. The new
-- signature (uuid, uuid, numeric, text, text, text) is NOT covered by mig
-- 112's proname loop (which ran once against the OLD signature), so an
-- explicit GRANT is added below the definition.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.top_up_teen(
  p_parent_id uuid, p_teen_id uuid, p_amount_dh numeric,
  p_provider text, p_provider_ref text,
  p_idempotency_key text DEFAULT NULL
) RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_caller         UUID := auth.uid();
  v_amount_coins   INTEGER;
  v_payment_id     UUID;
  v_signature_id   UUID;
  v_link_id        UUID;
  v_new_balance    INTEGER;
  v_existing_id    UUID;
  v_caps           jsonb;
BEGIN
  -- F1 (mig 199): serialize concurrent top-ups per parent AND per teen.
  PERFORM pg_advisory_xact_lock(hashtext('g4_topup:' || p_parent_id::text));
  PERFORM pg_advisory_xact_lock(hashtext('g4_topup_teen:' || p_teen_id::text));

  IF v_caller IS NOT NULL AND v_caller <> p_parent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  IF p_amount_dh IS NULL OR p_amount_dh <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  IF p_provider IS NULL OR length(p_provider) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_provider');
  END IF;

  IF p_provider_ref IS NOT NULL AND length(p_provider_ref) > 0 THEN
    SELECT id INTO v_existing_id
    FROM payment_transactions
    WHERE psp_provider = p_provider AND psp_reference = p_provider_ref
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'idempotent_replay', true,
        'payment_id', v_existing_id
      );
    END IF;
  END IF;

  v_amount_coins := (p_amount_dh * 100)::integer;

  -- F8 (mig 199): coin-precision / hard-cap guards.
  IF v_amount_coins <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount_below_coin_precision');
  END IF;
  IF p_amount_dh > 10000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'amount_exceeds_hard_cap');
  END IF;

  SELECT id INTO v_link_id
  FROM parent_teen_links
  WHERE parent_id = p_parent_id AND teen_id = p_teen_id
  LIMIT 1;

  IF v_link_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'teen_not_linked');
  END IF;

  SELECT id INTO v_signature_id
  FROM e_signatures
  WHERE parent_id = p_parent_id AND terms_accepted = true
  LIMIT 1;

  IF v_signature_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'requires_signature');
  END IF;

  -- F6 (mig 179): plafonds BAM — par opération, mensuel parent, agrégat ado.
  v_caps := public._check_topup_caps(p_parent_id, p_teen_id, p_amount_dh);
  IF NOT (v_caps->>'ok')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', v_caps->>'error',
      'cap_dh', v_caps->'cap_dh', 'mtd_dh', v_caps->'mtd_dh');
  END IF;

  -- F3.a (mig 199): attach client_idempotency_key ATOMICALLY with the insert
  -- so the route no longer needs a racy post-RPC UPDATE. p_idempotency_key is
  -- text (matches the RPC param shape); the column is uuid, so we cast. NULL
  -- (server-driven callers disburse_allowance / _savings_match_trigger) stays
  -- NULL — those rails dedupe on psp_reference, not on the client key.
  INSERT INTO payment_transactions (
    parent_id, teen_id, amount_dh, amount_coins, status,
    psp_provider, psp_reference, client_idempotency_key
  ) VALUES (
    p_parent_id, p_teen_id, p_amount_dh, v_amount_coins, 'pending',
    p_provider, p_provider_ref, p_idempotency_key::uuid
  ) RETURNING id INTO v_payment_id;

  UPDATE payment_transactions
     SET status = 'succeeded', succeeded_at = NOW()
   WHERE id = v_payment_id;

  INSERT INTO escrow_ledger (
    parent_id, teen_id, direction, amount_dh, amount_coins,
    related_payment_id, reason, created_by
  ) VALUES (
    p_parent_id, p_teen_id, 'top_up', p_amount_dh, v_amount_coins,
    v_payment_id, format('Parent top-up via %s (ref=%s)', p_provider, COALESCE(p_provider_ref, 'n/a')),
    p_parent_id
  );

  INSERT INTO user_coins (teen_id, balance, lifetime_earned, updated_at)
  VALUES (p_teen_id, v_amount_coins, v_amount_coins, NOW())
  ON CONFLICT (teen_id) DO UPDATE
    SET balance = COALESCE(user_coins.balance, 0) + EXCLUDED.balance,
        lifetime_earned = COALESCE(user_coins.lifetime_earned, 0) + EXCLUDED.lifetime_earned,
        updated_at = NOW()
  RETURNING balance INTO v_new_balance;

  INSERT INTO coin_transactions (
    teen_id, amount, transaction_type, source_type, source_id,
    description, balance_after
  ) VALUES (
    p_teen_id, v_amount_coins, 'topup', 'parent_topup', v_payment_id,
    format('Recharge parentale %s DH via %s', p_amount_dh, p_provider),
    v_new_balance
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'amount_coins', v_amount_coins,
    'new_balance', v_new_balance,
    'provider', p_provider,
    'provider_ref', p_provider_ref
  );
-- F2.b (mig 199): a concurrent insert with the same (psp_provider,
-- psp_reference) committed between our SELECT and INSERT; the UNIQUE index
-- (F2.a) makes this a clean dedupe instead of a double credit.
EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_existing_id FROM payment_transactions
      WHERE psp_provider = p_provider AND psp_reference = p_provider_ref LIMIT 1;
    RETURN jsonb_build_object('success', true, 'idempotent_replay', true, 'payment_id', v_existing_id);
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- The 6-arg signature is brand new; mig 112's proname loop granted the OLD
-- 5-arg signature. Re-grant explicitly so the route keeps working.
GRANT EXECUTE ON FUNCTION public.top_up_teen(uuid, uuid, numeric, text, text, text) TO service_role;


-- ===========================================================================
-- F2.c — disburse_allowance: route through the 5-arg overload with a stable
--        psp_reference (allowance:<id>:<scheduled_at>), so each disbursement
--        is replay-safe instead of relying on the linkless 3-arg path.
-- ===========================================================================
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

  -- F2.c (mig 199): 5-arg overload with a stable psp_reference keyed on the
  -- allowance id + scheduled instant. A replay of the same disbursement (e.g.
  -- cron retried after a crash) now dedupes via the F2.a UNIQUE index instead
  -- of double-crediting.
  v_topup := public.top_up_teen(v_a.parent_id, v_a.teen_id, v_a.amount_dh, 'allowance', format('allowance:%s:%s', p_allowance_id, v_scheduled));

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


-- ===========================================================================
-- F2.c + G — _savings_match_trigger: 5-arg overload + audited failure path
-- ---------------------------------------------------------------------------
-- Recreated from mig 054 (lines 503-574). Two changes only:
--   * the top_up_teen call now carries a stable psp_reference keyed on the
--     contribution id (F2.c),
--   * a top-up failure that previously returned silently now writes an
--     audit_log row so an operator can see the parent-match didn't fund.
-- ===========================================================================
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

  -- F2.c (mig 199): 5-arg overload with a stable psp_reference keyed on the
  -- contribution id. A trigger retry (rare, but possible after a crash mid-
  -- fire) dedupes instead of double-funding the match.
  v_topup := public.top_up_teen(v_goal.parent_id, v_goal.teen_id, v_amount_dh, 'savings_match', format('savings_match:%s', NEW.id));
  IF NOT COALESCE((v_topup->>'success')::boolean, FALSE) THEN
    -- G (mig 199): previously swallowed silently. Audit the failure so an
    -- operator can reconcile; the teen_lock still holds (return NEW so the
    -- contribution row commits).
    INSERT INTO public.audit_log (actor_id, actor_role, action, resource_type, resource_id, target_user_id, description, metadata)
    VALUES (v_goal.parent_id, 'parent', 'savings_match_failed', 'savings_goal', NEW.goal_id::text, v_goal.teen_id,
      'Parent match top_up_teen failed during teen_lock contribution',
      jsonb_build_object('goal_id', NEW.goal_id, 'contribution_id', NEW.id, 'match_coins', v_match_coins, 'amount_dh', v_amount_dh, 'topup_error', v_topup->>'error'));
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

-- Trigger itself is untouched; just keep the binding canonical.
DROP TRIGGER IF EXISTS savings_contributions_match_trigger ON public.savings_contributions;
CREATE TRIGGER savings_contributions_match_trigger
AFTER INSERT ON public.savings_contributions
FOR EACH ROW EXECUTE FUNCTION public._savings_match_trigger();


-- ===========================================================================
-- M1 — parent_approve_session: spendable check + escrow + cashback (canon §)
-- ---------------------------------------------------------------------------
-- Recreated from mig 059 (lines 105-177). The coin block previously:
--   * debited the FULL balance (ignoring savings locks — could drain a goal),
--   * wrote no escrow_ledger row,
--   * awarded no cashback XP,
--   * returned no spend_id / cashback_xp.
-- Now mirrors the canonical spend rails (spend_teen_coins / complete_ride):
--   * subtracts active savings locks (spendable),
--   * keeps the deny-approval + deny-session side effects on insufficient,
--   * RETURNING id for escrow + cashback linkage,
--   * cashback via the canonical helper _cashback_pct(NULL) (mentor has no
--     partner),
--   * enriched return: amount_coins_debited + cashback_xp + spend_id.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.parent_approve_session(
  p_session_id uuid,
  p_parent_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller UUID := auth.uid();
  v_session RECORD;
  v_balance INT;
  v_locked INT;
  v_spendable INT;
  v_new_balance INT;
  v_coin_tx_id UUID;
  v_cashback_pct INT;
  v_cashback_xp INT := 0;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_parent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  SELECT s.* INTO v_session FROM public.mentor_sessions s WHERE s.id = p_session_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'session_not_found'); END IF;
  IF v_session.status <> 'pending_approval' THEN
    RETURN jsonb_build_object('success', false, 'error', 'session_not_pending');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.parent_teen_links
    WHERE parent_id = p_parent_id AND teen_id = v_session.mentee_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_linked_parent');
  END IF;

  UPDATE public.parental_approvals
    SET status='approved', decided_at=NOW(), decided_by=p_parent_id
    WHERE id = v_session.parent_approval_id;

  UPDATE public.mentor_sessions SET status='approved' WHERE id = p_session_id;

  IF v_session.amount_coins > 0 THEN
    SELECT balance INTO v_balance FROM public.user_coins
      WHERE teen_id = v_session.mentee_user_id FOR UPDATE;
    IF v_balance IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'no_wallet');
    END IF;

    -- M1 (mig 199): spendable = balance minus active savings locks (mirrors
    -- spend_teen_coins / complete_ride). Approving a mentor session must NOT
    -- drain coins the teen has locked toward a savings goal.
    SELECT COALESCE(SUM(current_saved_coins), 0)::int INTO v_locked
      FROM savings_goals WHERE teen_id = v_session.mentee_user_id AND status = 'active';
    v_spendable := v_balance - v_locked;

    IF v_spendable < v_session.amount_coins THEN
      UPDATE public.parental_approvals
        SET status='denied', decided_at=NOW(), decided_by=p_parent_id,
            details = COALESCE(details,'{}'::jsonb) || jsonb_build_object('error','insufficient_balance')
        WHERE id = v_session.parent_approval_id;
      UPDATE public.mentor_sessions SET status='denied' WHERE id = p_session_id;
      RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance',
        'balance', v_balance, 'locked', v_locked, 'spendable', v_spendable);
    END IF;

    UPDATE public.user_coins
      SET balance = balance - v_session.amount_coins,
          lifetime_spent = COALESCE(lifetime_spent,0) + v_session.amount_coins,
          updated_at = NOW()
      WHERE teen_id = v_session.mentee_user_id
      RETURNING balance INTO v_new_balance;

    INSERT INTO public.coin_transactions (
      teen_id, amount, transaction_type, source_type, source_id,
      description, balance_after
    ) VALUES (
      v_session.mentee_user_id, -v_session.amount_coins, 'spend', 'mentor_session', p_session_id,
      format('Mentor session payment (%s coins)', v_session.amount_coins),
      v_new_balance
    ) RETURNING id INTO v_coin_tx_id;

    -- M1 (mig 199): paired escrow_ledger row (canon §29 #4 — every spend).
    -- NB: parent_id comes from the function ARG p_parent_id (no v_parent_id is
    -- declared here — unlike spend_teen_coins which derives it from the link).
    INSERT INTO escrow_ledger (parent_id, teen_id, direction, amount_dh, amount_coins, related_spend_id, reason, created_by)
    VALUES (p_parent_id, v_session.mentee_user_id, 'spend', v_session.amount_dh, v_session.amount_coins, v_coin_tx_id,
      format('Mentor session %s', p_session_id), p_parent_id);

    -- M1 (mig 199): cashback XP via the canonical resolver (mig 175). A mentor
    -- session has no partner, so _cashback_pct(NULL) resolves the global rule.
    -- Integer truncation of the pct is acceptable: production rules use integer
    -- percentages, and the helper returns integer by design (175:50).
    v_cashback_pct := public._cashback_pct(NULL);
    v_cashback_xp := FLOOR(v_session.amount_coins * v_cashback_pct / 100)::int;
    IF v_cashback_xp > 0 THEN
      PERFORM public.add_xp_to_user(v_session.mentee_user_id, v_cashback_xp, 'cashback'::varchar, 'mentor_session'::varchar, v_coin_tx_id, format('Cashback %s%% sur session mentor (%s coins)', v_cashback_pct, v_session.amount_coins));
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'amount_coins_debited', v_session.amount_coins,
    'cashback_xp', v_cashback_xp,
    'spend_id', v_coin_tx_id
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.parent_approve_session(uuid, uuid) TO service_role, authenticated;


-- ===========================================================================
-- I7 — complete_ride: spendable check (subtract savings locks)
-- ---------------------------------------------------------------------------
-- Recreated from mig 061 (lines 179-327). The coins branch previously checked
-- `v_balance < v_amount_coins`, ignoring savings locks — a teen could spend
-- locked coins on a ride. Only the spendable math is added; escrow + cashback
-- were already canonical (cashback ladder unified to _cashback_pct in the I5
-- section below — same CREATE OR REPLACE).
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.complete_ride(
  p_ride_id uuid,
  p_actual_dh numeric,
  p_caller_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller UUID;
  v_ride public.ride_bookings;
  v_driver public.nivy_drivers;
  v_balance INT;
  v_locked INT;
  v_spendable INT;
  v_amount_coins INT;
  v_new_balance INT;
  v_cashback_pct numeric;
  v_cashback_xp INT := 0;
  v_coin_tx_id uuid;
  v_is_admin BOOLEAN := FALSE;
BEGIN
  v_caller := COALESCE(p_caller_id, auth.uid());

  SELECT * INTO v_ride FROM public.ride_bookings WHERE id = p_ride_id FOR UPDATE;
  IF v_ride.id IS NULL THEN RAISE EXCEPTION 'ride_not_found'; END IF;

  IF v_ride.driver_id IS NOT NULL THEN
    SELECT * INTO v_driver FROM public.nivy_drivers WHERE id = v_ride.driver_id;
  END IF;

  IF v_caller IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.admin_roles WHERE profile_id = v_caller) THEN
      v_is_admin := TRUE;
    END IF;
    IF NOT v_is_admin AND (v_driver.user_id IS NULL OR v_driver.user_id <> v_caller) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  IF v_ride.status NOT IN ('dispatched','in_progress') THEN
    RAISE EXCEPTION 'invalid_status:%', v_ride.status;
  END IF;
  IF p_actual_dh IS NULL OR p_actual_dh < 0 THEN
    RAISE EXCEPTION 'invalid_actual_dh';
  END IF;

  IF v_ride.payment_method = 'coins' THEN
    -- §27 LOCKED: 1 DH = 100 coins (no placeholder, no rounding ambiguity)
    v_amount_coins := ROUND(p_actual_dh * 100)::INT;

    SELECT balance INTO v_balance FROM public.user_coins WHERE teen_id = v_ride.teen_id FOR UPDATE;
    IF v_balance IS NULL THEN
      INSERT INTO public.user_coins (teen_id, balance, lifetime_earned, lifetime_spent)
        VALUES (v_ride.teen_id, 0, 0, 0);
      v_balance := 0;
    END IF;

    -- I7 (mig 199): spendable = balance minus active savings locks (mirrors
    -- spend_teen_coins / parent_approve_session). A ride must NOT drain coins
    -- the teen has locked toward a savings goal.
    SELECT COALESCE(SUM(current_saved_coins), 0)::int INTO v_locked
      FROM savings_goals WHERE teen_id = v_ride.teen_id AND status = 'active';
    v_spendable := v_balance - v_locked;

    IF v_spendable < v_amount_coins THEN
      RAISE EXCEPTION 'insufficient_balance';
    END IF;

    -- I5 (mig 199): unified cashback via the canonical resolver (mig 175).
    -- _cashback_pct returns integer; assignment into numeric is implicit-safe.
    -- Integer truncation of the pct is acceptable: production rules use integer
    -- percentages, and the helper returns integer by design (175:50).
    v_cashback_pct := public._cashback_pct(NULL);

    v_cashback_xp := FLOOR(v_amount_coins * v_cashback_pct / 100)::INT;

    v_new_balance := v_balance - v_amount_coins;
    UPDATE public.user_coins
      SET balance = v_new_balance,
          lifetime_spent = COALESCE(lifetime_spent, 0) + v_amount_coins,
          updated_at = NOW()
      WHERE teen_id = v_ride.teen_id;

    INSERT INTO public.coin_transactions (
      teen_id, amount, transaction_type, source_type, source_id,
      description, balance_after
    ) VALUES (
      v_ride.teen_id, -v_amount_coins, 'spend', 'ride', p_ride_id,
      format('Trajet %s → %s (cashback %s%% = %s XP)',
        v_ride.pickup_address, v_ride.dropoff_address, v_cashback_pct, v_cashback_xp),
      v_new_balance
    ) RETURNING id INTO v_coin_tx_id;

    -- Paired escrow_ledger row (§29 #4)
    INSERT INTO public.escrow_ledger (
      parent_id, teen_id, direction, amount_dh, amount_coins,
      related_spend_id, reason, created_by
    ) VALUES (
      v_ride.parent_id, v_ride.teen_id, 'spend',
      p_actual_dh, v_amount_coins,
      v_coin_tx_id,
      format('Ride %s', p_ride_id),
      v_ride.teen_id
    );

    -- Cashback XP (§29 #3)
    IF v_cashback_xp > 0 THEN
      PERFORM public.add_xp_to_user(
        v_ride.teen_id, v_cashback_xp,
        'cashback'::varchar, 'ride'::varchar,
        v_coin_tx_id,
        format('Cashback %s%% sur trajet %s coins', v_cashback_pct, v_amount_coins)
      );
    END IF;
  END IF;

  UPDATE public.ride_bookings
    SET status = 'completed',
        completed_at = NOW(),
        actual_dh = p_actual_dh
    WHERE id = p_ride_id;

  BEGIN
    INSERT INTO public.user_notifications (user_id, title, body, priority, data, action_url) VALUES
      (v_ride.parent_id, 'Trajet terminé',
       format('Trajet terminé — %s DH (%s coins, +%s XP cashback)', p_actual_dh::TEXT, COALESCE(v_amount_coins,0), v_cashback_xp),
       'normal',
       jsonb_build_object('ride_id', p_ride_id, 'type', 'ride_completed'),
       '/parent/rides/' || p_ride_id::TEXT),
      (v_ride.teen_id, 'Trajet terminé',
       format('Bon retour ! +%s XP de cashback.', v_cashback_xp),
       'normal',
       jsonb_build_object('ride_id', p_ride_id, 'type', 'ride_completed'),
       '/teen/rides');
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN jsonb_build_object(
    'success', TRUE,
    'ride_id', p_ride_id,
    'status', 'completed',
    'actual_dh', p_actual_dh,
    'coins_debited', COALESCE(v_amount_coins, 0),
    'cashback_xp', v_cashback_xp,
    'cashback_pct', v_cashback_pct
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.complete_ride(uuid, numeric, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_ride(uuid, numeric, uuid) TO service_role;


-- ===========================================================================
-- I5 — spend_teen_coins: unify cashback via _cashback_pct
-- ---------------------------------------------------------------------------
-- Recreated from mig 124 (lines 52-214). The inline cashback ladder (SELECT
-- FROM cashback_rules ORDER BY partner_id NULLS LAST + default + fallback 10)
-- is replaced by a single call to public._cashback_pct(p_partner_id), which is
-- iso-semantic (mig 175:46-68). Everything else (idempotency fast path, FOR
-- UPDATE, spendable check, escrow, partner_transactions, RETURNING) is
-- preserved unchanged.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.spend_teen_coins(
  p_teen_id uuid,
  p_amount_coins integer,
  p_partner_id uuid DEFAULT NULL::uuid,
  p_reward_id uuid DEFAULT NULL::uuid,
  p_idempotency_key uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_balance integer;
  v_locked integer;
  v_spendable integer;
  v_new_balance integer;
  v_cashback_pct numeric;
  v_cashback_xp integer;
  v_parent_id uuid;
  v_xp_result jsonb;
  v_coin_tx_id uuid;
  v_existing_id uuid;
  v_existing_balance integer;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_teen_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  IF p_amount_coins IS NULL OR p_amount_coins <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  -- Idempotency fast path: a prior committed spend with the same key replays
  -- its stored result instead of debiting again.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id, balance_after INTO v_existing_id, v_existing_balance
      FROM coin_transactions
     WHERE client_idempotency_key = p_idempotency_key
     LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'status', 'succeeded',
        'new_balance', v_existing_balance, 'spend_id', v_existing_id,
        'idempotent_replay', true);
    END IF;
  END IF;

  SELECT balance INTO v_balance FROM user_coins WHERE teen_id = p_teen_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_wallet');
  END IF;

  SELECT COALESCE(SUM(current_saved_coins), 0)::int INTO v_locked
    FROM savings_goals
   WHERE teen_id = p_teen_id AND status = 'active';

  v_spendable := v_balance - v_locked;
  IF v_spendable < p_amount_coins THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance',
      'balance', v_balance, 'locked', v_locked, 'spendable', v_spendable);
  END IF;

  -- I5 (mig 199): canonical cashback resolver (mig 175). Replaces the inline
  -- ladder (cashback_rules → default_cashback_pct → 10). _cashback_pct returns
  -- integer; assignment into numeric is implicit-safe. Integer truncation of
  -- the pct is acceptable: production rules use integer percentages, and the
  -- helper returns integer by design (175:50).
  v_cashback_pct := public._cashback_pct(p_partner_id);

  v_cashback_xp := FLOOR(p_amount_coins * v_cashback_pct / 100)::integer;

  UPDATE user_coins
  SET balance = balance - p_amount_coins,
      lifetime_spent = COALESCE(lifetime_spent, 0) + p_amount_coins,
      updated_at = NOW()
  WHERE teen_id = p_teen_id
  RETURNING balance INTO v_new_balance;

  -- Capture coin_transactions.id so we can wire escrow_ledger.related_spend_id
  INSERT INTO coin_transactions (
    teen_id, amount, transaction_type, source_type, source_id,
    description, balance_after, client_idempotency_key
  ) VALUES (
    p_teen_id, -p_amount_coins, 'spend',
    CASE WHEN p_partner_id IS NOT NULL THEN 'partner' ELSE 'reward' END,
    COALESCE(p_partner_id, p_reward_id),
    format('Dépense de %s coins (cashback %s%% = %s XP)', p_amount_coins, v_cashback_pct, v_cashback_xp),
    v_new_balance, p_idempotency_key
  ) RETURNING id INTO v_coin_tx_id;

  SELECT parent_id INTO v_parent_id
  FROM parent_teen_links
  WHERE teen_id = p_teen_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_parent_id IS NOT NULL THEN
    INSERT INTO escrow_ledger (
      parent_id, teen_id, direction, amount_dh, amount_coins,
      related_spend_id, reason, created_by
    ) VALUES (
      v_parent_id, p_teen_id, 'spend',
      p_amount_coins / 100.0, p_amount_coins,
      v_coin_tx_id,
      format('Spend (partner=%s reward=%s)', COALESCE(p_partner_id::text, '-'), COALESCE(p_reward_id::text, '-')),
      p_teen_id
    );
  END IF;

  IF v_cashback_xp > 0 THEN
    v_xp_result := add_xp_to_user(
      p_teen_id, v_cashback_xp,
      'cashback'::varchar, 'spend'::varchar,
      v_coin_tx_id,
      format('Cashback %s%% sur dépense de %s coins', v_cashback_pct, p_amount_coins)
    );
  END IF;

  IF p_partner_id IS NOT NULL THEN
    INSERT INTO partner_transactions (
      partner_id, teen_id, reward_id, amount_dh, amount_coins,
      cashback_xp, status
    ) VALUES (
      p_partner_id, p_teen_id, p_reward_id,
      p_amount_coins / 100.0, p_amount_coins,
      v_cashback_xp, 'succeeded'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'status', 'succeeded',
    'new_balance', v_new_balance,
    'spendable', v_new_balance - v_locked,
    'xp_earned', v_cashback_xp,
    'cashback_pct', v_cashback_pct,
    'spend_id', v_coin_tx_id
  );
EXCEPTION
  WHEN unique_violation THEN
    -- A concurrent request with the same idempotency key already committed.
    -- The function's writes rolled back to its savepoint; replay the prior row.
    SELECT id, balance_after INTO v_existing_id, v_existing_balance
      FROM coin_transactions
     WHERE client_idempotency_key = p_idempotency_key
     LIMIT 1;
    RETURN jsonb_build_object('success', true, 'status', 'succeeded',
      'new_balance', v_existing_balance, 'spend_id', v_existing_id,
      'idempotent_replay', true);
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.spend_teen_coins(uuid, integer, uuid, uuid, uuid)
  TO authenticated, service_role;


-- ===========================================================================
-- I4 — REVOKE add_coins_to_user from PUBLIC/anon/authenticated
-- ---------------------------------------------------------------------------
-- add_coins_to_user (mig 060:84) is SECURITY DEFINER and credits
-- user_coins.balance + coin_transactions from (p_teen_id, p_amount) ARGS.
-- Anyone with EXECUTE could impersonate any teen and mint coins. Its sole
-- legitimate runtime caller (app/api/webhooks/stripe/dispatcher.ts:129) goes
-- through the service-role client, which bypasses function EXECUTE grants, so
-- revoking from PUBLIC/anon/authenticated closes the hole without breaking
-- the Stripe path. Signature confirmed against mig 060:84-91.
--
-- We use the proname-loop DO block (pattern from mig 112) so the revoke lands
-- on EVERY live signature regardless of any future arg-type drift, and is a
-- no-op if the function has been renamed/dropped.
-- ===========================================================================
DO $do$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND p.proname = 'add_coins_to_user'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    -- service_role bypasses EXECUTE checks, but grant explicitly for clarity
    -- and so the intent is visible in \df+ introspection.
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $do$;

COMMIT;
