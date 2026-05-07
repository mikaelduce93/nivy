/**
 * W-D.11 — Quiz seen-history prune cron.
 *
 * Schedule: 03:30 Africa/Casablanca (= 02:30 UTC).
 * Whitepaper §29 #9 keeps the no-repeat invariant for 30 days. Older rows are
 * useless storage, so we prune them nightly.
 *
 * Note: schema column is `last_seen` (not `seen_at`).
 *
 * Auth: Vercel cron header OR Bearer CRON_SECRET, fail-CLOSED.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
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

  const startedAt = Date.now()
  const supabase = createServiceRoleClient()
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Probe table existence first.
  const { error: probeErr } = await supabase
    .from("quiz_seen_history")
    .select("teen_id", { count: "exact", head: true })
    .limit(1)
  if (probeErr) {
    console.warn(
      "[cron/quiz-seen-history-prune] table_missing or unreadable:",
      probeErr.message,
    )
    return NextResponse.json({
      skipped: true,
      reason: "quiz_seen_history table missing or unreadable",
      duration_ms: Date.now() - startedAt,
    })
  }

  const { error: delErr, count } = await supabase
    .from("quiz_seen_history")
    .delete({ count: "exact" })
    .lt("last_seen", cutoff)

  if (delErr) {
    console.error("[cron/quiz-seen-history-prune] delete failed:", delErr)
    return NextResponse.json(
      { error: "Delete failed", detail: delErr.message },
      { status: 500 },
    )
  }

  return NextResponse.json({
    cutoff,
    rows_deleted: count ?? 0,
    duration_ms: Date.now() - startedAt,
  })
}
