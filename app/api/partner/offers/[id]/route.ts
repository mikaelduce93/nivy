import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "partner") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      partnerId,
      title,
      description,
      offerType,
      discountValue,
      minPurchaseAmount,
      maxTotalUses,
      maxUsesPerUser,
      requiresVip,
      minVipLevel,
      validFrom,
      validUntil,
      status,
    } = body

    // Verify partner owns this offer
    const partnerIdFromUser = userInfo.partnerData?.id
    if (partnerId !== partnerIdFromUser) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    // Verify offer belongs to partner
    const { data: existingOffer, error: fetchError } = await supabase
      .from("partner_offers")
      .select("id")
      .eq("id", id)
      .eq("partner_id", partnerId)
      .single()

    if (fetchError || !existingOffer) {
      return NextResponse.json(
        { success: false, error: "Offre non trouvée" },
        { status: 404 }
      )
    }

    // Validate title
    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Le nom de l'offre est requis" },
        { status: 400 }
      )
    }

    // #50 — clamp to the canonical CHECK domains and the moderation model.
    // offer_type ∈ {discount, reduction, challenge}; status is a partner-settable
    // subset (never 'approved'/'rejected' — that is admin moderation, #58);
    // min_vip_level ∈ {free, silver, gold, platinum}.
    const OFFER_TYPES = new Set(["discount", "reduction", "challenge"])
    const VIP_LEVELS = new Set(["free", "silver", "gold", "platinum"])
    const PARTNER_STATUS: Record<string, string> = {
      draft: "draft",
      pending_approval: "pending_approval",
      paused: "paused",
      archived: "archived",
      // legacy UI vocabulary
      inactive: "paused",
      pending: "pending_approval",
      active: "pending_approval",
    }
    const safeStatus = PARTNER_STATUS[status as string] ?? "pending_approval"
    const safeOfferType = OFFER_TYPES.has(offerType) ? offerType : "reduction"
    const safeVipLevel =
      requiresVip && VIP_LEVELS.has(minVipLevel)
        ? minVipLevel
        : requiresVip
          ? "silver"
          : null

    // Build update object — canonical partner_offers columns only.
    const updateData: Record<string, unknown> = {
      title: title.trim(),
      description: description?.trim() || null,
      offer_type: safeOfferType,
      discount_value: discountValue ?? 0,
      min_purchase_amount: minPurchaseAmount ?? null,
      max_total_uses: maxTotalUses ?? null,
      max_uses_per_user: maxUsesPerUser ?? null,
      requires_vip: !!requiresVip,
      min_vip_level: safeVipLevel,
      valid_from: validFrom || null,
      valid_until: validUntil || null,
      status: safeStatus,
      // Wave 3A invariant: is_active requires status='approved'. A partner edit
      // never self-approves, so the offer goes offline pending (re)moderation.
      is_active: false,
      updated_at: new Date().toISOString(),
    }

    // Update offer
    const { error: updateError } = await supabase
      .from("partner_offers")
      .update(updateData)
      .eq("id", id)

    if (updateError) {
      console.error("Offer update error:", updateError)
      return NextResponse.json(
        { success: false, error: "Erreur lors de la mise à jour" },
        { status: 500 }
      )
    }

    // #50 — canonical audit_log (activity_logs was dropped in Wave 1C).
    try {
      await supabase.from("audit_log").insert({
        actor_id: userInfo.profileId,
        action: "partner_offer.update",
        resource_type: "partner_offer",
        resource_id: id,
        metadata: { partner_id: partnerId, title: title.trim(), status: safeStatus },
      })
    } catch {
      // non-critical
    }

    return NextResponse.json({
      success: true,
      message: "Offre mise à jour avec succès"
    })
  } catch (error) {
    console.error("Partner offer PATCH API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "partner") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const partnerId = userInfo.partnerData?.id
    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    // Verify offer belongs to partner
    const { data: existingOffer, error: fetchError } = await supabase
      .from("partner_offers")
      .select("id, title")
      .eq("id", id)
      .eq("partner_id", partnerId)
      .single()

    if (fetchError || !existingOffer) {
      return NextResponse.json(
        { success: false, error: "Offre non trouvée" },
        { status: 404 }
      )
    }

    // Delete offer
    const { error: deleteError } = await supabase
      .from("partner_offers")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("Offer delete error:", deleteError)
      return NextResponse.json(
        { success: false, error: "Erreur lors de la suppression" },
        { status: 500 }
      )
    }

    // #50 — canonical audit_log (activity_logs was dropped in Wave 1C).
    try {
      await supabase.from("audit_log").insert({
        actor_id: userInfo.profileId,
        action: "partner_offer.delete",
        resource_type: "partner_offer",
        resource_id: id,
        metadata: { partner_id: partnerId, title: existingOffer.title },
      })
    } catch {
      // non-critical
    }

    return NextResponse.json({
      success: true,
      message: "Offre supprimée avec succès"
    })
  } catch (error) {
    console.error("Partner offer DELETE API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "partner") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const partnerId = userInfo.partnerData?.id
    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const { data: offer, error } = await supabase
      .from("partner_offers")
      .select("*")
      .eq("id", id)
      .eq("partner_id", partnerId)
      .single()

    if (error || !offer) {
      return NextResponse.json(
        { success: false, error: "Offre non trouvée" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: offer
    })
  } catch (error) {
    console.error("Partner offer GET API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
