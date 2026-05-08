/**
 * Wave 3.1 — Transport / mobility.
 * POST /api/driver/rides/:id/complete — driver settles fare.
 */
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const userInfo = await getUserRole()
  if (!userInfo) return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 })
  const { id } = await ctx.params
  const body = (await request.json()) as { actualDh?: number }
  if (typeof body.actualDh !== "number" || body.actualDh < 0) {
    return NextResponse.json({ success: false, error: "actualDh required" }, { status: 400 })
  }
  const admin = createServiceRoleClient()
  const { data, error } = await admin.rpc("complete_ride", {
    p_ride_id: id,
    p_actual_dh: body.actualDh,
    p_caller_id: userInfo.profileId,
  })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
