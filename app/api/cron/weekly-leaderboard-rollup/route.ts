/**
 * W-D.11 — Weekly leaderboard rollup cron.
 *
 * Schedule: Saturday 22:00 UTC.
 * Computes weekly XP gain per teen from `xp_transactions` over the last 7
 * days and upserts into `weekly_leaderboard_snapshots`. Used to render
 * /teen/leaderboard with a STABLE weekly ranking that doesn't drift
 * intra-day.
 *
 * NOTE: `weekly_leaderboard_snapshots` does NOT yet exist on staging. The
 * cron self-detects and returns `{ skipped: true }` — once the table is
 * added (recommended schema below), the cron starts populating without code
 * changes.
 *
 * Recommended schema (follow-up migration):
 *   create table weekly_leaderboard_snapshots (
 *     week_starting date not null,
 *     teen_id uuid not null references teens(id),
 *     total_xp integer not null default 0,
 *     rank integer not null,
 *     created_at timestamptz default now(),
 *     primary key (week_starting, teen_id)
 *   );
 *
 * Auth: Vercel cron header OR Bearer CRON_SECRET, fail-CLOSED.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function weekStartingMonday(now: Date): string {
  // Returns YYYY-MM-DD for the Monday of the week ending now.
  const d = new Date(now)
  const day = d.getUTCDay() // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7 // Monday=0
  d.setUTCDate(d.getUTCDate() - diff)
  return d.toISOString().slice(0, 10)
}

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

  // Probe the snapshot table.
  const { error: probeErr } = await supabase
    .from("weekly_leaderboard_snapshots")
    .select("teen_id", { count: "exact", head: true })
    .limit(1)
  if (probeErr) {
    console.warn(
      "[cron/weekly-leaderboard-rollup] snapshots table missing:",
      probeErr.message,
    )
    return NextResponse.json({
      skipped: true,
      reason:
        "weekly_leaderboard_snapshots table does not exist; cron is a stub awaiting migration",
      duration_ms: Date.now() - startedAt,
    })
  }

  const now = new Date()
  const sinceIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const weekStarting = weekStartingMonday(now)

  // Aggregate XP per teen over last 7 days.
  const { data: rows, error: txErr } = await supabase
    .from("xp_transactions")
    .select("teen_id, amount")
    .gte("created_at", sinceIso)

  if (txErr) {
    console.error("[cron/weekly-leaderboard-rollup] xp query failed:", txErr)
    return NextResponse.json(
      { error: "Failed to query xp_transactions", detail: txErr.message },
      { status: 500 },
    )
  }

  const totals = new Map<string, number>()
  for (const r of rows ?? []) {
    if (!r.teen_id) continue
    totals.set(r.teen_id, (totals.get(r.teen_id) ?? 0) + Number(r.amount ?? 0))
  }

  const ranked = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([teen_id, total_xp], idx) => ({
      week_starting: weekStarting,
      teen_id,
      total_xp,
      rank: idx + 1,
    }))

  let upserted = 0
  if (ranked.length > 0) {
    // Upsert in chunks to avoid payload limits.
    const CHUNK = 500
    for (let i = 0; i < ranked.length; i += CHUNK) {
      const chunk = ranked.slice(i, i + CHUNK)
      const { error: upErr } = await supabase
        .from("weekly_leaderboard_snapshots")
        .upsert(chunk, { onConflict: "week_starting,teen_id" })
      if (upErr) {
        console.error(
          `[cron/weekly-leaderboard-rollup] upsert chunk ${i} failed:`,
          upErr,
        )
      } else {
        upserted += chunk.length
      }
    }
  }

  return NextResponse.json({
    week_starting: weekStarting,
    teens_ranked: ranked.length,
    rows_upserted: upserted,
    duration_ms: Date.now() - startedAt,
  })
}
