/**
 * POST /api/marketplace/transactions/:id/confirm-receipt
 * Buyer confirms receipt → release escrow, credit seller, cashback XP to buyer.
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const userInfo = await getUserRole()
  if (!userInfo) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 })
  const buyerId = userInfo.role === "teen" ? (userInfo.teenData?.id || userInfo.profileId) : userInfo.profileId
  if (!buyerId) return NextResponse.json({ success: false, error: "no_profile" }, { status: 400 })

  const sb = createServiceRoleClient()
  const { data, error } = await sb.rpc("confirm_receipt", {
    p_transaction_id: id,
    p_buyer_id: buyerId,
  })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
