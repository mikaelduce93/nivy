-- ============================================================================
-- Migration 171 — Neutralisation de la complétion automatique user_missions
-- ⚠️ À APPLIQUER (fichier seulement — ne pas exécuter pendant la pause DB)
-- ============================================================================
--
-- Décision PO G2-B (2026-07-11) : `user_challenges` est le moteur UNIQUE de
-- missions/défis. Le moteur parallèle `user_missions` est neutralisé.
-- Réf : docs/audits/audit-2026-07-11-gamification/defis.md (D4 P0) + SYNTHESE.md (N7).
--
-- CE QUE CETTE MIGRATION NEUTRALISE ET POURQUOI
-- ---------------------------------------------
-- Deux triggers posés par 003_missions_system.sql (lignes 548-601) font qu'une
-- complétion de `user_challenges` ou un gain d'XP (`user_xp`) passe
-- automatiquement 2-3 lignes `user_missions` seedées à status='completed'
-- (via update_mission_progress). Ces missions s'affichaient « complétées
-- + N XP » sur /teen/streak, alors que la seule fonction qui crédite
-- réellement (claim_mission_rewards, appelée par claimMissionReward /
-- claimAllMissionRewards côté TS) n'est branchée sur AUCUNE UI :
--   - promesse non tenue aujourd'hui : l'XP affiché n'est jamais crédité ;
--   - double/triple-crédit garanti demain : le même événement rapporte déjà
--     son XP via le moteur réel user_challenges — si quelqu'un branche un
--     bouton « Réclamer », l'ado serait payé deux fois pour la même action.
--
-- Triggers/fonctions supprimés :
--   1. TRIGGER on_challenge_complete_update_missions
--        (AFTER INSERT OR UPDATE ON public.user_challenges)
--      + FUNCTION public.trigger_update_missions_on_challenge()
--   2. TRIGGER on_xp_update_missions
--        (AFTER INSERT OR UPDATE ON public.user_xp)
--      + FUNCTION public.trigger_update_missions_on_xp()
--
-- Vérifié (grep user_missions sur toutes les migrations) : aucune migration
-- ultérieure n'ajoute d'autre trigger de complétion automatique.
-- 060d_cron_rpcs.sql et 086_assign_missions_profile.sql ne font qu'ASSIGNER
-- des lignes status='active' (cron /api/cron/assign-missions) ; 006 et 054 ne
-- font que LIRE user_missions.
--
-- NON DESTRUCTIF : aucune table droppée, aucune ligne supprimée ou modifiée.
-- Les tables mission_templates / user_missions / mission_progress_log, la
-- fonction update_mission_progress et les RPC de lecture (get_user_missions,
-- get_mission_stats…) restent en place ; leur suppression relève d'une passe
-- ultérieure, une fois le code TS mort (gamification-system/features/missions)
-- retiré.
-- ============================================================================

-- Les DROP TRIGGER sont gardés par to_regclass : `DROP TRIGGER IF EXISTS`
-- échoue si la TABLE cible n'existe pas (même pattern de garde que 003).
DO $$
BEGIN
  IF to_regclass('public.user_challenges') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS on_challenge_complete_update_missions ON public.user_challenges;
  END IF;

  IF to_regclass('public.user_xp') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS on_xp_update_missions ON public.user_xp;
  END IF;
END $$;

-- Fonctions trigger désormais orphelines (à dropper APRÈS leurs triggers).
DROP FUNCTION IF EXISTS public.trigger_update_missions_on_challenge();
DROP FUNCTION IF EXISTS public.trigger_update_missions_on_xp();
