/**
 * W3.2 — Quest assignment cron.
 *
 * Runs daily at 00:05 Africa/Casablanca (registered in `vercel.json`).
 * For every teen whose owning auth user has signed in within the last 90 days,
 * calls the `assign_missions_for_teen` RPC to top them up to:
 *   3 active daily / 3 weekly / 3 monthly / 1 seasonal mission.
 *
 * Selection logic (TICKET-037, migration 086):
 *   The RPC ranks candidate `mission_templates` by SUM(affinity_scores.score
 *   WHERE tag = ANY(mission.tags)) with a random tiebreaker. Teens with
 *   zero affinity rows (cold start) fall back to ORDER BY random(). Each
 *   inserted `user_missions` row carries `assigned_via = 'profile' |
 *   'fallback'` for observability. The cron route stays minimal: all
 *   ranking/decisioning lives in the RPC.
 *
 * Auth: must be a Vercel cron invocation (`x-vercel-cron` header) OR carry
 *       `Authorization: Bearer <CRON_SECRET>` (env var).
 *
 * Returns `{ teens_processed, missions_assigned }` plus a per-teen breakdown
 * for observability.
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

  // ---- Pick teens with recently-active auth users ------------------------
  // We use the auth schema view via .rpc() for 90-day filter — simpler to do
  // with a direct query against auth.users joined to public.teens.
  // The service-role key bypasses RLS so we can hit auth.users directly.
  const { data: teenRows, error: teensErr } = await supabase
    .schema("auth")
    .from("users")
    .select("id, last_sign_in_at")
    .gte(
      "last_sign_in_at",
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    )

  if (teensErr) {
    console.error("[cron/assign-missions] auth.users query failed:", teensErr)
    return NextResponse.json(
      { error: "Failed to enumerate active users", detail: teensErr.message },
      { status: 500 }
    )
  }

  const candidateIds = (teenRows ?? []).map((r: { id: string }) => r.id)

  // Filter down to those that actually exist in public.teens.
  let activeTeenIds: string[] = []
  if (candidateIds.length > 0) {
    const { data: matched, error: teensTblErr } = await supabase
      .from("teens")
      .select("id")
      .in("id", candidateIds)

    if (teensTblErr) {
      console.error("[cron/assign-missions] teens query failed:", teensTblErr)
      return NextResponse.json(
        { error: "Failed to enumerate teens", detail: teensTblErr.message },
        { status: 500 }
      )
    }
    activeTeenIds = (matched ?? []).map((r: { id: string }) => r.id)
  }

  // ---- Fan out RPC calls --------------------------------------------------
  let missionsAssigned = 0
  const perTeen: Array<{ teen_id: string; inserted: number; error?: string }> = []

  for (const teenId of activeTeenIds) {
    const { data, error } = await supabase.rpc("assign_missions_for_teen", {
      p_teen_id: teenId,
    })
    if (error) {
      console.error(
        `[cron/assign-missions] RPC failed for teen ${teenId}:`,
        error
      )
      perTeen.push({ teen_id: teenId, inserted: 0, error: error.message })
      continue
    }
    const inserted = typeof data === "number" ? data : Number(data ?? 0)
    missionsAssigned += inserted
    perTeen.push({ teen_id: teenId, inserted })
  }

  const teensProcessed = activeTeenIds.length
  const durationMs = Date.now() - startedAt

  // ---- Profile-vs-fallback breakdown for today (observability) ----------
  // Count how many of *today's* inserts came from each path. Cheap aggregate:
  // since the cron just ran, the set of rows inserted in the last few seconds
  // is bounded by missionsAssigned. We use a window since `startedAt` instead
  // of trying to thread row ids back from the RPC.
  let assignedViaBreakdown: Record<string, number> = {}
  try {
    const { data: viaRows } = await supabase
      .from("user_missions")
      .select("assigned_via")
      .gte("created_at", new Date(startedAt).toISOString())
    if (Array.isArray(viaRows)) {
      assignedViaBreakdown = viaRows.reduce(
        (acc: Record<string, number>, row: { assigned_via: string | null }) => {
          const k = row.assigned_via ?? "unknown"
          acc[k] = (acc[k] ?? 0) + 1
          return acc
        },
        {}
      )
    }
  } catch (breakdownErr) {
    console.error(
      "[cron/assign-missions] assigned_via breakdown failed:",
      breakdownErr
    )
  }

  // ---- Audit log (best effort) -------------------------------------------
  try {
    await supabase.from("admin_audit_logs").insert({
      user_id: null,
      action: "cron.assign_missions",
      target_type: "system",
      target_id: null,
      payload: {
        teens_processed: teensProcessed,
        missions_assigned: missionsAssigned,
        duration_ms: durationMs,
        per_teen: perTeen,
        assigned_via_breakdown: assignedViaBreakdown,
        triggered_by: isVercelCron ? "vercel-cron" : "bearer",
      },
    })
  } catch (auditErr) {
    console.error("[cron/assign-missions] audit log insert failed:", auditErr)
  }

  return NextResponse.json({
    teens_processed: teensProcessed,
    missions_assigned: missionsAssigned,
    duration_ms: durationMs,
    per_teen: perTeen,
    assigned_via_breakdown: assignedViaBreakdown,
  })
}
