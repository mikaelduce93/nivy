-- =========================================================================
-- Migration 085 — recommend_for_teen v4: turn on collab + friend weights
-- TICKET-035 (V1.2-Sprint Wave 3 / P4)
-- Date: 2026-05-08
-- Source: docs/vision/personalization-engine.md §4 (formula + default
--         weights table at lines 167-191)
--         docs/vision/audit-content-personalization/TICKETS.md (TICKET-035)
--
-- ─────────────────────────────────────────────────────────────────────────
-- Context
-- ─────────────────────────────────────────────────────────────────────────
-- The ranking formula in personalization-engine.md §4 is
--
--   score = w1 * affinity_match
--         + w2 * collaborative_signal     ← "teens like me also did X"
--         + w3 * friend_resonance         ← "your friends just did X"
--         + w4 * novelty_bonus
--         + w5 * context_fit
--         + w6 * difficulty_fit
--         - p1 * recently_seen_penalty
--
-- Wave-2 v3 (migration 077) only used w1/w4/w5/w6/p1; w2 and w3 were
-- effectively zero in code even though the `recommendation_weights` table
-- had non-zero defaults. That made the ranker a pure tag-affinity ranker
-- with no social or collaborative-filtering signal — the reason the
-- whitepaper's "teens like me also did X" experience never showed up.
--
-- Wave 3 P3 just landed `teen_neighbours` (mig 084 — recompute_neighbours
-- nightly cron) so the collab term has data to read. This migration:
--   1. Re-applies per-content-type weight sets aligned with §4 defaults
--      (bumping version to 2 and clearing the v1 active flag).
--   2. Recreates `recommend_for_teen` as v4 — adds collab + friend +
--      true-novelty (zero-prior) sub-scores while keeping every v2/v3
--      filter (cohort_key, language fallback, 7-day no-repeat).
--
-- Out of scope (do NOT touch in this migration):
--   * teen_neighbours computation        → P3 (mig 084 / recompute_neighbours)
--   * cron extension for evolve          → P3
--   * recommend_friends RPC              → mig 079 (TICKET-021), unrelated
-- =========================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Bump weights to v2 — match personalization-engine.md §4 defaults.
--    Only `quiz`, `defi`, `event`, `partner_offer` are tuned here per
--    TICKET-035. The remaining content_types (`mission`, `friend`,
--    `feed_post`, `mentor`) keep v1 values.
--    We INSERT a new (content_type, version=2) row and flip is_active so
--    the SELECT … ORDER BY version DESC LIMIT 1 picks the new one.
-- ─────────────────────────────────────────────────────────────────────────

UPDATE public.recommendation_weights
   SET is_active = FALSE
 WHERE content_type IN ('quiz','defi','event','partner_offer')
   AND version = 1;

INSERT INTO public.recommendation_weights
  ( content_type, w1_affinity, w2_collab, w3_friend, w4_novelty,
    w5_context, w6_difficulty, p1_recently_seen, p2_friend_already_did,
    p3_difficulty_mismatch, diversity_floor_pct, is_active, version )
VALUES
  ('quiz',          0.30, 0.15, 0.05, 0.10, 0.15, 0.25, 0.50, 0.00, 0.30, 20.0, TRUE, 2),
  ('defi',          0.30, 0.10, 0.20, 0.10, 0.15, 0.15, 0.40, 0.00, 0.20, 20.0, TRUE, 2),
  ('event',         0.25, 0.10, 0.30, 0.15, 0.20, 0.00, 0.20, 0.05, 0.00, 20.0, TRUE, 2),
  ('partner_offer', 0.40, 0.10, 0.05, 0.15, 0.20, 0.00, 0.30, 0.00, 0.00, 20.0, TRUE, 2)
ON CONFLICT DO NOTHING;

-- Note: there is no UNIQUE constraint on (content_type, version) on this
-- table at present (verified live), so ON CONFLICT DO NOTHING is a no-op
-- safety. Re-running this migration is idempotent because the SELECT in
-- recommend_for_teen orders by version DESC, so duplicate v2 inserts
-- collapse into "use the most recent v2 row".

-- ─────────────────────────────────────────────────────────────────────────
-- 2. recommend_for_teen v4 — collab + friend + true-novelty.
--    Drops the v3 4-arg signature, replaces with same arity (no breaking
--    API change for app/api/teen/recommend/route.ts callers).
-- ─────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.recommend_for_teen(uuid, text, integer, text);

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
  v_caller          UUID;
  v_teen            public.teens%ROWTYPE;
  v_level           INT;
  v_w               public.recommendation_weights%ROWTYPE;
  v_cohort_key      TEXT;
  v_lang_has_rows   BOOLEAN := TRUE;
  v_neighbour_total INT;
