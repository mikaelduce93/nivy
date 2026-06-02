-- 140_venue_group_booking.sql
-- ---------------------------------------------------------------------------
-- #238 (V6, P2) — Réservation de lieu partenaire (venue) + réservation groupée.
--
--   venue_slots      : créneaux réservables d'un partenaire type='venue'.
--   venue_bookings   : 1 ligne par participant d'une résa de créneau.
--   reserve_group_venue_slot(group_action, slot) : discount taille (#234) →
--     split atomique (#228) → venue_bookings + décrément capacité + opposition (#230).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.venue_slots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  uuid NOT NULL,
  title       text,
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz,
  capacity    integer NOT NULL DEFAULT 1 CHECK (capacity >= 1),
  booked      integer NOT NULL DEFAULT 0,
  price_coins integer NOT NULL DEFAULT 0 CHECK (price_coins >= 0),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_venue_slots_partner ON public.venue_slots(partner_id, is_active, starts_at);

CREATE TABLE IF NOT EXISTS public.venue_bookings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id         uuid NOT NULL REFERENCES public.venue_slots(id) ON DELETE CASCADE,
  partner_id      uuid NOT NULL,
  group_action_id uuid REFERENCES public.group_actions(id) ON DELETE SET NULL,
  organizer_id    uuid NOT NULL,
  teen_id         uuid NOT NULL,
  share_coins     integer NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  parent_approval_id uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slot_id, teen_id, group_action_id)
);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_slot ON public.venue_bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_teen ON public.venue_bookings(teen_id);

ALTER TABLE public.venue_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS venue_slots_read ON public.venue_slots;
CREATE POLICY venue_slots_read ON public.venue_slots FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS venue_bookings_read ON public.venue_bookings;
CREATE POLICY venue_bookings_read ON public.venue_bookings FOR SELECT
  USING (
    teen_id = (SELECT auth.uid()) OR organizer_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.parent_teen_links l
               WHERE l.parent_id = (SELECT auth.uid()) AND l.teen_id = venue_bookings.teen_id)
  );

CREATE OR REPLACE FUNCTION public.reserve_group_venue_slot(
  p_group_action_id uuid,
  p_slot_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller uuid := auth.uid(); v_ga group_actions%ROWTYPE; v_slot venue_slots%ROWTYPE;
  v_size integer; v_unlock jsonb; v_discount numeric := 0; v_share integer;
  v_parts jsonb := '[]'::jsonb; v_member RECORD; v_split jsonb;
BEGIN
  IF v_caller IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  SELECT * INTO v_ga FROM group_actions WHERE id = p_group_action_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'group_action_not_found'); END IF;
  IF v_ga.organizer_id <> v_caller THEN RETURN jsonb_build_object('success', false, 'error', 'not_organizer'); END IF;
  IF v_ga.action_type <> 'venue_booking' THEN RETURN jsonb_build_object('success', false, 'error', 'not_a_venue_action'); END IF;
  IF v_ga.status <> 'forming' THEN RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'status', v_ga.status); END IF;

  SELECT * INTO v_slot FROM venue_slots WHERE id = p_slot_id FOR UPDATE;
  IF NOT FOUND OR v_slot.is_active IS NOT TRUE THEN RETURN jsonb_build_object('success', false, 'error', 'slot_unavailable'); END IF;

  SELECT count(*) INTO v_size FROM group_action_invites WHERE group_action_id = p_group_action_id AND status = 'accepted';
  IF v_size = 0 THEN RETURN jsonb_build_object('success', false, 'error', 'no_accepted_participants'); END IF;
  IF v_slot.booked + v_size > v_slot.capacity THEN RETURN jsonb_build_object('success', false, 'error', 'slot_full', 'remaining', v_slot.capacity - v_slot.booked); END IF;

  v_unlock := public.unlock_group_size_rewards(p_group_action_id, v_slot.partner_id);
  v_discount := COALESCE((v_unlock->>'discount_pct')::numeric, 0);
  v_share := GREATEST(round(v_slot.price_coins * (1 - v_discount/100))::integer, 0);

  FOR v_member IN SELECT teen_id FROM group_action_invites WHERE group_action_id = p_group_action_id AND status = 'accepted'
  LOOP
    IF v_share > 0 THEN v_parts := v_parts || jsonb_build_object('teen_id', v_member.teen_id, 'share_coins', v_share); END IF;
  END LOOP;

  IF v_share > 0 THEN
    v_split := public.split_group_purchase(p_group_action_id, v_parts, v_slot.partner_id, NULL);
    IF (v_split->>'success')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'split_failed:%', COALESCE(v_split->>'error','unknown'); END IF;
  END IF;

  FOR v_member IN SELECT teen_id FROM group_action_invites WHERE group_action_id = p_group_action_id AND status = 'accepted'
  LOOP
    INSERT INTO venue_bookings (slot_id, partner_id, group_action_id, organizer_id, teen_id, share_coins, status)
    VALUES (p_slot_id, v_slot.partner_id, p_group_action_id, v_caller, v_member.teen_id, v_share, 'confirmed')
    ON CONFLICT (slot_id, teen_id, group_action_id) DO NOTHING;
  END LOOP;

  UPDATE venue_slots SET booked = booked + v_size WHERE id = p_slot_id;
  UPDATE group_actions SET status = 'completed', resource_id = p_slot_id, total_coins = v_share * v_size, updated_at = now()
   WHERE id = p_group_action_id;
  PERFORM public.request_group_opposition(p_group_action_id, 'group_booking');

  RETURN jsonb_build_object('success', true, 'slot_id', p_slot_id, 'participant_count', v_size,
    'share_coins', v_share, 'discount_pct', v_discount);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM); END;
$function$;

GRANT EXECUTE ON FUNCTION public.reserve_group_venue_slot(uuid, uuid) TO authenticated, service_role;
COMMENT ON TABLE public.venue_slots IS '#238: créneaux réservables d''un partenaire venue.';
COMMENT ON FUNCTION public.reserve_group_venue_slot(uuid, uuid) IS
  '#238: réserve un créneau venue en groupe (discount taille → split → venue_bookings → capacité → opposition).';
