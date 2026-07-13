-- =========================================================================
-- Migration 200 — Wallet deepening, canon parity, XP reversal (vague 3)
-- =========================================================================
-- Implements 4 coupled audit fixes from docs/audits/audit-2026-07-13:
--   I6   — Drop the user_progression.coins mirror column (single source of
--          truth = user_coins.balance). Rewrite add_coins_to_user + init_user_gamification
--          so no live function references the column, then DROP COLUMN.
--   I8.a — confirm_receipt: replace the raw user_xp/xp_transactions cashback write
--          with the canonical add_xp_to_user RPC (level math + progression sync).
--   I8.b — Create revoke_xp_cashback RPC: the inverse of add_xp_to_user, used to
--          reverse cashback XP on dispute refunds / order rejections (P0 canon gap).
--   I8.c — resolve_dispute: wire revoke_xp_cashback in refund_buyer + split branches.
--   I8.d — partner_reject_food_order: replace the inline level-drifting total_xp
--          decrement with revoke_xp_cashback (recomputes current_level).
--   I9   — Document coin_transactions.transaction_type direction semantics.
--
-- Section map:
--   A — I6+I9  Rewrite add_coins_to_user (drop user_progression.coins write)
--   B — I6+I9  Rewrite init_user_gamification (drop coins column + provenance row)
--   C — I8.b   Create revoke_xp_cashback RPC
--   D — I8.a   Patch confirm_receipt (canon add_xp_to_user for cashback)
--   E — I6     DROP COLUMN user_progression.coins (AFTER all function rewrites)
--   F — I9     COMMENT ON COLUMN coin_transactions.transaction_type
--   G — I8.c   Wire revoke_xp_cashback in resolve_dispute
--   H — I8.d   Refactor partner_reject_food_order reversal block
--
-- RULES: CREATE OR REPLACE only (never DROP), preserve grants (mig 199 already
-- REVOKE'd add_coins_to_user from PUBLIC/anon/authenticated; CREATE OR REPLACE
-- keeps that). DROP COLUMN is ordered last so no live function references it.
-- =========================================================================

BEGIN;

-- =========================================================================
-- Section A — I6+I9: Rewrite add_coins_to_user (drop user_progression.coins mirror)
-- =========================================================================
-- Source: mig 060:84-143. Identical EXCEPT the `UPDATE public.user_progression
-- SET coins = v_new_balance ...` block (060:132-134) is removed — user_coins
-- is now the single source of truth. Grants preserved by CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.add_coins_to_user(
  p_teen_id uuid,
  p_amount integer,
  p_transaction_type character varying,
  p_source_type character varying,
  p_source_id uuid DEFAULT NULL::uuid,
  p_description text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  INSERT INTO public.user_coins (teen_id, balance)
  VALUES (p_teen_id, 0)
  ON CONFLICT (teen_id) DO NOTHING;

  SELECT balance INTO v_current_balance
  FROM public.user_coins
  WHERE teen_id = p_teen_id
  FOR UPDATE;

  v_new_balance := v_current_balance + p_amount;

  IF v_new_balance < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Solde insuffisant',
      'current_balance', v_current_balance,
      'required', ABS(p_amount)
    );
  END IF;

  UPDATE public.user_coins
  SET
    balance = v_new_balance,
    lifetime_earned = CASE WHEN p_amount > 0 THEN lifetime_earned + p_amount ELSE lifetime_earned END,
    lifetime_spent = CASE WHEN p_amount < 0 THEN lifetime_spent + ABS(p_amount) ELSE lifetime_spent END,
    updated_at = NOW()
  WHERE teen_id = p_teen_id;

  INSERT INTO public.coin_transactions (teen_id, amount, transaction_type, source_type, source_id, description, balance_after)
  VALUES (p_teen_id, p_amount, p_transaction_type, p_source_type, p_source_id, p_description, v_new_balance);

  RETURN jsonb_build_object(
    'success', true,
    'amount', p_amount,
    'previous_balance', v_current_balance,
    'new_balance', v_new_balance
  );
END;
$function$;

-- =========================================================================
-- Section B — I6+I9: Rewrite init_user_gamification (drop coins column + add provenance)
-- =========================================================================
-- Source: mig 000:581-604. Changes:
--   1. user_progression INSERT: coins column + value 100 removed.
--   2. After the user_coins INSERT, a coin_transactions row records the
--      onboarding_bonus provenance (100 coins). Plain INSERT — function is
--      called once per teen via trigger; coin_transactions has no dedupe key.

