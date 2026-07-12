-- 177_topup_packages_table.sql
-- ---------------------------------------------------------------------------
-- #351 (tokenomics-coherence) — Externaliser les packs de recharge en table
-- serveur (canon economy §6 FORBIDDEN #5) et corriger leur incohérence.
--
-- Les packs étaient codés en dur dans app/parent/topup/page.tsx (affichage) et
-- app/api/parent/topup/route.ts (montants), avec des « coins » incohérents avec
-- le taux verrouillé 1 DH = 100 coins. On crée `topup_packages` comme source
-- unique. Règles de conformité appliquées :
--   - coins = price_dh * 100 STRICT (1 DH = 100 coins) ;
--   - PAS de bonus coins non adossés à du DH (invariant d'escrow) ;
--   - plafond 200 DH / opération (BAM Circular 6/W/2017, palier faiblement KYC) ;
--   - plancher 50 DH, aligné sur le réglage live xp_payment_settings.min_topup_dh.
--
-- Idempotent : CREATE IF NOT EXISTS + upsert du seed.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.topup_packages (
  id          text PRIMARY KEY,
  coins       integer NOT NULL CHECK (coins > 0),
  bonus_coins integer NOT NULL DEFAULT 0 CHECK (bonus_coins >= 0),
  price_dh    numeric(10,2) NOT NULL CHECK (price_dh >= 50 AND price_dh <= 200),
  is_popular  boolean NOT NULL DEFAULT false,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- Garde-fou : les coins doivent exactement valoir price_dh * 100.
  CONSTRAINT topup_packages_rate_ck CHECK (coins = (price_dh * 100)::integer)
);
COMMENT ON TABLE public.topup_packages IS
  '#351: packs de recharge serveur. coins = price_dh*100 (1 DH = 100 coins), sans bonus non adossé, 50-200 DH/op (min_topup_dh live + BAM lightly-KYC).';

INSERT INTO public.topup_packages (id, coins, bonus_coins, price_dh, is_popular, sort_order) VALUES
  ('pack_50',   5000, 0,  50, false, 1),
  ('pack_100', 10000, 0, 100, true,  2),
  ('pack_150', 15000, 0, 150, false, 3),
  ('pack_200', 20000, 0, 200, false, 4)
ON CONFLICT (id) DO UPDATE
  SET coins = EXCLUDED.coins, bonus_coins = EXCLUDED.bonus_coins,
      price_dh = EXCLUDED.price_dh, is_popular = EXCLUDED.is_popular,
      sort_order = EXCLUDED.sort_order, is_active = true;

ALTER TABLE public.topup_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS topup_packages_read ON public.topup_packages;
CREATE POLICY topup_packages_read ON public.topup_packages
  FOR SELECT TO authenticated USING (is_active);
