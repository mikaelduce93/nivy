/**
 * POST /api/partner/restaurant/orders/:id/reject — partner rejects, refunds coins atomically.
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "partner") {
    return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  const reason = (body?.reason as string) || "partner_rejected"

  const admin = createServiceRoleClient()
  const { data, error } = await admin.rpc("partner_reject_food_order", {
    p_order_id: id,
    p_reason: reason,
  })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
