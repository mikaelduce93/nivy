-- 144_externalize_partner_commission.sql
-- ---------------------------------------------------------------------------
-- #233 (V6, P2/S) — Externaliser le taux de commission partenaire.
--
-- NB : l'audit dit « vers cashback_rules », mais cashback_rules porte le
-- cashback ADO (cashback_pct, ce que l'ado regagne en XP), conceptuellement
-- distinct de la COMMISSION plateforme (la part Nivy sur une vente partenaire).
-- On externalise donc proprement vers :
--   - un défaut global : xp_payment_settings('default_partner_commission_pct')
--     (même table que le default_cashback_pct déjà lu par le pipeline de dépense),
--   - un override par partenaire : partners.commission_pct,
--   - un helper canonique get_partner_commission_pct(partner_id) que TOUTE
--     computation de commission doit consommer (fin du 10% magique en dur).
-- register_marketplace_seller (#241) s'appuie désormais dessus.
-- ---------------------------------------------------------------------------

ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS commission_pct numeric
  CHECK (commission_pct IS NULL OR (commission_pct >= 0 AND commission_pct <= 100));

INSERT INTO public.xp_payment_settings (setting_key, setting_value)
SELECT 'default_partner_commission_pct', '10'
WHERE NOT EXISTS (SELECT 1 FROM public.xp_payment_settings WHERE setting_key = 'default_partner_commission_pct');

CREATE OR REPLACE FUNCTION public.get_partner_commission_pct(p_partner_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT COALESCE(
    (SELECT commission_pct FROM partners WHERE id = p_partner_id),
    (SELECT (setting_value)::text::numeric FROM xp_payment_settings WHERE setting_key = 'default_partner_commission_pct' LIMIT 1),
    10
  );
$function$;

GRANT EXECUTE ON FUNCTION public.get_partner_commission_pct(uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.get_partner_commission_pct(uuid) IS
  '#233: taux de commission partenaire externalisé (override partners.commission_pct → défaut xp_payment_settings → 10).';

-- Branche le défaut du vendeur marketplace (#241) sur le taux externalisé.
CREATE OR REPLACE FUNCTION public.register_marketplace_seller(
  p_partner_id uuid, p_display_name text DEFAULT NULL, p_commission_pct numeric DEFAULT NULL, p_payout_method text DEFAULT 'bank')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE v_seller uuid; v_pct numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM partners WHERE id = p_partner_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'partner_not_found');
  END IF;
  v_pct := COALESCE(p_commission_pct, public.get_partner_commission_pct(p_partner_id));
  INSERT INTO marketplace_sellers (partner_id, display_name, commission_pct, payout_method)
  VALUES (p_partner_id, p_display_name, v_pct, COALESCE(p_payout_method,'bank'))
  ON CONFLICT (partner_id) DO UPDATE SET display_name = EXCLUDED.display_name,
    commission_pct = EXCLUDED.commission_pct, payout_method = EXCLUDED.payout_method
  RETURNING id INTO v_seller;
  RETURN jsonb_build_object('success', true, 'seller_id', v_seller, 'commission_pct', v_pct);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM); END;
$function$;
GRANT EXECUTE ON FUNCTION public.register_marketplace_seller(uuid, text, numeric, text) TO authenticated, service_role;
