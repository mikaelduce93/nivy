-- Migration 077: educational_quizzes language filter
-- TICKET-011 (Wave 2 / Q5)
-- ----------------------------------------------------------------------------
-- Goals:
--   1. Ensure educational_quizzes has a `language` column (text, default 'fr').
--   2. Constrain language to the supported V1 set: fr, ar, darija, en.
--   3. Index language for cheap filtering inside recommend_for_teen.
--   4. Extend recommend_for_teen() with an optional `p_language` argument.
--      Layered on top of 076 (cohort-aware quiz filter, TICKET-007 / Q2):
--      we keep the cohort_key filter intact and add a language filter with
--      a graceful fallback — when no active quiz matches p_language, the
--      language filter is bypassed so the recommendation set is never
--      empty (whitepaper §29.9 invariant).
-- ----------------------------------------------------------------------------

-- 0. Drop the previous 3-arg signature so PostgREST sees a single overload --
DROP FUNCTION IF EXISTS public.recommend_for_teen(uuid, text, integer);

-- 1. Column (idempotent) -----------------------------------------------------
ALTER TABLE public.educational_quizzes
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'fr';

-- 2. CHECK constraint (drop-then-add to keep idempotent) ---------------------
ALTER TABLE public.educational_quizzes
  DROP CONSTRAINT IF EXISTS educational_quizzes_language_check;

ALTER TABLE public.educational_quizzes
  ADD CONSTRAINT educational_quizzes_language_check
  CHECK (language IN ('fr', 'ar', 'darija', 'en'));

-- 3. Index -------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_edu_quizzes_language
  ON public.educational_quizzes (language)
  WHERE is_active = TRUE;

