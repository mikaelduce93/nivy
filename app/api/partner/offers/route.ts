import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"

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

    // Get partner ID from email
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

    // Get all offers for this partner
    const { data: offers, error } = await supabase
      .from("partner_discounts")
      .select(`
        id,
        discount_name,
        description,
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

    return NextResponse.json({
      success: true,
      data: offers || []
    })
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

    // Get partner ID from email
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
      applicableCategories
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

    // Validate dates
    const fromDate = new Date(validFrom)
    const untilDate = new Date(validUntil)
    if (fromDate > untilDate) {
      return NextResponse.json(
        { success: false, error: "La date de fin doit être après la date de début" },
        { status: 400 }
      )
    }

    // Create the offer
    const offerData = {
      partner_id: partner.id,
      discount_name: name.trim(),
      description: description?.trim() || null,
      discount_type: discountType || "percentage",
      discount_value: parseFloat(discountValue),
      requires_vip: requiresVip ?? true,
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
      applicable_categories: applicableCategories?.length > 0 ? applicableCategories : null
    }

    const { data: newOffer, error: insertError } = await supabase
      .from("partner_discounts")
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

    // Log activity (non-critical, ignore errors)
    try {
      await supabase.from("activity_logs").insert({
        user_id: userInfo.profileId,
        action: "create",
        description: `Nouvelle offre créée: ${name}`,
        resource_type: "partner_discount",
        resource_id: newOffer.id,
        created_at: new Date().toISOString()
      })
    } catch {
      // Don't fail if logging fails
    }

    return NextResponse.json({
      success: true,
      message: "Offre créée avec succès",
      data: newOffer
    })
  } catch (error) {
    console.error("Partner offers POST API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
