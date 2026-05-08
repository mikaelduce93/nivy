-- =========================================================================
-- Migration 079 — recommend_friends RPC (Wave 2 / TICKET-021)
-- Date: 2026-05-08
-- Source: docs/vision/audit-content-personalization/TICKETS.md (TICKET-021)
--         docs/vision/personalization-engine.md (teen_neighbours / affinity_scores)
--
-- ─────────────────────────────────────────────────────────────────────────
-- Context
-- ─────────────────────────────────────────────────────────────────────────
-- TICKET-021 ships the opponent picker that powers FD2's friend-challenge
-- creation form. The picker must surface up to N candidate teens ranked
-- by similarity, excluding people who:
--   * are already accepted friends of p_teen_id,
--   * are themselves the caller,
--   * already have a pending or active friend_challenge with p_teen_id
--     (acceptance_status IN ('pending') OR status IN ('pending','active')).
--
-- Scoring strategy:
--   1. PRIMARY: public.teen_neighbours.similarity (NUMERIC(5,4)) — populated
--      by the Wave-3 nightly cron `recompute_neighbours` (out of scope here).
--   2. FALLBACK: cosine similarity computed on the fly from
--      public.affinity_scores when teen_neighbours has < p_limit rows for
--      this teen. This keeps the picker useful before the cron is wired.
--
-- The RPC returns one JSON object per row:
--   { teen_id, name, level, last_seen, similarity, source }
-- where:
--   * name      = COALESCE(teens.pseudo, teens.first_name, 'Anonyme')
--   * level     = user_xp.current_level (1 if missing)
--   * last_seen = auth.users.last_sign_in_at (NULL if never)
--   * source    = 'neighbours' | 'affinity'
--
-- Authorization: SECURITY DEFINER. Caller must be the teen themself or
--   the teen's parent (matches the recommend_for_teen pattern in mig 052).
--
-- Idempotency: CREATE OR REPLACE — re-running is a no-op.
--
-- Out of scope (handled elsewhere, do NOT touch in this migration):
--   * recompute_neighbours nightly cron      → Wave 3 P3
--   * friend-challenge create/accept RPCs    → FD1 (TICKET-019)
--   * picker UI                              → FD2 (TICKET-020)
-- =========================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.recommend_friends(
  p_teen_id UUID,
  p_limit   INT DEFAULT 10
)
RETURNS SETOF JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller     UUID;
  v_n          INT := GREATEST(LEAST(COALESCE(p_limit, 10), 50), 1);
  v_neighbour_count INT;
