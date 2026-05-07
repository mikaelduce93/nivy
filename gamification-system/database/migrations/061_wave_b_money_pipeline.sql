-- Migration 061 — Wave B money pipeline hardening
-- Date: 2026-05-07
-- Source: docs/vision/audit-prelaunch/PRE_LAUNCH_AUDIT.md (Wave B)
--
-- B.1 Rewrite complete_ride: 100 coins/DH + paired escrow_ledger + 10% cashback
-- B.2 Add resolve_dispute RPC for marketplace
-- B.3 Fix partner_accept_food_order double-insert into partner_transactions
-- B.4 Cashback rate config-driven (cashback_rules) in confirm_receipt
--     + partner_reject_food_order reverses cashback XP on refund
-- B.5 spend_teen_coins populates escrow_ledger.related_spend_id
-- B.8 17 missing FK indexes

BEGIN;

-- =========================================================================
-- B.0 — Schema additions required by new RPCs
-- =========================================================================

-- Add admin_notes column for resolve_dispute audit trail
ALTER TABLE public.marketplace_disputes
  ADD COLUMN IF NOT EXISTS admin_notes text;

-- Extend marketplace_transactions.status CHECK to include split resolution
ALTER TABLE public.marketplace_transactions
  DROP CONSTRAINT IF EXISTS marketplace_transactions_status_check;
ALTER TABLE public.marketplace_transactions
  ADD CONSTRAINT marketplace_transactions_status_check
  CHECK (status = ANY (ARRAY[
    'escrow'::text, 'completed'::text, 'disputed'::text,
    'refunded'::text, 'cancelled'::text, 'split_resolved'::text
  ]));

-- =========================================================================
-- B.5 — spend_teen_coins links escrow_ledger to coin_transactions
-- =========================================================================

