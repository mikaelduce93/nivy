/**
 * Wave 3.1 — Transport / mobility curfew cron.
 *
 * Runs daily at 22:00 UTC. Cancels any pending or approved teen ride scheduled
 * past 22:00 local without explicit `curfew_override`. Whitepaper §27 #34.
 *
 * Auth: Vercel cron header OR `Authorization: Bearer <CRON_SECRET>`.
 */
import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const isVercelCron = request.headers.get("x-vercel-cron") !== null
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  const hasValidBearer =
    typeof cronSecret === "string" && cronSecret.length > 0 && authHeader === `Bearer ${cronSecret}`
  if (!isVercelCron && !hasValidBearer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sb = createServiceRoleClient()
  const startedAt = Date.now()

  // Casablanca / Morocco is UTC+1 year-round; treat 22:00 local as 21:00 UTC.
  // Cancel any future ride scheduled after today's 21:00 UTC where override=false.
  const now = new Date()
  const todayCurfewUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 21, 0, 0)
  )
  const tomorrowCurfewUtc = new Date(todayCurfewUtc.getTime() + 24 * 60 * 60 * 1000)

  const { data: rides, error } = await sb
    .from("ride_bookings")
    .select("id, teen_id, parent_id, scheduled_for, status, curfew_override")
    .in("status", ["requested", "approved"])
    .eq("curfew_override", false)
    .gte("scheduled_for", todayCurfewUtc.toISOString())
    .lt("scheduled_for", tomorrowCurfewUtc.toISOString())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let cancelled = 0
  for (const r of rides ?? []) {
    const { error: upErr } = await sb
      .from("ride_bookings")
      .update({
        status: "cancelled",
        cancellation_reason: "curfew_22h",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", r.id)
    if (!upErr) cancelled++
  }

  try {
    await sb.from("admin_audit_logs").insert({
      user_id: null,
      action: "cron.ride_curfew_check",
      target_type: "system",
      target_id: null,
      payload: {
        candidates: rides?.length ?? 0,
        cancelled,
        duration_ms: Date.now() - startedAt,
      },
    })
  } catch {
    // best-effort
  }

  return NextResponse.json({
    candidates: rides?.length ?? 0,
    cancelled,
    duration_ms: Date.now() - startedAt,
  })
}
