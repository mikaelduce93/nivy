-- 155_scope_public_users_self_read.sql  (V8 #259, A2)
--
-- SÉCURITÉ: public.users {id, email, created_at} portait `users_authenticated_read` (qual=true)
-- -> TOUT utilisateur authentifié lisait la table entière = fuite des emails inter-comptes.
--
-- Fix: scoper la lecture à soi (id = auth.uid()).
-- Vérifié: anon -> 0 ; authenticated -> sa propre ligne.
--
-- NB: les rares lecteurs (activity-feed/share/subscription) lisent users.username/avatar_url,
-- colonnes FANTÔMES sur public.users (déjà cassées, 42703) -> aucune régression introduite ;
-- ils sont à migrer vers profiles/teens (suivi drift, hors V8).
-- Idempotent.

DROP POLICY IF EXISTS "users_authenticated_read" ON public.users;
CREATE POLICY "users_self_read" ON public.users
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));
