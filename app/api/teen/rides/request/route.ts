/**
 * Wave 3.1 — Transport / mobility.
 * POST /api/teen/rides/request — calls request_ride RPC.
 */
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface Body {
  pickupAddress?: string
  dropoffAddress?: string
  scheduledFor?: string
  eventId?: string | null
  provider?: "careem" | "heetch" | "nivy_partner" | "public_transport"
  paymentMethod?: "coins" | "dh" | "split_with_parent"
  pickupLat?: number
  pickupLng?: number
  dropoffLat?: number
  dropoffLng?: number
  estimatedDh?: number
  teenId?: string // for parent-on-behalf
  curfewOverride?: boolean // parent-only flag for rides past 22:00 local
}

export async function POST(request: Request) {
  try {
    const userInfo = await getUserRole()
    if (!userInfo) {
      return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 })
    }
    if (userInfo.role !== "teen" && userInfo.role !== "parent") {
      return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 })
    }

    const body = (await request.json()) as Body
    if (!body.pickupAddress || !body.dropoffAddress || !body.scheduledFor) {
      return NextResponse.json(
        { success: false, error: "pickupAddress, dropoffAddress, scheduledFor required" },
        { status: 400 }
      )
    }

    const teenId = userInfo.role === "teen" ? userInfo.profileId : body.teenId
    if (!teenId) {
      return NextResponse.json({ success: false, error: "teenId required" }, { status: 400 })
    }

    const admin = createServiceRoleClient()
    const { data, error } = await admin.rpc("request_ride", {
      p_teen_id: teenId,
      p_pickup_address: body.pickupAddress,
      p_dropoff_address: body.dropoffAddress,
      p_scheduled_for: body.scheduledFor,
      p_event_id: body.eventId ?? null,
      p_provider: body.provider ?? "nivy_partner",
      p_payment_method: body.paymentMethod ?? "coins",
      p_pickup_lat: body.pickupLat ?? null,
      p_pickup_lng: body.pickupLng ?? null,
      p_dropoff_lat: body.dropoffLat ?? null,
      p_dropoff_lng: body.dropoffLng ?? null,
      p_estimated_dh: body.estimatedDh ?? null,
      p_caller_id: userInfo.profileId,
      p_curfew_override: body.curfewOverride ?? false,
    })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }
    return NextResponse.json(data ?? { success: true })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "server_error" },
      { status: 500 }
    )
  }
}