BEGIN
  -- ──────────────────────────────────────────────────────────────────────
  -- AuthZ — caller must be the teen or the teen's parent.
  -- ──────────────────────────────────────────────────────────────────────
  v_caller := auth.uid();
  IF v_caller IS NOT NULL AND v_caller <> p_teen_id THEN
    PERFORM 1 FROM public.teens t
      WHERE t.id = p_teen_id AND t.parent_id = v_caller;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Not authorized to read recommendations for this teen'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.teens WHERE id = p_teen_id) THEN
    RAISE EXCEPTION 'Teen % not found', p_teen_id USING ERRCODE = 'P0002';
  END IF;

  -- ──────────────────────────────────────────────────────────────────────
  -- Decide source: prefer neighbours table when populated for this teen.
  -- ──────────────────────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_neighbour_count
    FROM public.teen_neighbours
   WHERE teen_id = p_teen_id;

  RETURN QUERY
  WITH excluded_users AS (
    -- already accepted friends (friendships.user1_id < user2_id by mig 024)
    SELECT user2_id AS uid FROM public.friendships
      WHERE user1_id = p_teen_id AND status = 'accepted'
    UNION
    SELECT user1_id AS uid FROM public.friendships
      WHERE user2_id = p_teen_id AND status = 'accepted'
    UNION
    -- already in a pending or active friend_challenge with the caller
    SELECT opponent_id AS uid FROM public.friend_challenges
      WHERE creator_id = p_teen_id
        AND opponent_id IS NOT NULL
        AND ( acceptance_status = 'pending'
              OR status IN ('pending','active') )
    UNION
    SELECT creator_id AS uid FROM public.friend_challenges
      WHERE opponent_id = p_teen_id
        AND ( acceptance_status = 'pending'
              OR status IN ('pending','active') )
    UNION
    SELECT p_teen_id  -- never recommend self
  ),
  -- ── PRIMARY: precomputed neighbours ──────────────────────────────────
  from_neighbours AS (
    SELECT n.neighbour_id AS teen_id,
           n.similarity::NUMERIC AS similarity,
           'neighbours'::TEXT AS source
      FROM public.teen_neighbours n
     WHERE n.teen_id = p_teen_id
       AND v_neighbour_count > 0
       AND n.neighbour_id NOT IN (SELECT uid FROM excluded_users WHERE uid IS NOT NULL)
  ),
  -- ── FALLBACK: on-the-fly cosine on affinity_scores ───────────────────
  -- Computed only when from_neighbours yields fewer than v_n candidates.
  -- cosine(A,B) = SUM(A.score * B.score) / (||A|| * ||B||).
  caller_vec AS (
    SELECT tag, score::NUMERIC AS s
      FROM public.affinity_scores
     WHERE teen_id = p_teen_id
  ),
  caller_norm AS (
    SELECT NULLIF(SQRT(SUM(s * s)), 0) AS n FROM caller_vec
  ),
  candidate_vecs AS (
    SELECT a.teen_id, a.tag, a.score::NUMERIC AS s
      FROM public.affinity_scores a
     WHERE a.teen_id <> p_teen_id
       AND a.teen_id NOT IN (SELECT uid FROM excluded_users WHERE uid IS NOT NULL)
       AND EXISTS (SELECT 1 FROM caller_vec) -- skip when caller has no profile
  ),
  candidate_norm AS (
    SELECT teen_id, NULLIF(SQRT(SUM(s * s)), 0) AS n
      FROM candidate_vecs
     GROUP BY teen_id
  ),
  dot_products AS (
    SELECT cv.teen_id, SUM(cv.s * cu.s) AS dot
      FROM candidate_vecs cv
      JOIN caller_vec cu ON cu.tag = cv.tag
     GROUP BY cv.teen_id
  ),
  from_affinity AS (
    SELECT dp.teen_id,
           (dp.dot / (cn.n * (SELECT n FROM caller_norm)))::NUMERIC AS similarity,
           'affinity'::TEXT AS source
      FROM dot_products dp
      JOIN candidate_norm cn ON cn.teen_id = dp.teen_id
     WHERE (SELECT n FROM caller_norm) IS NOT NULL
       AND cn.n IS NOT NULL
       -- only top up when neighbours under-supplied
       AND (v_neighbour_count = 0 OR v_neighbour_count < v_n)
       AND dp.teen_id NOT IN (SELECT teen_id FROM from_neighbours)
  ),
  -- ── Merge sources, dedup, rank ───────────────────────────────────────
  merged AS (
    SELECT teen_id, similarity, source FROM from_neighbours
    UNION ALL
    SELECT teen_id, similarity, source FROM from_affinity
  ),
  ranked AS (
    SELECT m.teen_id,
           m.similarity,
           m.source,
           ROW_NUMBER() OVER (
             PARTITION BY m.teen_id
             ORDER BY CASE WHEN m.source = 'neighbours' THEN 0 ELSE 1 END,
                      m.similarity DESC NULLS LAST
           ) AS rn
      FROM merged m
  )
  SELECT json_build_object(
    'teen_id',    r.teen_id,
    'name',       COALESCE(t.pseudo, t.first_name, 'Anonyme'),
    'level',      COALESCE(ux.current_level, 1),
    'last_seen',  au.last_sign_in_at,
    'similarity', ROUND(COALESCE(r.similarity, 0)::NUMERIC, 4),
    'source',     r.source
  )::JSON
    FROM ranked r
    JOIN public.teens t  ON t.id = r.teen_id
    LEFT JOIN public.user_xp ux ON ux.teen_id = r.teen_id
    LEFT JOIN auth.users au ON au.id = r.teen_id
   WHERE r.rn = 1
   ORDER BY CASE WHEN r.source = 'neighbours' THEN 0 ELSE 1 END,
            r.similarity DESC NULLS LAST,
            r.teen_id ASC
   LIMIT v_n;
END;
$$;

COMMENT ON FUNCTION public.recommend_friends(UUID, INT) IS
  'Wave-2 TICKET-021: returns up to N candidate opponents for the friend-challenge picker. Primary source = teen_neighbours.similarity; fallback = on-the-fly cosine over affinity_scores. Excludes self, accepted friends, and pending/active friend_challenges.';

GRANT EXECUTE ON FUNCTION public.recommend_friends(UUID, INT)
  TO authenticated, service_role;

COMMIT;
