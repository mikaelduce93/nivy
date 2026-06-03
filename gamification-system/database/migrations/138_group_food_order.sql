-- 138_group_food_order.sql
-- ---------------------------------------------------------------------------
-- #236 (V6, P1) — Commande resto groupée. Le chemin SOLO (place_food_order)
-- reste intact ; on ajoute un orchestrateur de groupe distinct.
--
--   food_orders.group_action_id : trace vers l'action de groupe.
--   finalize_group_food_order(group_action, partner, delivery_type, items, address)
--     : total depuis les items → discount taille (#234) → split atomique (#228)
--       → food_orders + food_order_items + opposition parentale (#230).
--
-- items = [{"menu_item_id":uuid,"qty":int,"unit_price_coins":int,"unit_price_dh":num}]
-- ---------------------------------------------------------------------------

ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS group_action_id uuid;
CREATE INDEX IF NOT EXISTS idx_food_orders_group_action ON public.food_orders(group_action_id);

CREATE OR REPLACE FUNCTION public.finalize_group_food_order(
  p_group_action_id uuid,
  p_partner_id uuid,
  p_delivery_type text,
  p_items jsonb,
  p_address text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller   uuid := auth.uid();
  v_ga       group_actions%ROWTYPE;
  v_size     integer;
  v_unlock   jsonb;
  v_discount numeric := 0;
  v_gross    integer := 0;
  v_total    integer;
  v_base     integer;
  v_remainder integer;
  v_parent   uuid;
  v_order    uuid;
  v_item     jsonb;
  v_parts    jsonb := '[]'::jsonb;
  v_share    integer;
  v_member   RECORD;
  v_split    jsonb;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF p_delivery_type NOT IN ('delivery','pickup','dine_in') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_delivery_type');
  END IF;

  SELECT * INTO v_ga FROM group_actions WHERE id = p_group_action_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'group_action_not_found'); END IF;
  IF v_ga.organizer_id <> v_caller THEN RETURN jsonb_build_object('success', false, 'error', 'not_organizer'); END IF;
  IF v_ga.action_type <> 'food' THEN RETURN jsonb_build_object('success', false, 'error', 'not_a_food_action'); END IF;
  IF v_ga.status <> 'forming' THEN RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'status', v_ga.status); END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_items');
  END IF;

  -- Total brut (coins) depuis les items.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_gross := v_gross + (COALESCE((v_item->>'qty')::integer,1) * COALESCE((v_item->>'unit_price_coins')::integer,0));
  END LOOP;
  IF v_gross <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'zero_total');
  END IF;

  SELECT count(*) INTO v_size FROM group_action_invites
   WHERE group_action_id = p_group_action_id AND status = 'accepted';

  v_unlock := public.unlock_group_size_rewards(p_group_action_id, p_partner_id);
  v_discount := COALESCE((v_unlock->>'discount_pct')::numeric, 0);
  v_total := GREATEST(round(v_gross * (1 - v_discount/100))::integer, 0);

  SELECT parent_id INTO v_parent FROM parent_teen_links
    WHERE teen_id = v_caller ORDER BY created_at ASC LIMIT 1;

  INSERT INTO food_orders (teen_id, parent_id, partner_id, delivery_type, delivery_address,
                           total_dh, total_coins, payment_method, status, group_action_id)
  VALUES (v_caller, v_parent, p_partner_id, p_delivery_type, p_address,
          v_total / 100.0, v_total, 'split', 'pending', p_group_action_id)
  RETURNING id INTO v_order;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO food_order_items (order_id, menu_item_id, qty, unit_price_dh, unit_price_coins, customizations)
    VALUES (v_order, (v_item->>'menu_item_id')::uuid, COALESCE((v_item->>'qty')::integer,1),
            COALESCE((v_item->>'unit_price_dh')::numeric, (COALESCE((v_item->>'unit_price_coins')::integer,0))/100.0),
            COALESCE((v_item->>'unit_price_coins')::integer,0), v_item->'customizations');
  END LOOP;

  -- Répartition (part plancher égale, reste à l'organisateur).
  v_base := CASE WHEN v_total > 0 THEN v_total / v_size ELSE 0 END;
  v_remainder := v_total - (v_base * v_size);
  FOR v_member IN
    SELECT teen_id, is_organizer FROM group_action_invites
     WHERE group_action_id = p_group_action_id AND status = 'accepted'
     ORDER BY is_organizer DESC
  LOOP
    v_share := v_base + CASE WHEN v_member.is_organizer THEN v_remainder ELSE 0 END;
    IF v_share > 0 THEN
      v_parts := v_parts || jsonb_build_object('teen_id', v_member.teen_id, 'share_coins', v_share);
    END IF;
  END LOOP;

  IF v_total > 0 THEN
    v_split := public.split_group_purchase(p_group_action_id, v_parts, p_partner_id, NULL);
    IF (v_split->>'success')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'split_failed:%', COALESCE(v_split->>'error','unknown');
    END IF;
  END IF;

  UPDATE group_actions SET status = 'completed', resource_id = v_order, total_coins = v_total, updated_at = now()
   WHERE id = p_group_action_id;
  PERFORM public.request_group_opposition(p_group_action_id, 'group_food_split');

  RETURN jsonb_build_object('success', true, 'food_order_id', v_order,
    'participant_count', v_size, 'total_coins', v_total, 'discount_pct', v_discount);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.finalize_group_food_order(uuid, uuid, text, jsonb, text) TO authenticated, service_role;
COMMENT ON FUNCTION public.finalize_group_food_order(uuid, uuid, text, jsonb, text) IS
  '#236: commande resto groupée (total items → discount taille → split atomique → food_orders/items → opposition).';
