-- Wave 3.2 — Food delivery RPCs (companion to 058_food_delivery.sql).
-- Spec: docs/vision/food-delivery-restaurants.md.

CREATE OR REPLACE FUNCTION public.place_food_order(
  p_teen_id UUID,
  p_partner_id UUID,
  p_delivery_type TEXT,
  p_items JSONB,
  p_address TEXT DEFAULT NULL,
  p_scheduled_for TIMESTAMPTZ DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'coins'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_total_dh NUMERIC(10,2) := 0;
  v_total_coins INTEGER := 0;
  v_total_calories INTEGER := 0;
  v_has_non_halal BOOLEAN := false;
  v_blocked_by_challenge BOOLEAN := false;
  v_challenge RECORD;
  v_item RECORD;
  v_input JSONB;
  v_order_id UUID;
  v_parent_id UUID;
  v_max_per_tx INTEGER;
  v_mode TEXT;
  v_approval_id UUID := NULL;
  v_requires_approval BOOLEAN := false;
  v_approval_reason TEXT := NULL;
  v_cashback_xp INTEGER := 0;
  v_spend_result JSONB;
  v_resolved_coins INTEGER;
  v_resolved_dh NUMERIC(10,2);
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_teen_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;
  IF p_delivery_type NOT IN ('delivery','pickup','dine_in') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_delivery_type');
  END IF;
  IF p_payment_method NOT IN ('coins','dh','split') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_payment_method');
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_items');
  END IF;

  SELECT parent_id INTO v_parent_id
  FROM parent_teen_links WHERE teen_id = p_teen_id ORDER BY created_at ASC LIMIT 1;
  IF v_parent_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_parent_linked');
  END IF;

  FOR v_input IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT mi.id, mi.partner_id, mi.price_dh, mi.price_coins, mi.calories, mi.is_halal, mi.is_active
      INTO v_item FROM menu_items mi WHERE mi.id = (v_input->>'menu_item_id')::uuid;
    IF v_item.id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'menu_item_not_found',
        'menu_item_id', v_input->>'menu_item_id');
    END IF;
    IF v_item.partner_id <> p_partner_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'menu_item_partner_mismatch');
    END IF;
    IF NOT v_item.is_active THEN
      RETURN jsonb_build_object('success', false, 'error', 'menu_item_inactive');
    END IF;
    v_resolved_coins := COALESCE(v_item.price_coins, (v_item.price_dh * 100)::int);
    v_resolved_dh := v_item.price_dh;
    v_total_dh := v_total_dh + v_resolved_dh * COALESCE((v_input->>'qty')::int, 1);
    v_total_coins := v_total_coins + v_resolved_coins * COALESCE((v_input->>'qty')::int, 1);
    v_total_calories := v_total_calories + COALESCE(v_item.calories, 0) * COALESCE((v_input->>'qty')::int, 1);
    IF NOT COALESCE(v_item.is_halal, true) THEN
      v_has_non_halal := true;
    END IF;
  END LOOP;

  IF v_has_non_halal THEN
    v_requires_approval := true;
    v_approval_reason := 'non_halal_item';
  END IF;

  SELECT * INTO v_challenge FROM nutrition_challenges
  WHERE teen_id = p_teen_id AND is_active = true
    AND valid_from <= CURRENT_DATE
    AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
  ORDER BY created_at DESC LIMIT 1;

  IF v_challenge.id IS NOT NULL THEN
    IF (v_challenge.nutrition_targets->>'halal_only')::boolean = true AND v_has_non_halal THEN
      v_blocked_by_challenge := true;
      v_approval_reason := COALESCE(v_approval_reason, 'challenge_halal_only');
    END IF;
    IF v_challenge.nutrition_targets ? 'max_calories_per_meal'
       AND v_total_calories > (v_challenge.nutrition_targets->>'max_calories_per_meal')::int THEN
      v_blocked_by_challenge := true;
      v_approval_reason := COALESCE(v_approval_reason, 'challenge_max_calories');
    END IF;
    IF v_challenge.budget_coins IS NOT NULL AND v_total_coins > v_challenge.budget_coins THEN
      v_blocked_by_challenge := true;
      v_approval_reason := COALESCE(v_approval_reason, 'challenge_budget_exceeded');
    END IF;
    IF v_blocked_by_challenge THEN v_requires_approval := true; END IF;
  END IF;

  SELECT mode, max_per_transaction_coins INTO v_mode, v_max_per_tx
    FROM teen_budget_limits WHERE teen_id = p_teen_id LIMIT 1;
  v_mode := COALESCE(v_mode, 'validation');
  IF v_mode = 'validation' OR (v_max_per_tx IS NOT NULL AND v_total_coins > v_max_per_tx) THEN
    v_requires_approval := true;
    v_approval_reason := COALESCE(v_approval_reason, 'exceeds_ceiling');
  END IF;

  IF v_requires_approval THEN
    INSERT INTO parental_approvals (
      parent_id, teen_id, action_type, resource_type, amount, details, status
    ) VALUES (
      v_parent_id, p_teen_id, 'food_order', 'food_order', v_total_coins,
      jsonb_build_object(
        'partner_id', p_partner_id, 'total_coins', v_total_coins,
        'total_dh', v_total_dh, 'total_calories', v_total_calories,
        'has_non_halal', v_has_non_halal, 'reason', v_approval_reason,
        'items', p_items, 'delivery_type', p_delivery_type,
        'challenge_id', v_challenge.id
      ), 'pending'
    ) RETURNING id INTO v_approval_id;

    INSERT INTO food_orders (
      teen_id, parent_id, partner_id, delivery_type, delivery_address, scheduled_for,
      total_dh, total_coins, payment_method, status, parent_approval_id, challenge_id, notes
    ) VALUES (
      p_teen_id, v_parent_id, p_partner_id, p_delivery_type, p_address, p_scheduled_for,
      v_total_dh, v_total_coins, p_payment_method, 'pending', v_approval_id, v_challenge.id,
      v_approval_reason
    ) RETURNING id INTO v_order_id;

    FOR v_input IN SELECT * FROM jsonb_array_elements(p_items) LOOP
      SELECT mi.id, mi.price_dh, mi.price_coins INTO v_item
      FROM menu_items mi WHERE mi.id = (v_input->>'menu_item_id')::uuid;
      INSERT INTO food_order_items (order_id, menu_item_id, qty, unit_price_dh, unit_price_coins, customizations)
      VALUES (v_order_id, v_item.id,
        COALESCE((v_input->>'qty')::int, 1), v_item.price_dh,
        COALESCE(v_item.price_coins, (v_item.price_dh * 100)::int),
        COALESCE(v_input->'customizations', '{}'::jsonb))
      ON CONFLICT (order_id, menu_item_id) DO UPDATE SET qty = food_order_items.qty + EXCLUDED.qty;
    END LOOP;

    RETURN jsonb_build_object(
      'success', true, 'status', 'pending_approval',
      'order_id', v_order_id, 'parent_approval_id', v_approval_id,
      'total_coins', v_total_coins, 'total_dh', v_total_dh, 'reason', v_approval_reason
    );
  END IF;

  v_cashback_xp := FLOOR(v_total_coins * 0.10)::int;

  IF p_payment_method IN ('coins','split') AND v_total_coins > 0 THEN
    v_spend_result := spend_teen_coins(p_teen_id, v_total_coins, p_partner_id, NULL);
    IF v_spend_result IS NULL OR (v_spend_result->>'success')::boolean IS DISTINCT FROM true THEN
      RETURN jsonb_build_object('success', false, 'error', 'debit_failed', 'details', v_spend_result);
    END IF;
  END IF;

  INSERT INTO food_orders (
    teen_id, parent_id, partner_id, delivery_type, delivery_address, scheduled_for,
    total_dh, total_coins, cashback_xp, payment_method, status, challenge_id
  ) VALUES (
    p_teen_id, v_parent_id, p_partner_id, p_delivery_type, p_address, p_scheduled_for,
    v_total_dh, v_total_coins, v_cashback_xp, p_payment_method, 'pending', v_challenge.id
  ) RETURNING id INTO v_order_id;

  FOR v_input IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT mi.id, mi.price_dh, mi.price_coins INTO v_item
    FROM menu_items mi WHERE mi.id = (v_input->>'menu_item_id')::uuid;
    INSERT INTO food_order_items (order_id, menu_item_id, qty, unit_price_dh, unit_price_coins, customizations)
    VALUES (v_order_id, v_item.id,
      COALESCE((v_input->>'qty')::int, 1), v_item.price_dh,
      COALESCE(v_item.price_coins, (v_item.price_dh * 100)::int),
      COALESCE(v_input->'customizations', '{}'::jsonb))
    ON CONFLICT (order_id, menu_item_id) DO UPDATE SET qty = food_order_items.qty + EXCLUDED.qty;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true, 'status', 'pending',
    'order_id', v_order_id, 'total_coins', v_total_coins,
    'total_dh', v_total_dh, 'cashback_xp', v_cashback_xp
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_food_order(UUID, UUID, TEXT, JSONB, TEXT, TIMESTAMPTZ, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.partner_accept_food_order(
  p_order_id UUID,
  p_partner_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_order RECORD;
  v_is_staff BOOLEAN;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_partner_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;
  SELECT * INTO v_order FROM food_orders WHERE id = p_order_id;
  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM partner_staff
    WHERE user_id = p_partner_user_id AND partner_id = v_order.partner_id AND is_active = true
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

  UPDATE food_orders SET status = 'accepted', accepted_at = NOW() WHERE id = p_order_id;

  INSERT INTO partner_transactions (
    partner_id, teen_id, amount_dh, amount_coins, cashback_xp,
    commission_dh, status, scanner_user_id, scanned_at
  ) VALUES (
    v_order.partner_id, v_order.teen_id, v_order.total_dh, v_order.total_coins,
    COALESCE(v_order.cashback_xp, 0), v_order.total_dh * 0.10,
    'succeeded', p_partner_user_id, NOW()
  );

  RETURN jsonb_build_object('success', true, 'status', 'accepted', 'order_id', p_order_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION public.partner_accept_food_order(UUID, UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.partner_reject_food_order(
  p_order_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_order RECORD;
  v_is_staff BOOLEAN;
  v_new_balance INTEGER;
BEGIN
  SELECT * INTO v_order FROM food_orders WHERE id = p_order_id;
  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;
  IF v_caller IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM partner_staff
      WHERE user_id = v_caller AND partner_id = v_order.partner_id AND is_active = true
    ) INTO v_is_staff;
    IF NOT v_is_staff THEN
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
  END IF;

  UPDATE food_orders SET status = 'rejected',
    notes = COALESCE(p_reason, notes) WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'status', 'rejected', 'order_id', p_order_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION public.partner_reject_food_order(UUID, TEXT) TO authenticated, service_role;
