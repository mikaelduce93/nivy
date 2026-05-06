import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"

// POST: Verify a VIP card by QR code data
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

    // Get partner info
    const { data: partner } = await supabase
      .from("partners")
      .select("id, company_name, partner_type")
      .eq("email", userInfo.email)
      .single()

    if (!partner) {
      return NextResponse.json(
        { success: false, error: "Partenaire non trouvé" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { qrData } = body

    if (!qrData) {
      return NextResponse.json(
        { success: false, error: "Données QR manquantes" },
        { status: 400 }
      )
    }

    // Parse QR code - Format: TPVIP:userId:cardNumber or just cardNumber
    let userId: string | null = null
    let cardNumber: string = qrData

    if (qrData.startsWith("TPVIP:")) {
      const parts = qrData.split(":")
      if (parts.length >= 3) {
        userId = parts[1]
        cardNumber = parts[2]
      }
    }

    // Find the VIP card
    const { data: vipCard, error: cardError } = await supabase
      .from("vip_cards")
      .select(`
        id,
        card_number,
        tier,
        status,
        start_date,
        end_date,
        profile_id,
        profiles!inner (
          id,
          full_name,
          email,
          role
        )
      `)
      .eq("card_number", cardNumber)
      .single()

    if (cardError || !vipCard) {
      return NextResponse.json({
        success: false,
        isValid: false,
        error: "Carte VIP non trouvée"
      })
    }

    // Check card status
    if (vipCard.status !== "active") {
      return NextResponse.json({
        success: false,
        isValid: false,
        error: `Carte ${vipCard.status === "expired" ? "expirée" : "inactive"}`
      })
    }

    // Check expiration
    const now = new Date()
    const endDate = new Date(vipCard.end_date)
    if (endDate < now) {
      return NextResponse.json({
        success: false,
        isValid: false,
        error: "Carte VIP expirée"
      })
    }

    // Get user's total points
    const { data: userPoints } = await supabase
      .from("user_points")
      .select("total_points, current_tier")
      .eq("profile_id", vipCard.profile_id)
      .single()

    // Get eligible offers from this partner for this tier
    const tierPriority: Record<string, number> = {
      free: 0,
      silver: 1,
      gold: 2,
      platinum: 3
    }

    const userTierLevel = tierPriority[vipCard.tier.toLowerCase()] || 0

    const { data: eligibleOffers } = await supabase
      .from("partner_discounts")
      .select(`
        id,
        discount_name,
        description,
        discount_type,
        discount_value,
        min_vip_level,
        min_purchase_amount,
        max_discount_amount,
        terms_and_conditions,
        valid_until
      `)
      .eq("partner_id", partner.id)
      .eq("is_active", true)
      .lte("valid_from", now.toISOString())
      .gte("valid_until", now.toISOString())

    // Filter offers by VIP level
    const applicableOffers = (eligibleOffers || []).filter(offer => {
      if (!offer.min_vip_level) return true
      const requiredLevel = tierPriority[offer.min_vip_level.toLowerCase()] || 0
      return userTierLevel >= requiredLevel
    })

    // Check usage limits for each offer
    const offersWithUsage = await Promise.all(
      applicableOffers.map(async (offer) => {
        const { count } = await supabase
          .from("discount_usage")
          .select("*", { count: "exact", head: true })
          .eq("discount_id", offer.id)
          .eq("profile_id", vipCard.profile_id)

        return {
          ...offer,
          usedByUser: count || 0
        }
      })
    )

    // Format response
    const profile = vipCard.profiles as unknown as { full_name: string; email: string; role: string }

    return NextResponse.json({
      success: true,
      isValid: true,
      member: {
        id: vipCard.profile_id,
        name: profile.full_name,
        email: profile.email,
        role: profile.role
      },
      card: {
        id: vipCard.id,
        cardNumber: vipCard.card_number,
        tier: vipCard.tier,
        status: vipCard.status,
        expiresAt: vipCard.end_date
      },
      points: {
        total: userPoints?.total_points || 0,
        tier: userPoints?.current_tier || "bronze"
      },
      eligibleOffers: offersWithUsage.map(offer => ({
        id: offer.id,
        name: offer.discount_name,
        description: offer.description,
        type: offer.discount_type,
        value: offer.discount_value,
        minPurchase: offer.min_purchase_amount,
        maxDiscount: offer.max_discount_amount,
        terms: offer.terms_and_conditions,
        expiresAt: offer.valid_until,
        usedByUser: offer.usedByUser
      }))
    })
  } catch (error) {
    console.error("Partner verify-card API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
