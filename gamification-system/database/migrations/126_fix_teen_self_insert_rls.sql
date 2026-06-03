-- 126_fix_teen_self_insert_rls.sql
-- ---------------------------------------------------------------------------
-- Fix RLS : les ados ne pouvaient pas écrire leurs propres lignes.
--
-- Plusieurs policies INSERT nommées « Teens can … » exigeaient en réalité
-- `teens.parent_id = auth.uid()` (modèle hérité « le parent opère le compte
-- ado »). Or les ados se connectent eux-mêmes : auth.uid() = teens.id =
-- profiles.id (vérifié : teen_full_profile.id = teens.id = profiles.id). La
-- condition parent_id = auth.uid() est donc TOUJOURS fausse en session ado →
-- INSERT refusé silencieusement :
--   • quiz_attempts      → « Failed to save quiz attempt » en fin de quiz
--   • friend_connections → impossible d'ajouter un ami
--   • teen_grades        → impossible d'ajouter ses notes
--
-- Correctif ADDITIF : on ajoute une policy INSERT « self » (teen_id = auth.uid()),
-- OR'd avec les policies existantes (permissives) — le chemin parent éventuel
-- reste intact. Aligné sur les policies correctes déjà en place
-- (quiz_attempts_self_read, user_challenges_owner_all). Idempotent (DROP IF EXISTS).
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "quiz_attempts_self_insert" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_self_insert" ON public.quiz_attempts
  FOR INSERT TO authenticated
  WITH CHECK (teen_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "friend_connections_self_insert" ON public.friend_connections;
CREATE POLICY "friend_connections_self_insert" ON public.friend_connections
  FOR INSERT TO authenticated
  WITH CHECK (teen_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "teen_grades_self_insert" ON public.teen_grades;
CREATE POLICY "teen_grades_self_insert" ON public.teen_grades
  FOR INSERT TO authenticated
  WITH CHECK (teen_id = (SELECT auth.uid()));