-- 4. recommend_for_teen v3 — cohort + language aware -------------------------
CREATE OR REPLACE FUNCTION public.recommend_for_teen(
  p_teen_id      UUID,
  p_content_type TEXT,
  p_n            INT     DEFAULT 5,
  p_language     TEXT    DEFAULT NULL
)
RETURNS SETOF JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller         UUID;
  v_teen           public.teens%ROWTYPE;
  v_level          INT;
  v_w              public.recommendation_weights%ROWTYPE;
  v_cohort_key     TEXT;
  v_lang_has_rows  BOOLEAN := TRUE;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NOT NULL THEN
    IF v_caller <> p_teen_id THEN
      PERFORM 1 FROM public.teens t WHERE t.id = p_teen_id AND t.parent_id = v_caller;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Not authorized to read recommendations for this teen' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  SELECT * INTO v_teen FROM public.teens WHERE id = p_teen_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Teen % not found', p_teen_id USING ERRCODE = 'P0002';
  END IF;

  SELECT current_level INTO v_level FROM public.user_xp WHERE teen_id = p_teen_id;
  v_level := COALESCE(v_level, 1);

  SELECT * INTO v_w
  FROM public.recommendation_weights
  WHERE content_type = p_content_type AND is_active = TRUE
  ORDER BY version DESC
  LIMIT 1;

  IF NOT FOUND THEN
    v_w.w1_affinity            := 1.00;
    v_w.w2_collab              := 0.00;
    v_w.w3_friend              := 0.00;
    v_w.w4_novelty             := 0.30;
    v_w.w5_context             := 0.40;
    v_w.w6_difficulty          := 0.50;
    v_w.p1_recently_seen       := 0.50;
    v_w.p2_friend_already_did  := 0.00;
    v_w.p3_difficulty_mismatch := 0.30;
  END IF;

  -- Cohort key (preserved from 076 / TICKET-007)
  v_cohort_key := public.derive_quiz_cohort_key(
    v_teen.grade_level,
    v_teen.school_type,
    v_teen.curriculum,
    v_teen.primary_language
  );

  -- Language fallback: if no active quiz of requested language exists,
  -- disable the language filter so the recommendation set is never empty.
  IF p_content_type = 'quiz' AND p_language IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.educational_quizzes
      WHERE is_active = TRUE AND language = p_language
    ) INTO v_lang_has_rows;
  END IF;

  RETURN QUERY
  WITH teen_tags AS (
    SELECT tag, weight::NUMERIC AS w FROM public.teen_interests WHERE teen_id = p_teen_id
    UNION ALL
    SELECT tag, score::NUMERIC AS w FROM public.affinity_scores WHERE teen_id = p_teen_id
  ),
  teen_affinity AS (
    SELECT tag, SUM(w) AS w FROM teen_tags GROUP BY tag
  ),
  recent_seen AS (
    SELECT quiz_id AS item_id, last_seen
      FROM public.quiz_seen_history
     WHERE teen_id = p_teen_id AND last_seen >= NOW() - INTERVAL '7 days'
  ),
  candidates AS (
    SELECT id, tags, title, difficulty_num, est_minutes FROM (
      -- Quiz branch — cohort-scoped (076) + language-scoped (077)
      SELECT id,
             COALESCE(tags, ARRAY[]::TEXT[]) AS tags,
             title::TEXT AS title,
             CASE LOWER(COALESCE(difficulty,'medium'))
               WHEN 'easy' THEN 1 WHEN 'medium' THEN 2
               WHEN 'hard' THEN 3 WHEN 'expert' THEN 4 ELSE 2 END AS difficulty_num,
             COALESCE(time_limit_minutes, 10) AS est_minutes
        FROM public.educational_quizzes
       WHERE p_content_type = 'quiz' AND is_active = TRUE
         AND (cohort_key IS NULL OR cohort_key = v_cohort_key)
         AND (v_teen.grade_level IS NULL OR grade_level IS NULL OR grade_level = v_teen.grade_level
              OR NOT EXISTS (SELECT 1 FROM public.educational_quizzes
                             WHERE is_active = TRUE AND grade_level = v_teen.grade_level))
         AND (
              p_language IS NULL
              OR NOT v_lang_has_rows
              OR language = p_language
         )
      UNION ALL
      SELECT id,
             COALESCE(tags, ARRAY[]::TEXT[]) AS tags,
             name::TEXT AS title,
             CASE LOWER(COALESCE(difficulty,'medium'))
               WHEN 'easy' THEN 1 WHEN 'medium' THEN 2
               WHEN 'hard' THEN 3 WHEN 'expert' THEN 4 ELSE 2 END AS difficulty_num,
             10 AS est_minutes
        FROM public.mission_templates
       WHERE p_content_type = 'mission' AND is_active = TRUE
      UNION ALL
      SELECT id,
             COALESCE(tags, ARRAY[]::TEXT[]) AS tags,
             title::TEXT AS title,
             2 AS difficulty_num,
             60 AS est_minutes
        FROM public.events
       WHERE p_content_type = 'event' AND status = 'published'
         AND (v_teen.city IS NULL OR city IS NULL OR city = v_teen.city
              OR NOT EXISTS (SELECT 1 FROM public.events
                             WHERE status = 'published' AND city = v_teen.city))
      UNION ALL
      SELECT id,
             COALESCE(tags, ARRAY[]::TEXT[]) AS tags,
             title::TEXT AS title,
             2 AS difficulty_num,
             10 AS est_minutes
        FROM public.partner_offers
       WHERE p_content_type = 'partner_offer' AND is_active = TRUE
    ) x
  ),
  scored AS (
    SELECT
      c.id, c.title, c.tags,
      COALESCE((SELECT SUM(ta.w)::NUMERIC FROM teen_affinity ta WHERE ta.tag = ANY (c.tags)), 0)
        / GREATEST(COALESCE(array_length(c.tags, 1), 0), 1)::NUMERIC AS affinity_match,
      CASE
        WHEN COALESCE(array_length(c.tags, 1), 0) = 0 THEN 0::NUMERIC
        WHEN NOT EXISTS (
          SELECT 1 FROM public.behavioral_signals s
           WHERE s.teen_id = p_teen_id
             AND s.created_at >= NOW() - INTERVAL '30 days'
             AND COALESCE((s.metadata->>'tags')::TEXT, '') <> ''
        ) THEN 1.0::NUMERIC
        ELSE 0::NUMERIC
      END AS novelty_bonus,
      CASE WHEN c.est_minutes <= 15 THEN 1.0::NUMERIC ELSE 0.4::NUMERIC END AS context_fit,
      EXP( - ((c.difficulty_num - LEAST(GREATEST(v_level, 1), 4))^2) / 2.0 )::NUMERIC AS difficulty_fit,
      CASE
        WHEN p_content_type = 'quiz' AND EXISTS (SELECT 1 FROM recent_seen r WHERE r.item_id = c.id)
          THEN 1.0::NUMERIC ELSE 0::NUMERIC
      END AS recently_seen_penalty
    FROM candidates c
  ),
  ranked AS (
    SELECT s.id, s.title, s.tags, s.affinity_match, s.novelty_bonus, s.context_fit,
           s.difficulty_fit, s.recently_seen_penalty,
           ( v_w.w1_affinity   * s.affinity_match
           + v_w.w4_novelty    * s.novelty_bonus
           + v_w.w5_context    * s.context_fit
           + v_w.w6_difficulty * s.difficulty_fit
           - v_w.p1_recently_seen * s.recently_seen_penalty
           )::NUMERIC AS score
    FROM scored s
    WHERE NOT (p_content_type = 'quiz' AND EXISTS (SELECT 1 FROM recent_seen r WHERE r.item_id = s.id))
  )
  SELECT json_build_object(
    'id', r.id,
    'content_type', p_content_type,
    'score', ROUND(r.score::NUMERIC, 4),
    'reason', CONCAT(
      'aff=', ROUND(r.affinity_match::NUMERIC, 2),
      ' nov=', ROUND(r.novelty_bonus::NUMERIC, 2),
      ' ctx=', ROUND(r.context_fit::NUMERIC, 2),
      ' diff=', ROUND(r.difficulty_fit::NUMERIC, 2),
      CASE WHEN r.recently_seen_penalty > 0 THEN ' seen7d=1' ELSE '' END,
      CASE WHEN r.affinity_match = 0 THEN ' [coldstart]' ELSE '' END,
      CASE WHEN p_language IS NOT NULL AND NOT v_lang_has_rows THEN ' [lang-fallback]' ELSE '' END
    )
  )::JSON
  FROM ranked r
  ORDER BY r.score DESC, r.id ASC
  LIMIT GREATEST(p_n, 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.recommend_for_teen(UUID, TEXT, INT, TEXT) TO authenticated, service_role;
