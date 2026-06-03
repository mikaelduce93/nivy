-- 135_group_size_rules_engine.sql
-- ---------------------------------------------------------------------------
-- #234 (V6) — Moteur de déblocage par taille de groupe « à partir de N → avantage ».
--
-- Patron `cashback_rules` (clé = service_type, partner optionnel). Évalué au
-- finalize/split : on compte les participants acceptés, on sélectionne la
-- meilleure règle par type de récompense, on persiste dans group_action_rewards.
--
--   group_size_rules    : service_type, min_group_size, reward_type
--                         (discount_pct/bonus_xp/free_item/table), reward_value,
--                         partner_id (NULL=global), fenêtre temporelle.
--   group_action_rewards: récompenses débloquées d'une action (idempotent).
--   unlock_group_size_rewards(group_action_id, partner_id) : compute + persist,
--     renvoie discount_pct (à appliquer AVANT le split) + bonus_xp (attribué une
--     fois à chaque participant). Levier viral pendant le RSVP.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.group_size_rules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type   text NOT NULL,                  -- ride/food/event/venue_booking/partner_purchase/generic
  partner_id     uuid,                            -- NULL = règle globale
  min_group_size integer NOT NULL CHECK (min_group_size >= 2),
  reward_type    text NOT NULL CHECK (reward_type IN ('discount_pct','bonus_xp','free_item','table')),
  reward_value   numeric NOT NULL DEFAULT 0,
  label          text,
  is_active      boolean NOT NULL DEFAULT true,
  active_from    timestamptz DEFAULT now(),
  active_until   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_group_size_rules_lookup
  ON public.group_size_rules(service_type, is_active, min_group_size);

CREATE TABLE IF NOT EXISTS public.group_action_rewards (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_action_id uuid NOT NULL REFERENCES public.group_actions(id) ON DELETE CASCADE,
  rule_id         uuid REFERENCES public.group_size_rules(id) ON DELETE SET NULL,
  reward_type     text NOT NULL,
  reward_value    numeric NOT NULL DEFAULT 0,
  group_size      integer NOT NULL,
  label           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_action_id, rule_id)
);
CREATE INDEX IF NOT EXISTS idx_group_action_rewards_action ON public.group_action_rewards(group_action_id);

ALTER TABLE public.group_size_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_action_rewards ENABLE ROW LEVEL SECURITY;

-- Règles lisibles par tout authentifié (catalogue d'avantages, levier RSVP).
DROP POLICY IF EXISTS group_size_rules_read ON public.group_size_rules;
CREATE POLICY group_size_rules_read ON public.group_size_rules FOR SELECT
  USING (is_active = true);

-- Récompenses débloquées : visibles par l'organisateur + participants + parents.
DROP POLICY IF EXISTS group_action_rewards_read ON public.group_action_rewards;
CREATE POLICY group_action_rewards_read ON public.group_action_rewards FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_actions ga
    WHERE ga.id = group_action_rewards.group_action_id
      AND (ga.organizer_id = (SELECT auth.uid())
           OR EXISTS (SELECT 1 FROM public.group_action_invites i
                      WHERE i.group_action_id = ga.id AND i.teen_id = (SELECT auth.uid())))
  ));

