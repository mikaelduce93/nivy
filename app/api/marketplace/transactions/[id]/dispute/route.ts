/**
 * POST /api/marketplace/transactions/:id/dispute
 * Body: { reason: string }
 * Either party may open a dispute within 7 days of escrow.
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const userInfo = await getUserRole()
  if (!userInfo) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 })
  const userId = userInfo.role === "teen" ? (userInfo.teenData?.id || userInfo.profileId) : userInfo.profileId
  if (!userId) return NextResponse.json({ success: false, error: "no_profile" }, { status: 400 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const reason = String(body.reason ?? "").trim()
  if (reason.length < 5) return NextResponse.json({ success: false, error: "reason_required" }, { status: 400 })

  const sb = createServiceRoleClient()
  const { data, error } = await sb.rpc("open_dispute", {
    p_transaction_id: id,
    p_user_id: userId,
    p_reason: reason,
  })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
