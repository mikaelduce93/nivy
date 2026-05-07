/**
 * GET /api/partner/restaurant/orders/feed — partner-side incoming orders poll.
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "partner") {
    return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
  }
  const admin = createServiceRoleClient()
  const { data: partner } = await admin
    .from("partners")
    .select("id")
    .eq("email", userInfo.email!)
    .maybeSingle()
  if (!partner) {
    return NextResponse.json({ success: false, error: "Partenaire introuvable" }, { status: 404 })
  }
  const { data, error } = await admin
    .from("food_orders")
    .select("*")
    .eq("partner_id", partner.id)
    .order("created_at", { ascending: false })
    .limit(50)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: data ?? [] })
}
