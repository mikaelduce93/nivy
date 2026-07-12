-- 175_cashback_rules_table.sql
-- ---------------------------------------------------------------------------
-- #350 (tokenomics-coherence) — Matérialiser le cashback configurable.
--
-- État live constaté (2026-07-12) : la table `cashback_rules` EXISTE déjà en
-- production (colonnes id, partner_id, reward_id, cashback_pct, active_from,
-- active_until, is_active, created_at — 0 ligne) et le réglage
-- `default_cashback_pct = 10` est déjà seedé. Trois RPC (_debit_teen_coins,
-- confirm_receipt, complete_ride) lisent déjà l'échelle :
--   règle active (partner_id spécifique > globale NULL, bornes active_*)
--   → default_cashback_pct → fallback 10.
-- Ce fichier :
--   1) garantit la table sur une installation fraîche (schéma MIROIR du live),
--   2) garantit le seed default_cashback_pct,
--   3) extrait le helper canonique `_cashback_pct(partner_id)` reproduisant
--      EXACTEMENT la sémantique live (à consommer par toute future RPC au lieu
--      de dupliquer l'échelle inline),
--   4) active RLS (lecture authenticated ; écritures service_role only).
--
-- Idempotent : CREATE IF NOT EXISTS, seed gardé, CREATE OR REPLACE, DROP POLICY IF EXISTS.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cashback_rules (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id   uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  reward_id    uuid,
  cashback_pct numeric NOT NULL CHECK (cashback_pct >= 0 AND cashback_pct <= 100),
  active_from  timestamptz,
  active_until timestamptz,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.cashback_rules IS
  '#350: taux de cashback XP — partner_id renseigné = règle par partenaire, NULL = règle globale. Résolu par _cashback_pct().';

CREATE INDEX IF NOT EXISTS idx_cashback_rules_partner
  ON public.cashback_rules(partner_id) WHERE is_active;

-- Défaut global (10 %) lu par l'échelle de résolution du pipeline de dépense.
INSERT INTO public.xp_payment_settings (setting_key, setting_value, description)
SELECT 'default_cashback_pct', '10', 'Taux de cashback XP par défaut (%) sur une dépense de coins'
WHERE NOT EXISTS (
  SELECT 1 FROM public.xp_payment_settings WHERE setting_key = 'default_cashback_pct'
);

-- Helper canonique — sémantique IDENTIQUE au ladder inline live de
-- _debit_teen_coins : règle partenaire > règle globale (NULLS LAST), bornes
-- active_from <= now() < active_until, puis défaut global, puis 10.
CREATE OR REPLACE FUNCTION public._cashback_pct(p_partner_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT COALESCE(
    (SELECT cr.cashback_pct FROM cashback_rules cr
      WHERE cr.is_active = true
        AND (cr.partner_id IS NULL OR cr.partner_id = p_partner_id)
        AND (cr.active_from  IS NULL OR cr.active_from  <= now())
        AND (cr.active_until IS NULL OR cr.active_until > now())
      ORDER BY cr.partner_id NULLS LAST, cr.created_at DESC
      LIMIT 1),
    (SELECT (setting_value)::text::numeric FROM xp_payment_settings
      WHERE setting_key = 'default_cashback_pct' LIMIT 1),
    10
  )::integer;
$function$;
GRANT EXECUTE ON FUNCTION public._cashback_pct(uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public._cashback_pct(uuid) IS
  '#350: échelle canonique du cashback XP (règle partenaire → règle globale → défaut xp_payment_settings → 10). Iso-sémantique du ladder inline de _debit_teen_coins.';

ALTER TABLE public.cashback_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cashback_rules_read ON public.cashback_rules;
CREATE POLICY cashback_rules_read ON public.cashback_rules
  FOR SELECT TO authenticated USING (true);
-- Écritures : service_role uniquement (bypass RLS) ; deny-default pour le reste.
