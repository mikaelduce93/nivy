/**
 * Wave 3.1 — Transport / mobility.
 * POST /api/admin/drivers/:id/approve — KYC approval.
 */
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "admin") {
    return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 })
  }
  const { id } = await ctx.params
  let body: { decision?: "approve" | "reject"; activate?: boolean } = {}
  try {
    body = (await request.json()) as typeof body
  } catch {
    // empty body OK
  }
  const decision = body.decision ?? "approve"
  const admin = createServiceRoleClient()
  const update: Record<string, unknown> = {
    kyc_status: decision === "approve" ? "approved" : "rejected",
    approved_by: userInfo.profileId,
    approved_at: new Date().toISOString(),
  }
  if (decision === "approve" && body.activate !== false) update.is_active = true
  const { data, error } = await admin
    .from("nivy_drivers")
    .update(update)
    .eq("id", id)
    .select()
    .single()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  return NextResponse.json({ success: true, driver: data })
}
