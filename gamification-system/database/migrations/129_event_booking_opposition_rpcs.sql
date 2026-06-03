-- 129_event_booking_opposition_rpcs.sql
-- ---------------------------------------------------------------------------
-- Réservation event côté ado = modèle OPT-OUT (le parent peut s'opposer).
--
-- L'ado réserve directement (booking status='confirmed', pas d'attente). Une
-- ligne parental_approvals (action_type='event_booking', status='pending') est
-- créée pour CHAQUE parent lié : c'est sa fenêtre d'OPPOSITION, pas une
-- validation préalable.
--
-- Le handler parent (app/api/parent/approvals/route.ts) dispatche déjà
-- 'event_booking' -> parent_approve_booking / parent_deny_booking, MAIS ces
-- RPCs n'existaient pas (l'opposition aurait échoué en 500). On les crée :
--   - approve : lève l'opposition (booking reste confirmé)
--   - deny    : OPPOSITION -> annule le booking (status='cancelled')
-- Idempotent sur approval_id, vérifie l'ownership (défense en profondeur ;
-- la route re-vérifie déjà parent_id + lien actif).
--
-- PRÉ-REQUIS : la contrainte parental_approvals_action_type_check n'autorisait
-- pas 'event_booking' (la route le dispatche pourtant) → l'insert d'opposition
-- échouait silencieusement. On élargit la contrainte (les valeurs existantes
-- sont conservées).
-- ---------------------------------------------------------------------------

ALTER TABLE public.parental_approvals DROP CONSTRAINT IF EXISTS parental_approvals_action_type_check;
ALTER TABLE public.parental_approvals ADD CONSTRAINT parental_approvals_action_type_check
  CHECK (action_type = ANY (ARRAY[
    'booking', 'event_booking', 'purchase_above_ceiling', 'coach_meeting',
    'venue_visit', 'crew_join', 'xp_award_above_cap', 'food_order'
  ]));

CREATE OR REPLACE FUNCTION public.parent_approve_booking(p_approval_id uuid, p_parent_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v parental_approvals%ROWTYPE;
BEGIN
  SELECT * INTO v FROM parental_approvals WHERE id = p_approval_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'approval_not_found'); END IF;
  IF v.parent_id <> p_parent_id THEN RETURN jsonb_build_object('success', false, 'error', 'not_owner'); END IF;
  IF v.action_type <> 'event_booking' THEN RETURN jsonb_build_object('success', false, 'error', 'wrong_action_type'); END IF;
  IF v.status <> 'pending' THEN RETURN jsonb_build_object('success', true, 'idempotent', true); END IF;

  UPDATE parental_approvals
     SET status = 'approved', decided_at = now(), decided_by = p_parent_id
   WHERE id = p_approval_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.parent_deny_booking(p_approval_id uuid, p_parent_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v parental_approvals%ROWTYPE;
BEGIN
  SELECT * INTO v FROM parental_approvals WHERE id = p_approval_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'approval_not_found'); END IF;
  IF v.parent_id <> p_parent_id THEN RETURN jsonb_build_object('success', false, 'error', 'not_owner'); END IF;
  IF v.action_type <> 'event_booking' THEN RETURN jsonb_build_object('success', false, 'error', 'wrong_action_type'); END IF;
  IF v.status <> 'pending' THEN RETURN jsonb_build_object('success', true, 'idempotent', true); END IF;

  UPDATE parental_approvals
     SET status = 'denied', decided_at = now(), decided_by = p_parent_id,
         details = coalesce(details, '{}'::jsonb) || jsonb_build_object('deny_reason', p_reason)
   WHERE id = p_approval_id;

  -- OPPOSITION : annule le booking lié.
  IF v.resource_id IS NOT NULL THEN
    UPDATE bookings SET status = 'cancelled', updated_at = now() WHERE id = v.resource_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.parent_approve_booking(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.parent_deny_booking(uuid, uuid, text) TO authenticated, service_role;
