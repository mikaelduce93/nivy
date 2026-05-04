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
      name,
      description,
      offerType,
      discountValue,
      minPurchase,
      maxUsage,
      validFrom,
      validUntil,
      status,
      eligibleLevels
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

    // Validate name
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Le nom de l'offre est requis" },
        { status: 400 }
      )
    }

    // Build update object
    const updateData: any = {
      name: name.trim(),
      description: description?.trim() || null,
      offer_type: offerType || "reduction",
      discount_value: discountValue || 0,
      min_purchase: minPurchase || 0,
      max_usage: maxUsage || null,
      valid_from: validFrom || null,
      valid_until: validUntil || null,
      status: status || "active",
      eligible_levels: eligibleLevels?.length > 0 ? eligibleLevels : null,
      updated_at: new Date().toISOString()
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

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: userInfo.profileId,
      action: "update",
      description: `Offre mise à jour: ${name}`,
      resource_type: "partner_offer",
      resource_id: id,
      created_at: new Date().toISOString()
    })

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

    // Verify offer belongs to partner
    const { data: existingOffer, error: fetchError } = await supabase
      .from("partner_offers")
      .select("id, name")
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

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: userInfo.profileId,
      action: "delete",
      description: `Offre supprimée: ${existingOffer.name}`,
      resource_type: "partner_offer",
      resource_id: id,
      created_at: new Date().toISOString()
    })

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
