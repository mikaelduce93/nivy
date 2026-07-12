-- ============================================================================
-- Migration 180 — Verrouillage de la clé de réponses des quiz (J0, spec G4)
-- ============================================================================
-- ⚠️ À APPLIQUER — fichier écrit le 2026-07-12, PAS encore appliqué à la base
-- (jalon J0, fichier seulement — aucune application dans cette mission).
--
-- Contexte (docs/specs/SPEC-G4-BATTLES-MINIJEUX.md §2.3, §3.0, §8 J0 ;
-- red-team #1, sévérité HAUTE) : la RLS 022 « Everyone can view active
-- quizzes » (022_pillars_system.sql:1287) laisse TOUT rôle client
-- (authenticated ET anon — la policy est sans clause TO, et les grants table
-- par défaut incluent anon) lire le JSONB `educational_quizzes.questions`
-- complet, champ `correct` (et `explanation`) inclus — format confirmé
-- {question, options[4], correct, explanation} (172a:37). N'importe quel ado
-- connecté (ou n'importe qui avec la clé anon embarquée dans le bundle) peut
-- télécharger la clé de réponses de toute la banque. Sans ce verrou, toute
-- l'autorité serveur des battles (§3.4) et le scoring serveur du quiz solo
-- sont du théâtre.
--
-- Ce que fait cette migration :
--   1. Privilèges PAR COLONNE : REVOKE SELECT table entière pour
--      authenticated/anon/PUBLIC, puis GRANT SELECT à authenticated sur
--      toutes les colonnes SAUF `questions` (énumération dynamique — robuste
--      au drift de colonnes : tags/language/cohort_key/school_type/… absents
--      des types générés mais présents en live). anon ne récupère RIEN
--      (canon V8 : zéro surface pré-auth). La RLS 022 reste en place telle
--      quelle (filtre de lignes is_active=true pour authenticated).
--   2. RPC `get_quiz_questions_stripped(p_quiz_id)` : SEULE façon pour un
--      client d'obtenir les énoncés — questions sans `correct` ni
--      `explanation` (l'explication se révèle après soumission, via la
--      réponse de app/api/teen/quiz/submit). SECURITY DEFINER, search_path
--      épinglé, REVOKE anon (patterns 060/169/173).
--   3. RPC `get_quiz_question_counts()` : (quiz_id, questions_count) des quiz
--      actifs — remplace les SELECT `questions` qui ne servaient qu'à compter
--      (categories/daily, lib/quiz/server.ts).
--
-- Compat TS (pattern tryAdaptiveQuizRecommendations, lib/quiz/server.ts) :
-- tant que cette migration n'est pas appliquée, les deux RPC n'existent pas
-- (PGRST202/42883) → le code retombe sur la lecture directe de `questions`
-- (encore permise pré-180) avec strip côté serveur. Une fois appliquée, les
-- RPC répondent et le fallback ne s'exécute plus. Le scoring serveur
-- (submit) bascule sur service-role à la première erreur 42501.
--
-- NOTE colonnes futures : un GRANT par colonne ne couvre PAS les colonnes
-- ajoutées après coup. Toute migration qui ajoute une colonne NON sensible à
-- educational_quizzes doit ajouter :
--   GRANT SELECT (nouvelle_colonne) ON public.educational_quizzes TO authenticated;
-- Ne JAMAIS re-granter `questions`.
--
-- Idempotent : REVOKE/GRANT et CREATE OR REPLACE le sont par nature.
-- ============================================================================

BEGIN;

-- Garde (pattern V11) : ne rien faire sur une base qui n'a pas la table.
DO $$
BEGIN
  IF to_regclass('public.educational_quizzes') IS NULL THEN
    RAISE EXCEPTION 'educational_quizzes absente — appliquer 022_pillars_system.sql d''abord';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1) Privilèges par colonne : `questions` quitte la surface client
-- ----------------------------------------------------------------------------
-- La RLS 022 (lignes is_active=true) reste en place ; ici on retire l'accès
-- COLONNE. Quel que soit le chemin (PostgREST select, embed, Realtime, RPC
-- non-DEFINER), `questions` devient illisible hors service_role.

REVOKE SELECT ON public.educational_quizzes FROM PUBLIC, anon, authenticated;

-- GRANT SELECT à authenticated sur toutes les colonnes SAUF `questions`.
-- Énumération dynamique : la liste réelle des colonnes live a drifté par
-- rapport aux types générés (tags, language, cohort_key, school_type,
-- curriculum, learning_style_targets…) — on ne fige pas une liste fausse.
DO $$
DECLARE
  v_cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO v_cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'educational_quizzes'
    AND column_name  <> 'questions';

  IF v_cols IS NULL THEN
    RAISE EXCEPTION 'educational_quizzes : aucune colonne trouvée (inattendu)';
  END IF;

  EXECUTE format(
    'GRANT SELECT (%s) ON public.educational_quizzes TO authenticated;',
    v_cols
  );
END $$;

-- anon : rien du tout (canon V8, zéro surface pré-auth — la clé anon est
-- embarquée dans le bundle client, un « teen » peut requêter en anon).

-- ----------------------------------------------------------------------------
-- 2) RPC get_quiz_questions_stripped — les énoncés SANS la clé de réponses
-- ----------------------------------------------------------------------------
-- Seule voie client vers les énoncés. Retire `correct` ET `explanation` de
-- chaque question (l'explication est révélée après soumission par la réponse
-- de /api/teen/quiz/submit, question par question — jamais en avance).
-- Retourne NULL si le quiz n'existe pas ou est inactif (le caller fait un
-- 404), '[]' si le quiz actif n'a pas de questions. Les RPC battles (J2)
-- et Quiz Rush (J5) liront, elles, le JSONB complet en interne (DEFINER).

