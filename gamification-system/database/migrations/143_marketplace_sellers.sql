-- 143_marketplace_sellers.sql
-- ---------------------------------------------------------------------------
-- #241 (V6, P2) — Marketplace partenaire-vendeur : commission + payout.
--
-- Aujourd'hui marketplace_listings est C2C (seller_user_id = ado). On ajoute la
-- dimension partenaire-vendeur : un partenaire référencé peut lister, on calcule
-- une commission par vente et on agrège des payouts.
--   marketplace_sellers (partner_id, commission_pct, payout_method, status).
--   marketplace_listings.seller_id → marketplace_sellers (NULL = C2C ado).
--   marketplace_sales (listing, seller, buyer_teen, amount, commission).
--   marketplace_payouts (seller, period, gross, commission, net, status).
--   register_marketplace_seller, record_marketplace_sale (commission depuis
--   cashback_rules si dispo, sinon défaut), accrue_marketplace_payout.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.marketplace_sellers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id     uuid NOT NULL UNIQUE,
  display_name   text,
  commission_pct numeric NOT NULL DEFAULT 10 CHECK (commission_pct >= 0 AND commission_pct <= 100),
  payout_method  text NOT NULL DEFAULT 'bank' CHECK (payout_method IN ('bank','wallet','manual')),
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_listings ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES public.marketplace_sellers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller ON public.marketplace_listings(seller_id);

CREATE TABLE IF NOT EXISTS public.marketplace_sales (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id     uuid REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  seller_id      uuid NOT NULL REFERENCES public.marketplace_sellers(id) ON DELETE CASCADE,
  buyer_teen_id  uuid NOT NULL,
  amount_coins   integer NOT NULL DEFAULT 0,
  commission_coins integer NOT NULL DEFAULT 0,
  net_coins      integer NOT NULL DEFAULT 0,
  spend_id       uuid,
  payout_id      uuid,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_marketplace_sales_seller ON public.marketplace_sales(seller_id, payout_id);

CREATE TABLE IF NOT EXISTS public.marketplace_payouts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id      uuid NOT NULL REFERENCES public.marketplace_sellers(id) ON DELETE CASCADE,
  gross_coins    integer NOT NULL DEFAULT 0,
  commission_coins integer NOT NULL DEFAULT 0,
  net_coins      integer NOT NULL DEFAULT 0,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  period_start   timestamptz,
  period_end     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  paid_at        timestamptz
);

ALTER TABLE public.marketplace_sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS marketplace_sellers_read ON public.marketplace_sellers;
CREATE POLICY marketplace_sellers_read ON public.marketplace_sellers FOR SELECT USING (status = 'active');
DROP POLICY IF EXISTS marketplace_sales_buyer_read ON public.marketplace_sales;
CREATE POLICY marketplace_sales_buyer_read ON public.marketplace_sales FOR SELECT
  USING (buyer_teen_id = (SELECT auth.uid()));

-- Référencer un partenaire-vendeur (commission par défaut depuis cashback_rules).
CREATE OR REPLACE FUNCTION public.register_marketplace_seller(
  p_partner_id uuid, p_display_name text DEFAULT NULL, p_commission_pct numeric DEFAULT NULL, p_payout_method text DEFAULT 'bank')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE v_seller uuid; v_pct numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM partners WHERE id = p_partner_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'partner_not_found');
  END IF;
  v_pct := COALESCE(p_commission_pct,
    (SELECT cashback_pct FROM cashback_rules WHERE partner_id = p_partner_id AND is_active ORDER BY active_from DESC NULLS LAST LIMIT 1),
    10);
  INSERT INTO marketplace_sellers (partner_id, display_name, commission_pct, payout_method)
  VALUES (p_partner_id, p_display_name, v_pct, COALESCE(p_payout_method,'bank'))
  ON CONFLICT (partner_id) DO UPDATE SET display_name = EXCLUDED.display_name,
    commission_pct = EXCLUDED.commission_pct, payout_method = EXCLUDED.payout_method
  RETURNING id INTO v_seller;
  RETURN jsonb_build_object('success', true, 'seller_id', v_seller, 'commission_pct', v_pct);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM); END;
