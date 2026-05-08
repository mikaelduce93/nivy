-- Migration 075: Add cohort_key to educational_quizzes
-- TICKET-007 (Wave 2, Sub-agent Q2)
--
-- Goal: stop broadcasting AI-generated quizzes globally. Each quiz now
-- carries a `cohort_key` describing the (grade_level, school_type,
-- curriculum, language) tuple it was generated for. The recommender
-- (recommend_for_teen v2, migration 076) filters candidates so a teen
-- only sees AI quizzes whose cohort_key matches their profile OR is
-- NULL (legacy/library content stays universally available).
--
-- Derivation (matches the cron at app/api/cron/generate-daily-content/route.ts):
--   cohort_key = lower(coalesce(grade_level,'unknown')) || '|' ||
--                lower(coalesce(school_type,'unknown')) || '|' ||
--                lower(coalesce(curriculum,'unknown'))  || '|' ||
--                lower(coalesce(language,'french'))
--
-- All non-alphanumeric chars (other than `_-`) are sanitized to `_`
-- so the value matches the `cohortId()` helper used by the cron.
--
-- Idempotent: column added only if missing; backfill rewrites every row
-- with the same deterministic value, so re-running is a no-op.

BEGIN;

-- 1. Column ----------------------------------------------------------------

ALTER TABLE public.educational_quizzes
  ADD COLUMN IF NOT EXISTS cohort_key TEXT;

COMMENT ON COLUMN public.educational_quizzes.cohort_key IS
  'Cohort scope key (grade|school|curriculum|lang). NULL = universal/library. Matches cohortId() in app/api/cron/generate-daily-content/route.ts.';

-- 2. Helper for cohort_key derivation -------------------------------------
--    Mirrors the TS `cohortId()` helper in the cron.

CREATE OR REPLACE FUNCTION public.derive_quiz_cohort_key(
  p_grade_level TEXT,
  p_school_type TEXT,
  p_curriculum  TEXT,
  p_language    TEXT
) RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    regexp_replace(LOWER(COALESCE(NULLIF(p_grade_level, ''), 'unknown')), '[^a-z0-9_-]', '_', 'g')
    || '|' ||
    regexp_replace(LOWER(COALESCE(NULLIF(p_school_type, ''), 'unknown')), '[^a-z0-9_-]', '_', 'g')
    || '|' ||
    regexp_replace(LOWER(COALESCE(NULLIF(p_curriculum,  ''), 'unknown')), '[^a-z0-9_-]', '_', 'g')
    || '|' ||
    regexp_replace(LOWER(COALESCE(NULLIF(p_language,    ''), 'french')),  '[^a-z0-9_-]', '_', 'g')
$$;

GRANT EXECUTE ON FUNCTION public.derive_quiz_cohort_key(TEXT, TEXT, TEXT, TEXT)
  TO authenticated, service_role;

-- 3. Backfill --------------------------------------------------------------
--    Stamp cohort_key on every existing row that has at least one of the
--    cohort dimensions populated. Library/seed rows with all-NULL cohort
--    columns stay NULL → universal scope (intended).

UPDATE public.educational_quizzes
SET cohort_key = public.derive_quiz_cohort_key(grade_level, school_type, curriculum, language)
WHERE grade_level IS NOT NULL
   OR school_type IS NOT NULL
   OR curriculum IS NOT NULL
   OR language IS NOT NULL;

-- 4. Indexes ---------------------------------------------------------------
--    btree on cohort_key for equality match. GIN not needed since
--    cohort_key is a single TEXT scalar; we keep the existing GIN on tags.

CREATE INDEX IF NOT EXISTS idx_educational_quizzes_cohort_key
  ON public.educational_quizzes (cohort_key)
  WHERE is_active = TRUE;

-- 5. Audit log (best-effort) ----------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_audit_logs') THEN
    INSERT INTO admin_audit_logs (action, target_type, metadata, created_at)
    VALUES (
      'add_quiz_cohort_key',
      'educational_quizzes',
      jsonb_build_object(
        'migration', '075_quiz_cohort_key',
        'derivation', 'grade_level|school_type|curriculum|language'
      ),
      NOW()
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

COMMIT;
