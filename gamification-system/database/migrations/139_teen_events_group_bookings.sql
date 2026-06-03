-- 139_teen_events_group_bookings.sql
-- ---------------------------------------------------------------------------
-- #237 (V6, P1) — Évènements créés par l'ado + réservation groupée.
--
--   events.created_by : l'ado organisateur (NULL = event partenaire/admin).
--   group_bookings    : 1 ligne par participant d'une résa d'event groupée.
--   create_teen_event(...)            : l'ado crée un event (status pending_review).
--   finalize_group_event_booking(...) : prix/tête remisé → split atomique (#228)
--     → group_bookings + opposition parentale (#230).
-- ---------------------------------------------------------------------------

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_by uuid;
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);

CREATE TABLE IF NOT EXISTS public.group_bookings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  group_action_id  uuid REFERENCES public.group_actions(id) ON DELETE SET NULL,
  organizer_id     uuid NOT NULL,
  teen_id          uuid NOT NULL,
  share_coins      integer NOT NULL DEFAULT 0,
  status           text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  parent_approval_id uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, teen_id, group_action_id)
);
CREATE INDEX IF NOT EXISTS idx_group_bookings_event ON public.group_bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_group_bookings_teen ON public.group_bookings(teen_id);
CREATE INDEX IF NOT EXISTS idx_group_bookings_action ON public.group_bookings(group_action_id);

ALTER TABLE public.group_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS group_bookings_read ON public.group_bookings;
CREATE POLICY group_bookings_read ON public.group_bookings FOR SELECT
  USING (
    teen_id = (SELECT auth.uid())
    OR organizer_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.parent_teen_links l
               WHERE l.parent_id = (SELECT auth.uid()) AND l.teen_id = group_bookings.teen_id)
  );

-- L'ado crée un évènement (en attente de modération).
CREATE OR REPLACE FUNCTION public.create_teen_event(
  p_title text,
  p_description text DEFAULT NULL,
  p_starts_at timestamptz DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_capacity integer DEFAULT NULL,
  p_price_coins integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_event  uuid;
BEGIN
  IF v_caller IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  IF NOT EXISTS (SELECT 1 FROM teens WHERE id = v_caller) THEN
    RETURN jsonb_build_object('success', false, 'error', 'creator_not_teen');
  END IF;
  IF p_title IS NULL OR length(btrim(p_title)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'title_required');
  END IF;

  INSERT INTO events (title, description, created_by, status, event_date, starts_at,
                      city, address, capacity, price_coins, category)
  VALUES (p_title, p_description, v_caller, 'pending_review', p_starts_at, p_starts_at,
          p_city, p_address, p_capacity, GREATEST(COALESCE(p_price_coins,0),0), 'teen_created')
  RETURNING id INTO v_event;

  RETURN jsonb_build_object('success', true, 'event_id', v_event, 'status', 'pending_review');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- Réservation groupée d'un évènement (chacun paie sa place remisée).
CREATE OR REPLACE FUNCTION public.finalize_group_event_booking(
  p_group_action_id uuid,
  p_event_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller   uuid := auth.uid();
  v_ga       group_actions%ROWTYPE;
  v_event    events%ROWTYPE;
  v_size     integer;
  v_unlock   jsonb;
  v_discount numeric := 0;
  v_price    integer;
  v_share    integer;
  v_parts    jsonb := '[]'::jsonb;
  v_member   RECORD;
  v_split    jsonb;
  v_appr     uuid;
BEGIN
  IF v_caller IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;

  SELECT * INTO v_ga FROM group_actions WHERE id = p_group_action_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'group_action_not_found'); END IF;
  IF v_ga.organizer_id <> v_caller THEN RETURN jsonb_build_object('success', false, 'error', 'not_organizer'); END IF;
  IF v_ga.action_type <> 'event' THEN RETURN jsonb_build_object('success', false, 'error', 'not_an_event_action'); END IF;
  IF v_ga.status <> 'forming' THEN RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'status', v_ga.status); END IF;

  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'event_not_found'); END IF;

  SELECT count(*) INTO v_size FROM group_action_invites
   WHERE group_action_id = p_group_action_id AND status = 'accepted';
  IF v_size = 0 THEN RETURN jsonb_build_object('success', false, 'error', 'no_accepted_participants'); END IF;

  v_unlock := public.unlock_group_size_rewards(p_group_action_id, v_event.partner_id);
  v_discount := COALESCE((v_unlock->>'discount_pct')::numeric, 0);

  -- Prix/tête = price_coins de l'event (ou price_dh*100), remisé.
  v_price := COALESCE(v_event.price_coins, round(COALESCE(v_event.price_dh,0) * 100)::integer, 0);
  v_share := GREATEST(round(v_price * (1 - v_discount/100))::integer, 0);

  -- Capacité.
  IF v_event.capacity IS NOT NULL AND v_size > v_event.capacity THEN
    RETURN jsonb_build_object('success', false, 'error', 'over_capacity', 'capacity', v_event.capacity);
  END IF;

  FOR v_member IN
    SELECT teen_id FROM group_action_invites
     WHERE group_action_id = p_group_action_id AND status = 'accepted'
  LOOP
    IF v_share > 0 THEN
      v_parts := v_parts || jsonb_build_object('teen_id', v_member.teen_id, 'share_coins', v_share);
    END IF;
  END LOOP;

  IF v_share > 0 THEN
    v_split := public.split_group_purchase(p_group_action_id, v_parts, v_event.partner_id, NULL);
    IF (v_split->>'success')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'split_failed:%', COALESCE(v_split->>'error','unknown');
    END IF;
  END IF;

  -- group_bookings par participant.
  FOR v_member IN
    SELECT teen_id FROM group_action_invites
     WHERE group_action_id = p_group_action_id AND status = 'accepted'
  LOOP
    INSERT INTO group_bookings (event_id, group_action_id, organizer_id, teen_id, share_coins, status)
    VALUES (p_event_id, p_group_action_id, v_caller, v_member.teen_id, v_share, 'confirmed')
    ON CONFLICT (event_id, teen_id, group_action_id) DO NOTHING;
  END LOOP;

  UPDATE group_actions SET status = 'completed', resource_id = p_event_id, total_coins = v_share * v_size, updated_at = now()
   WHERE id = p_group_action_id;
  PERFORM public.request_group_opposition(p_group_action_id, 'group_booking');

  RETURN jsonb_build_object('success', true, 'event_id', p_event_id,
    'participant_count', v_size, 'share_coins', v_share, 'discount_pct', v_discount);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_teen_event(text, text, timestamptz, text, text, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_group_event_booking(uuid, uuid) TO authenticated, service_role;

COMMENT ON TABLE public.group_bookings IS '#237: réservations d''event groupées (1 ligne/participant).';
COMMENT ON FUNCTION public.finalize_group_event_booking(uuid, uuid) IS
  '#237: réserve un event en groupe (prix/tête remisé → split atomique → group_bookings → opposition).';
