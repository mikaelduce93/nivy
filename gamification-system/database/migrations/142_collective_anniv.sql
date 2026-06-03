-- 142_collective_anniv.sql
-- ---------------------------------------------------------------------------
-- #240 (V6, P2) — Anniversaire collectif : invités + split des contributions
-- + bonus par taille.
--   anniv_order_attendees (1 ligne/invité, contribution).
--   finalize_group_anniv(group_action, anniv_order, total_dh) : discount taille
--   (#234) → split atomique des contributions (#228) → attendees → opposition (#230).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.anniv_order_attendees (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anniv_order_id    uuid NOT NULL REFERENCES public.anniv_orders(id) ON DELETE CASCADE,
  group_action_id   uuid REFERENCES public.group_actions(id) ON DELETE SET NULL,
  teen_id           uuid NOT NULL,
  contribution_coins integer NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  parent_approval_id uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (anniv_order_id, teen_id)
);
CREATE INDEX IF NOT EXISTS idx_anniv_attendees_order ON public.anniv_order_attendees(anniv_order_id);
CREATE INDEX IF NOT EXISTS idx_anniv_attendees_teen ON public.anniv_order_attendees(teen_id);

ALTER TABLE public.anniv_order_attendees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anniv_attendees_read ON public.anniv_order_attendees;
CREATE POLICY anniv_attendees_read ON public.anniv_order_attendees FOR SELECT
  USING (teen_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.parent_teen_links l WHERE l.parent_id = (SELECT auth.uid()) AND l.teen_id = anniv_order_attendees.teen_id));

CREATE OR REPLACE FUNCTION public.finalize_group_anniv(
  p_group_action_id uuid, p_anniv_order_id uuid, p_total_dh numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller uuid := auth.uid(); v_ga group_actions%ROWTYPE; v_size integer;
  v_unlock jsonb; v_discount numeric := 0; v_total integer; v_base integer; v_remainder integer;
  v_parts jsonb := '[]'::jsonb; v_share integer; v_member RECORD; v_split jsonb;
BEGIN
  IF v_caller IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  SELECT * INTO v_ga FROM group_actions WHERE id = p_group_action_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'group_action_not_found'); END IF;
  IF v_ga.organizer_id <> v_caller THEN RETURN jsonb_build_object('success', false, 'error', 'not_organizer'); END IF;
  IF v_ga.action_type <> 'anniv' THEN RETURN jsonb_build_object('success', false, 'error', 'not_an_anniv_action'); END IF;
  IF v_ga.status <> 'forming' THEN RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'status', v_ga.status); END IF;
  IF NOT EXISTS (SELECT 1 FROM anniv_orders WHERE id = p_anniv_order_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'anniv_order_not_found');
  END IF;

  SELECT count(*) INTO v_size FROM group_action_invites WHERE group_action_id = p_group_action_id AND status = 'accepted';
  IF v_size = 0 THEN RETURN jsonb_build_object('success', false, 'error', 'no_accepted_participants'); END IF;

  v_unlock := public.unlock_group_size_rewards(p_group_action_id, NULL);
  v_discount := COALESCE((v_unlock->>'discount_pct')::numeric, 0);
  v_total := GREATEST(round(p_total_dh * 100 * (1 - v_discount/100))::integer, 0);
  v_base := CASE WHEN v_total > 0 THEN v_total / v_size ELSE 0 END;
  v_remainder := v_total - (v_base * v_size);

  FOR v_member IN
    SELECT teen_id, is_organizer FROM group_action_invites
     WHERE group_action_id = p_group_action_id AND status = 'accepted' ORDER BY is_organizer DESC
  LOOP
    v_share := v_base + CASE WHEN v_member.is_organizer THEN v_remainder ELSE 0 END;
    IF v_share > 0 THEN v_parts := v_parts || jsonb_build_object('teen_id', v_member.teen_id, 'share_coins', v_share); END IF;
  END LOOP;

  IF v_total > 0 THEN
    v_split := public.split_group_purchase(p_group_action_id, v_parts, NULL, NULL);
    IF (v_split->>'success')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'split_failed:%', COALESCE(v_split->>'error','unknown'); END IF;
  END IF;

  FOR v_member IN
    SELECT teen_id, is_organizer FROM group_action_invites
     WHERE group_action_id = p_group_action_id AND status = 'accepted' ORDER BY is_organizer DESC
  LOOP
    v_share := v_base + CASE WHEN v_member.is_organizer THEN v_remainder ELSE 0 END;
    INSERT INTO anniv_order_attendees (anniv_order_id, group_action_id, teen_id, contribution_coins, status)
    VALUES (p_anniv_order_id, p_group_action_id, v_member.teen_id, v_share, 'confirmed')
    ON CONFLICT (anniv_order_id, teen_id) DO UPDATE SET contribution_coins = EXCLUDED.contribution_coins, status = 'confirmed';
  END LOOP;

  UPDATE group_actions SET status = 'completed', resource_id = p_anniv_order_id, total_coins = v_total, updated_at = now()
   WHERE id = p_group_action_id;
  PERFORM public.request_group_opposition(p_group_action_id, 'group_food_split');

  RETURN jsonb_build_object('success', true, 'anniv_order_id', p_anniv_order_id,
    'participant_count', v_size, 'total_coins', v_total, 'discount_pct', v_discount);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM); END;
$function$;

GRANT EXECUTE ON FUNCTION public.finalize_group_anniv(uuid, uuid, numeric) TO authenticated, service_role;
COMMENT ON TABLE public.anniv_order_attendees IS '#240: invités d''un anniv collectif (contribution = part split).';