CREATE OR REPLACE FUNCTION public.spend_teen_coins(
  p_teen_id uuid,
  p_amount_coins integer,
  p_partner_id uuid DEFAULT NULL::uuid,
  p_reward_id uuid DEFAULT NULL::uuid
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
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_teen_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  IF p_amount_coins IS NULL OR p_amount_coins <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
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

  SELECT cashback_pct INTO v_cashback_pct
  FROM cashback_rules
  WHERE is_active = true
    AND (partner_id IS NULL OR partner_id = p_partner_id)
    AND (active_from IS NULL OR active_from <= NOW())
    AND (active_until IS NULL OR active_until > NOW())
  ORDER BY partner_id NULLS LAST
  LIMIT 1;

  IF v_cashback_pct IS NULL THEN
    SELECT (setting_value)::text::numeric INTO v_cashback_pct
    FROM xp_payment_settings
    WHERE setting_key = 'default_cashback_pct'
    LIMIT 1;
  END IF;
  v_cashback_pct := COALESCE(v_cashback_pct, 10);

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
    description, balance_after
  ) VALUES (
    p_teen_id, -p_amount_coins, 'spend',
    CASE WHEN p_partner_id IS NOT NULL THEN 'partner' ELSE 'reward' END,
    COALESCE(p_partner_id, p_reward_id),
    format('Dépense de %s coins (cashback %s%% = %s XP)', p_amount_coins, v_cashback_pct, v_cashback_xp),
    v_new_balance
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
      v_coin_tx_id,                                          -- B.5: link
      format('Spend (partner=%s reward=%s)', COALESCE(p_partner_id::text, '-'), COALESCE(p_reward_id::text, '-')),
      p_teen_id
    );
  END IF;

  IF v_cashback_xp > 0 THEN
    v_xp_result := add_xp_to_user(
      p_teen_id, v_cashback_xp,
      'cashback'::varchar, 'spend'::varchar,
      v_coin_tx_id,                                          -- link cashback to spend
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
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- =========================================================================
-- B.1 — Rewrite complete_ride
-- =========================================================================
-- Honors §29 invariants: 100 coins/DH (locked), paired escrow_ledger row with
-- related_spend_id, configurable cashback via cashback_rules, atomic FOR UPDATE.

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

    IF v_balance < v_amount_coins THEN
      RAISE EXCEPTION 'insufficient_balance';
    END IF;

    -- Cashback rate from config (whitepaper §5)
    SELECT cashback_pct INTO v_cashback_pct
    FROM cashback_rules
    WHERE is_active = true
      AND partner_id IS NULL
      AND (active_from IS NULL OR active_from <= NOW())
      AND (active_until IS NULL OR active_until > NOW())
    ORDER BY created_at DESC LIMIT 1;

    IF v_cashback_pct IS NULL THEN
      SELECT (setting_value)::text::numeric INTO v_cashback_pct
      FROM xp_payment_settings WHERE setting_key = 'default_cashback_pct' LIMIT 1;
    END IF;
    v_cashback_pct := COALESCE(v_cashback_pct, 10);
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

-- =========================================================================
-- B.3 — Remove duplicate partner_transactions insert in partner_accept_food_order
-- =========================================================================
-- spend_teen_coins (called from place_food_order autonomous path) ALREADY
-- inserts a partner_transactions row when p_partner_id is non-null. This
-- function previously double-inserted, overcounting commission.

CREATE OR REPLACE FUNCTION public.partner_accept_food_order(
  p_order_id uuid,
  p_partner_user_id uuid
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
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_partner_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  SELECT * INTO v_order FROM food_orders WHERE id = p_order_id FOR UPDATE;
  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM partner_staff
    WHERE user_id = p_partner_user_id
      AND partner_id = v_order.partner_id
      AND is_active = true
  ) INTO v_is_staff;
  IF NOT v_is_staff THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_partner_staff');
  END IF;

  IF v_order.status NOT IN ('pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'status', v_order.status);
  END IF;

  IF v_order.parent_approval_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'awaiting_parent_approval');
  END IF;

  UPDATE food_orders
  SET status = 'accepted',
      accepted_at = NOW()
  WHERE id = p_order_id;

  -- B.3 fix: do NOT insert partner_transactions here. The row was already
  -- written by spend_teen_coins inside place_food_order's autonomous path.
  -- Stamp scanner_user_id + scanned_at on the existing succeeded row instead.
  UPDATE partner_transactions
  SET scanner_user_id = p_partner_user_id,
      scanned_at = NOW()
  WHERE partner_id = v_order.partner_id
    AND teen_id = v_order.teen_id
    AND status = 'succeeded'
    AND scanner_user_id IS NULL
    AND created_at >= v_order.created_at - INTERVAL '5 seconds'
    AND created_at <= NOW();

  RETURN jsonb_build_object('success', true, 'status', 'accepted', 'order_id', p_order_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- =========================================================================
-- B.4a — confirm_receipt reads cashback_pct from config
-- =========================================================================

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

  IF v_buyer_is_teen AND v_cashback_xp > 0 THEN
    INSERT INTO public.user_xp (teen_id, total_xp, current_level, updated_at)
    VALUES (v_tx.buyer_user_id, v_cashback_xp, 1, now())
    ON CONFLICT (teen_id) DO UPDATE
      SET total_xp = COALESCE(public.user_xp.total_xp, 0) + EXCLUDED.total_xp, updated_at = now();

    INSERT INTO public.xp_transactions (teen_id, amount, source_type, source_id, description, type, reference_type, reference_id)
    VALUES (v_tx.buyer_user_id, v_cashback_xp, 'marketplace_cashback', p_transaction_id,
      format('Marketplace cashback (%s%%)', v_cashback_pct), 'earn', 'marketplace_transaction', p_transaction_id);
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
-- B.2 — resolve_dispute RPC (admin-only)
-- =========================================================================
-- Resolves an open marketplace dispute. resolution = 'release_to_seller'
-- (treat as confirm_receipt) | 'refund_buyer' (return coins to buyer, listing
-- back to active) | 'split' (50/50). Closes the dispute row and the tx.

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
  v_cashback_to_reverse INTEGER;
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
-- B.4b — partner_reject_food_order reverses cashback XP on refund
-- =========================================================================
-- The original spend gave cashback via spend_teen_coins. On rejection we now
-- reverse it so net XP for the teen returns to pre-spend state.

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

    -- B.4b: reverse cashback XP given on the original spend.
    v_cashback_to_reverse := COALESCE(v_order.cashback_xp, 0);
    IF v_cashback_to_reverse > 0 THEN
      UPDATE user_xp
      SET total_xp = GREATEST(COALESCE(total_xp, 0) - v_cashback_to_reverse, 0),
          updated_at = NOW()
      WHERE teen_id = v_order.teen_id;

      INSERT INTO xp_transactions (
        teen_id, amount, source_type, source_id, description
      ) VALUES (
        v_order.teen_id, -v_cashback_to_reverse, 'cashback_reversal',
        v_order.id,
        format('Cashback reversed on food order refund (order=%s)', v_order.id)
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

-- =========================================================================
-- B.8 — 17 missing FK indexes
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_escrow_ledger_created_by ON public.escrow_ledger (created_by);
CREATE INDEX IF NOT EXISTS idx_escrow_ledger_related_payment_id ON public.escrow_ledger (related_payment_id);
CREATE INDEX IF NOT EXISTS idx_escrow_ledger_related_spend_id ON public.escrow_ledger (related_spend_id);
CREATE INDEX IF NOT EXISTS idx_food_order_items_menu_item_id ON public.food_order_items (menu_item_id);
CREATE INDEX IF NOT EXISTS idx_food_orders_parent_approval_id ON public.food_orders (parent_approval_id);
CREATE INDEX IF NOT EXISTS idx_food_orders_parent_id ON public.food_orders (parent_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_disputes_opened_by ON public.marketplace_disputes (opened_by);
CREATE INDEX IF NOT EXISTS idx_marketplace_disputes_resolved_by ON public.marketplace_disputes (resolved_by);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_moderation_id ON public.marketplace_listings (moderation_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_listing_id ON public.marketplace_transactions (listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_meet_location ON public.marketplace_transactions (meet_location_partner_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_parent_approval ON public.marketplace_transactions (parent_approval_id);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_parent_approval_id ON public.mentor_sessions (parent_approval_id);
CREATE INDEX IF NOT EXISTS idx_partner_transactions_scanner_user_id ON public.partner_transactions (scanner_user_id);
CREATE INDEX IF NOT EXISTS idx_ride_bookings_driver_id ON public.ride_bookings (driver_id);
CREATE INDEX IF NOT EXISTS idx_ride_bookings_event_id ON public.ride_bookings (event_id);
CREATE INDEX IF NOT EXISTS idx_ride_bookings_parent_approval_id ON public.ride_bookings (parent_approval_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_template_id ON public.user_notifications (template_id);

COMMIT;
