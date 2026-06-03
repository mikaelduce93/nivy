-- 161_teen_goals_target_date.sql  (V11 #304, Pilier C)
--
-- Structuration des objectifs ado : teen_goals avait déjà `goal_tag` mais pas
-- d'échéance. Ajoute `target_date` (nullable) pour porter l'échéance extraite
-- du texte libre (heuristique FR côté serveur, null si aucun repère temporel).

ALTER TABLE public.teen_goals
  ADD COLUMN IF NOT EXISTS target_date DATE;
