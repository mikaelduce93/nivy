/**
 * Wave 1.5 — Nightly evolve-teen-profiles cron.
 *
 * Runs daily at 02:00 UTC (03:00 Africa/Casablanca). Calls the
 * `evolve_all_teens` RPC which loops every teen whose owning auth user
 * signed in within the last 90 days and refreshes their affinity_scores
 * by aggregating the past 30 days of behavioral_signals (decay=0.95^days)
 * plus a baseline floor from teen_interests (weight * 0.5).
 *
 * Auth: must be a Vercel cron invocation (`x-vercel-cron` header) OR carry
 *       `Authorization: Bearer <CRON_SECRET>` (env var).
 *
 * Returns the RPC result `{ teens_processed, total_rows_upserted }` plus
 * timing for observability.
 */

import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

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

  // ---- Run RPC ------------------------------------------------------------
  const { data, error } = await supabase.rpc("evolve_all_teens")

  const durationMs = Date.now() - startedAt

  if (error) {
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
    duration_ms: durationMs,
  })
}
