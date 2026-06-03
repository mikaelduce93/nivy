-- 152_harden_teen_activity_anon_read.sql  (V8 #258, A1)
--
-- SÉCURITÉ (RLS): l'activité de mineurs était lisible PRÉ-AUTH. Les policies SELECT
-- `qual=true` rôle {public} (incl. anon) sur mini_game_participants / mini_game_sessions /
-- event_check_ins exposaient à un visiteur anonyme qui a joué/participé/s'est présenté.
--
-- Fix: passer la lecture à {authenticated} (anon n'a aucune raison de lire l'activité teen).
-- Vérifié: SET ROLE anon -> count = 0 sur les 3 tables ; les leaderboards (RPC SECDEF) restent OK.
-- Idempotent.

DROP POLICY IF EXISTS "Anyone can view participants" ON public.mini_game_participants;
CREATE POLICY "mini_game_participants_authenticated_read" ON public.mini_game_participants
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view game sessions" ON public.mini_game_sessions;
CREATE POLICY "mini_game_sessions_authenticated_read" ON public.mini_game_sessions
  FOR SELECT TO authenticated USING (true);

-- event_check_ins : retirer la policy publique redondante (la version authenticated reste).
DROP POLICY IF EXISTS "event_check_ins_read" ON public.event_check_ins;
