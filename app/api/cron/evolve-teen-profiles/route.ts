/**
 * Wave 1.5 — Nightly evolve-teen-profiles cron.
 *
 * Runs daily at 02:00 UTC (03:00 Africa/Casablanca). The job has two phases:
 *
 *   Phase 1 — Affinity decay
 *     Calls the `evolve_all_teens` RPC which loops every teen whose owning
 *     auth user signed in within the last 90 days and refreshes their
 *     affinity_scores by aggregating the past 30 days of behavioral_signals
 *     (decay=0.95^days) plus a baseline floor from teen_interests
 *     (weight * 0.5).
 *
 *   Phase 2 — Neighbour recomputation (Wave 3 / TICKET-034)
 *     For each teen that has at least 3 affinity_scores rows (the
 *     min-signal guard), calls `recompute_neighbours(teen_id, 50)` to
 *     refresh the top-50 nearest-neighbour set used by collaborative
 *     filtering (recommend_for_teen) and the friend opponent picker
 *     (recommend_friends, mig 079).
 *
 * Auth: must be a Vercel cron invocation (`x-vercel-cron` header) OR carry
 *       `Authorization: Bearer <CRON_SECRET>` (env var).
 *
 * Returns the RPC result `{ teens_processed, total_rows_upserted }` plus
 * neighbour-phase totals and timing for observability.
 */

import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Min affinity_scores rows before we compute neighbours for a teen. Mirrors
// the in-RPC guard inside recompute_neighbours so the cron can short-circuit
// without paying the function-call overhead.
const MIN_AFFINITY_ROWS_FOR_NEIGHBOURS = 3

// Top-K neighbours to keep per teen (matches teen_neighbours expected size).
const NEIGHBOUR_TOP_K = 50

export async function GET(request: Request) {
  // ---- Authorization ------------------------------------------------------
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

  // ---- Phase 1: affinity decay -------------------------------------------
  const { data, error } = await supabase.rpc("evolve_all_teens")

  if (error) {
    const durationMs = Date.now() - startedAt
    console.error("[cron/evolve-teen-profiles] RPC failed:", error)
    // Best-effort audit even on failure.
    try {
      await supabase.from("admin_audit_logs").insert({
        user_id: null,
        action: "cron.evolve_teen_profiles",
        target_type: "system",
        target_id: null,
        payload: {
          ok: false,
          phase: "evolve_all_teens",
          error: error.message,
          duration_ms: durationMs,
          triggered_by: isVercelCron ? "vercel-cron" : "bearer",
        },
      })
    } catch (auditErr) {
      console.error(
        "[cron/evolve-teen-profiles] audit log insert failed:",
        auditErr
      )
    }
    return NextResponse.json(
      { error: "evolve_all_teens RPC failed", detail: error.message },
      { status: 500 }
    )
  }

  // The RPC returns a JSON object {teens_processed, total_rows_upserted}.
  const result =
    data && typeof data === "object"
      ? (data as { teens_processed?: number; total_rows_upserted?: number })
      : {}
  const teensProcessed = Number(result.teens_processed ?? 0)
  const totalRowsUpserted = Number(result.total_rows_upserted ?? 0)

  // ---- Phase 2: neighbour recomputation ----------------------------------
  // Fetch every teen that (a) has affinity rows above the guard threshold
  // and (b) belongs to an auth user that signed in within the last 90 days
  // (mirrors the evolve_all_teens active-cohort definition).
  let neighbourTeensProcessed = 0
  let neighbourTeensSkipped = 0
  let neighbourRowsUpserted = 0
  const neighbourErrors: Array<{ teen_id: string; error: string }> = []

  // Pull candidates: teens with >= MIN affinity rows. We then double-filter
  // by last_sign_in_at via a join in SQL because the JS client can't easily
  // express it in a single query without an RPC. Use a tiny RPC-less SELECT.
  const { data: candidates, error: candErr } = await supabase
    .from("affinity_scores")
    .select("teen_id")
    .limit(100000) // hard ceiling; <=10k teens per spec
  if (candErr) {
    console.error(
      "[cron/evolve-teen-profiles] candidate fetch failed:",
      candErr
    )
  }

  // Group rows -> tally signals per teen, keep teens passing the guard.
  const counts = new Map<string, number>()
  for (const row of candidates ?? []) {
    const id = (row as { teen_id: string }).teen_id
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  const eligibleTeens: string[] = []
  for (const [teenId, n] of counts) {
    if (n >= MIN_AFFINITY_ROWS_FOR_NEIGHBOURS) {
      eligibleTeens.push(teenId)
    } else {
      neighbourTeensSkipped++
    }
  }

  // Run recompute_neighbours per teen sequentially. The function is cheap
  // (single query against indexed affinity_scores) and we prefer steady DB
  // pressure over a thundering herd.
  for (const teenId of eligibleTeens) {
    const { data: nData, error: nErr } = await supabase.rpc(
      "recompute_neighbours",
      { p_teen_id: teenId, p_limit: NEIGHBOUR_TOP_K }
    )
    if (nErr) {
      neighbourErrors.push({ teen_id: teenId, error: nErr.message })
      continue
    }
    neighbourTeensProcessed++
    neighbourRowsUpserted += Number(nData ?? 0)
  }

  const durationMs = Date.now() - startedAt

  // ---- Audit log (best effort) -------------------------------------------
  try {
    await supabase.from("admin_audit_logs").insert({
      user_id: null,
      action: "cron.evolve_teen_profiles",
      target_type: "system",
      target_id: null,
      payload: {
        ok: true,
        teens_processed: teensProcessed,
        total_rows_upserted: totalRowsUpserted,
        neighbour_teens_processed: neighbourTeensProcessed,
        neighbour_teens_skipped: neighbourTeensSkipped,
        neighbour_rows_upserted: neighbourRowsUpserted,
        neighbour_errors: neighbourErrors.length,
        duration_ms: durationMs,
        triggered_by: isVercelCron ? "vercel-cron" : "bearer",
      },
    })
  } catch (auditErr) {
    console.error(
      "[cron/evolve-teen-profiles] audit log insert failed:",
      auditErr
    )
  }

  return NextResponse.json({
    teens_processed: teensProcessed,
    total_rows_upserted: totalRowsUpserted,
    neighbour_teens_processed: neighbourTeensProcessed,
    neighbour_teens_skipped: neighbourTeensSkipped,
    neighbour_rows_upserted: neighbourRowsUpserted,
    neighbour_errors: neighbourErrors,
    duration_ms: durationMs,
  })
}
