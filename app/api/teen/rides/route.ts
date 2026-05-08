/**
 * Wave 3.1 — Transport / mobility.
 * GET /api/teen/rides — upcoming + history for the authenticated teen.
 */
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") {
    return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 })
  }
  const teenId = userInfo.profileId
  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from("ride_bookings")
    .select(
      "id,status,pickup_address,dropoff_address,scheduled_for,return_scheduled_for,provider,payment_method,estimated_dh,actual_dh,driver_id,created_at,completed_at"
    )
    .eq("teen_id", teenId)
    .order("scheduled_for", { ascending: false })
    .limit(50)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  const now = new Date().toISOString()
  const upcoming = (data ?? []).filter(
    (r) => r.scheduled_for >= now && !["completed", "cancelled", "denied"].includes(r.status)
  )
  const history = (data ?? []).filter(
    (r) => r.scheduled_for < now || ["completed", "cancelled", "denied"].includes(r.status)
  )
  return NextResponse.json({ success: true, upcoming, history })
}
