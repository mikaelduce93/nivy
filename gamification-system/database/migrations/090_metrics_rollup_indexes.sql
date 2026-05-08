-- =========================================================================
-- Migration 090 — recommendation metrics rollup support
-- TICKET-038 (V1.3-A — closes V1.2-Sprint Wave 4 V1 launch-blocker)
-- Date: 2026-05-08
--
-- ─────────────────────────────────────────────────────────────────────────
-- Context
-- ─────────────────────────────────────────────────────────────────────────
-- V1 audit (docs/vision/audit-content-personalization/wave4-reports/
-- V1_metrics_rollup.md) flagged TICKET-038 (recommendation_metrics_daily
-- rollup) as NOT_BUILT. Two layers were missing:
--
--   1. Source — `app/api/teen/recommendations/route.ts` and
--      `lib/quiz/server.ts` invoked the `recommend_for_teen` RPC but
--      never wrote what they served back into `content_recommendations`,
--      leaving the impression ledger empty.
--
--   2. Sink — no `app/api/cron/recommendation-metrics-rollup/route.ts`
--      existed and `vercel.json` had no entry to fire it.
--
-- This migration prepares the database side of the fix:
--
--   * Re-asserts the `recommendation_metrics_daily` table (it was created
--     live but never tracked in this repo's `migrations/` folder — see
--     the V1 audit §2.1). Idempotent CREATE TABLE IF NOT EXISTS.
--
--   * Adds indexes on `content_recommendations` that the daily cron's
--     aggregation depends on (date-bucket scan + status counter).
--
--   * Adds a small index on `recommendation_metrics_daily(date DESC)` so
--     the staleness monitor described in the V1 audit §7-(6) runs in O(1).
--
-- Out of scope (handled in Layer-1 / Layer-2 application code, not SQL):
--   * INSERT into content_recommendations from the recommendations route.
--   * UPDATE clicked_at / completed_at correlation in /quiz/[id] start.
--   * The cron route + vercel.json schedule.
-- =========================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Ensure `recommendation_metrics_daily` exists.
--    Schema is the canonical 6-column rollup table (date, content_type +
--    4 counters), PK = (date, content_type) so the cron's UPSERT is
--    idempotent on re-runs.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.recommendation_metrics_daily (
  date            DATE    NOT NULL,
  content_type    TEXT    NOT NULL,
  shown_count     INTEGER NOT NULL DEFAULT 0,
  clicked_count   INTEGER NOT NULL DEFAULT 0,
  completed_count INTEGER NOT NULL DEFAULT 0,
  novelty_count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, content_type)
);

COMMENT ON TABLE public.recommendation_metrics_daily IS
  'TICKET-038: per-day, per-content_type counters of served recommendations. Populated nightly at 23:00 UTC by /api/cron/recommendation-metrics-rollup, sourcing from content_recommendations.';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Indexes on content_recommendations needed by the rollup aggregation.
--
--    The cron's WHERE clause filters by `recommended_at::date`. The
--    existing `idx_recommendations_unique_per_day` UNIQUE INDEX on
--    (teen_id, content_type, content_id, to_utc_date(recommended_at))
--    is teen-prefixed, so it cannot serve a date-only scan. Add a
--    dedicated date-prefix index. We index on the same `to_utc_date`
--    expression to match the cron's WHERE.
-- ─────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_recommendations_recommended_at_date
  ON public.content_recommendations (public.to_utc_date(recommended_at), content_type);

-- Click/complete correlation in Layer-1 looks up rows by
-- (teen_id, content_id, recommended_at >= now() - 24h). The existing
-- `idx_recommendations_teen` covers (teen_id, status) but not content_id,
-- and the unique-per-day index is fine for an exact-day match. Add a
-- partial index that is small but exact for the correlation hot path.
CREATE INDEX IF NOT EXISTS idx_recommendations_correlate
  ON public.content_recommendations (teen_id, content_id, recommended_at DESC);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Tiny helper index on the rollup table — supports the staleness probe
--    `MAX(date) FROM recommendation_metrics_daily` recommended in the
--    V1 audit. The PK already orders (date, content_type) so this is
--    technically redundant for current Postgres versions, but explicit
--    intent helps future ops who add date-only queries.
-- ─────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_recommendation_metrics_daily_date_desc
  ON public.recommendation_metrics_daily (date DESC);

COMMIT;