CREATE OR REPLACE FUNCTION init_user_gamification(p_teen_id UUID)
RETURNS void AS $$
BEGIN
  -- Initialiser XP
  INSERT INTO public.user_xp (teen_id, total_xp, current_level)
  VALUES (p_teen_id, 0, 1)
  ON CONFLICT (teen_id) DO NOTHING;

  -- Initialiser Coins
  INSERT INTO public.user_coins (teen_id, balance)
  VALUES (p_teen_id, 100) -- Bonus de départ
  ON CONFLICT (teen_id) DO NOTHING;

  -- I9 provenance: onboarding bonus transaction (100 coins)
  INSERT INTO public.coin_transactions (teen_id, amount, transaction_type, source_type, source_id, description, balance_after)
  VALUES (p_teen_id, 100, 'onboarding_bonus', 'system', NULL, 'Bonus de bienvenue (100 coins)', 100);

  -- Initialiser Streak
  INSERT INTO public.user_streaks (teen_id, current_streak)
  VALUES (p_teen_id, 0)
  ON CONFLICT (teen_id) DO NOTHING;

  -- Initialiser Progression (coins column dropped — I6)
  INSERT INTO public.user_progression (user_id, total_xp, current_level)
  VALUES (p_teen_id, 0, 1)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- Section C — I8.b: Create revoke_xp_cashback (NEW RPC, P0 canon gap)
-- =========================================================================
-- The inverse of add_xp_to_user (060:145-225). Decreases total_xp, recomputes
-- current_level via the inverse level loop, writes a negative xp_transactions
-- row, and keeps user_progression in sync (total_xp + current_level only).
--
-- Level-down threshold (mirror of the level-UP threshold in 060:185):
--   A teen belongs at level N iff total_xp >= (N * (N+1) / 2) * 100.
--   Equivalently, they no longer qualify for level N iff
--   total_xp < (N * (N-1) / 2) * 100  (the threshold for level N-1).
--   So we step down while v_new_xp < (v_new_level * (v_new_level - 1) / 2) * 100.

CREATE OR REPLACE FUNCTION public.revoke_xp_cashback(
  p_teen_id uuid,
  p_amount_xp integer,
  p_source_id uuid,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_current_xp INTEGER;
  v_current_level INTEGER;
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_xp_for_level INTEGER;
  v_previous_level INTEGER;
  v_levels_lost INTEGER := 0;
BEGIN
  -- Idempotent: no-op if amount <= 0
  IF p_amount_xp IS NULL OR p_amount_xp <= 0 THEN
    RETURN jsonb_build_object('success', true, 'xp_revoked', 0, 'reason', 'no_xp_to_revoke');
  END IF;

  -- Lock + read current state
  SELECT total_xp, current_level
    INTO v_current_xp, v_current_level
    FROM public.user_xp
    WHERE teen_id = p_teen_id
    FOR UPDATE;

  -- If no user_xp row exists, nothing to revoke
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'xp_revoked', 0, 'reason', 'no_user_xp_row');
  END IF;

  v_previous_level := v_current_level;
  v_new_xp := GREATEST(v_current_xp - p_amount_xp, 0);

  -- Level-DOWN loop (inverse of add_xp_to_user 060:182-197)
  -- Threshold: a teen belongs at level N if total_xp >= (N * (N+1) / 2) * 100
  -- So we step down while total_xp < (current_level * (current_level - 1) / 2) * 100
  -- (i.e. no longer meets the threshold for the current level)
  v_new_level := v_current_level;
  WHILE v_new_level > 1 AND v_new_xp < (v_new_level * (v_new_level - 1) / 2) * 100 LOOP
    v_new_level := v_new_level - 1;
  END LOOP;
  v_levels_lost := v_previous_level - v_new_level;

  UPDATE public.user_xp
    SET
      total_xp = v_new_xp,
      current_level = v_new_level,
      xp_to_next_level = ((v_new_level * (v_new_level + 1) / 2) * 100) - v_new_xp,
      updated_at = NOW()
    WHERE teen_id = p_teen_id;

  -- Insert negative XP transaction (audit trail)
  INSERT INTO public.xp_transactions (teen_id, amount, source_type, source_id, description)
  VALUES (p_teen_id, -p_amount_xp, 'cashback_reversal', p_source_id, p_reason);

  -- Keep user_progression in sync (only total_xp + current_level, NOT coins — dropped in Section E)
  UPDATE public.user_progression
    SET total_xp = v_new_xp, current_level = v_new_level, updated_at = NOW()
    WHERE user_id = p_teen_id;

  RETURN jsonb_build_object(
    'success', true,
    'xp_revoked', p_amount_xp,
    'new_total_xp', v_new_xp,
    'previous_level', v_previous_level,
    'new_level', v_new_level,
    'levels_lost', v_levels_lost
  );
