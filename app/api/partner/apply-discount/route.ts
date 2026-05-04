import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"

// POST: Apply a discount and record the transaction
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
    const { discountId, memberId, purchaseAmount, notes } = body

    if (!discountId || !memberId) {
      return NextResponse.json(
        { success: false, error: "Données manquantes" },
        { status: 400 }
      )
    }

    if (!purchaseAmount || purchaseAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Montant d'achat invalide" },
        { status: 400 }
      )
    }

    // Get the discount details
    const { data: discount, error: discountError } = await supabase
      .from("partner_discounts")
      .select("*")
      .eq("id", discountId)
      .eq("partner_id", partner.id)
      .single()

    if (discountError || !discount) {
      return NextResponse.json(
        { success: false, error: "Offre non trouvée" },
        { status: 404 }
      )
    }

    // Validate discount is still active
    if (!discount.is_active) {
      return NextResponse.json(
        { success: false, error: "Cette offre n'est plus active" },
        { status: 400 }
      )
    }

    // Check validity dates
    const now = new Date()
    if (new Date(discount.valid_from) > now || new Date(discount.valid_until) < now) {
      return NextResponse.json(
        { success: false, error: "Cette offre n'est pas valide actuellement" },
        { status: 400 }
      )
    }

    // Check minimum purchase amount
    if (discount.min_purchase_amount && purchaseAmount < discount.min_purchase_amount) {
      return NextResponse.json({
        success: false,
        error: `Montant minimum requis: ${discount.min_purchase_amount} DH`
      }, { status: 400 })
    }

    // Check total usage limit
    if (discount.max_total_uses && discount.current_total_uses >= discount.max_total_uses) {
      return NextResponse.json(
        { success: false, error: "Limite d'utilisation atteinte pour cette offre" },
        { status: 400 }
      )
    }

    // Check per-user usage limit
    if (discount.max_uses_per_user) {
      const { count } = await supabase
        .from("discount_usage")
        .select("*", { count: "exact", head: true })
        .eq("discount_id", discountId)
        .eq("profile_id", memberId)

      if (count && count >= discount.max_uses_per_user) {
        return NextResponse.json(
          { success: false, error: "Limite d'utilisation atteinte pour ce membre" },
          { status: 400 }
        )
      }
    }

    // Calculate discount amount
    let discountAmount: number
    if (discount.discount_type === "percentage") {
      discountAmount = (purchaseAmount * discount.discount_value) / 100
    } else {
      discountAmount = discount.discount_value
    }

    // Apply max discount cap if set
    if (discount.max_discount_amount && discountAmount > discount.max_discount_amount) {
      discountAmount = discount.max_discount_amount
    }

    // Calculate final amount
    const finalAmount = Math.max(0, purchaseAmount - discountAmount)

    // Record the usage
    const { data: usage, error: usageError } = await supabase
      .from("discount_usage")
      .insert({
        discount_id: discountId,
        profile_id: memberId,
        partner_id: partner.id,
        purchase_amount: purchaseAmount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        notes: notes || null,
        used_at: now.toISOString()
      })
      .select()
      .single()

    if (usageError) {
      console.error("Discount usage insert error:", usageError)
      return NextResponse.json(
        { success: false, error: "Erreur lors de l'enregistrement" },
        { status: 500 }
      )
    }

    // Update the total usage count
    await supabase
      .from("partner_discounts")
      .update({
        current_total_uses: (discount.current_total_uses || 0) + 1
      })
      .eq("id", discountId)

    // Award XP to the member if they're a teen
    const { data: memberProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", memberId)
      .single()

    if (memberProfile?.role === "teen") {
      // Award 1 XP per 10 DH spent (adjustable)
      const xpEarned = Math.floor(finalAmount / 10)
      if (xpEarned > 0) {
        try {
          await supabase.rpc("add_user_xp", {
            p_user_id: memberId,
            p_xp_amount: xpEarned,
            p_source: "partner_purchase",
            p_source_id: usage.id
          })
        } catch {
          // Ignore XP errors - non-critical
        }
      }
    }

    // Award loyalty points based on VIP tier
    const { data: vipCard } = await supabase
      .from("vip_cards")
      .select("tier")
      .eq("profile_id", memberId)
      .eq("status", "active")
      .single()

    if (vipCard) {
      const pointsMultiplier: Record<string, number> = {
        silver: 1,
        gold: 2,
        platinum: 3
      }
      const multiplier = pointsMultiplier[vipCard.tier.toLowerCase()] || 1
      const pointsEarned = Math.floor((finalAmount / 10) * multiplier)

      if (pointsEarned > 0) {
        // Add points transaction (non-critical, ignore errors)
        try {
          await supabase
            .from("points_transactions")
            .insert({
              profile_id: memberId,
              points_amount: pointsEarned,
              type: "earn",
              source: "partner_purchase",
              source_id: usage.id,
              description: `Achat chez ${partner.company_name}`
            })

          // Update total points
          await supabase
            .from("user_points")
            .upsert({
              profile_id: memberId,
              total_points: supabase.rpc("increment_points", {
                p_profile_id: memberId,
                p_amount: pointsEarned
              })
            }, { onConflict: "profile_id" })
        } catch {
          // Ignore points errors - non-critical
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Réduction appliquée avec succès",
      data: {
        transactionId: usage.id,
        purchaseAmount,
        discountAmount: Math.round(discountAmount * 100) / 100,
        finalAmount: Math.round(finalAmount * 100) / 100,
        discountName: discount.discount_name,
        timestamp: usage.used_at
      }
    })
  } catch (error) {
    console.error("Partner apply-discount API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
