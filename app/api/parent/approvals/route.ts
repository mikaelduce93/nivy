import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"

/**
 * Parent decision endpoint for parental_approvals rows.
 *
 * Wave-B audit: previous version wrote to non-existent columns
 * (responded_at, rejection_reason, approval_type, title) and tables
 * (notifications, activity_logs, event_bookings) — every parent decision
 * silently 500'd. Rewritten against the canonical parental_approvals shape
 * (action_type, decided_at, decided_by) and Nivy's user_notifications table.
 *
 * Resource-specific cascades (e.g. mentor_session approval triggering coin
 * debit) are handled by dedicated RPCs (parent_approve_session, etc.).
 * This route's job is purely the parent's decision + teen notification.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }
    if (userInfo.role !== "parent") {
      return NextResponse.json({ error: "Réservé aux parents" }, { status: 403 })
    }

    const { approvalId, action, reason } = await request.json()

    if (!approvalId || !action) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
    }
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Action invalide" }, { status: 400 })
    }

    // Verify the approval belongs to this parent and is still pending.
    const { data: approval, error: fetchError } = await supabase
      .from("parental_approvals")
      .select("id, parent_id, teen_id, action_type, resource_type, resource_id, amount, status, details")
      .eq("id", approvalId)
      .eq("parent_id", userInfo.profileId)
      .maybeSingle()

    if (fetchError || !approval) {
      return NextResponse.json({ error: "Approbation non trouvée" }, { status: 404 })
    }
    if (approval.status !== "pending") {
      return NextResponse.json(
        { error: "Cette demande a déjà été traitée", status: approval.status },
        { status: 400 }
      )
    }

    const newStatus = action === "approve" ? "approved" : "denied"
    const detailsPatch =
      action === "reject" && reason
        ? { ...(approval.details ?? {}), rejection_reason: reason }
        : approval.details

    const { error: updateError } = await supabase
      .from("parental_approvals")
      .update({
        status: newStatus,
        decided_at: new Date().toISOString(),
        decided_by: userInfo.profileId,
        details: detailsPatch,
      })
      .eq("id", approvalId)

    if (updateError) {
      console.error("[parent/approvals] update error:", updateError)
      return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 })
    }

    // Notify the teen via the canonical user_notifications table (best-effort).
    const labelByType: Record<string, string> = {
      booking: "réservation",
      coach_meeting: "rendez-vous mentor",
      food_order: "commande restaurant",
      purchase_above_ceiling: "achat marketplace",
      ride: "trajet",
    }
    const label = labelByType[approval.action_type] ?? "demande"
    const title = action === "approve" ? "Demande approuvée" : "Demande refusée"
    const body =
      action === "approve"
        ? `Votre ${label} a été approuvée par votre parent.`
        : `Votre ${label} a été refusée${reason ? ` (${reason})` : ""}.`

    try {
      await supabase.from("user_notifications").insert({
        user_id: approval.teen_id,
        title,
        body,
        priority: "high",
        data: {
          type: "parental_approval",
          approval_id: approvalId,
          action_type: approval.action_type,
          resource_type: approval.resource_type,
          resource_id: approval.resource_id,
          decision: newStatus,
        },
        action_url:
          approval.resource_type === "mentor_session"
            ? `/teen/mentor-sessions/${approval.resource_id}`
            : approval.resource_type === "ride"
            ? `/teen/rides`
            : approval.resource_type === "food_order"
            ? `/teen/food`
            : approval.resource_type === "marketplace_listing"
            ? `/marketplace/listings/${approval.resource_id}`
            : undefined,
      })
    } catch (err) {
      console.error("[parent/approvals] notification insert (non-fatal):", err)
    }

    return NextResponse.json({
      success: true,
      data: {
        approvalId,
        status: newStatus,
        teenId: approval.teen_id,
        actionType: approval.action_type,
        resourceType: approval.resource_type,
        resourceId: approval.resource_id,
      },
      hint:
        approval.resource_type === "mentor_session" && newStatus === "approved"
          ? "Pour exécuter le débit coins, appelez ensuite /api/parent/mentor-sessions/[id]/approve (qui invoque parent_approve_session)."
          : undefined,
    })
  } catch (error) {
    console.error("[parent/approvals] unhandled error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
