import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "parent") {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "pending"

    const { data: requests, error } = await supabase
      .from("booking_approval_requests")
      .select(`
        *,
        teen:teen_id (id, full_name, avatar_url),
        event:event_id (id, title, start_date, venue_name, cover_image)
      `)
      .eq("parent_id", userInfo.profileId)
      .eq("status", status)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching requests:", error)
      return NextResponse.json(
        { error: "Erreur de récupération" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: requests || [],
    })
  } catch (error) {
    console.error("Booking approvals GET error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "parent") {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { requestId, action, response } = await request.json()

    if (!requestId || !action) {
      return NextResponse.json(
        { error: "Paramètres manquants" },
        { status: 400 }
      )
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Action invalide" }, { status: 400 })
    }

    // Verify the request belongs to this parent
    const { data: approvalRequest, error: fetchError } = await supabase
      .from("booking_approval_requests")
      .select(`
        *,
        teen:teen_id (id, full_name),
        event:event_id (id, title)
      `)
      .eq("id", requestId)
      .eq("parent_id", userInfo.profileId)
      .single()

    if (fetchError || !approvalRequest) {
      return NextResponse.json(
        { error: "Demande non trouvée" },
        { status: 404 }
      )
    }

    if (approvalRequest.status !== "pending") {
      return NextResponse.json(
        { error: "Cette demande a déjà été traitée" },
        { status: 400 }
      )
    }

    // Check if request has expired
    if (new Date(approvalRequest.expires_at) < new Date()) {
      await supabase
        .from("booking_approval_requests")
        .update({ status: "expired" })
        .eq("id", requestId)

      return NextResponse.json(
        { error: "Cette demande a expiré" },
        { status: 400 }
      )
    }

    if (action === "approve") {
      // Use the database function to approve and create booking
      const { data, error } = await supabase.rpc("approve_booking_request", {
        p_request_id: requestId,
        p_parent_response: response || null,
      })

      if (error) {
        console.error("Error approving request:", error)
        return NextResponse.json(
          { error: "Erreur lors de l'approbation" },
          { status: 500 }
        )
      }

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: userInfo.profileId,
        action: "booking_approved",
        description: `Réservation approuvée pour ${approvalRequest.teen?.full_name}: ${approvalRequest.event?.title}`,
        resource_type: "booking_approval",
        resource_id: requestId,
        created_at: new Date().toISOString(),
      })

      return NextResponse.json({
        success: true,
        message: "Réservation approuvée",
        data: {
          requestId,
          bookingId: data,
          status: "approved",
        },
      })
    } else {
      // Reject the request
      const { error } = await supabase.rpc("reject_booking_request", {
        p_request_id: requestId,
        p_parent_response: response || null,
      })

      if (error) {
        console.error("Error rejecting request:", error)
        return NextResponse.json(
          { error: "Erreur lors du refus" },
          { status: 500 }
        )
      }

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: userInfo.profileId,
        action: "booking_rejected",
        description: `Réservation refusée pour ${approvalRequest.teen?.full_name}: ${approvalRequest.event?.title}`,
        resource_type: "booking_approval",
        resource_id: requestId,
        created_at: new Date().toISOString(),
      })

      return NextResponse.json({
        success: true,
        message: "Réservation refusée",
        data: {
          requestId,
          status: "rejected",
        },
      })
    }
  } catch (error) {
    console.error("Booking approvals POST error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
