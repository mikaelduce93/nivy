-- 176_partner_commission_by_category.sql
-- ---------------------------------------------------------------------------
-- #352 (tokenomics-coherence) — Aligner la commission partenaire sur la grille
-- marketing par catégorie (app/partenaires : Retail 8 % · Lieux 10 % · Clubs
-- 12 % · Éducation 15 %) au lieu d'un 10 % plat.
--
-- On introduit une grille `partner_commission_rules` (par partner_type) et on
-- réécrit `get_partner_commission_pct` pour résoudre :
--   1) override explicite partners.commission_pct
--   2) grille par catégorie (partner_commission_rules)
--   3) défaut global xp_payment_settings.default_partner_commission_pct
--   4) fallback dur 10
-- Les catégories non listées (food, event_*, creator, mentor, driver…)
-- retombent sur le défaut global (10) — aucun chiffre inventé.
--
-- Idempotent : CREATE IF NOT EXISTS + upsert du seed.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.partner_commission_rules (
  partner_type   text PRIMARY KEY,
  commission_pct numeric NOT NULL CHECK (commission_pct >= 0 AND commission_pct <= 100),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.partner_commission_rules IS
  '#352: grille de commission Nivy par catégorie de partenaire (aligne le marketing app/partenaires).';

INSERT INTO public.partner_commission_rules (partner_type, commission_pct) VALUES
  ('retail', 8), ('venue', 10), ('club', 12), ('education', 15)
ON CONFLICT (partner_type) DO UPDATE
  SET commission_pct = EXCLUDED.commission_pct, updated_at = now();

CREATE OR REPLACE FUNCTION public.get_partner_commission_pct(p_partner_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT COALESCE(
    -- 1) override explicite par partenaire
    (SELECT commission_pct FROM partners WHERE id = p_partner_id),
    -- 2) grille par catégorie
    (SELECT r.commission_pct
       FROM partners p
       JOIN partner_commission_rules r ON r.partner_type = p.partner_type
      WHERE p.id = p_partner_id),
    -- 3) défaut global
    (SELECT (setting_value)::text::numeric FROM xp_payment_settings
      WHERE setting_key = 'default_partner_commission_pct' LIMIT 1),
    -- 4) fallback dur
    10
  );
$function$;
GRANT EXECUTE ON FUNCTION public.get_partner_commission_pct(uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.get_partner_commission_pct(uuid) IS
  '#352: commission partenaire externalisée (override → grille catégorie → défaut → 10).';

ALTER TABLE public.partner_commission_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS partner_commission_rules_read ON public.partner_commission_rules;
CREATE POLICY partner_commission_rules_read ON public.partner_commission_rules
  FOR SELECT TO authenticated USING (true);