CREATE OR REPLACE FUNCTION public.get_quiz_questions_stripped(p_quiz_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN jsonb_typeof(eq.questions) IS DISTINCT FROM 'array' THEN '[]'::jsonb
    ELSE COALESCE(
      (
        SELECT jsonb_agg(
                 CASE WHEN jsonb_typeof(t.q) = 'object'
                      THEN t.q - 'correct' - 'explanation'
                      ELSE t.q
                 END
                 ORDER BY t.ord
               )
        FROM jsonb_array_elements(eq.questions) WITH ORDINALITY AS t(q, ord)
      ),
      '[]'::jsonb
    )
  END
  FROM public.educational_quizzes eq
  WHERE eq.id = p_quiz_id
    AND eq.is_active = true;
$$;

-- Pattern 060/169/173 : jamais d'EXECUTE pour anon sur une SECURITY DEFINER.
REVOKE EXECUTE ON FUNCTION public.get_quiz_questions_stripped(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_quiz_questions_stripped(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_quiz_questions_stripped(uuid) IS
  'J0 spec G4 (2026-07-12) : sert les questions d''un quiz actif SANS les '
  'champs correct/explanation (clé de réponses verrouillée par la 180 — '
  'privilèges par colonne). Seule voie client vers les énoncés ; la '
  'correction et l''explication ne sont révélées qu''après soumission via '
  'app/api/teen/quiz/submit. NULL si quiz absent/inactif.';

-- ----------------------------------------------------------------------------
-- 3) RPC get_quiz_question_counts — compter sans lire
-- ----------------------------------------------------------------------------
-- categories/daily et lib/quiz/server.ts ne lisaient `questions` que pour
-- `questions_count`. Ce compteur remplace ces lectures.

CREATE OR REPLACE FUNCTION public.get_quiz_question_counts()
RETURNS TABLE (quiz_id uuid, questions_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT eq.id,
         CASE WHEN jsonb_typeof(eq.questions) = 'array'
              THEN jsonb_array_length(eq.questions)
              ELSE 0
         END
  FROM public.educational_quizzes eq
  WHERE eq.is_active = true;
$$;

REVOKE EXECUTE ON FUNCTION public.get_quiz_question_counts() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_quiz_question_counts() TO authenticated, service_role;

COMMENT ON FUNCTION public.get_quiz_question_counts() IS
  'J0 spec G4 (2026-07-12) : nombre de questions par quiz actif, sans exposer '
  'le JSONB questions (verrouillé par la 180). Consommé par les routes '
  'categories/daily et lib/quiz/server.ts.';

COMMIT;

-- ============================================================================
-- VÉRIFICATION (à exécuter À L'APPLICATION — smoke-test J0, pattern
-- set_config + RAISE-rollback V6). Ne fait PAS partie de la migration.
-- ============================================================================
-- BEGIN;
-- -- Simuler un teen authentifié (remplacer par un uuid teen réel) :
-- SELECT set_config('request.jwt.claims',
--        '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}', true);
-- SET LOCAL ROLE authenticated;
--
-- -- 1. La colonne questions est morte pour authenticated :
-- --    attendu : ERROR 42501 permission denied
-- -- SELECT questions FROM public.educational_quizzes LIMIT 1;
--
-- -- 2. Les colonnes non sensibles restent lisibles (lignes actives) :
-- SELECT id, title, subject FROM public.educational_quizzes LIMIT 3;
--
-- -- 3. La RPC strippée ne contient ni correct ni explanation :
-- DO $$
-- DECLARE v jsonb;
-- BEGIN
--   SELECT public.get_quiz_questions_stripped(id) INTO v
--   FROM public.educational_quizzes WHERE is_active = true LIMIT 1;
--   IF v::text LIKE '%"correct"%' OR v::text LIKE '%"explanation"%' THEN
--     RAISE EXCEPTION 'FUITE : correct/explanation présents dans le retour strippé';
--   END IF;
--   RAISE NOTICE 'OK — payload strippé propre : %', v;
-- END $$;
--
-- -- 4. Compteurs :
-- SELECT * FROM public.get_quiz_question_counts() LIMIT 5;
--
-- -- 5. RPC 173 non régressée (si appliquée) :
-- -- SELECT * FROM public.recommend_quizzes_for_teen('<teen_uuid>', 3);
--
-- ROLLBACK;
-- ============================================================================
