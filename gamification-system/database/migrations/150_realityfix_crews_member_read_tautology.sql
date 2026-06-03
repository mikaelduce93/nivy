-- 150_realityfix_crews_member_read_tautology.sql
--
-- BUG (logique RLS): la policy crews_member_read (SELECT sur crews) compare la FK
-- crew_id à l'id de la ligne membre : `EXISTS (SELECT 1 FROM crew_members
-- WHERE crew_id = id AND user_id = auth.uid() AND status='active')`. Dans la sous-requête
-- `id` se lie à crew_members.id (pas crews.id), donc `crew_id = id` est ~toujours faux
-- -> un membre d'un crew PRIVÉ ne peut jamais le lire. Même bug que celui corrigé sur
-- circles (migration 117). Impact runtime nul aujourd'hui (0 crew privé, crews_public_read
-- masque) mais latent.
--
-- Fix: réutiliser le helper SECURITY DEFINER is_active_crew_member(p_crew_id, p_user_id)
-- introduit en migration 116 (non récursif). USING(is_active_crew_member(crews.id, auth.uid())).
-- Idempotent: DROP POLICY IF EXISTS + CREATE POLICY.

DROP POLICY IF EXISTS crews_member_read ON public.crews;
CREATE POLICY crews_member_read ON public.crews
  FOR SELECT
  USING ( public.is_active_crew_member(id, (SELECT auth.uid())) );
