/**
 * POST /api/partner/restaurant/orders/:id/accept — partner accepts an order.
 *
 * Wave 4C — adds defence-in-depth ownership check: the order's partner_id
 * must match the caller's partner_id before invoking the RPC. Without this
 * the RPC was the only line of defence; a partner_user_id mismatch would
 * surface as a generic RPC error instead of a clean 403/404.
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "partner") {
    return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
  }
  const admin = createServiceRoleClient()

  // Resolve partner row for caller.
  const { data: partner } = await admin
    .from("partners")
    .select("id")
    .eq("email", userInfo.email!)
    .maybeSingle()
  if (!partner) {
    return NextResponse.json({ success: false, error: "Partenaire introuvable" }, { status: 404 })
  }

  // Wave 4C — verify this order belongs to the caller's partner.
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
  if (order.status !== "pending") {
    return NextResponse.json(
      { success: false, error: "invalid_status", status: order.status },
      { status: 409 },
    )
  }

  const { data: staff } = await admin
    .from("partner_staff")
    .select("user_id")
    .eq("partner_id", partner.id)
    .eq("is_active", true)
    .maybeSingle()

  const partnerUserId = staff?.user_id || userInfo.profileId
  if (!partnerUserId) {
    return NextResponse.json({ success: false, error: "Aucun staff actif" }, { status: 400 })
  }

  const { data, error } = await admin.rpc("partner_accept_food_order", {
    p_order_id: id,
    p_partner_user_id: partnerUserId,
  })
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
