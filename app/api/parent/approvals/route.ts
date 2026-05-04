import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "parent") {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { approvalId, action, reason } = await request.json()

    if (!approvalId || !action) {
      return NextResponse.json(
        { error: "Paramètres manquants" },
        { status: 400 }
      )
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Action invalide" }, { status: 400 })
    }

    // Verify the approval belongs to this parent
    const { data: approval, error: fetchError } = await supabase
      .from("parental_approvals")
      .select(`
        *,
        teen:teen_id (id, full_name)
      `)
      .eq("id", approvalId)
      .eq("parent_id", userInfo.profileId)
      .single()

    if (fetchError || !approval) {
      return NextResponse.json(
        { error: "Approbation non trouvée" },
        { status: 404 }
      )
    }

    if (approval.status !== "pending") {
      return NextResponse.json(
        { error: "Cette demande a déjà été traitée" },
        { status: 400 }
      )
    }

    // Update the approval status
    const newStatus = action === "approve" ? "approved" : "rejected"
    const { error: updateError } = await supabase
      .from("parental_approvals")
      .update({
        status: newStatus,
        responded_at: new Date().toISOString(),
        rejection_reason: action === "reject" ? reason : null
      })
      .eq("id", approvalId)

    if (updateError) {
      console.error("Error updating approval:", updateError)
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour" },
        { status: 500 }
      )
    }

    // Handle booking approval - update booking status
    if (approval.approval_type === "booking" && approval.resource_id) {
      const bookingStatus = action === "approve" ? "confirmed" : "cancelled"
      await supabase
        .from("bookings")
        .update({
          status: bookingStatus,
          parent_approval_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", approval.resource_id)
    }

    // Handle event booking approval
    if (approval.approval_type === "event_booking" && approval.resource_id) {
      const eventBookingStatus = action === "approve" ? "approved" : "rejected"
      await supabase
        .from("event_bookings")
        .update({
          status: eventBookingStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", approval.resource_id)
    }

    // Send notification to teen
    const notificationTitle = action === "approve"
      ? "Demande approuvée"
      : "Demande refusée"

    const notificationMessage = action === "approve"
      ? `Votre demande "${approval.title || 'Approbation'}" a été approuvée par votre parent.`
      : `Votre demande "${approval.title || 'Approbation'}" a été refusée.${reason ? ` Raison: ${reason}` : ''}`

    await supabase.from("notifications").insert({
      user_id: approval.teen_id,
      type: action === "approve" ? "approval_approved" : "approval_rejected",
      title: notificationTitle,
      message: notificationMessage,
      read: false,
      resource_type: "parental_approval",
      resource_id: approvalId,
      created_at: new Date().toISOString()
    })

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: userInfo.profileId,
      action: action,
      description: `${action === "approve" ? "Approuvé" : "Refusé"}: ${approval.title || "Demande d'approbation"}`,
      resource_type: "parental_approval",
      resource_id: approvalId,
      created_at: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: action === "approve" ? "Demande approuvée" : "Demande refusée",
      data: {
        approvalId,
        status: newStatus,
        teenId: approval.teen_id
      }
    })
  } catch (error) {
    console.error("Error in approval API:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