BEGIN
  -- AuthZ: caller is the teen themself, the teen's parent, or service.
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
    -- Fallback defaults match §4 quiz row.
    v_w.w1_affinity            := 0.30;
    v_w.w2_collab              := 0.15;
    v_w.w3_friend              := 0.05;
    v_w.w4_novelty             := 0.10;
    v_w.w5_context             := 0.15;
    v_w.w6_difficulty          := 0.25;
    v_w.p1_recently_seen       := 0.50;
    v_w.p2_friend_already_did  := 0.00;
    v_w.p3_difficulty_mismatch := 0.30;
  END IF;

  -- Cohort key (preserved from v2 / mig 076 / TICKET-007)
  v_cohort_key := public.derive_quiz_cohort_key(
    v_teen.grade_level,
    v_teen.school_type,
    v_teen.curriculum,
    v_teen.primary_language
  );

  -- Language fallback (preserved from v3 / mig 077 / TICKET-011)
  IF p_content_type = 'quiz' AND p_language IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.educational_quizzes
      WHERE is_active = TRUE AND language = p_language
    ) INTO v_lang_has_rows;
  END IF;

  -- Neighbour denominator for collab normalization. We use the live
  -- number of neighbours this teen has (capped at 50 per the spec) so
  -- the collab term stays in [0, 1] regardless of how filled the table
  -- is for this user.
  SELECT LEAST(COUNT(*), 50)::INT INTO v_neighbour_total
    FROM public.teen_neighbours WHERE teen_id = p_teen_id;

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
  -- Pre-compute the teen's high-similarity neighbour set (top 50 by sim,
  -- minimum sim 0.20 to filter noise — same threshold the spec assumes
  -- in §4.2 cosine cutoff).
  neighbours AS (
    SELECT n.neighbour_id
      FROM public.teen_neighbours n
     WHERE n.teen_id = p_teen_id
       AND n.similarity >= 0.20
     ORDER BY n.similarity DESC
     LIMIT 50
  ),
  -- Pre-compute the set of (target_type, target_id) pairs that the
  -- caller themself has any non-negative signal on, in the last 30 days.
  -- Used both for the true-novelty bonus AND to detect "tag-cold-start"
  -- (no signals at all → bias everything as novel).
  caller_seen AS (
    SELECT s.target_id AS item_id
      FROM public.behavioral_signals s
     WHERE s.teen_id = p_teen_id
       AND s.target_type = p_content_type
       AND s.created_at >= NOW() - INTERVAL '30 days'
  ),
  caller_has_any_tag_signal AS (
    SELECT EXISTS (
      SELECT 1 FROM public.behavioral_signals s
       WHERE s.teen_id = p_teen_id
         AND s.created_at >= NOW() - INTERVAL '30 days'
         AND COALESCE((s.metadata->>'tags')::TEXT, '') <> ''
    ) AS v
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
      -- 1. affinity_match: tag-weighted intersection
      COALESCE((SELECT SUM(ta.w)::NUMERIC FROM teen_affinity ta WHERE ta.tag = ANY (c.tags)), 0)
        / GREATEST(COALESCE(array_length(c.tags, 1), 0), 1)::NUMERIC AS affinity_match,

      -- 2. collab_signal (NEW v4): share of high-sim neighbours who
      --    completed THIS specific item in the last 60 days. In [0, 1].
      --    Spec: §4.2 — sum(complete by neighbour) / |neighbours|.
      CASE
        WHEN v_neighbour_total = 0 THEN 0::NUMERIC
        ELSE (
          SELECT COUNT(DISTINCT bs.teen_id)::NUMERIC / v_neighbour_total::NUMERIC
            FROM public.behavioral_signals bs
            JOIN neighbours nb ON nb.neighbour_id = bs.teen_id
           WHERE bs.target_type = p_content_type
             AND bs.target_id = c.id
             AND bs.signal_type = 'complete'
             AND bs.created_at >= NOW() - INTERVAL '60 days'
        )
      END AS collab_signal,

      -- 3. friend_resonance (NEW v4): bumped score when accepted friends
      --    have completed/favorited this item in the last 7 days. In [0, 1].
      --    Spec: §4.3 — additive bumps capped at 1.0.
      LEAST(1.0::NUMERIC,
        COALESCE((
          SELECT
              CASE WHEN COUNT(*) FILTER (WHERE bs.signal_type = 'complete') >= 2 THEN 0.50
                   WHEN COUNT(*) FILTER (WHERE bs.signal_type = 'complete') >= 1 THEN 0.30
                   ELSE 0 END
            + CASE WHEN COUNT(*) FILTER (WHERE bs.signal_type = 'favorite') >= 1 THEN 0.10
                   ELSE 0 END
            FROM public.behavioral_signals bs
           WHERE bs.target_type = p_content_type
             AND bs.target_id = c.id
             AND bs.created_at >= NOW() - INTERVAL '7 days'
             AND bs.teen_id IN (
                   SELECT user2_id FROM public.friendships
                    WHERE user1_id = p_teen_id AND status = 'accepted'
                   UNION
                   SELECT user1_id FROM public.friendships
                    WHERE user2_id = p_teen_id AND status = 'accepted'
                 )
        ), 0::NUMERIC)
      ) AS friend_resonance,

      -- 4. novelty_bonus (v4 strengthened): two layers per §4.4 —
      --    (a) tag-cold-start: teen has no recent signals at all → bias up
      --    (b) item-novelty: this exact item has zero signals from teen
      --        in the last 30 days, AND the item has tags. Returns 0.5
      --        when (b) holds, plus 0.5 when (a) holds, capped at 1.0.
      LEAST(1.0::NUMERIC,
        CASE WHEN COALESCE(array_length(c.tags, 1), 0) = 0 THEN 0::NUMERIC
             WHEN NOT (SELECT v FROM caller_has_any_tag_signal) THEN 1.0::NUMERIC
             ELSE 0::NUMERIC END
        +
        CASE WHEN NOT EXISTS (SELECT 1 FROM caller_seen cs WHERE cs.item_id = c.id)
             THEN 0.5::NUMERIC ELSE 0::NUMERIC END
      ) AS novelty_bonus,

      -- 5. context_fit (preserved)
      CASE WHEN c.est_minutes <= 15 THEN 1.0::NUMERIC ELSE 0.4::NUMERIC END AS context_fit,

      -- 6. difficulty_fit (preserved)
      EXP( - ((c.difficulty_num - LEAST(GREATEST(v_level, 1), 4))^2) / 2.0 )::NUMERIC AS difficulty_fit,

      -- p1: recently_seen (preserved, quiz only)
      CASE
        WHEN p_content_type = 'quiz' AND EXISTS (SELECT 1 FROM recent_seen r WHERE r.item_id = c.id)
          THEN 1.0::NUMERIC ELSE 0::NUMERIC
      END AS recently_seen_penalty
    FROM candidates c
  ),
  ranked AS (
    SELECT s.id, s.title, s.tags,
           s.affinity_match, s.collab_signal, s.friend_resonance,
           s.novelty_bonus, s.context_fit, s.difficulty_fit,
           s.recently_seen_penalty,
           ( v_w.w1_affinity   * s.affinity_match
           + v_w.w2_collab     * s.collab_signal
           + v_w.w3_friend     * s.friend_resonance
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
      'aff=',  ROUND(r.affinity_match::NUMERIC, 2),
      ' col=', ROUND(r.collab_signal::NUMERIC, 2),
      ' fr=',  ROUND(r.friend_resonance::NUMERIC, 2),
      ' nov=', ROUND(r.novelty_bonus::NUMERIC, 2),
      ' ctx=', ROUND(r.context_fit::NUMERIC, 2),
      ' diff=',ROUND(r.difficulty_fit::NUMERIC, 2),
      CASE WHEN r.recently_seen_penalty > 0 THEN ' seen7d=1' ELSE '' END,
      CASE WHEN r.affinity_match = 0 THEN ' [coldstart]' ELSE '' END,
      CASE WHEN p_language IS NOT NULL AND NOT v_lang_has_rows THEN ' [lang-fallback]' ELSE '' END,
      CASE WHEN v_neighbour_total = 0 THEN ' [no-neighbours]' ELSE '' END
    )
  )::JSON
  FROM ranked r
  ORDER BY r.score DESC, r.id ASC
  LIMIT GREATEST(p_n, 1);
END;
$$;

COMMENT ON FUNCTION public.recommend_for_teen(UUID, TEXT, INT, TEXT) IS
  'Wave-3 TICKET-035 v4: scoring formula = w1*affinity + w2*collab + w3*friend + w4*novelty + w5*ctx + w6*diff - p1*seen. Reads teen_neighbours (mig 084) for collab and friendships (accepted) for friend_resonance. Preserves cohort_key + language filters from v2/v3.';

GRANT EXECUTE ON FUNCTION public.recommend_for_teen(UUID, TEXT, INT, TEXT) TO authenticated, service_role;

COMMIT;
