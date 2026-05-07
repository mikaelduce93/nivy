/**
 * Wave 2.4 — Marketplace escrow auto-release.
 *
 * Runs daily at 06:00 UTC (registered in vercel.json).
 * For every escrow tx older than 3 days with no open dispute, calls
 * confirm_receipt() so the seller is paid and the buyer earns cashback XP.
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

  const { data, error } = await sb.rpc("marketplace_auto_release_escrow")
  if (error) {
    console.error("[cron/marketplace-escrow-release] RPC failed:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = Array.isArray(data) ? data : []
  const released = rows.filter((r: { status?: string }) => r.status === "completed").length
  const errors = rows.filter((r: { error?: string | null }) => r.error).length
  const durationMs = Date.now() - startedAt

  try {
    await sb.from("admin_audit_logs").insert({
      user_id: null,
      action: "cron.marketplace_escrow_release",
      target_type: "system",
      target_id: null,
      payload: { released, errors, duration_ms: durationMs, rows },
    })
  } catch (e) {
    console.error("[cron/marketplace-escrow-release] audit log insert failed:", e)
  }

  return NextResponse.json({ released, errors, duration_ms: durationMs, rows })
}