END;
$function$;

-- Grants: same pattern as add_xp_to_user (060:230-232)
REVOKE EXECUTE ON FUNCTION public.revoke_xp_cashback(uuid, integer, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_xp_cashback(uuid, integer, uuid, text) TO service_role, authenticated;

-- =========================================================================
-- Section D — I8.a: Patch confirm_receipt (canon add_xp_to_user for cashback)
-- =========================================================================
-- Source: mig 061:408-510. Change: the cashback block (061:489-498) — which did
-- a raw user_xp UPSERT + xp_transactions INSERT, bypassing the level-up loop
-- and user_progression sync — is replaced with a single call to the canonical
-- add_xp_to_user RPC (same pattern as spend_teen_coins in mig 124:172-179).
-- v_xp_result jsonb added to DECLARE for the return value.

CREATE OR REPLACE FUNCTION public.confirm_receipt(
  p_transaction_id uuid,
  p_buyer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller UUID := auth.uid();
  v_tx public.marketplace_transactions%ROWTYPE;
  v_fee INTEGER;
  v_seller_credit INTEGER;
  v_cashback_pct numeric;
  v_cashback_xp INTEGER;
  v_seller_is_teen BOOLEAN;
  v_buyer_is_teen BOOLEAN;
  v_new_seller_balance INTEGER;
  v_fee_pct numeric;
  v_xp_result jsonb;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_buyer_id AND NOT public.mp_is_admin(v_caller) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  SELECT * INTO v_tx FROM public.marketplace_transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'transaction_not_found'); END IF;
  IF v_tx.buyer_user_id <> p_buyer_id AND NOT public.mp_is_admin(v_caller) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_buyer');
  END IF;
  IF v_tx.status <> 'escrow' THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_in_escrow', 'status', v_tx.status);
  END IF;

  -- Fee pct from xp_payment_settings (default 8% per whitepaper)
  SELECT (setting_value)::text::numeric INTO v_fee_pct
  FROM xp_payment_settings WHERE setting_key = 'marketplace_fee_pct' LIMIT 1;
  v_fee_pct := COALESCE(v_fee_pct, 8);

  -- Cashback pct from cashback_rules (no partner-specific in C2C path)
  SELECT cashback_pct INTO v_cashback_pct
  FROM cashback_rules
  WHERE is_active = true AND partner_id IS NULL
    AND (active_from IS NULL OR active_from <= NOW())
    AND (active_until IS NULL OR active_until > NOW())
  ORDER BY created_at DESC LIMIT 1;
  IF v_cashback_pct IS NULL THEN
    SELECT (setting_value)::text::numeric INTO v_cashback_pct
    FROM xp_payment_settings WHERE setting_key = 'default_cashback_pct' LIMIT 1;
  END IF;
  v_cashback_pct := COALESCE(v_cashback_pct, 10);

  v_fee := floor(v_tx.amount_coins * v_fee_pct / 100)::INTEGER;
  v_seller_credit := v_tx.amount_coins - v_fee;
  v_cashback_xp := floor(v_tx.amount_coins * v_cashback_pct / 100)::INTEGER;

  SELECT EXISTS (SELECT 1 FROM public.teens WHERE id = v_tx.seller_user_id) INTO v_seller_is_teen;
  SELECT EXISTS (SELECT 1 FROM public.teens WHERE id = v_tx.buyer_user_id) INTO v_buyer_is_teen;

  IF v_seller_is_teen THEN
    INSERT INTO public.user_coins (teen_id, balance, lifetime_earned, updated_at)
    VALUES (v_tx.seller_user_id, v_seller_credit, v_seller_credit, now())
    ON CONFLICT (teen_id) DO UPDATE
      SET balance = COALESCE(public.user_coins.balance, 0) + EXCLUDED.balance,
          lifetime_earned = COALESCE(public.user_coins.lifetime_earned, 0) + EXCLUDED.lifetime_earned,
          updated_at = now()
    RETURNING balance INTO v_new_seller_balance;

    INSERT INTO public.coin_transactions (teen_id, amount, transaction_type, source_type, source_id, description, balance_after)
    VALUES (v_tx.seller_user_id, v_seller_credit, 'earn', 'marketplace_sale', p_transaction_id,
      format('Marketplace sale (net of %s%% fee)', v_fee_pct), v_new_seller_balance);

    UPDATE public.user_seller_stats
    SET sold_count = sold_count + 1, total_revenue_coins = total_revenue_coins + v_seller_credit, updated_at = now()
    WHERE user_id = v_tx.seller_user_id;
    IF NOT FOUND THEN
      INSERT INTO public.user_seller_stats (user_id, sold_count, total_revenue_coins, updated_at)
      VALUES (v_tx.seller_user_id, 1, v_seller_credit, now());
    END IF;
  END IF;

  -- I8.a: canonical cashback via add_xp_to_user (level math + progression sync)
  IF v_buyer_is_teen AND v_cashback_xp > 0 THEN
    v_xp_result := add_xp_to_user(
      v_tx.buyer_user_id, v_cashback_xp,
      'cashback'::varchar, 'marketplace'::varchar,
      p_transaction_id,
      format('Marketplace cashback (%s%%)', v_cashback_pct)
    );
  END IF;

  UPDATE public.marketplace_transactions
  SET status = 'completed', cashback_xp = v_cashback_xp, platform_fee_coins = v_fee
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object('success', true, 'status', 'completed',
    'seller_credit_coins', v_seller_credit,
    'platform_fee_coins', v_fee, 'fee_pct', v_fee_pct,
    'cashback_xp', v_cashback_xp, 'cashback_pct', v_cashback_pct);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- =========================================================================
-- Section E — I6: DROP COLUMN user_progression.coins
-- =========================================================================
-- MUST come after Sections A, B, C, D so no live function references the column.
-- init_user_gamification (B) and add_coins_to_user (A) no longer write it;
-- revoke_xp_cashback (C) and confirm_receipt (D) never did.

ALTER TABLE public.user_progression DROP COLUMN IF EXISTS coins;

-- =========================================================================
-- Section F — I9: COMMENT ON COLUMN coin_transactions.transaction_type
-- =========================================================================

COMMENT ON COLUMN public.coin_transactions.transaction_type IS 'direction: spend (outflow); inflows use specific labels e.g. onboarding_bonus, topup, marketplace_dispute refund';

-- =========================================================================
-- Section G — I8.c: Wire revoke_xp_cashback in resolve_dispute
-- =========================================================================
-- Source: mig 061:520-648. Changes:
--   1. Dead var v_cashback_to_reverse (061:539) removed.
--   2. refund_buyer branch (061:568-593): after escrow_ledger INSERT, revoke
--      the cashback XP the buyer earned on confirm_receipt (full reversal —
--      the buyer is getting their coins back, so the cashback is void).
--   3. split branch (061:598-628): after the UPDATE ... cashback_xp = 0,
--      same revoke block (buyer didn't receive the good).

CREATE OR REPLACE FUNCTION public.resolve_dispute(
  p_dispute_id uuid,
  p_resolution text,
  p_admin_notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_dispute public.marketplace_disputes%ROWTYPE;
  v_tx public.marketplace_transactions%ROWTYPE;
  v_buyer_is_teen BOOLEAN;
  v_seller_is_teen BOOLEAN;
  v_new_balance INTEGER;
  v_split_to_seller INTEGER;
  v_split_to_buyer INTEGER;
BEGIN
  IF v_caller IS NULL OR NOT public.mp_is_admin(v_caller) THEN
    RETURN jsonb_build_object('success', false, 'error', 'admin_required');
  END IF;
  IF p_resolution NOT IN ('release_to_seller','refund_buyer','split') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_resolution');
  END IF;

  SELECT * INTO v_dispute FROM public.marketplace_disputes WHERE id = p_dispute_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'dispute_not_found'); END IF;
  IF v_dispute.status NOT IN ('open','investigating') THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_resolved', 'status', v_dispute.status);
  END IF;

  SELECT * INTO v_tx FROM public.marketplace_transactions WHERE id = v_dispute.transaction_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'tx_not_found'); END IF;
  IF v_tx.status <> 'disputed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'tx_not_disputed', 'status', v_tx.status);
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.teens WHERE id = v_tx.buyer_user_id) INTO v_buyer_is_teen;
  SELECT EXISTS (SELECT 1 FROM public.teens WHERE id = v_tx.seller_user_id) INTO v_seller_is_teen;

  IF p_resolution = 'release_to_seller' THEN
    -- Reset tx to escrow temporarily so confirm_receipt accepts it
    UPDATE public.marketplace_transactions SET status = 'escrow' WHERE id = v_tx.id;
    PERFORM public.confirm_receipt(v_tx.id, v_tx.buyer_user_id);

  ELSIF p_resolution = 'refund_buyer' THEN
    -- Refund full amount to buyer, relist
    IF v_buyer_is_teen THEN
      UPDATE public.user_coins
      SET balance = COALESCE(balance, 0) + v_tx.amount_coins,
          lifetime_spent = GREATEST(COALESCE(lifetime_spent, 0) - v_tx.amount_coins, 0),
          updated_at = NOW()
      WHERE teen_id = v_tx.buyer_user_id
      RETURNING balance INTO v_new_balance;

      INSERT INTO public.coin_transactions (
        teen_id, amount, transaction_type, source_type, source_id, description, balance_after
      ) VALUES (
        v_tx.buyer_user_id, v_tx.amount_coins, 'refund', 'marketplace_dispute', v_tx.id,
        format('Dispute refund (resolution=refund_buyer, dispute=%s)', p_dispute_id),
        v_new_balance
      );

      INSERT INTO public.escrow_ledger (
        parent_id, teen_id, direction, amount_dh, amount_coins, reason, created_by
      ) SELECT pl.parent_id, v_tx.buyer_user_id, 'refund',
        v_tx.amount_dh, v_tx.amount_coins,
        format('Marketplace dispute refund (dispute=%s)', p_dispute_id),
        v_caller
      FROM public.parent_teen_links pl WHERE pl.teen_id = v_tx.buyer_user_id LIMIT 1;

      -- I8.c: reverse the cashback XP awarded on confirm_receipt
      IF v_tx.cashback_xp IS NOT NULL AND v_tx.cashback_xp > 0 AND v_buyer_is_teen THEN
        PERFORM public.revoke_xp_cashback(
          v_tx.buyer_user_id, v_tx.cashback_xp, v_tx.id,
          format('Marketplace dispute refund (dispute=%s)', p_dispute_id)
        );
      END IF;
    END IF;

    UPDATE public.marketplace_listings SET status = 'active', sold_at = NULL WHERE id = v_tx.listing_id;
    UPDATE public.marketplace_transactions SET status = 'refunded' WHERE id = v_tx.id;

  ELSE -- split
    v_split_to_seller := v_tx.amount_coins / 2;
    v_split_to_buyer := v_tx.amount_coins - v_split_to_seller;

    IF v_buyer_is_teen AND v_split_to_buyer > 0 THEN
      UPDATE public.user_coins
      SET balance = COALESCE(balance, 0) + v_split_to_buyer,
          lifetime_spent = GREATEST(COALESCE(lifetime_spent, 0) - v_split_to_buyer, 0),
          updated_at = NOW()
      WHERE teen_id = v_tx.buyer_user_id
      RETURNING balance INTO v_new_balance;

      INSERT INTO public.coin_transactions (teen_id, amount, transaction_type, source_type, source_id, description, balance_after)
      VALUES (v_tx.buyer_user_id, v_split_to_buyer, 'refund', 'marketplace_dispute', v_tx.id,
        format('Dispute refund 50%% (dispute=%s)', p_dispute_id), v_new_balance);
    END IF;

    IF v_seller_is_teen AND v_split_to_seller > 0 THEN
      INSERT INTO public.user_coins (teen_id, balance, lifetime_earned, updated_at)
      VALUES (v_tx.seller_user_id, v_split_to_seller, v_split_to_seller, now())
      ON CONFLICT (teen_id) DO UPDATE
        SET balance = COALESCE(public.user_coins.balance, 0) + EXCLUDED.balance,
            lifetime_earned = COALESCE(public.user_coins.lifetime_earned, 0) + EXCLUDED.lifetime_earned,
            updated_at = now();
    END IF;

    UPDATE public.marketplace_transactions
    SET status = 'split_resolved',
        platform_fee_coins = 0,
        cashback_xp = 0
    WHERE id = v_tx.id;

    -- I8.c: split still means buyer didn't receive the good — full cashback reversal
    IF v_tx.cashback_xp IS NOT NULL AND v_tx.cashback_xp > 0 AND v_buyer_is_teen THEN
      PERFORM public.revoke_xp_cashback(
        v_tx.buyer_user_id, v_tx.cashback_xp, v_tx.id,
        format('Marketplace dispute refund (dispute=%s)', p_dispute_id)
      );
    END IF;
  END IF;

  UPDATE public.marketplace_disputes
  SET status = 'resolved',
      resolved_at = NOW(),
      resolved_by = v_caller,
      resolution = p_resolution,
      admin_notes = p_admin_notes
  WHERE id = p_dispute_id;

  RETURN jsonb_build_object(
    'success', true,
    'dispute_id', p_dispute_id,
    'transaction_id', v_tx.id,
    'resolution', p_resolution
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.resolve_dispute(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_dispute(uuid, text, text) TO service_role, authenticated;

-- =========================================================================
-- Section H — I8.d: Refactor partner_reject_food_order reversal block
-- =========================================================================
-- Source: mig 061:659-759. Change: the inline cashback reversal block (061:722-735)
-- — which decremented total_xp directly via UPDATE user_xp without recomputing
-- current_level (level-drift bug) and wrote the xp_transactions row by hand — is
-- replaced with a single call to revoke_xp_cashback. Variable names preserved:
--   v_order.teen_id      (teen)
--   v_order.cashback_xp  (cashback amount)
--   v_order.id           (source id — food order)
-- The return shape keeps 'cashback_reversed' for backward compatibility.

CREATE OR REPLACE FUNCTION public.partner_reject_food_order(
  p_order_id uuid,
  p_reason text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller UUID := auth.uid();
  v_order RECORD;
  v_is_staff BOOLEAN;
  v_new_balance INTEGER;
  v_cashback_to_reverse INTEGER;
BEGIN
  SELECT * INTO v_order FROM food_orders WHERE id = p_order_id FOR UPDATE;
  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  IF v_caller IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM partner_staff
      WHERE user_id = v_caller AND partner_id = v_order.partner_id AND is_active = true
    ) INTO v_is_staff;
    IF NOT v_is_staff AND NOT EXISTS (SELECT 1 FROM admin_roles WHERE profile_id = v_caller) THEN
      RETURN jsonb_build_object('success', false, 'error', 'not_partner_staff');
    END IF;
  END IF;

  IF v_order.status NOT IN ('pending','accepted','preparing','ready') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'status', v_order.status);
  END IF;

  IF v_order.payment_method IN ('coins','split') AND v_order.total_coins > 0
     AND v_order.parent_approval_id IS NULL THEN
    UPDATE user_coins
    SET balance = balance + v_order.total_coins,
        lifetime_spent = GREATEST(COALESCE(lifetime_spent,0) - v_order.total_coins, 0),
        updated_at = NOW()
    WHERE teen_id = v_order.teen_id
    RETURNING balance INTO v_new_balance;

    INSERT INTO coin_transactions (
      teen_id, amount, transaction_type, source_type, source_id, description, balance_after
    ) VALUES (
      v_order.teen_id, v_order.total_coins, 'refund', 'food_order_refund', v_order.id,
      format('Refund food order %s (reason=%s)', v_order.id, COALESCE(p_reason,'partner_rejected')),
      v_new_balance
    );

    INSERT INTO escrow_ledger (
      parent_id, teen_id, direction, amount_dh, amount_coins, reason, created_by
    ) VALUES (
      v_order.parent_id, v_order.teen_id, 'refund',
      v_order.total_dh, v_order.total_coins,
      format('Food order refund (reason=%s)', COALESCE(p_reason,'partner_rejected')),
      COALESCE(v_caller, v_order.teen_id)
    );

    -- B.4b / I8.d: reverse cashback XP via canonical RPC (recomputes level).
    v_cashback_to_reverse := COALESCE(v_order.cashback_xp, 0);
    IF v_cashback_to_reverse > 0 THEN
      PERFORM public.revoke_xp_cashback(
        v_order.teen_id, v_cashback_to_reverse, v_order.id,
        'Food order rejected — cashback reversal'
      );
    END IF;

    -- Roll back partner_transactions row written by spend_teen_coins
    UPDATE partner_transactions
    SET status = 'refunded'
    WHERE partner_id = v_order.partner_id
      AND teen_id = v_order.teen_id
      AND status = 'succeeded'
      AND amount_coins = v_order.total_coins
      AND scanner_user_id IS NULL
      AND created_at >= v_order.created_at - INTERVAL '5 seconds'
      AND created_at <= v_order.created_at + INTERVAL '5 seconds';
  END IF;

  UPDATE food_orders
  SET status = 'rejected',
      notes = COALESCE(p_reason, notes)
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'status', 'rejected', 'order_id', p_order_id,
    'cashback_reversed', COALESCE(v_cashback_to_reverse, 0));
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

COMMIT;
