-- 137_purchase_partner_offer.sql
-- ---------------------------------------------------------------------------
-- #232 (V6, P1) — Achat ado-initié chez un partenaire (répare la régression
-- « boutique partenaire »). Brique cœur manquante de l'addendum audit §B/§C.
--
-- Différence nette avec apply_partner_offer (partenaire-initié au PDV) : ICI
-- l'ado déclenche l'achat depuis /teen/partners/[id]. RPC atomique :
--   débit spend_teen_coins (escrow + cashback + partner_transactions) +
--   bump current_total_uses + enforce max_uses_per_user / max_total_uses /
--   min_vip_level/requires_vip + émission d'un code de redemption (voucher).
--
-- Idempotent sur p_idempotency_key (rejoue le voucher au lieu de re-débiter).
-- ---------------------------------------------------------------------------

-- 1. Vouchers de redemption (code à présenter / scanner au PDV).
CREATE TABLE IF NOT EXISTS public.partner_offer_redemptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id        uuid NOT NULL REFERENCES public.partner_offers(id) ON DELETE CASCADE,
  teen_id         uuid NOT NULL,
  partner_id      uuid NOT NULL,
  code            text NOT NULL,
  amount_coins    integer NOT NULL DEFAULT 0,
  spend_id        uuid,                         -- coin_transactions.id du débit
  group_action_id uuid,                         -- achat groupé éventuel (#228)
  idempotency_key uuid,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','redeemed','cancelled')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  redeemed_at     timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_redemptions_code ON public.partner_offer_redemptions(code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_redemptions_idem
  ON public.partner_offer_redemptions(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partner_redemptions_teen ON public.partner_offer_redemptions(teen_id, status);
CREATE INDEX IF NOT EXISTS idx_partner_redemptions_offer ON public.partner_offer_redemptions(offer_id);

ALTER TABLE public.partner_offer_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS partner_redemptions_teen_read ON public.partner_offer_redemptions;
CREATE POLICY partner_redemptions_teen_read ON public.partner_offer_redemptions FOR SELECT
  USING (
    teen_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.parent_teen_links l
               WHERE l.parent_id = (SELECT auth.uid())
                 AND l.teen_id = partner_offer_redemptions.teen_id)
  );

-- 2. Rang VIP (free<silver<gold<platinum) pour le gating min_vip_level.
CREATE OR REPLACE FUNCTION public._vip_rank(p_level text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE lower(coalesce(p_level,'free'))
           WHEN 'platinum' THEN 3 WHEN 'gold' THEN 2 WHEN 'silver' THEN 1 ELSE 0 END;
$$;

-- 3. purchase_partner_offer
CREATE OR REPLACE FUNCTION public.purchase_partner_offer(
  p_offer_id uuid,
  p_teen_id uuid,
  p_idempotency_key uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller   uuid := auth.uid();
  v_offer    partner_offers%ROWTYPE;
  v_used     integer;
  v_teen_vip text;
  v_spend    jsonb;
  v_code     text;
  v_redeem   uuid;
  v_existing partner_offer_redemptions%ROWTYPE;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_teen_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  -- Idempotency fast path.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM partner_offer_redemptions WHERE idempotency_key = p_idempotency_key LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object('success', true, 'idempotent_replay', true,
        'redemption_id', v_existing.id, 'redemption_code', v_existing.code);
    END IF;
  END IF;

  SELECT * INTO v_offer FROM partner_offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'offer_not_found');
  END IF;
  IF v_offer.is_active IS NOT TRUE OR v_offer.status <> 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'offer_unavailable');
  END IF;
  IF (v_offer.valid_from  IS NOT NULL AND v_offer.valid_from  > now())
     OR (v_offer.valid_until IS NOT NULL AND v_offer.valid_until <= now()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'offer_out_of_window');
  END IF;
  IF v_offer.price_coins IS NULL OR v_offer.price_coins <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'offer_not_purchasable');
  END IF;

  -- Plafond global.
  IF v_offer.max_total_uses IS NOT NULL AND v_offer.current_total_uses >= v_offer.max_total_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'offer_sold_out');
  END IF;

  -- Plafond par ado.
  IF v_offer.max_uses_per_user IS NOT NULL THEN
    SELECT count(*) INTO v_used FROM partner_offer_redemptions
      WHERE offer_id = p_offer_id AND teen_id = p_teen_id AND status <> 'cancelled';
    IF v_used >= v_offer.max_uses_per_user THEN
      RETURN jsonb_build_object('success', false, 'error', 'user_limit_reached');
    END IF;
  END IF;

  -- Gating VIP.
  IF v_offer.requires_vip IS TRUE OR public._vip_rank(v_offer.min_vip_level) > 0 THEN
    SELECT card_type INTO v_teen_vip FROM vip_cards
      WHERE profile_id = p_teen_id AND status = 'active'
      ORDER BY public._vip_rank(card_type) DESC LIMIT 1;
    IF v_offer.requires_vip IS TRUE AND v_teen_vip IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'vip_required');
    END IF;
    IF public._vip_rank(v_teen_vip) < public._vip_rank(v_offer.min_vip_level) THEN
      RETURN jsonb_build_object('success', false, 'error', 'vip_level_too_low',
        'required', v_offer.min_vip_level, 'have', COALESCE(v_teen_vip,'free'));
    END IF;
  END IF;

  -- Débit (escrow + cashback + partner_transactions via le pipeline canonique).
  v_spend := public.spend_teen_coins(p_teen_id, v_offer.price_coins, v_offer.partner_id, p_offer_id, p_idempotency_key);
  IF (v_spend->>'success')::boolean IS NOT TRUE THEN
    RETURN v_spend;  -- insufficient_balance / no_wallet / … remontés tels quels
  END IF;

  UPDATE partner_offers SET current_total_uses = current_total_uses + 1, updated_at = now()
   WHERE id = p_offer_id;

  v_code := upper(translate(substr(gen_random_uuid()::text, 1, 10), '-', ''));
  INSERT INTO partner_offer_redemptions (offer_id, teen_id, partner_id, code, amount_coins, spend_id, idempotency_key)
  VALUES (p_offer_id, p_teen_id, v_offer.partner_id, v_code, v_offer.price_coins,
          (v_spend->>'spend_id')::uuid, p_idempotency_key)
  RETURNING id INTO v_redeem;

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', v_redeem,
    'redemption_code', v_code,
    'spend_id', v_spend->>'spend_id',
    'new_balance', v_spend->>'new_balance',
    'xp_earned', v_spend->>'xp_earned'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.purchase_partner_offer(uuid, uuid, uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.purchase_partner_offer(uuid, uuid, uuid) IS
  '#232: achat ado-initié d''une offre partenaire (débit + limites + VIP + voucher de redemption). Idempotent.';
COMMENT ON TABLE public.partner_offer_redemptions IS '#232: vouchers de redemption d''offres partenaires (code au PDV).';
