-- 180_vip_cards_cancel_and_usage.sql
-- ---------------------------------------------------------------------------
-- Drift réel révélé par la régénération du typage Supabase (2026-07-12) :
-- `features/pass/actions.ts` écrit `vip_cards.cancelled_at` /
-- `cancellation_reason` (cancelPass) et insère dans `vip_card_usage`
-- (trackPassUsage / getPassUsageHistory), mais NI les colonnes NI la table
-- n'existaient en base → ces flux 500aient à l'exécution. On matérialise le
-- schéma canonique de `features/pass/schema.ts` (VIPCard + VIPCardUsage).
--
-- Idempotent : ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS.
-- ---------------------------------------------------------------------------

ALTER TABLE public.vip_cards
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

CREATE TABLE IF NOT EXISTS public.vip_card_usage (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vip_card_id      uuid NOT NULL REFERENCES public.vip_cards(id) ON DELETE CASCADE,
  usage_type       text NOT NULL,
  reference_type   text,
  reference_id     text,
  discount_applied numeric(10,2) NOT NULL DEFAULT 0,
  usage_date       timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.vip_card_usage IS
  'Historique d''utilisation des avantages de la carte VIP payante (features/pass). Écrit par trackPassUsage, lu par getPassUsageHistory.';

CREATE INDEX IF NOT EXISTS idx_vip_card_usage_card
  ON public.vip_card_usage(vip_card_id, usage_date DESC);

ALTER TABLE public.vip_card_usage ENABLE ROW LEVEL SECURITY;

-- Lecture : le détenteur de la carte uniquement.
DROP POLICY IF EXISTS vip_card_usage_owner_read ON public.vip_card_usage;
CREATE POLICY vip_card_usage_owner_read ON public.vip_card_usage
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.vip_cards vc
    WHERE vc.id = vip_card_id AND vc.profile_id = auth.uid()
  ));

-- Insertion : trackPassUsage tourne avec le client session (authenticated) ;
-- on n'autorise l'insert que sur SA propre carte.
DROP POLICY IF EXISTS vip_card_usage_owner_insert ON public.vip_card_usage;
CREATE POLICY vip_card_usage_owner_insert ON public.vip_card_usage
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.vip_cards vc
    WHERE vc.id = vip_card_id AND vc.profile_id = auth.uid()
  ));
