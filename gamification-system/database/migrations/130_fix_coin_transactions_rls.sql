-- 130_fix_coin_transactions_rls.sql
-- ---------------------------------------------------------------------------
-- #229 (V6 socle, P0 sécu) — Resserrer la RLS SELECT de coin_transactions.
--
-- AVANT : une seule policy SELECT, scopée PARENT uniquement
--   USING (EXISTS (SELECT 1 FROM teens
--                  WHERE teens.id = coin_transactions.teen_id
--                    AND teens.parent_id = auth.uid()))
-- Conséquence : l'ado lui-même (auth.uid() = teens.id) ne voit PAS son propre
-- historique, et le scope « tous les enfants d'un parent » ne pince pas l'ado
-- actif. Avant que split_group_purchase (#228) n'écrive des coin_transactions
-- pour N ados d'un même groupe, on doit garantir qu'un ado ne lit QUE ses
-- propres lignes (sinon A verrait les dépenses de B).
--
-- APRÈS : deux policies restrictives, sur le patron canonique du codebase
-- (cf. avatars_self_read) :
--   - teen self-read   : teen_id = auth.uid()
--   - parent supervisor: via parent_teen_links (parent_id = auth.uid())
-- Les écritures restent sans policy (default-deny) : elles passent uniquement
-- par les RPC SECURITY DEFINER (spend_teen_coins, split_group_purchase, …).
--
-- Idempotent. auth.uid() est wrappé en (SELECT auth.uid()) — forme optimisée
-- (init-plan, évaluée une fois) utilisée partout dans la base.
-- ---------------------------------------------------------------------------

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

-- Retire l'ancienne policy parent-only (et toute variante déjà posée).
DROP POLICY IF EXISTS "Users can view own coin transactions" ON public.coin_transactions;
DROP POLICY IF EXISTS "coin_transactions_teen_self_read" ON public.coin_transactions;
DROP POLICY IF EXISTS "coin_transactions_parent_read" ON public.coin_transactions;

-- L'ado voit uniquement ses propres transactions.
CREATE POLICY "coin_transactions_teen_self_read"
  ON public.coin_transactions FOR SELECT
  USING (teen_id = (SELECT auth.uid()));

-- Le parent superviseur voit celles de ses enfants liés (lien actif ou non —
-- la supervision financière reste valable même pendant un lien en attente).
CREATE POLICY "coin_transactions_parent_read"
  ON public.coin_transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.parent_teen_links l
    WHERE l.parent_id = (SELECT auth.uid())
      AND l.teen_id = coin_transactions.teen_id
  ));

COMMENT ON TABLE public.coin_transactions IS
  '#229: SELECT = ado self (teen_id=auth.uid()) OU parent lié (parent_teen_links). Écritures via RPC SECURITY DEFINER uniquement.';
