/**
 * V1.3-A — Daily recommendation metrics rollup cron (TICKET-038).
 *
 * Runs daily at 23:00 UTC (00:00 Africa/Casablanca) — i.e. immediately
 * after the UTC day to roll up has fully closed. The job aggregates the
 * impression ledger in `content_recommendations` (filled at runtime by
 * `app/api/teen/recommendations/route.ts` and `lib/quiz/server.ts`) into
 * the per-day, per-content_type counter table `recommendation_metrics_daily`.
 *
 * The aggregation uses the row's `recommended_at` (UTC) as the bucket date
 * and reads the row's terminal `status` to derive the four counters:
 *
 *   shown_count     = COUNT(*) over rows with status IN
 *                       ('shown','accepted','completed','rejected','expired')
 *                     — anything that was actually served.
 *   clicked_count   = COUNT(*) over rows with status IN ('accepted','completed')
 *   completed_count = COUNT(*) over rows with status = 'completed'
 *   novelty_count   = COUNT(*) over rows with
 *                       (recommendation_factors->>'nov')::numeric >= 0.5
 *
 * Auth: must be a Vercel cron invocation (`x-vercel-cron` header) OR carry
 *       `Authorization: Bearer <CRON_SECRET>` (env). Mirrors the canonical
 *       fail-closed pattern from `app/api/cron/evolve-teen-profiles/route.ts`
 *       (Wave A.7 / V1.2-Sprint).
 *
 * Idempotency: ON CONFLICT (date, content_type) DO UPDATE — re-running the
 * cron on the same UTC day overwrites the prior counts with the latest
 * snapshot. Safe to retrigger manually for backfills.
 *
 * Empty days: yesterday may yield zero rows (cold start, no served recs);
 * this is acceptable per V1 audit §6 — the cron logs `rows_upserted: 0`
 * and exits 200. The staleness probe described in V1 audit §7-(6) treats
 * "no row for date" the same as "row with all zeros" — both pass.
 */

import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Yesterday at UTC midnight as YYYY-MM-DD. The aggregation window is
// [yesterday 00:00:00 UTC, today 00:00:00 UTC), exclusive of the boundary
// to avoid double-counting if the cron drifts a few seconds.
function yesterdayUtcIso(): {
  startIso: string
  endIso: string
  dateStr: string
} {
  const now = new Date()
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
  const yesterdayUtc = new Date(todayUtc.getTime() - 24 * 60 * 60 * 1000)
  const dateStr = yesterdayUtc.toISOString().slice(0, 10)
  return {
    startIso: yesterdayUtc.toISOString(),
    endIso: todayUtc.toISOString(),
    dateStr,
  }
}

interface ImpressionRow {
  content_type: string | null
  status: string | null
  recommendation_factors: Record<string, unknown> | null
}

interface AggBucket {
  shown: number
  clicked: number
  completed: number
  novelty: number
}

const SHOWN_STATUSES = new Set([
  "shown",
  "accepted",
  "completed",
  "rejected",
  "expired",
])
const CLICKED_STATUSES = new Set(["accepted", "completed"])

