/**
 * GET /api/marketplace/my-listings — listings owned by the current user.
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const userInfo = await getUserRole()
  if (!userInfo) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 })
  const sellerId = userInfo.role === "teen" ? (userInfo.teenData?.id || userInfo.profileId) : userInfo.profileId
  if (!sellerId) return NextResponse.json({ success: false, error: "no_profile" }, { status: 400 })

  const sb = createServiceRoleClient()
  const { data, error } = await sb
    .from("marketplace_listings")
    .select("*")
    .eq("seller_user_id", sellerId)
    .order("created_at", { ascending: false })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, listings: data ?? [] })
}
