/**
 * POST /api/partner/restaurant/orders/:id/reject — partner rejects, refunds coins atomically.
 *
 * Wave 4C — adds defence-in-depth ownership check (see accept/route.ts).
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

  const { data: partner } = await admin
    .from("partners")
    .select("id")
    .eq("email", userInfo.email!)
    .maybeSingle()
  if (!partner) {
    return NextResponse.json({ success: false, error: "Partenaire introuvable" }, { status: 404 })
  }

  const { data: order } = await admin
    .from("food_orders")
    .select("id, partner_id, status")
    .eq("id", id)
    .maybeSingle()
  if (!order) {
    return NextResponse.json({ success: false, error: "Commande introuvable" }, { status: 404 })
  }
  if (order.partner_id !== partner.id) {
    return NextResponse.json({ success: false, error: "not_order_owner" }, { status: 403 })
  }
  if (order.status !== "pending" && order.status !== "accepted") {
    return NextResponse.json(
      { success: false, error: "invalid_status", status: order.status },
      { status: 409 },
    )
  }

  const { data, error } = await admin.rpc("partner_reject_food_order", {
    p_order_id: id,
    p_reason: reason,
  })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