-- ===========================================================================
-- RPC unlock_group_size_rewards — compute + persist, renvoie discount/bonus.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.unlock_group_size_rewards(
  p_group_action_id uuid,
  p_partner_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_action_type text;
  v_size        integer;
  v_rule        RECORD;
  v_discount    numeric := 0;
  v_bonus_xp    integer := 0;
  v_rewards     jsonb := '[]'::jsonb;
  v_inserted    boolean;
  v_part        RECORD;
BEGIN
  SELECT action_type INTO v_action_type FROM group_actions WHERE id = p_group_action_id;
  IF v_action_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'group_action_not_found');
  END IF;

  SELECT count(*) INTO v_size FROM group_action_invites
   WHERE group_action_id = p_group_action_id AND status = 'accepted';

  -- Meilleure règle par type de récompense (plus haut palier satisfait).
  FOR v_rule IN
    SELECT DISTINCT ON (reward_type) id, reward_type, reward_value, min_group_size, label
    FROM group_size_rules
    WHERE is_active = true
      AND (service_type = v_action_type OR service_type = 'generic')
      AND (partner_id IS NULL OR partner_id = p_partner_id)
      AND min_group_size <= v_size
      AND (active_from  IS NULL OR active_from  <= now())
      AND (active_until IS NULL OR active_until >  now())
    ORDER BY reward_type, min_group_size DESC, reward_value DESC
  LOOP
    INSERT INTO group_action_rewards (group_action_id, rule_id, reward_type, reward_value, group_size, label)
    VALUES (p_group_action_id, v_rule.id, v_rule.reward_type, v_rule.reward_value, v_size, v_rule.label)
    ON CONFLICT (group_action_id, rule_id) DO NOTHING;
    v_inserted := FOUND;

    IF v_rule.reward_type = 'discount_pct' THEN
      v_discount := GREATEST(v_discount, v_rule.reward_value);
    ELSIF v_rule.reward_type = 'bonus_xp' THEN
      v_bonus_xp := GREATEST(v_bonus_xp, v_rule.reward_value::integer);
      -- Attribue le bonus XP une seule fois (à la 1ʳᵉ persistance) à chaque participant.
      IF v_inserted AND v_rule.reward_value::integer > 0 THEN
        FOR v_part IN
          SELECT teen_id FROM group_action_invites
           WHERE group_action_id = p_group_action_id AND status = 'accepted'
        LOOP
          PERFORM add_xp_to_user(v_part.teen_id, v_rule.reward_value::integer,
            'group_bonus'::varchar, 'group_size'::varchar, p_group_action_id,
            format('Bonus groupe (%s+ amis)', v_rule.min_group_size));
        END LOOP;
      END IF;
    END IF;

    v_rewards := v_rewards || jsonb_build_object(
      'reward_type', v_rule.reward_type, 'reward_value', v_rule.reward_value,
      'min_group_size', v_rule.min_group_size, 'label', v_rule.label);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'group_size', v_size,
    'discount_pct', v_discount,
    'bonus_xp', v_bonus_xp,
    'rewards', v_rewards
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.unlock_group_size_rewards(uuid, uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.unlock_group_size_rewards(uuid, uuid) IS
  '#234: évalue group_size_rules pour une action, persiste les récompenses, renvoie discount_pct/bonus_xp.';

-- ===========================================================================
-- Seed de règles de démonstration (idempotent par (service_type,min,reward)).
-- ===========================================================================
INSERT INTO public.group_size_rules (service_type, min_group_size, reward_type, reward_value, label)
SELECT v.service_type, v.min_group_size, v.reward_type, v.reward_value, v.label
FROM (VALUES
  ('food',          3, 'discount_pct', 10::numeric, '-10% à partir de 3 amis'),
  ('food',          6, 'discount_pct', 15::numeric, '-15% à partir de 6 amis'),
  ('ride',          4, 'discount_pct', 15::numeric, '-15% sur la course à 4'),
  ('venue_booking', 8, 'table',         1::numeric, 'Table offerte dès 8 personnes'),
  ('event',         5, 'bonus_xp',     50::numeric, '+50 XP en squad de 5+'),
  ('generic',       3, 'bonus_xp',     20::numeric, '+20 XP de groupe')
) AS v(service_type, min_group_size, reward_type, reward_value, label)
WHERE NOT EXISTS (
  SELECT 1 FROM public.group_size_rules g
  WHERE g.service_type = v.service_type
    AND g.min_group_size = v.min_group_size
    AND g.reward_type = v.reward_type
);

COMMENT ON TABLE public.group_size_rules IS '#234: règles « taille → avantage » cross-service (patron cashback_rules).';
