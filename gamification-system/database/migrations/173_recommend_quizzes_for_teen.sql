-- ============================================================================
-- Migration 173 — recommend_quizzes_for_teen : sélection de quiz RÉELLEMENT
--                 adaptative (niveau + catégories faibles + répétition espacée)
-- ============================================================================
-- ⚠️ À APPLIQUER — fichier écrit le 2026-07-12, PAS encore appliqué à la base
-- (mission G3-B : fichier seulement, aucune application). Tant que la fonction
-- n'existe pas en base, le code TS (lib/quiz/server.ts) retombe proprement sur
-- le chemin existant recommend_for_teen (erreur PGRST202/42883 avalée).
--
-- Contexte : audit 2026-07-11 gamification, trouvaille Q2 (« adaptatif » est
-- trompeur) — docs/audits/audit-2026-07-11-gamification/quiz.md. Le recommender
-- générique recommend_for_teen (052 → v2 076 → +langue 077 → v4 085) score sur
-- affinité de tags / nouveauté / contexte / niveau XP / cohorte, mais :
--   * ignore l'HISTORIQUE D'ERREURS (aucune lecture de quiz_attempts) ;
--   * ne fait aucune répétition espacée des quiz ratés ;
--   * continue de proposer des quiz déjà RÉUSSIS (qui ne rapportent plus
--     d'XP depuis la 169 — proposition morte) ;
--   * ne lit jamais teens.learning_style.
--
-- Décisions PO (2026-07-11) : adaptativité en 2 crans — (1) sélection par
-- niveau + catégories faibles (historique d'erreurs), (2) répétition espacée
-- des quiz ratés ; learning_style influence le FORMAT / le choix de contenu.
--
-- ----------------------------------------------------------------------------
-- CHOIX : NOUVELLE fonction dédiée, PAS une v5 de recommend_for_teen
-- ----------------------------------------------------------------------------
-- recommend_for_teen est un recommender GÉNÉRIQUE 4 content-types
-- (quiz | mission | event | partner_offer), consommé aussi par
-- app/api/teen/recommend/route.ts, et son `reason` JSON est parsé par regex
-- (clés aff/col/fr/nov/ctx/diff) par la persistance d'impressions de
-- lib/quiz/server.ts et le rollup nightly. Les signaux PO sont quiz-only et
-- changent la SÉMANTIQUE du candidate-set (exclusion dure des quiz réussis),
-- ce qui serait faux pour missions/events. Une fonction séparée :
--   * ne risque rien pour les autres surfaces du recommender générique ;
--   * rend le fallback TS non ambigu (« function does not exist » = 173 pas
--     encore appliquée → chemin actuel) ;
--   * peut retourner des colonnes typées (quiz_id, score, reason) au lieu
--     de SETOF JSON.
--
-- ----------------------------------------------------------------------------
-- SIGNAUX CÂBLÉS (a-e)
-- ----------------------------------------------------------------------------
-- (a) CATÉGORIES FAIBLES — score moyen par educational_quizzes.subject dérivé
--     de quiz_attempts (tentatives complétées du teen). weakness ∈ [0,1] =
--     (100 - avg_score)/100. Un quiz d'une matière faible est boosté.
--     Granularité assumée : la MATIÈRE (subject), pas la question — le détail
--     par question existe dans quiz_attempts.answers (JSONB) mais il est
--     indexé par POSITION dans le tableau JSONB educational_quizzes.questions
--     (pas d'identifiant stable de question), donc inexploitable de façon
--     fiable pour une répétition espacée par question.
-- (b) NIVEAU — difficulté cible dérivée de user_xp.current_level :
--       cible = LEAST(1 + FLOOR((level - 1) / 3), 4)
--       niveaux 1-3 → 1 (easy), 4-6 → 2 (medium), 7-9 → 3 (hard), 10+ → 4
--       fit = EXP(-((difficulté - cible)²) / (2·σ²))
--       σ² = 0.5 pour level ≤ 3 (quasi exclusivement easy), 1.0 ensuite (mix).
--     Mapping texte→numérique identique à 076/077 (easy=1 … expert=4).
-- (c) RÉPÉTITION ESPACÉE — un quiz RATÉ (≥1 tentative complétée, aucune
--     réussie) redevient prioritaire selon un backoff 2 → 4 → 7 jours :
--       due_at = last_failed_at + CASE fail_count
--                  WHEN 1 THEN INTERVAL '2 days'
--                  WHEN 2 THEN INTERVAL '4 days'
--                  ELSE        INTERVAL '7 days'   -- ≥3 échecs : plafond 7 j
--                END
--       NOW() ≥ due_at  → retry_due = 1 (boost +0.40, passe devant le neuf)
--       NOW() <  due_at → cooling  = 1 (pénalité -0.80 : il « repose »)
--     fail_count = tentatives complétées non réussies ; last_failed_at = date
--     de la dernière. Calculable uniquement depuis les timestamps de
--     quiz_attempts — aucune table d'état supplémentaire.
-- (d) EXCLUSION DES QUIZ DÉJÀ RÉUSSIS — filtre dur NOT ever_passed : depuis
--     la 169 un quiz réussi ne rapporte plus d'XP (rejeu = entraînement, 0 XP),
--     il ne doit donc plus apparaître en « à faire ». Le rejeu reste accessible
--     via le hub / l'URL directe — cette fonction ne bloque rien.
-- (e) LEARNING_STYLE (teens.learning_style ∈ visual|auditory|kinesthetic|
--     reading, écrit par le questionnaire V11 —
--     app/api/teen/onboarding/learning-style/route.ts) :
--       1. si educational_quizzes.learning_style_targets (colonne POSÉE par
--          cette migration) contient le style du teen → fit = 1.0 ;
--       2. sinon heuristique sur question_type_mix (031) : proportion du type
--          de question associé au style (visual→image, auditory→audio,
--          kinesthetic→matching, reading→fill_blank) ;
--       3. sinon 0.
--     HONNÊTETÉ : au 2026-07-12, AUCUN contenu ne porte ces signaux —
--     learning_style_targets n'existe pas encore (posée ici, NULL partout) et
--     question_type_mix est NULL sur les seeds comme sur les quiz du cron IA
--     (le runner ne supporte d'ailleurs que mcq/true_false — lib/quiz/schema.ts).
--     Le terme (e) contribue donc 0 pour toutes les lignes actuelles : la
--     colonne est le CONTRAT que la banque de contenu G3-A devra remplir pour
--     que le signal devienne effectif, sans nouvelle migration.
--
-- Filtres conservés du recommender existant (pas de régression Q7 sur le
-- « quiz du jour ») : is_active, cohort_key (NULL universel ou exact — 076),
-- grade_level avec fallback (076), langue du teen avec fallback si aucune
-- ligne dans sa langue (077), pénalité quiz_seen_history 7 jours (adoucie :
-- pénalité -0.30 au lieu d'une exclusion, et seulement pour les quiz jamais
-- ratés — le calendrier de répétition espacée gouverne les quiz ratés).
--
-- Sécurité : patterns 060/169 — SECURITY DEFINER, search_path épinglé
-- (public, pg_temp), garde d'appel (le teen lui-même ou son parent),
-- REVOKE PUBLIC/anon + GRANT authenticated/service_role.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) Colonne de tag learning-style sur le contenu (contrat pour la banque
--    G3-A). NULL = contenu non taggé (tout le contenu existant).
-- ----------------------------------------------------------------------------
ALTER TABLE public.educational_quizzes
  ADD COLUMN IF NOT EXISTS learning_style_targets TEXT[] DEFAULT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'educational_quizzes_learning_style_targets_check'
  ) THEN
    ALTER TABLE public.educational_quizzes
      ADD CONSTRAINT educational_quizzes_learning_style_targets_check
      CHECK (
        learning_style_targets IS NULL
        OR learning_style_targets <@ ARRAY['visual','auditory','kinesthetic','reading']::TEXT[]
      );
  END IF;
END
$$;

COMMENT ON COLUMN public.educational_quizzes.learning_style_targets IS
  'Styles d''apprentissage que ce quiz sert particulièrement bien '
  '(sous-ensemble de {visual,auditory,kinesthetic,reading}). NULL = non taggé. '
  'Lu par recommend_quizzes_for_teen (173) ; à remplir par la banque de '
  'contenu G3-A et les futurs générateurs.';

-- Index de support pour l'agrégation par (teen, quiz) de la fonction.
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_teen_quiz
  ON public.quiz_attempts (teen_id, quiz_id);

-- ----------------------------------------------------------------------------
-- 2) La fonction
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recommend_quizzes_for_teen(
  p_teen_id UUID,
  p_limit   INT DEFAULT 5
)
RETURNS TABLE (quiz_id UUID, score NUMERIC, reason TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller        UUID;
  v_teen          public.teens%ROWTYPE;
  v_level         INT;
  v_target        NUMERIC;  -- difficulté cible 1..4 dérivée du niveau (b)
  v_sigma2        NUMERIC;  -- variance de la gaussienne de difficulté (b)
  v_style_key     TEXT;     -- clé question_type_mix associée au style (e)
  v_cohort_key    TEXT;
  v_lang_has_rows BOOLEAN := FALSE;
BEGIN
  -- Garde d'appel : identique à recommend_for_teen (076/077) — le teen
  -- lui-même, ou son parent. service_role (auth.uid() NULL) passe.
  v_caller := auth.uid();
  IF v_caller IS NOT NULL THEN
    IF v_caller <> p_teen_id THEN
      PERFORM 1 FROM public.teens t WHERE t.id = p_teen_id AND t.parent_id = v_caller;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Not authorized to read recommendations for this teen'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  SELECT * INTO v_teen FROM public.teens WHERE id = p_teen_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Teen % not found', p_teen_id USING ERRCODE = 'P0002';
  END IF;

  -- (b) Niveau → difficulté cible.
  SELECT ux.current_level INTO v_level FROM public.user_xp ux WHERE ux.teen_id = p_teen_id;
  v_level  := COALESCE(v_level, 1);
  v_target := LEAST(1 + FLOOR((v_level - 1) / 3.0), 4)::NUMERIC;
  v_sigma2 := CASE WHEN v_level <= 3 THEN 0.5 ELSE 1.0 END;

  -- (e) Style → clé de question_type_mix (heuristique 031).
  v_style_key := CASE v_teen.learning_style
    WHEN 'visual'      THEN 'image'
    WHEN 'auditory'    THEN 'audio'
    WHEN 'kinesthetic' THEN 'matching'
    WHEN 'reading'     THEN 'fill_blank'
    ELSE NULL
  END;

  -- Filtres cohorte + langue, à l'identique de 076/077.
  v_cohort_key := public.derive_quiz_cohort_key(
    v_teen.grade_level,
    v_teen.school_type,
    v_teen.curriculum,
    v_teen.primary_language
  );

  IF v_teen.primary_language IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.educational_quizzes eq
      WHERE eq.is_active = TRUE AND eq.language = v_teen.primary_language
    ) INTO v_lang_has_rows;
  END IF;

  RETURN QUERY
  WITH attempt_stats AS (
    -- Historique par quiz du teen. « Échec » = tentative COMPLÉTÉE non
    -- réussie (les tentatives en cours, completed_at NULL, ne comptent pas).
    SELECT qa.quiz_id AS qz_id,
           BOOL_OR(qa.passed IS TRUE) AS ever_passed,
           COUNT(*) FILTER (
             WHERE qa.completed_at IS NOT NULL AND qa.passed IS DISTINCT FROM TRUE
           ) AS fail_count,
           MAX(qa.created_at) FILTER (
             WHERE qa.completed_at IS NOT NULL AND qa.passed IS DISTINCT FROM TRUE
           ) AS last_failed_at
      FROM public.quiz_attempts qa
     WHERE qa.teen_id = p_teen_id
     GROUP BY qa.quiz_id
  ),
  subject_stats AS (
    -- (a) Maîtrise par matière depuis l'historique complété.
    SELECT eq.subject AS subj,
           AVG(qa.score)::NUMERIC AS avg_score
      FROM public.quiz_attempts qa
      JOIN public.educational_quizzes eq ON eq.id = qa.quiz_id
     WHERE qa.teen_id = p_teen_id
       AND qa.completed_at IS NOT NULL
     GROUP BY eq.subject
  ),
  recent_seen AS (
    SELECT qsh.quiz_id AS item_id
      FROM public.quiz_seen_history qsh
     WHERE qsh.teen_id = p_teen_id
       AND qsh.last_seen >= NOW() - INTERVAL '7 days'
  ),
  candidates AS (
    SELECT q.id,
           q.subject,
           CASE LOWER(COALESCE(q.difficulty, 'medium'))
             WHEN 'easy' THEN 1 WHEN 'medium' THEN 2
             WHEN 'hard' THEN 3 WHEN 'expert' THEN 4 ELSE 2
           END AS difficulty_num,
           q.learning_style_targets,
           q.question_type_mix,
           COALESCE(ast.fail_count, 0) AS fail_count,
           -- (c) Échéance de répétition espacée : backoff 2 → 4 → 7 jours.
           CASE
             WHEN ast.last_failed_at IS NOT NULL AND ast.fail_count >= 1 THEN
               ast.last_failed_at + (CASE
                 WHEN ast.fail_count = 1 THEN INTERVAL '2 days'
                 WHEN ast.fail_count = 2 THEN INTERVAL '4 days'
                 ELSE INTERVAL '7 days'
               END)
           END AS retry_due_at
      FROM public.educational_quizzes q
      LEFT JOIN attempt_stats ast ON ast.qz_id = q.id
     WHERE q.is_active = TRUE
       -- (d) Exclusion dure des quiz déjà réussis (plus d'XP depuis la 169).
       AND COALESCE(ast.ever_passed, FALSE) = FALSE
       -- Cohorte (076) : NULL = universel/librairie, sinon match exact.
       AND (q.cohort_key IS NULL OR q.cohort_key = v_cohort_key)
       -- Grade avec fallback (076) : si aucun quiz du grade du teen n'existe,
       -- on ne filtre pas.
       AND (v_teen.grade_level IS NULL OR q.grade_level IS NULL
            OR q.grade_level = v_teen.grade_level
            OR NOT EXISTS (SELECT 1 FROM public.educational_quizzes q2
                           WHERE q2.is_active = TRUE
                             AND q2.grade_level = v_teen.grade_level))
       -- Langue avec fallback (077) : filtre seulement s'il existe des lignes
       -- dans la langue du teen.
       AND (v_teen.primary_language IS NULL
            OR NOT v_lang_has_rows
            OR q.language = v_teen.primary_language)
  ),
  scored AS (
    SELECT c.id AS c_id,
      -- (a) Faiblesse de la matière ∈ [0,1] ; 0 si jamais tentée (le froid
      -- n'est ni boosté ni pénalisé — la découverte passe par diff/style).
      COALESCE(
        (SELECT (100 - ss.avg_score) / 100.0 FROM subject_stats ss WHERE ss.subj = c.subject),
        0
      )::NUMERIC AS weak,
      -- (b) Fit de difficulté : gaussienne autour de la cible dérivée du niveau.
      EXP( - ((c.difficulty_num - v_target)^2) / (2.0 * v_sigma2) )::NUMERIC AS diff_fit,
      -- (c) Raté et dû → prioritaire ; raté et pas encore dû → repose.
      CASE WHEN c.retry_due_at IS NOT NULL AND NOW() >= c.retry_due_at
           THEN 1 ELSE 0 END::NUMERIC AS retry_due,
      CASE WHEN c.retry_due_at IS NOT NULL AND NOW() < c.retry_due_at
           THEN 1 ELSE 0 END::NUMERIC AS cooling,
      -- (e) Fit learning-style : tag explicite > heuristique type-mix > 0.
      CASE
        WHEN v_teen.learning_style IS NULL THEN 0
        WHEN c.learning_style_targets IS NOT NULL
             AND v_teen.learning_style = ANY (c.learning_style_targets) THEN 1.0
        WHEN v_style_key IS NOT NULL
             AND (c.question_type_mix ->> v_style_key) ~ '^[0-9]+(\.[0-9]+)?$'
          THEN LEAST((c.question_type_mix ->> v_style_key)::NUMERIC, 1.0)
        ELSE 0
      END::NUMERIC AS style_fit,
      -- No-repeat 7 j (impression) : pénalité douce, uniquement pour les quiz
      -- jamais ratés — les ratés sont gouvernés par la répétition espacée.
      CASE WHEN c.fail_count = 0
                AND EXISTS (SELECT 1 FROM recent_seen r WHERE r.item_id = c.id)
           THEN 1 ELSE 0 END::NUMERIC AS seen_penalty
    FROM candidates c
  ),
  ranked AS (
    SELECT s.c_id,
      ( 0.35 * s.weak
      + 0.25 * s.diff_fit
      + 0.40 * s.retry_due
      + 0.15 * s.style_fit
      - 0.80 * s.cooling
      - 0.30 * s.seen_penalty
      )::NUMERIC AS s_score,
      CONCAT(
        'weak=',  ROUND(s.weak, 2),
        ' diff=',  ROUND(s.diff_fit, 2),
        ' retry=', s.retry_due::INT,
        ' cool=',  s.cooling::INT,
        ' style=', ROUND(s.style_fit, 2),
        CASE WHEN s.seen_penalty > 0 THEN ' seen7d=1' ELSE '' END
      ) AS s_reason
    FROM scored s
  )
  SELECT r.c_id, ROUND(r.s_score, 4), r.s_reason
  FROM ranked r
  ORDER BY 2 DESC, 1 ASC
  LIMIT GREATEST(p_limit, 1);
END;
$$;

-- Pattern 060/169 : jamais d'EXECUTE pour anon sur une SECURITY DEFINER.
REVOKE EXECUTE ON FUNCTION public.recommend_quizzes_for_teen(UUID, INT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.recommend_quizzes_for_teen(UUID, INT) TO authenticated, service_role;

COMMENT ON FUNCTION public.recommend_quizzes_for_teen(UUID, INT) IS
  'Ranker adaptatif dédié quiz (G3-B, 2026-07-12) : catégories faibles '
  '(quiz_attempts par subject), difficulté cible dérivée de '
  'user_xp.current_level, répétition espacée des quiz ratés (backoff '
  '2/4/7 jours sur les timestamps de quiz_attempts), exclusion des quiz déjà '
  'réussis (0 XP depuis la 169), pondération learning_style '
  '(learning_style_targets puis heuristique question_type_mix). Consommé par '
  'lib/quiz/server.ts avec fallback sur recommend_for_teen tant que non appliqué.';

COMMIT;
