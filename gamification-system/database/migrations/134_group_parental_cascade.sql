-- 134_group_parental_cascade.sql
-- ---------------------------------------------------------------------------
-- #230 (V6 socle) — Cascade parentale OPT-OUT pour les actions de groupe.
--
-- Modèle inchangé (opt-out, cf. migration 129) : l'action a lieu, une fenêtre
-- d'OPPOSITION est ouverte pour chaque parent lié. On étend juste la mécanique
-- aux actions de groupe (split, réservation, création d'event, adhésion) :
--
--   - parental_approvals.action_type += group_booking / event_creation /
--     group_food_split / group_join (valeurs existantes conservées).
--   - parental_approvals.group_action_id (uuid) : trace vers l'action de groupe.
--   - request_group_opposition(group_action_id, action_type) : ouvre une fenêtre
--     pending par (participant accepté × parent lié), reliée à l'invite
--     (parent_approval_id). Appelée par les services après le split.
--   - parent_deny_group_action  : OPPOSITION → refund_group_split(teen) (#228).
--   - parent_approve_group_action: lève l'opposition (l'action reste valide).
-- ---------------------------------------------------------------------------

-- 1. Étendre la contrainte action_type (additif).
ALTER TABLE public.parental_approvals DROP CONSTRAINT IF EXISTS parental_approvals_action_type_check;
ALTER TABLE public.parental_approvals ADD CONSTRAINT parental_approvals_action_type_check
  CHECK (action_type = ANY (ARRAY[
    'booking', 'event_booking', 'purchase_above_ceiling', 'coach_meeting',
    'venue_visit', 'crew_join', 'xp_award_above_cap', 'food_order',
    'group_booking', 'event_creation', 'group_food_split', 'group_join'
  ]));

-- 2. Colonne de traçage vers l'action de groupe.
ALTER TABLE public.parental_approvals ADD COLUMN IF NOT EXISTS group_action_id uuid;
CREATE INDEX IF NOT EXISTS idx_parental_approvals_group_action ON public.parental_approvals(group_action_id);

-- 3. Ouvrir les fenêtres d'opposition (1 par participant accepté × parent lié).
CREATE OR REPLACE FUNCTION public.request_group_opposition(
  p_group_action_id uuid,
  p_action_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_inv     RECORD;
  v_link    RECORD;
  v_share   integer;
  v_appr_id uuid;
  v_first   boolean;
  v_count   integer := 0;
BEGIN
  IF p_action_type NOT IN ('group_booking','event_creation','group_food_split','group_join') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_action_type');
  END IF;

  FOR v_inv IN
    SELECT teen_id FROM group_action_invites
     WHERE group_action_id = p_group_action_id AND status = 'accepted'
  LOOP
    SELECT share_coins INTO v_share FROM split_ledger
      WHERE group_action_id = p_group_action_id AND teen_id = v_inv.teen_id;

    v_first := true;
    FOR v_link IN
      SELECT parent_id FROM parent_teen_links WHERE teen_id = v_inv.teen_id
    LOOP
      INSERT INTO parental_approvals (
        parent_id, teen_id, action_type, resource_type, resource_id,
        group_action_id, amount, details, status
      ) VALUES (
        v_link.parent_id, v_inv.teen_id, p_action_type, 'group_action', p_group_action_id,
        p_group_action_id, v_share,
        jsonb_build_object('group_action_id', p_group_action_id, 'share_coins', v_share),
        'pending'
      ) RETURNING id INTO v_appr_id;

      -- Relie l'invite au 1er parent (opposition tracée côté membre).
      IF v_first THEN
        UPDATE group_action_invites SET parent_approval_id = v_appr_id
          WHERE group_action_id = p_group_action_id AND teen_id = v_inv.teen_id;
        v_first := false;
      END IF;

      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'oppositions_opened', v_count);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- 4. Opposition parentale : annule la part de l'ado (refund appairé).
CREATE OR REPLACE FUNCTION public.parent_deny_group_action(
  p_approval_id uuid,
  p_parent_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_appr   parental_approvals%ROWTYPE;
  v_refund jsonb;
BEGIN
  SELECT * INTO v_appr FROM parental_approvals WHERE id = p_approval_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'approval_not_found');
  END IF;
  IF v_appr.parent_id <> p_parent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_owner');
  END IF;
  IF v_appr.action_type NOT IN ('group_booking','event_creation','group_food_split','group_join') THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_a_group_action');
  END IF;
  IF v_appr.status <> 'pending' THEN
    RETURN jsonb_build_object('success', true, 'status', v_appr.status, 'idempotent', true);
  END IF;

  UPDATE parental_approvals
     SET status = 'denied', decided_at = now(), decided_by = p_parent_id
   WHERE id = p_approval_id;

  -- Rembourse uniquement la part de CET ado dans le split de groupe.
  IF v_appr.group_action_id IS NOT NULL THEN
    v_refund := public.refund_group_split(v_appr.group_action_id, v_appr.teen_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'denied', 'refund', v_refund);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- 5. Levée d'opposition : l'action reste valide.
CREATE OR REPLACE FUNCTION public.parent_approve_group_action(
  p_approval_id uuid,
  p_parent_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_appr parental_approvals%ROWTYPE;
BEGIN
  SELECT * INTO v_appr FROM parental_approvals WHERE id = p_approval_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'approval_not_found');
  END IF;
  IF v_appr.parent_id <> p_parent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_owner');
  END IF;
  IF v_appr.status <> 'pending' THEN
    RETURN jsonb_build_object('success', true, 'status', v_appr.status, 'idempotent', true);
  END IF;

  UPDATE parental_approvals
     SET status = 'approved', decided_at = now(), decided_by = p_parent_id
   WHERE id = p_approval_id;

  RETURN jsonb_build_object('success', true, 'status', 'approved');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.request_group_opposition(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.parent_deny_group_action(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.parent_approve_group_action(uuid, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.request_group_opposition(uuid, text) IS
  '#230: ouvre une fenêtre d''opposition opt-out par (participant accepté × parent lié).';
COMMENT ON FUNCTION public.parent_deny_group_action(uuid, uuid) IS
  '#230: opposition parentale → refund_group_split de la part de l''ado.';
