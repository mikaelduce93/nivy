-- ============================================================================
-- Migration 184 — G4-complétion-B (J8) : détection différée anti-triche
--                  battles — bot calibré (battle.suspect_pattern) et
--                  collusion/throw (battle.suspect_collusion)
-- ============================================================================
-- ⚠️ À APPLIQUER — fichier écrit le 2026-07-12, PAS encore appliqué à la base
-- (mission G4-complétion-B : fichiers de migration seulement, aucune
-- application).
-- Dépend de : 181_battles_schema.sql (battles, battle_answers) et de la
-- table audit_log (mig 094/096).
--
-- Autorité : docs/specs/SPEC-G4-BATTLES-MINIJEUX.md §4 M7/M8 (couche b),
-- §8 J8, journal red-team #2/#4. Rappel du modèle de menace :
--   * M8(b) — le plancher par battle (< 250 ms, resolve_battle/182) est
--     trivialement esquivable par un bot « à allure humaine » ; la SEULE
--     couche qui l'attrape est la détection cross-battle : justesse quasi
--     parfaite + temps de réponse anormalement RÉGULIERS sur beaucoup de
--     battles (un humain varie selon la longueur/difficulté des questions,
--     un script calibré non).
--   * M7 — les plafonds (5/j, 2/paire/j) BORNENT le win-trading, ils ne le
--     détectent pas : un binôme complice garde ~150 XP/jour garantis. La
--     signature du throw : victoires unilatérales quasi systématiques ET
--     réponses du perdant majoritairement fausses ou absentes.
--
-- AUCUNE sanction automatique v1 (décision spec §4 M7/M8) : cette fonction
-- ÉCRIT des lignes audit_log pour la file de revue humaine admin, rien
-- d'autre. Pas de retrait d'XP, pas de blocage.
--
-- Appelant : un cron quotidien (agent parallèle G4 — route
-- app/api/cron/battle-anticheat, service_role). Signature exposée simple :
--   SELECT public.detect_battle_anomalies();
-- Retour jsonb : {success, suspect_pattern_flagged, suspect_collusion_flagged,
--                 window_days, ran_at}.
--
-- Sécurité (pattern 060/169/182) : SECURITY DEFINER, search_path épinglé,
-- REVOKE PUBLIC/anon/authenticated, GRANT service_role SEUL — un teen ne
-- peut ni lancer le scan ni sonder qui est marqué.
-- Idempotence opérationnelle : dédup 7 jours par cible (un teen/une paire
-- déjà signalé·e récemment n'est pas re-signalé·e chaque nuit — la file
-- admin n'est pas spammée) ; relancer la fonction est toujours sûr.
-- ============================================================================

BEGIN;

-- Garde (pattern V11/180) : prérequis.
DO $$
BEGIN
  IF to_regclass('public.battles') IS NULL
     OR to_regclass('public.battle_answers') IS NULL THEN
    RAISE EXCEPTION 'tables battles/battle_answers absentes — appliquer 181_battles_schema.sql d''abord';
  END IF;
  IF to_regclass('public.audit_log') IS NULL THEN
    RAISE EXCEPTION 'audit_log absente — appliquer 094/096 d''abord';
  END IF;
END $$;

-- ============================================================================
-- detect_battle_anomalies — scan différé, service_role SEUL
-- ============================================================================
-- Seuils v1 (documentés ici ET dans le COMMENT ON — à recalibrer sur données
-- réelles, ils sont volontairement CONSERVATEURS pour une revue humaine) :
--
--   Fenêtre commune : battles RÉSOLUES des 30 derniers jours
--   (status='resolved', resolution IN ('score','forfeit') — les 'expired'
--   du sweeper ne comptent pas : personne n'y a été crédité).
--
--   (a) battle.suspect_pattern (bot calibré, M8-b) — par teen :
--       * ≥ 10 battles résolues distinctes avec au moins une réponse ;
--       * ≥ 30 réponses au total (sinon la variance n'est pas significative :
--         10 battles × 5 rounds = 50 réponses attendues, 30 tolère les
--         forfaits/timeouts) ;
--       * justesse ≥ 95 % (AVG(is_correct) ≥ 0.95) ;
--       * écart-type de response_ms < 400 ms — un humain lit des questions
--         de longueur/difficulté variables : sa dispersion dépasse largement
--         la seconde ; un script qui répond à cadence calibrée (même « à
--         allure humaine », ex. 1,5-2,5 s) produit une dispersion faible.
--         response_ms est calculé serveur (181/182), le client ne peut pas
--         l'étaler artificiellement sans perdre le bonus vitesse.
--
--   (b) battle.suspect_collusion (throw/win-trading, M7) — par paire
--       non ordonnée (LEAST/GREATEST des deux uuid) :
--       * ≥ 6 battles résolues avec gagnant (les égalités ne comptent pas) ;
--       * victoires unilatérales ≥ 90 % pour le même teen ;
--       * sur les battles gagnées par le dominant : réponses du perdant
--         majoritairement fausses ou vides — (fausses + manquantes) >
--         50 % des réponses attendues (Σ rounds_total ; un forfait-throw
--         compte donc ses rounds non joués comme « vides », c'est voulu).
--
--   Dédup : pas de nouvelle ligne si la même cible (teen pour (a),
--   paire pour (b), clé resource_id) a déjà été signalée avec la même
--   action durant les 7 derniers jours.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.detect_battle_anomalies()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_window interval := interval '30 days';
  v_dedup  interval := interval '7 days';
  v_pattern_n integer := 0;
  v_collusion_n integer := 0;
  v_rec record;
  v_expected integer;
  v_given integer;
  v_wrong integer;
  v_missing integer;
  v_pair_key text;
BEGIN
  -- --------------------------------------------------------------------
  -- (a) battle.suspect_pattern — bot calibré (M8-b, red-team #2)
  -- --------------------------------------------------------------------
  FOR v_rec IN
    SELECT ba.teen_id,
           COUNT(DISTINCT ba.battle_id)                    AS battles_n,
           COUNT(*)                                        AS answers_n,
           AVG((ba.is_correct)::int::numeric)              AS accuracy,
           stddev_samp(ba.response_ms)                     AS sd_ms,
           ROUND(AVG(ba.response_ms))                      AS avg_ms
    FROM public.battle_answers ba
    JOIN public.battles b ON b.id = ba.battle_id
    WHERE b.status = 'resolved'
      AND b.resolution IN ('score', 'forfeit')
      AND b.resolved_at >= now() - v_window
    GROUP BY ba.teen_id
    HAVING COUNT(DISTINCT ba.battle_id) >= 10
       AND COUNT(*) >= 30
       AND AVG((ba.is_correct)::int::numeric) >= 0.95
       AND COALESCE(stddev_samp(ba.response_ms), 0) < 400
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.audit_log al
      WHERE al.action = 'battle.suspect_pattern'
        AND al.target_user_id = v_rec.teen_id
        AND al.created_at > now() - v_dedup
    ) THEN
      INSERT INTO public.audit_log
        (actor_id, actor_role, action, resource_type, resource_id,
         target_user_id, description, metadata)
      VALUES
        (v_rec.teen_id, 'system', 'battle.suspect_pattern', 'teen',
         v_rec.teen_id::text, v_rec.teen_id,
         'G4 M8(b)/J8 : profil bot calibré — justesse >= 95 % et variance de response_ms anormalement faible sur >= 10 battles résolues (30 j). Revue humaine requise, aucune sanction automatique v1.',
         jsonb_build_object(
           'battles', v_rec.battles_n,
           'answers', v_rec.answers_n,
           'accuracy', ROUND(v_rec.accuracy, 4),
           'stddev_response_ms', ROUND(COALESCE(v_rec.sd_ms, 0)),
           'avg_response_ms', v_rec.avg_ms,
           'thresholds', jsonb_build_object(
             'min_battles', 10, 'min_answers', 30,
             'min_accuracy', 0.95, 'max_stddev_ms', 400),
           'window_days', 30));
      v_pattern_n := v_pattern_n + 1;
    END IF;
  END LOOP;

  -- --------------------------------------------------------------------
  -- (b) battle.suspect_collusion — throw/win-trading (M7, red-team #4)
  -- --------------------------------------------------------------------
  FOR v_rec IN
    SELECT p.t1, p.t2, p.battles_n,
           CASE WHEN p.t1_wins >= p.t2_wins THEN p.t1 ELSE p.t2 END AS dominant,
           CASE WHEN p.t1_wins >= p.t2_wins THEN p.t2 ELSE p.t1 END AS loser,
           GREATEST(p.t1_wins, p.t2_wins)                           AS dominant_wins,
           ROUND(GREATEST(p.t1_wins, p.t2_wins)::numeric / p.battles_n, 4) AS win_ratio
    FROM (
      SELECT LEAST(b.creator_id, b.opponent_id)    AS t1,
             GREATEST(b.creator_id, b.opponent_id) AS t2,
             COUNT(*)                              AS battles_n,
             COUNT(*) FILTER (WHERE b.winner_id = LEAST(b.creator_id, b.opponent_id))    AS t1_wins,
             COUNT(*) FILTER (WHERE b.winner_id = GREATEST(b.creator_id, b.opponent_id)) AS t2_wins
      FROM public.battles b
      WHERE b.status = 'resolved'
        AND b.resolution IN ('score', 'forfeit')
        AND b.winner_id IS NOT NULL
        AND b.resolved_at >= now() - v_window
      GROUP BY 1, 2
    ) p
    WHERE p.battles_n >= 6
      AND GREATEST(p.t1_wins, p.t2_wins)::numeric / p.battles_n >= 0.90
  LOOP
    -- Réponses du perdant désigné sur les battles gagnées par le dominant :
    -- attendues = Σ rounds_total ; « vides » = attendues - données (un
    -- forfait-throw compte ses rounds non joués comme vides, c'est voulu).
    SELECT COALESCE(SUM(b.rounds_total), 0) INTO v_expected
    FROM public.battles b
    WHERE b.status = 'resolved'
      AND b.resolution IN ('score', 'forfeit')
      AND b.winner_id = v_rec.dominant
      AND b.resolved_at >= now() - v_window
      AND ((b.creator_id = v_rec.t1 AND b.opponent_id = v_rec.t2)
        OR (b.creator_id = v_rec.t2 AND b.opponent_id = v_rec.t1));

    SELECT COUNT(*), COUNT(*) FILTER (WHERE NOT ba.is_correct)
    INTO v_given, v_wrong
    FROM public.battle_answers ba
    JOIN public.battles b ON b.id = ba.battle_id
    WHERE ba.teen_id = v_rec.loser
      AND b.status = 'resolved'
      AND b.resolution IN ('score', 'forfeit')
      AND b.winner_id = v_rec.dominant
      AND b.resolved_at >= now() - v_window
      AND ((b.creator_id = v_rec.t1 AND b.opponent_id = v_rec.t2)
        OR (b.creator_id = v_rec.t2 AND b.opponent_id = v_rec.t1));

    v_missing := GREATEST(0, v_expected - v_given);

    IF v_expected > 0
       AND (v_wrong + v_missing)::numeric / v_expected > 0.5 THEN
      -- Clé de paire stable (ordre lexicographique) pour la dédup.
      v_pair_key := LEAST(v_rec.t1::text, v_rec.t2::text) || ':' || GREATEST(v_rec.t1::text, v_rec.t2::text);

      IF NOT EXISTS (
        SELECT 1 FROM public.audit_log al
        WHERE al.action = 'battle.suspect_collusion'
          AND al.resource_id = v_pair_key
          AND al.created_at > now() - v_dedup
      ) THEN
        INSERT INTO public.audit_log
          (actor_id, actor_role, action, resource_type, resource_id,
           target_user_id, description, metadata)
        VALUES
          (v_rec.dominant, 'system', 'battle.suspect_collusion', 'teen_pair',
           v_pair_key, v_rec.dominant,
           'G4 M7/J8 : paire suspecte de win-trading — victoires unilatérales >= 90 % sur >= 6 battles (30 j) avec réponses du perdant majoritairement fausses/vides. Revue humaine requise, aucune sanction automatique v1.',
           jsonb_build_object(
             'pair_key', v_pair_key,
             'teen_1', v_rec.t1,
             'teen_2', v_rec.t2,
             'dominant', v_rec.dominant,
             'loser', v_rec.loser,
             'battles', v_rec.battles_n,
             'dominant_wins', v_rec.dominant_wins,
             'win_ratio', v_rec.win_ratio,
             'loser_expected_answers', v_expected,
             'loser_wrong_answers', v_wrong,
             'loser_missing_answers', v_missing,
             'thresholds', jsonb_build_object(
               'min_battles', 6, 'min_win_ratio', 0.90,
               'min_bad_or_missing_ratio', 0.5),
             'window_days', 30));
        v_collusion_n := v_collusion_n + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'suspect_pattern_flagged', v_pattern_n,
    'suspect_collusion_flagged', v_collusion_n,
    'window_days', 30,
    'ran_at', now());
END;
$function$;

-- [Pattern 060/169/182] service_role SEUL : un teen ne peut ni lancer le
-- scan ni sonder qui est marqué (la sortie compte, audit_log reste RLS
-- admin/service).
REVOKE EXECUTE ON FUNCTION public.detect_battle_anomalies() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.detect_battle_anomalies() TO service_role;

COMMENT ON FUNCTION public.detect_battle_anomalies() IS
  'G4 J8 (service_role UNIQUEMENT — destinée au cron quotidien anti-triche, agent parallèle). Appel : SELECT public.detect_battle_anomalies(); Retour jsonb {success, suspect_pattern_flagged, suspect_collusion_flagged, window_days, ran_at}. Écrit dans audit_log (revue humaine, AUCUNE sanction automatique v1) : (a) battle.suspect_pattern = bot calibré (par teen : >= 10 battles résolues et >= 30 réponses sur 30 j, justesse >= 95 %, stddev(response_ms) < 400 ms) ; (b) battle.suspect_collusion = throw (par paire : >= 6 battles à gagnant sur 30 j, victoires unilatérales >= 90 %, réponses du perdant fausses/vides > 50 % des attendues). Dédup 7 jours par cible (resource_id) — relance toujours sûre.';

COMMIT;

-- ============================================================================
-- VÉRIFICATION (à exécuter À L'APPLICATION — critères de done J8, jeu de
-- données synthétique). Ne fait PAS partie de la migration.
-- ============================================================================
-- -- 1. Grants : authenticated NE PEUT PAS l'appeler.
-- -- BEGIN;
-- -- SET LOCAL ROLE authenticated;
-- -- SELECT public.detect_battle_anomalies();  -- attendu : permission denied
-- -- ROLLBACK;
--
-- -- 2. Jeu synthétique (service_role, RAISE-rollback) :
-- --    * bot : 1 teen, 10 battles résolues, 50 réponses is_correct=true,
-- --      response_ms constant (ex. 1800 ± 50) ⇒ 1 ligne
-- --      audit_log action='battle.suspect_pattern'.
-- --    * throw : 1 paire, 6 battles résolues gagnées par A, réponses de B
-- --      toutes fausses ⇒ 1 ligne action='battle.suspect_collusion'.
-- --    * duo légitime (justesse ~60 %, variance > 1 s) ⇒ 0 ligne.
-- --    * re-appel immédiat ⇒ compteurs à 0 (dédup 7 j).
-- ============================================================================
