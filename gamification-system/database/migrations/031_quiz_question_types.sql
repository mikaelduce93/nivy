-- ============================================================================
-- MIGRATION 031: QUIZ QUESTION TYPES (Phase 4.1 - Audit Generation Quiz)
-- ============================================================================
-- Ajoute le support de plusieurs types de questions pour varier les quiz
-- generes par l'IA: mcq | true_false | fill_blank | image | audio | matching.
--
-- Deux tables potentielles co-existent dans le projet:
--   * public.quiz_questions      (questions par-ligne, ex. defis quiz)
--   * public.educational_quizzes (questions JSONB embarquees)
--
-- Pour la table educational_quizzes le type vit deja DANS le JSONB
-- (champ "type" sur chaque question). On ajoute donc seulement une colonne
-- au niveau quiz pour indiquer la "tendance" / mix de types autorises, et
-- une colonne explicite sur quiz_questions pour les questions par-ligne.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Table quiz_questions (questions par-ligne) - colonne question_type
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'quiz_questions'
  ) THEN
    -- Ajout de la colonne si absente
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'quiz_questions'
        AND column_name = 'question_type'
    ) THEN
      ALTER TABLE public.quiz_questions
        ADD COLUMN question_type TEXT NOT NULL DEFAULT 'mcq';
    END IF;

    -- Contrainte de valeurs autorisees
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'quiz_questions'
        AND constraint_name = 'quiz_questions_question_type_check'
    ) THEN
      ALTER TABLE public.quiz_questions
        ADD CONSTRAINT quiz_questions_question_type_check
        CHECK (question_type IN (
          'mcq',
          'true_false',
          'fill_blank',
          'image',
          'audio',
          'matching'
        ));
    END IF;

    -- Index pour filtrer rapidement par type
    CREATE INDEX IF NOT EXISTS idx_quiz_questions_question_type
      ON public.quiz_questions(question_type);

    COMMENT ON COLUMN public.quiz_questions.question_type IS
      'Type de question pour la generation IA (Phase 4.1 audit quiz). Defaut mcq.';
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 2) Table educational_quizzes - colonne question_type_mix (JSON optionnel)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'educational_quizzes'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'educational_quizzes'
        AND column_name = 'question_type_mix'
    ) THEN
      ALTER TABLE public.educational_quizzes
        ADD COLUMN question_type_mix JSONB DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'educational_quizzes'
        AND column_name = 'quality_score'
    ) THEN
      ALTER TABLE public.educational_quizzes
        ADD COLUMN quality_score INT DEFAULT NULL;
    END IF;

    COMMENT ON COLUMN public.educational_quizzes.question_type_mix IS
      'Distribution des types de questions ex: {"mcq":0.6,"true_false":0.3,"fill_blank":0.1}';
    COMMENT ON COLUMN public.educational_quizzes.quality_score IS
      'Score qualite global 0-100 calcule par lib/ai/quality-scoring.ts';
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 3) Documentation - aucune table cible: insertion exemple commentee
-- ----------------------------------------------------------------------------
-- Si aucune des deux tables n'existe encore, le code applicatif (orchestrateur
-- IA) doit gerer le champ "type" dans le JSON de chaque question.
-- Exemple d'insert:
-- INSERT INTO public.educational_quizzes (title, questions, question_type_mix)
-- VALUES (
--   'Quiz Geographie du Maroc',
--   '[{"type":"mcq","question":"...","options":[...],"correct":0}]',
--   '{"mcq":0.6,"true_false":0.3,"fill_blank":0.1}'
-- );
