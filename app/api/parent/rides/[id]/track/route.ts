/**
 * Wave 3.1 — Transport / mobility.
 * GET /api/parent/rides/:id/track — last N location pings.
 */
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const userInfo = await getUserRole()
  if (!userInfo || (userInfo.role !== "parent" && userInfo.role !== "teen")) {
    return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 })
  }
  const { id } = await ctx.params
  const url = new URL(request.url)
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "100"), 500)

  const admin = createServiceRoleClient()
  // Verify caller is allowed
  const { data: ride } = await admin
    .from("ride_bookings")
    .select("teen_id, parent_id")
    .eq("id", id)
    .maybeSingle()
  if (!ride) return NextResponse.json({ success: false, error: "ride_not_found" }, { status: 404 })
  if (ride.teen_id !== userInfo.profileId && ride.parent_id !== userInfo.profileId) {
    return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 })
  }
  const { data, error } = await admin
    .from("ride_tracks")
    .select("lat,lng,speed,heading,captured_at")
    .eq("ride_id", id)
    .order("captured_at", { ascending: false })
    .limit(limit)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, tracks: data ?? [] })
}
