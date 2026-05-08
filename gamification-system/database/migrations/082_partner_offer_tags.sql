-- ============================================================
-- Migration 082: Partner offer tags hardening + taxonomy backfill
-- ============================================================
-- TICKET-030 [partner-defi] Backfill tags on partner_offers
-- (taxonomy match)
--
-- WHY
--   Migration 074 stabilized the partner_offers schema and the
--   route at /api/partner/offers already writes a `tags TEXT[]`
--   array (canonical column). However:
--     * The DDL for `tags` was never an explicit, idempotent
--       statement in a numbered migration (it lived in the
--       initial table definition), which made the recovery story
--       fragile if the column ever drifted.
--     * Existing rows authored before TICKET-001/070 may carry
--       empty `tags` arrays even though their `applicable_categories`
--       or `offer_type` already encode a category that maps 1:1
--       onto the canonical `interest_taxonomy`.
--     * The recommender's `affinity_match` (see migration 052)
--       requires ≥1 taxonomy tag per row to score >0 — empty
--       `tags` silently zeros out partner offers in the feed.
--
-- WHAT
--   1. Re-assert `tags TEXT[]` on `partner_offers` (IF NOT EXISTS,
--      defaults to '{}').
--   2. Re-assert the GIN index on `tags` (IF NOT EXISTS).
--   3. Backfill `tags` from `applicable_categories` for rows where
--      `tags` is empty AND at least one entry in
--      `applicable_categories` is a valid taxonomy tag. This is a
--      pure no-op for any row whose categories never matched the
--      closed set.
--
-- WHAT IT DOES NOT DO
--   * It does NOT enforce a CHECK constraint on tags ⊆ taxonomy at
--     the DB layer. The closed-set guard is enforced at the API
--     layer (POST /api/partner/offers, this same ticket) so that
--     legacy rows can keep being read while the cron `tag-normalize`
--     job (already shipped in app/api/cron/tag-normalize) sweeps
--     drift offline.
--   * It does NOT touch `applicable_categories`; that column has
--     different semantics (merchant-side product category) and is
--     not part of the recommender's signal.
--
-- IDEMPOTENT
--   Re-running is a no-op: ADD COLUMN IF NOT EXISTS, CREATE INDEX
--   IF NOT EXISTS, and the backfill skips rows that already have
--   a non-empty `tags` array.
-- ============================================================

BEGIN;

-- ---------- 1. Ensure tags column exists --------------------------------
ALTER TABLE partner_offers
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- ---------- 2. GIN index for tag-overlap queries ------------------------
-- Used by the recommender (`tags && teen_interest_tags`) and by any
-- future "offers matching this tag" admin filter.
CREATE INDEX IF NOT EXISTS idx_partner_offers_tags_gin
  ON partner_offers USING GIN (tags);

-- ---------- 3. Backfill empty tags from applicable_categories -----------
-- For rows that never received tags, lift any value out of
-- `applicable_categories` that already happens to match the canonical
-- `interest_taxonomy`. Capped at 5 entries to mirror the API-layer
-- write-time validation (TICKET-030 acceptance: 0-5 tags).
WITH candidates AS (
  SELECT
    po.id,
    ARRAY(
      SELECT DISTINCT cat
      FROM unnest(COALESCE(po.applicable_categories, ARRAY[]::TEXT[])) AS cat
      WHERE cat IN (
        SELECT tag FROM interest_taxonomy WHERE is_active = true
      )
      LIMIT 5
    ) AS picked
  FROM partner_offers po
  WHERE COALESCE(array_length(po.tags, 1), 0) = 0
    AND po.applicable_categories IS NOT NULL
)
UPDATE partner_offers po
SET tags = c.picked
FROM candidates c
WHERE po.id = c.id
  AND array_length(c.picked, 1) IS NOT NULL
  AND array_length(c.picked, 1) > 0;

-- ---------- 4. Telemetry breadcrumb -------------------------------------
DO $$
DECLARE
  v_total INTEGER;
  v_with_tags INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM partner_offers;
  SELECT COUNT(*) INTO v_with_tags
  FROM partner_offers
  WHERE COALESCE(array_length(tags, 1), 0) > 0;

  -- audit_logs may or may not exist depending on environment; guard.
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='audit_logs'
  ) THEN
    INSERT INTO audit_logs (action, resource_type, metadata, created_at)
    VALUES (
      'migration_apply',
      'partner_offers',
      jsonb_build_object(
        'migration', '082_partner_offer_tags',
        'rows_total', v_total,
        'rows_with_tags', v_with_tags,
        'taxonomy', 'interest_taxonomy_v1'
      ),
      NOW()
    );
  END IF;
END $$;

COMMIT;
