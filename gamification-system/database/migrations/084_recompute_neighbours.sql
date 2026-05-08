-- =========================================================================
-- Migration 084 — recompute_neighbours RPC (Wave 3 / TICKET-034)
-- Date: 2026-05-08
-- Source: docs/vision/audit-content-personalization/TICKETS.md (TICKET-034)
--         docs/vision/personalization-engine.md
--
-- ─────────────────────────────────────────────────────────────────────────
-- Context
-- ─────────────────────────────────────────────────────────────────────────
-- TICKET-034 wires the missing nightly job that populates public.teen_neighbours
-- (currently 0 rows). Without it, the collaborative filtering branch of
-- recommend_for_teen_v2 and the primary path of recommend_friends (mig 079)
-- both fall back to on-the-fly cosine — fine for small N, useless at scale.
--
-- This migration adds:
--   * recompute_neighbours(p_teen_id, p_limit) — computes cosine similarity
--     between this teen's affinity_scores vector and every OTHER teen's
--     affinity vector, then UPSERTs the top-K (default 50) into
--     public.teen_neighbours.
--
-- The cron `app/api/cron/evolve-teen-profiles/route.ts` is extended in the
-- same Wave-3 ticket to call this RPC after each teen's affinity decay.
--
-- Idempotency: ON CONFLICT (teen_id, neighbour_id) DO UPDATE — re-running
-- replaces the stored similarity. Stale neighbours that fall out of the
-- top-K are removed for the same teen at the start of each run, so the
-- table never grows unboundedly per teen.
--
-- Guard: skip teens with fewer than 3 affinity_scores rows — not enough
-- signal to compute a meaningful neighbour set; the cron also enforces
-- this guard before calling.
--
-- AuthZ: SECURITY DEFINER. Intended for service_role / cron use only.
-- =========================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.recompute_neighbours(
  p_teen_id UUID,
  p_limit   INT DEFAULT 50
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n           INT := GREATEST(LEAST(COALESCE(p_limit, 50), 200), 1);
  v_caller_rows INT;
  v_upserted    INT := 0;
BEGIN
  IF p_teen_id IS NULL THEN
    RAISE EXCEPTION 'p_teen_id is required' USING ERRCODE = '22023';
  END IF;

  -- ──────────────────────────────────────────────────────────────────────
  -- Guard: caller teen must have at least 3 affinity rows. The cron also
  -- enforces this, but we double-guard here for direct calls.
  -- ──────────────────────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_caller_rows
    FROM public.affinity_scores
   WHERE teen_id = p_teen_id;

  IF v_caller_rows < 3 THEN
    RETURN 0;
  END IF;

  -- ──────────────────────────────────────────────────────────────────────
  -- Compute cosine similarity vs every OTHER teen with a non-empty profile.
  --
  --   cosine(A,B) = SUM(A.score * B.score) / (||A|| * ||B||)
  --
  -- Only candidates sharing >= 1 tag with the caller can have non-zero dot
  -- product, so we restrict candidate_vecs accordingly to bound the join.
  --
  -- Strategy: compute the new top-K once into a single CTE pipeline, then
  -- (1) DELETE rows that fell out, (2) UPSERT rows that remain. Both
  -- statements re-evaluate the same expression — cheap because the inner
  -- joins hit indexed tag/teen_id columns and N <= 200.
  -- ──────────────────────────────────────────────────────────────────────
  WITH caller_vec AS (
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
       AND a.tag IN (SELECT tag FROM caller_vec)
  ),
  candidate_norm AS (
    SELECT a.teen_id,
           NULLIF(SQRT(SUM((a.score::NUMERIC) * (a.score::NUMERIC))), 0) AS n
      FROM public.affinity_scores a
     WHERE a.teen_id IN (SELECT DISTINCT teen_id FROM candidate_vecs)
     GROUP BY a.teen_id
  ),
  dot_products AS (
    SELECT cv.teen_id, SUM(cv.s * cu.s) AS dot
      FROM candidate_vecs cv
      JOIN caller_vec cu ON cu.tag = cv.tag
     GROUP BY cv.teen_id
  ),
  scored AS (
    SELECT dp.teen_id AS neighbour_id,
           (dp.dot / (cn.n * (SELECT n FROM caller_norm)))::NUMERIC AS similarity
      FROM dot_products dp
      JOIN candidate_norm cn ON cn.teen_id = dp.teen_id
     WHERE (SELECT n FROM caller_norm) IS NOT NULL
       AND cn.n IS NOT NULL
       AND dp.dot > 0
  ),
  top_k AS (
    SELECT neighbour_id,
           -- Clamp into NUMERIC(5,4) range [-1,1].
           ROUND(GREATEST(LEAST(similarity, 1.0), -1.0), 4) AS similarity
      FROM scored
     ORDER BY similarity DESC NULLS LAST, neighbour_id ASC
     LIMIT v_n
  ),
  pruned AS (
    DELETE FROM public.teen_neighbours tn
     WHERE tn.teen_id = p_teen_id
       AND tn.neighbour_id NOT IN (SELECT tk.neighbour_id FROM top_k tk)
    RETURNING tn.neighbour_id
  ),
  upserted AS (
    INSERT INTO public.teen_neighbours (teen_id, neighbour_id, similarity, computed_at)
    SELECT p_teen_id, tk.neighbour_id, tk.similarity, NOW()
      FROM top_k tk
    ON CONFLICT (teen_id, neighbour_id) DO UPDATE
      SET similarity  = EXCLUDED.similarity,
          computed_at = EXCLUDED.computed_at
    RETURNING neighbour_id
  )
  SELECT (SELECT COUNT(*) FROM upserted) + (SELECT 0 * COUNT(*) FROM pruned)
    INTO v_upserted;

  RETURN COALESCE(v_upserted, 0);
END;
$$;

COMMENT ON FUNCTION public.recompute_neighbours(UUID, INT) IS
  'Wave-3 TICKET-034: recompute the top-K nearest-neighbour set for one teen using cosine similarity over public.affinity_scores. Skips teens with < 3 affinity rows. Idempotent UPSERT into public.teen_neighbours; prunes stale rows that fall out of the top-K. Called nightly from app/api/cron/evolve-teen-profiles after affinity decay.';

GRANT EXECUTE ON FUNCTION public.recompute_neighbours(UUID, INT)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.recompute_neighbours(UUID, INT)
  FROM PUBLIC, anon, authenticated;

COMMIT;
