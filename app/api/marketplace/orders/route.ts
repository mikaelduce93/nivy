/**
 * GET /api/marketplace/orders — buy + sell history for the current user.
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const userInfo = await getUserRole()
  if (!userInfo) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 })
  const userId = userInfo.role === "teen" ? (userInfo.teenData?.id || userInfo.profileId) : userInfo.profileId
  if (!userId) return NextResponse.json({ success: false, error: "no_profile" }, { status: 400 })

  const sb = createServiceRoleClient()
  const [{ data: bought }, { data: sold }] = await Promise.all([
    sb.from("marketplace_transactions").select("*").eq("buyer_user_id", userId).order("created_at", { ascending: false }),
    sb.from("marketplace_transactions").select("*").eq("seller_user_id", userId).order("created_at", { ascending: false }),
  ])
  return NextResponse.json({ success: true, bought: bought ?? [], sold: sold ?? [] })
}
