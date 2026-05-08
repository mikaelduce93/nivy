/**
 * Wave 3.1 — Transport / mobility.
 * POST /api/driver/rides/:id/track — driver POSTs lat/lng every 30s while in_progress.
 */
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface Body {
  lat?: number
  lng?: number
  speed?: number
  heading?: number
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const userInfo = await getUserRole()
  if (!userInfo) return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 })
  const { id } = await ctx.params
  const body = (await request.json()) as Body
  if (typeof body.lat !== "number" || typeof body.lng !== "number") {
    return NextResponse.json({ success: false, error: "lat,lng required" }, { status: 400 })
  }
  const admin = createServiceRoleClient()

  // Verify caller is the assigned driver
  const { data: ride } = await admin
    .from("ride_bookings")
    .select("id,status,driver_id")
    .eq("id", id)
    .maybeSingle()
  if (!ride) return NextResponse.json({ success: false, error: "ride_not_found" }, { status: 404 })

  const { data: driver } = await admin
    .from("nivy_drivers")
    .select("id,user_id")
    .eq("id", ride.driver_id ?? "00000000-0000-0000-0000-000000000000")
    .maybeSingle()
  if (!driver || driver.user_id !== userInfo.profileId) {
    return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 })
  }

  // Auto-flip dispatched -> in_progress on first ping
  if (ride.status === "dispatched") {
    await admin.from("ride_bookings").update({ status: "in_progress" }).eq("id", id)
  }

  const { error } = await admin.from("ride_tracks").insert({
    ride_id: id,
    lat: body.lat,
    lng: body.lng,
    speed: body.speed ?? null,
    heading: body.heading ?? null,
  })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
