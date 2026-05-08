/**
 * Wave 3.1 — Transport / mobility.
 * GET /api/parent/rides/active — live tracking list for parent.
 */
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") {
    return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 })
  }
  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from("ride_bookings")
    .select("*, driver:driver_id (id,full_name,vehicle_make,vehicle_model,vehicle_plate,phone,rating)")
    .eq("parent_id", userInfo.profileId)
    .in("status", ["requested", "approved", "dispatched", "in_progress"])
    .order("scheduled_for", { ascending: true })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, rides: data ?? [] })
}
