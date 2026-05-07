import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"

// ----------------------------------------------------------------------
// Wave-1 TICKET-025: this route now reads/writes `partner_offers` (the
// canonical table). The previous version targeted `partner_discounts`,
// which has been replaced by a backward-compat view by migration 074.
// ----------------------------------------------------------------------

// GET: List all offers for the partner
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "partner") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const { data: partner } = await supabase
      .from("partners")
      .select("id")
      .eq("email", userInfo.email)
      .single()

    if (!partner) {
      return NextResponse.json(
        { success: false, error: "Partenaire non trouvé" },
        { status: 404 }
      )
    }

    const { data: offers, error } = await supabase
      .from("partner_offers")
      .select(`
        id,
        title,
        description,
        offer_type,
        discount_type,
        discount_value,
        requires_vip,
        min_vip_level,
        min_purchase_amount,
        max_discount_amount,
        terms_and_conditions,
        valid_from,
        valid_until,
        is_active,
        max_uses_per_user,
        max_total_uses,
        current_total_uses,
        applicable_categories,
        tags,
        created_at
      `)
      .eq("partner_id", partner.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching offers:", error)
      return NextResponse.json(
        { success: false, error: "Erreur lors de la récupération des offres" },
        { status: 500 }
      )
    }

    // Compat layer: surface the legacy `discount_name` alias so any UI
    // still bound to it (Wave 2 PT1 will replace it) keeps working.
    const data = (offers || []).map((o) => ({
      ...o,
      discount_name: o.title,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Partner offers GET API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

// POST: Create a new offer
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "partner") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const { data: partner } = await supabase
      .from("partners")
      .select("id, company_name")
      .eq("email", userInfo.email)
      .single()

    if (!partner) {
      return NextResponse.json(
        { success: false, error: "Partenaire non trouvé" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      offerType,
      discountType,
      discountValue,
      minPurchase,
      maxDiscount,
      requiresVip,
      minVipLevel,
      maxUsesPerUser,
      maxTotalUses,
      validFrom,
      validUntil,
      termsAndConditions,
      applicableCategories,
      tags,
    } = body

    // Validation
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Le nom de l'offre est requis" },
        { status: 400 }
      )
    }

    if (!discountValue || discountValue <= 0) {
      return NextResponse.json(
        { success: false, error: "La valeur de la réduction est requise" },
        { status: 400 }
      )
    }

    if (!validFrom || !validUntil) {
      return NextResponse.json(
        { success: false, error: "Les dates de validité sont requises" },
        { status: 400 }
      )
    }

    const fromDate = new Date(validFrom)
    const untilDate = new Date(validUntil)
    if (fromDate > untilDate) {
      return NextResponse.json(
        { success: false, error: "La date de fin doit être après la date de début" },
        { status: 400 }
      )
    }

    const numericDiscount = parseFloat(discountValue)

    // Build the row using partner_offers' canonical column names. We
    // populate both the legacy `discount_pct` (for downstream readers
    // like the dashboard's `offer.discount_value` rendering) and the
    // newer `discount_value` so semantics stay consistent.
    const offerData = {
      partner_id: partner.id,
      title: name.trim(),
      description: description?.trim() || null,
      offer_type: offerType || "discount",
      discount_type: discountType || "percentage",
      discount_value: numericDiscount,
      discount_pct: discountType === "percentage" || !discountType ? numericDiscount : null,
      requires_vip: requiresVip ?? false,
      min_vip_level: requiresVip ? (minVipLevel || "silver") : null,
      min_purchase_amount: minPurchase ? parseFloat(minPurchase) : null,
      max_discount_amount: maxDiscount ? parseFloat(maxDiscount) : null,
      terms_and_conditions: termsAndConditions?.trim() || null,
      valid_from: validFrom,
      valid_until: validUntil,
      is_active: true,
      max_uses_per_user: maxUsesPerUser ? parseInt(maxUsesPerUser) : null,
      max_total_uses: maxTotalUses ? parseInt(maxTotalUses) : null,
      current_total_uses: 0,
      applicable_categories: Array.isArray(applicableCategories) && applicableCategories.length > 0
        ? applicableCategories
        : null,
      tags: Array.isArray(tags) && tags.length > 0 ? tags : [],
    }

    const { data: newOffer, error: insertError } = await supabase
      .from("partner_offers")
      .insert([offerData])
      .select()
      .single()

    if (insertError) {
      console.error("Offer insert error:", insertError)
      return NextResponse.json(
        { success: false, error: "Erreur lors de la création de l'offre" },
        { status: 500 }
      )
    }

    // Best-effort activity log; don't fail the request on logger errors.
    try {
      await supabase.from("activity_logs").insert({
        user_id: userInfo.profileId,
        action: "create",
        description: `Nouvelle offre créée: ${name}`,
        resource_type: "partner_offer",
        resource_id: newOffer.id,
        created_at: new Date().toISOString(),
      })
    } catch {
      // ignore — non-critical
    }

    return NextResponse.json({
      success: true,
      message: "Offre créée avec succès",
      data: { ...newOffer, discount_name: newOffer.title },
    })
  } catch (error) {
    console.error("Partner offers POST API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
