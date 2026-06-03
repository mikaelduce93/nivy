/**
 * #211 Coach Niv — purge de rétention (mineurs / minimisation des données).
 *
 * Appelle `purge_coach_data(90)` une fois par mois. La RPC (SECURITY DEFINER,
 * migration 119 puis 121) supprime les résumés de conversation, les faits et
 * objectifs clos, et les avatar_messages "dismissed" de plus de 90 jours.
 *
 * Schedule (vercel.json): 0 3 1 * *  (mensuel, 03:00 UTC → 04:00 Casablanca).
 *
 * Auth: header Vercel cron OU `Authorization: Bearer <CRON_SECRET>` —
 * pattern fail-closed canonique (cf. mentor-recording-retention).
 */
import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const RETENTION_DAYS = 90

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

  const { error } = await sb.rpc("purge_coach_data", { p_days: RETENTION_DAYS })

  if (error) {
    try {
      await sb.from("audit_log").insert({
        actor_id: null,
        action: "cron.coach_retention_purge.failed",
        resource_type: "system",
        resource_id: null,
        metadata: { error: error.message, duration_ms: Date.now() - startedAt },
      })
    } catch {
      // best-effort
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  try {
    await sb.from("audit_log").insert({
      actor_id: null,
      action: "cron.coach_retention_purge",
      resource_type: "system",
      resource_id: null,
      metadata: { retention_days: RETENTION_DAYS, duration_ms: Date.now() - startedAt },
    })
  } catch {
    // best-effort
  }

  return NextResponse.json({
    ok: true,
    retention_days: RETENTION_DAYS,
    duration_ms: Date.now() - startedAt,
  })
}