export async function GET(request: Request) {
  // ---- Authorization ------------------------------------------------------
  // Canonical fail-closed pattern (Wave A.7) — copied verbatim from
  // app/api/cron/evolve-teen-profiles/route.ts. Reject anything that
  // isn't either a Vercel cron header or a valid bearer.
  const isVercelCron = request.headers.get("x-vercel-cron") !== null
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  const hasValidBearer =
    typeof cronSecret === "string" &&
    cronSecret.length > 0 &&
    authHeader === `Bearer ${cronSecret}`

  if (!isVercelCron && !hasValidBearer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const startedAt = Date.now()
  const { startIso, endIso, dateStr } = yesterdayUtcIso()

  // ---- 1. Pull yesterday's impression rows --------------------------------
  // We pull (content_type, status, recommendation_factors) only — this is
  // narrow enough to fit a few thousand rows in memory comfortably (target
  // P95 daily volume per spec is < 50k impressions across all teens).
  // Pagination: PostgREST default limit is 1000; loop until we get fewer
  // than the page size to avoid silent truncation on a busy day.
  const PAGE = 1000
  const rows: ImpressionRow[] = []
  let from = 0
  let pageRows: ImpressionRow[] = []
  do {
    const { data, error } = await supabase
      .from("content_recommendations")
      .select("content_type, status, recommendation_factors")
      .gte("recommended_at", startIso)
      .lt("recommended_at", endIso)
      .range(from, from + PAGE - 1)

    if (error) {
      const durationMs = Date.now() - startedAt
      console.error(
        "[cron/recommendation-metrics-rollup] fetch failed:",
        error,
      )
      try {
        await supabase.from("admin_audit_logs").insert({
          user_id: null,
          action: "cron.recommendation_metrics_rollup",
          target_type: "system",
          target_id: null,
          payload: {
            ok: false,
            phase: "fetch_impressions",
            date: dateStr,
            error: error.message,
            duration_ms: durationMs,
            triggered_by: isVercelCron ? "vercel-cron" : "bearer",
          },
        })
      } catch (auditErr) {
        console.error(
          "[cron/recommendation-metrics-rollup] audit log insert failed:",
          auditErr,
        )
      }
      return NextResponse.json(
        { error: "fetch_impressions failed", detail: error.message },
        { status: 500 },
      )
    }

    pageRows = (data ?? []) as ImpressionRow[]
    rows.push(...pageRows)
    from += PAGE
  } while (pageRows.length === PAGE)

  // ---- 2. Aggregate per content_type --------------------------------------
  const buckets = new Map<string, AggBucket>()
  for (const r of rows) {
    const ct = (r.content_type ?? "").trim()
    if (!ct) continue
    const status = (r.status ?? "").trim()
    let bucket = buckets.get(ct)
    if (!bucket) {
      bucket = { shown: 0, clicked: 0, completed: 0, novelty: 0 }
      buckets.set(ct, bucket)
    }
    if (SHOWN_STATUSES.has(status)) bucket.shown += 1
    if (CLICKED_STATUSES.has(status)) bucket.clicked += 1
    if (status === "completed") bucket.completed += 1

    const factors = r.recommendation_factors
    const novRaw =
      factors && typeof factors === "object"
        ? (factors as Record<string, unknown>)["nov"]
        : null
    const novNum = typeof novRaw === "number" ? novRaw : Number(novRaw)
    if (Number.isFinite(novNum) && novNum >= 0.5) bucket.novelty += 1
  }

  // ---- 3. UPSERT into recommendation_metrics_daily ------------------------
  const upsertPayload = Array.from(buckets.entries()).map(([content_type, b]) => ({
    date: dateStr,
    content_type,
    shown_count: b.shown,
    clicked_count: b.clicked,
    completed_count: b.completed,
    novelty_count: b.novelty,
  }))

  let rowsUpserted = 0
  if (upsertPayload.length > 0) {
    const { error: upErr, data: upData } = await supabase
      .from("recommendation_metrics_daily")
      .upsert(upsertPayload, { onConflict: "date,content_type" })
      .select("content_type")

    if (upErr) {
      const durationMs = Date.now() - startedAt
      console.error(
        "[cron/recommendation-metrics-rollup] upsert failed:",
        upErr,
      )
      try {
        await supabase.from("admin_audit_logs").insert({
          user_id: null,
          action: "cron.recommendation_metrics_rollup",
          target_type: "system",
          target_id: null,
          payload: {
            ok: false,
            phase: "upsert_metrics",
            date: dateStr,
            impression_rows: rows.length,
            error: upErr.message,
            duration_ms: durationMs,
            triggered_by: isVercelCron ? "vercel-cron" : "bearer",
          },
        })
      } catch (auditErr) {
        console.error(
          "[cron/recommendation-metrics-rollup] audit log insert failed:",
          auditErr,
        )
      }
      return NextResponse.json(
        { error: "upsert_metrics failed", detail: upErr.message },
        { status: 500 },
      )
    }
    rowsUpserted = upData?.length ?? upsertPayload.length
  }

  const durationMs = Date.now() - startedAt

  // ---- 4. Audit log (best effort) -----------------------------------------
  try {
    await supabase.from("admin_audit_logs").insert({
      user_id: null,
      action: "cron.recommendation_metrics_rollup",
      target_type: "system",
      target_id: null,
      payload: {
        ok: true,
        date: dateStr,
        impression_rows: rows.length,
        content_types: upsertPayload.length,
        rows_upserted: rowsUpserted,
        duration_ms: durationMs,
        triggered_by: isVercelCron ? "vercel-cron" : "bearer",
      },
    })
  } catch (auditErr) {
    console.error(
      "[cron/recommendation-metrics-rollup] audit log insert failed:",
      auditErr,
    )
  }

  return NextResponse.json({
    ok: true,
    date: dateStr,
    impression_rows: rows.length,
    content_types: upsertPayload.length,
    rows_upserted: rowsUpserted,
    duration_ms: durationMs,
  })
}
