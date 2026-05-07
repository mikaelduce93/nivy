/**
 * V1.1 P2.5 — Mentorship safety / recording retention cron.
 *
 * Calls `prune_expired_mentor_recordings()` once a day. The RPC hard-deletes
 * any `mentor_session_recordings` row whose `expires_at` (recorded_at +
 * 90 days) is in the past, plus its underlying object in the private
 * `mentor-recordings` storage bucket. CNDP / Loi 09-08 retention guard.
 *
 * Schedule: 0 2 * * *  (UTC 02:00 → 03:00 Casablanca, UTC+1 year-round)
 *
 * Auth: Vercel cron header OR `Authorization: Bearer <CRON_SECRET>` —
 * canonical fail-closed pattern from Wave A.7. If CRON_SECRET is unset
 * AND the call is not from Vercel cron, the route returns 401.
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
    typeof cronSecret === "string" &&
    cronSecret.length > 0 &&
    authHeader === `Bearer ${cronSecret}`

  if (!isVercelCron && !hasValidBearer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sb = createServiceRoleClient()
  const startedAt = Date.now()

  const { data, error } = await sb.rpc("prune_expired_mentor_recordings")

  if (error) {
    // Best-effort audit on failure
    try {
      await sb.from("admin_audit_logs").insert({
        user_id: null,
        action: "cron.mentor_recording_retention.failed",
        target_type: "system",
        target_id: null,
        payload: { error: error.message, duration_ms: Date.now() - startedAt },
      })
    } catch {
      // ignore
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const pruned = typeof data === "number" ? data : 0

  try {
    await sb.from("admin_audit_logs").insert({
      user_id: null,
      action: "cron.mentor_recording_retention",
      target_type: "system",
      target_id: null,
      payload: { pruned, duration_ms: Date.now() - startedAt },
    })
  } catch {
    // best-effort
  }

  return NextResponse.json({
    ok: true,
    pruned,
    duration_ms: Date.now() - startedAt,
  })
}
