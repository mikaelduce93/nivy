/**
 * Wave 3.1 — Transport / mobility.
 * POST /api/parent/rides/:id/approve.
 */
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") {
    return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 })
  }
  const { id } = await ctx.params
  const admin = createServiceRoleClient()
  const { data, error } = await admin.rpc("approve_ride", {
    p_ride_id: id,
    p_parent_id: userInfo.profileId,
    p_decision: "approve",
  })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
