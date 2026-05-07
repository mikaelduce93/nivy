/**
 * POST /api/partner/restaurant/orders/:id/accept — partner accepts an order.
 * Calls partner_accept_food_order RPC; inserts partner_transactions row.
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

  // Resolve partner_user_id (partner_staff row for caller)
  const { data: partner } = await admin
    .from("partners")
    .select("id")
    .eq("email", userInfo.email!)
    .maybeSingle()
  if (!partner) {
    return NextResponse.json({ success: false, error: "Partenaire introuvable" }, { status: 404 })
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
