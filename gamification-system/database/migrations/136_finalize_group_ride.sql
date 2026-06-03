-- 136_finalize_group_ride.sql
-- ---------------------------------------------------------------------------
-- #235 (V6, P1) — Course groupée : 1er consommateur E2E du socle collectif.
--
-- L'organisateur a créé une group_action(action_type='ride') et invité des amis
-- (#227). À la finalisation : on débloque l'avantage de taille (#234), on
-- répartit le coût remisé entre les participants acceptés et on débite chacun
-- atomiquement (#228), puis on crée les ressources réelles (ride_groups +
-- ride_bookings) et on ouvre la fenêtre d'opposition parentale (#230).
--
-- Atomique : si le split échoue (un solde insuffisant), tout est annulé
-- (ride_groups + ride_bookings inclus, même transaction → RAISE).
--
-- Conversion : wallet en coins, 100 coins = 1 DH (cf. escrow amount_dh=coins/100).
-- Répartition : part égale plancher pour chacun, le reste à l'organisateur.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.finalize_group_ride(
  p_group_action_id uuid,
  p_pickup text,
  p_dropoff text,
  p_scheduled_for timestamptz,
  p_total_dh numeric,
  p_event_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller    uuid := auth.uid();
  v_ga        group_actions%ROWTYPE;
  v_size      integer;
  v_unlock    jsonb;
  v_discount  numeric := 0;
  v_total     integer;          -- coins
  v_base      integer;
  v_remainder integer;
  v_ride_group uuid;
  v_parts     jsonb := '[]'::jsonb;
  v_share     integer;
  v_teen      uuid;
  v_parent    uuid;
  v_idx       integer := 0;
  v_split     jsonb;
  v_member    RECORD;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_ga FROM group_actions WHERE id = p_group_action_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'group_action_not_found');
  END IF;
  IF v_ga.organizer_id <> v_caller THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_organizer');
  END IF;
  IF v_ga.action_type <> 'ride' THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_a_ride_action');
  END IF;
  IF v_ga.status <> 'forming' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'status', v_ga.status);
  END IF;

  SELECT count(*) INTO v_size FROM group_action_invites
   WHERE group_action_id = p_group_action_id AND status = 'accepted';
  IF v_size = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_accepted_participants');
  END IF;

  -- Avantage de taille → discount sur le total.
  v_unlock := public.unlock_group_size_rewards(p_group_action_id, NULL);
  v_discount := COALESCE((v_unlock->>'discount_pct')::numeric, 0);

  v_total := GREATEST(round(p_total_dh * 100 * (1 - v_discount/100))::integer, 0);

  -- Crée le conteneur carpool.
  INSERT INTO ride_groups (leader_id, event_id, scheduled_for, pickup_address, dropoff_address,
                           max_seats, seats_taken, status)
  VALUES (v_caller, p_event_id, p_scheduled_for, p_pickup, p_dropoff, v_size, v_size, 'dispatched')
  RETURNING id INTO v_ride_group;

  -- Répartition (part plancher égale, reste à l'organisateur) + ressources ride.
  v_base := CASE WHEN v_total > 0 THEN v_total / v_size ELSE 0 END;
  v_remainder := v_total - (v_base * v_size);

  FOR v_member IN
    SELECT teen_id, is_organizer FROM group_action_invites
     WHERE group_action_id = p_group_action_id AND status = 'accepted'
     ORDER BY is_organizer DESC
  LOOP
    v_teen := v_member.teen_id;
    v_share := v_base + CASE WHEN v_member.is_organizer THEN v_remainder ELSE 0 END;

    SELECT parent_id INTO v_parent FROM parent_teen_links
      WHERE teen_id = v_teen ORDER BY created_at ASC LIMIT 1;
    IF v_parent IS NULL THEN
      RAISE EXCEPTION 'participant_without_parent:%', v_teen;
    END IF;

    INSERT INTO ride_group_members (group_id, teen_id) VALUES (v_ride_group, v_teen)
      ON CONFLICT DO NOTHING;

    -- Chaque part est réellement payée en coins (le « split » vit au niveau
    -- group_action via split_ledger). status='approved' = opt-out (le parent
    -- peut encore s'opposer → refund + annulation).
    INSERT INTO ride_bookings (teen_id, parent_id, event_id, group_id, group_leader_id, group_size,
                               pickup_address, dropoff_address, scheduled_for,
                               estimated_dh, payment_method, status, provider)
    VALUES (v_teen, v_parent, p_event_id, v_ride_group, v_caller, LEAST(v_size, 6),
            p_pickup, p_dropoff, p_scheduled_for,
            v_share / 100.0, 'coins', 'approved', 'nivy_partner');

    IF v_share > 0 THEN
      v_parts := v_parts || jsonb_build_object('teen_id', v_teen, 'share_coins', v_share);
    END IF;
    v_idx := v_idx + 1;
  END LOOP;

  -- Débit atomique des parts (saute si course gratuite).
  IF v_total > 0 THEN
    v_split := public.split_group_purchase(p_group_action_id, v_parts, NULL, NULL);
    IF (v_split->>'success')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'split_failed:%', COALESCE(v_split->>'error','unknown');
    END IF;
  END IF;

  UPDATE group_actions
     SET status = 'completed', resource_id = v_ride_group, total_coins = v_total, updated_at = now()
   WHERE id = p_group_action_id;

  -- Fenêtre d'opposition parentale (opt-out).
  PERFORM public.request_group_opposition(p_group_action_id, 'group_booking');

  RETURN jsonb_build_object(
    'success', true,
    'ride_group_id', v_ride_group,
    'participant_count', v_idx,
    'total_coins', v_total,
    'discount_pct', v_discount
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.finalize_group_ride(uuid, text, text, timestamptz, numeric, uuid)
  TO authenticated, service_role;
COMMENT ON FUNCTION public.finalize_group_ride(uuid, text, text, timestamptz, numeric, uuid) IS
  '#235: finalise une course groupée (unlock taille → split atomique → ride_groups/ride_bookings → opposition).';
