/**
 * Wave 3.1 — Transport / mobility.
 * POST /api/teen/rides/:id/cancel — refund logic in cancel_ride RPC.
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
  let reason: string | null = null
  try {
    const body = (await request.json()) as { reason?: string }
    reason = body?.reason ?? null
  } catch {
    // body optional
  }
  const admin = createServiceRoleClient()
  const { data, error } = await admin.rpc("cancel_ride", {
    p_ride_id: id,
    p_reason: reason,
    p_caller_id: userInfo.profileId,
  })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
