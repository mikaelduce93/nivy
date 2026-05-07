-- Migration 070: Seed canonical interest_taxonomy tags on educational_quizzes
-- TICKET-001 (Wave 1, Sub-agent F1)
--
-- Goal: Backfill `educational_quizzes.tags` so the recommender's
-- `affinity_match` (computed from tag overlap with `teen_interests`)
-- returns >0 for ≥95% of active rows.
--
-- Source taxonomy: `interest_taxonomy` (50-tag closed set, see
-- `docs/vision/personalization-engine.md` Appendix A).
--
-- Idempotency: each UPDATE rewrites `tags` to a deterministic ARRAY
-- value. Re-running this migration is a no-op (same target value).
-- We do NOT array_append; we ASSIGN, so no double-tagging is possible.
--
-- Coverage acceptance: every active row gets ≥2 canonical tags.
--
-- Mapping rationale (subject + title + grade_level → tags):
--   math    → academic_math, science_physics
--   french  → academic_languages, academic_literature, writing
--   english → academic_languages, academic_literature
--   history → academic_history, academic_geography, social_debate
--   geography → academic_geography, travel, nature_environment
--   science (astro) → science_astronomy, science_physics, academic_math
--   culture → academic_history, academic_literature, reading_nonfiction

BEGIN;

-- Math: "Maths - Bases" (6eme)
UPDATE educational_quizzes
SET tags = ARRAY['academic_math','science_physics']::TEXT[]
WHERE id = 'bec99ca7-b249-4a1e-920f-de3481be7b50';

-- Math: "Les Fractions" (6eme)
UPDATE educational_quizzes
SET tags = ARRAY['academic_math','science_physics']::TEXT[]
WHERE id = 'bcc21aaa-53c5-4f7f-b02b-3d8124ea30ec';

-- French: "Francais - Grammaire" (4eme)
UPDATE educational_quizzes
SET tags = ARRAY['academic_languages','academic_literature','writing']::TEXT[]
WHERE id = '23d9da5b-9e6a-41af-9c71-c97d7d4bef10';

-- French: "Conjugaison Present" (6eme)
UPDATE educational_quizzes
SET tags = ARRAY['academic_languages','academic_literature','writing']::TEXT[]
WHERE id = '9320efc8-e2fd-4700-97f1-915d2453259d';

-- English: "English Basics" (6eme)
UPDATE educational_quizzes
SET tags = ARRAY['academic_languages','academic_literature']::TEXT[]
WHERE id = '420aa82b-042b-4220-88e8-eb552d06c325';

-- History: "Histoire - Independance du Maroc" (4eme)
UPDATE educational_quizzes
SET tags = ARRAY['academic_history','academic_geography','social_debate']::TEXT[]
WHERE id = '9315738c-219e-4d24-9eb1-a8f5974bdb63';

-- Geography: "Geographie - Le Maroc" (6eme)
UPDATE educational_quizzes
SET tags = ARRAY['academic_geography','travel','nature_environment']::TEXT[]
WHERE id = '81017c40-2a6a-4a7e-ac10-602801c722c8';

-- Science (astronomy): "Sciences - Systeme Solaire" (5eme)
UPDATE educational_quizzes
SET tags = ARRAY['science_astronomy','science_physics','academic_math']::TEXT[]
WHERE id = '195f05ba-5dc3-4f7c-8afd-afb2e0f114aa';

-- Culture: "Culture Generale" (3eme)
UPDATE educational_quizzes
SET tags = ARRAY['academic_history','academic_literature','reading_nonfiction']::TEXT[]
WHERE id = 'a76c617c-b099-4868-967c-9cae4e09a048';

-- Defensive fallback: any *active* quiz still missing ≥2 tags receives
-- a generic-but-valid pair derived from `subject`. Idempotent because
-- it only fires when array_length(tags,1) IS NULL OR < 2.
UPDATE educational_quizzes
SET tags = CASE
  WHEN subject = 'math'      THEN ARRAY['academic_math','science_physics']::TEXT[]
  WHEN subject = 'french'    THEN ARRAY['academic_languages','academic_literature']::TEXT[]
  WHEN subject = 'english'   THEN ARRAY['academic_languages','academic_literature']::TEXT[]
  WHEN subject = 'history'   THEN ARRAY['academic_history','academic_geography']::TEXT[]
  WHEN subject = 'geography' THEN ARRAY['academic_geography','travel']::TEXT[]
  WHEN subject = 'science'   THEN ARRAY['science_physics','science_biology']::TEXT[]
  WHEN subject = 'culture'   THEN ARRAY['academic_literature','reading_nonfiction']::TEXT[]
  ELSE ARRAY['academic_languages','academic_literature']::TEXT[]
END
WHERE is_active = TRUE
  AND (tags IS NULL OR COALESCE(array_length(tags, 1), 0) < 2);

-- Audit log (best-effort; ignore if table absent in this env)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_audit_logs') THEN
    INSERT INTO admin_audit_logs (action, target_type, metadata, created_at)
    VALUES (
      'seed_quiz_tags',
      'educational_quizzes',
      jsonb_build_object(
        'migration', '070_seed_quiz_tags',
        'rows_targeted', 9,
        'taxonomy', 'interest_taxonomy_v1'
      ),
      NOW()
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- non-fatal; audit log is informational only
  NULL;
END $$;

COMMIT;
