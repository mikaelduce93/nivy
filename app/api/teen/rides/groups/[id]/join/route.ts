/**
 * Wave 3.1 — Transport / mobility.
 * POST /api/teen/rides/groups/:id/join — teen joins a forming group.
 */
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") {
    return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 })
  }
  const { id } = await ctx.params
  const admin = createServiceRoleClient()
  const { data: group, error } = await admin
    .from("ride_groups")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error || !group) {
    return NextResponse.json({ success: false, error: "group_not_found" }, { status: 404 })
  }
  if (group.status !== "forming") {
    return NextResponse.json({ success: false, error: "group_closed" }, { status: 400 })
  }
  if (group.seats_taken >= group.max_seats) {
    return NextResponse.json({ success: false, error: "group_full" }, { status: 400 })
  }
  const { error: memErr } = await admin
    .from("ride_group_members")
    .insert({ group_id: id, teen_id: userInfo.profileId })
  if (memErr) return NextResponse.json({ success: false, error: memErr.message }, { status: 400 })
  await admin
    .from("ride_groups")
    .update({ seats_taken: group.seats_taken + 1 })
    .eq("id", id)
  return NextResponse.json({ success: true })
}
