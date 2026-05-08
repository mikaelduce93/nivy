/**
 * Wave 3.1 — Transport / mobility.
 * POST /api/teen/rides/groups/create — leader creates a forming group.
 */
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface Body {
  eventId?: string
  scheduledFor?: string
  pickupAddress?: string
  dropoffAddress?: string
  maxSeats?: number
}

export async function POST(request: Request) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") {
    return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 })
  }
  const body = (await request.json()) as Body
  if (!body.scheduledFor) {
    return NextResponse.json({ success: false, error: "scheduledFor required" }, { status: 400 })
  }
  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from("ride_groups")
    .insert({
      leader_id: userInfo.profileId,
      event_id: body.eventId ?? null,
      scheduled_for: body.scheduledFor,
      pickup_address: body.pickupAddress ?? null,
      dropoff_address: body.dropoffAddress ?? null,
      max_seats: Math.min(Math.max(body.maxSeats ?? 4, 1), 6),
      seats_taken: 1,
      status: "forming",
    })
    .select()
    .single()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })

  // Insert leader as first member
  await admin.from("ride_group_members").insert({
    group_id: data.id,
    teen_id: userInfo.profileId,
  })
  return NextResponse.json({ success: true, group: data })
}