$function$;

-- Vente : l'ado acheteur paie en coins ; commission calculée, net au vendeur.
CREATE OR REPLACE FUNCTION public.record_marketplace_sale(
  p_listing_id uuid, p_buyer_teen_id uuid, p_idempotency_key uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller uuid := auth.uid(); v_listing marketplace_listings%ROWTYPE; v_seller marketplace_sellers%ROWTYPE;
  v_amount integer; v_commission integer; v_net integer; v_spend jsonb; v_sale uuid;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_buyer_teen_id THEN RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller'); END IF;
  SELECT * INTO v_listing FROM marketplace_listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'listing_not_found'); END IF;
  IF v_listing.seller_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_a_partner_listing'); END IF;
  IF v_listing.status NOT IN ('active','available') THEN RETURN jsonb_build_object('success', false, 'error', 'listing_unavailable', 'status', v_listing.status); END IF;
  IF v_listing.price_coins IS NULL OR v_listing.price_coins <= 0 THEN RETURN jsonb_build_object('success', false, 'error', 'not_purchasable'); END IF;

  SELECT * INTO v_seller FROM marketplace_sellers WHERE id = v_listing.seller_id;
  v_amount := v_listing.price_coins;
  v_commission := FLOOR(v_amount * v_seller.commission_pct / 100)::integer;
  v_net := v_amount - v_commission;

  v_spend := public.spend_teen_coins(p_buyer_teen_id, v_amount, v_seller.partner_id, p_listing_id, p_idempotency_key);
  IF (v_spend->>'success')::boolean IS NOT TRUE THEN RETURN v_spend; END IF;

  UPDATE marketplace_listings SET status = 'sold', sold_at = now() WHERE id = p_listing_id;
  INSERT INTO marketplace_sales (listing_id, seller_id, buyer_teen_id, amount_coins, commission_coins, net_coins, spend_id)
  VALUES (p_listing_id, v_seller.id, p_buyer_teen_id, v_amount, v_commission, v_net, (v_spend->>'spend_id')::uuid)
  RETURNING id INTO v_sale;

  RETURN jsonb_build_object('success', true, 'sale_id', v_sale, 'amount_coins', v_amount,
    'commission_coins', v_commission, 'net_coins', v_net);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM); END;
$function$;

-- Agrège les ventes non payées d'un vendeur en un payout.
CREATE OR REPLACE FUNCTION public.accrue_marketplace_payout(p_seller_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE v_payout uuid; v_gross integer; v_comm integer; v_net integer; v_cnt integer;
BEGIN
  SELECT COALESCE(SUM(amount_coins),0), COALESCE(SUM(commission_coins),0), COALESCE(SUM(net_coins),0), count(*)
    INTO v_gross, v_comm, v_net, v_cnt
    FROM marketplace_sales WHERE seller_id = p_seller_id AND payout_id IS NULL;
  IF v_cnt = 0 THEN RETURN jsonb_build_object('success', true, 'sales', 0, 'note', 'nothing_to_accrue'); END IF;

  INSERT INTO marketplace_payouts (seller_id, gross_coins, commission_coins, net_coins, period_end)
  VALUES (p_seller_id, v_gross, v_comm, v_net, now()) RETURNING id INTO v_payout;
  UPDATE marketplace_sales SET payout_id = v_payout WHERE seller_id = p_seller_id AND payout_id IS NULL;

  RETURN jsonb_build_object('success', true, 'payout_id', v_payout, 'sales', v_cnt,
    'gross_coins', v_gross, 'commission_coins', v_comm, 'net_coins', v_net);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM); END;
$function$;

GRANT EXECUTE ON FUNCTION public.register_marketplace_seller(uuid, text, numeric, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_marketplace_sale(uuid, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accrue_marketplace_payout(uuid) TO service_role;
COMMENT ON TABLE public.marketplace_sellers IS '#241: partenaires-vendeurs marketplace (commission + payout).';
