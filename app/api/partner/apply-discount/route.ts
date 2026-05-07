import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"

// ----------------------------------------------------------------------
// Wave-1 TICKET-025: this route now reads/writes `partner_offers` (the
// canonical table). All `discount_*` field references are mapped onto
// partner_offers columns. The `discount_usage` table is treated as
// optional (best-effort logging) so that environments that haven't
// provisioned it yet don't break the apply flow.
// ----------------------------------------------------------------------

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

    const { data: offer, error: offerError } = await supabase
      .from("partner_offers")
      .select("*")
      .eq("id", discountId)
      .eq("partner_id", partner.id)
      .single()

    if (offerError || !offer) {
      return NextResponse.json(
        { success: false, error: "Offre non trouvée" },
        { status: 404 }
      )
    }

    if (!offer.is_active) {
      return NextResponse.json(
        { success: false, error: "Cette offre n'est plus active" },
        { status: 400 }
      )
    }

    const now = new Date()
    const validFromOk = !offer.valid_from || new Date(offer.valid_from) <= now
    const validUntilOk = !offer.valid_until || new Date(offer.valid_until) >= now
    if (!validFromOk || !validUntilOk) {
      return NextResponse.json(
        { success: false, error: "Cette offre n'est pas valide actuellement" },
        { status: 400 }
      )
    }

    if (offer.min_purchase_amount && purchaseAmount < offer.min_purchase_amount) {
      return NextResponse.json(
        {
          success: false,
          error: `Montant minimum requis: ${offer.min_purchase_amount} DH`,
        },
        { status: 400 }
      )
    }

    if (offer.max_total_uses && (offer.current_total_uses || 0) >= offer.max_total_uses) {
      return NextResponse.json(
        { success: false, error: "Limite d'utilisation atteinte pour cette offre" },
        { status: 400 }
      )
    }

    if (offer.max_uses_per_user) {
      try {
        const { count } = await supabase
          .from("discount_usage")
          .select("*", { count: "exact", head: true })
          .eq("discount_id", discountId)
          .eq("profile_id", memberId)

        if (count && count >= offer.max_uses_per_user) {
          return NextResponse.json(
            { success: false, error: "Limite d'utilisation atteinte pour ce membre" },
            { status: 400 }
          )
        }
      } catch {
        // discount_usage missing — skip the per-user cap silently rather
        // than block the apply flow.
      }
    }

    // Resolve the effective discount value: prefer the canonical
    // `discount_value`, fall back to legacy `discount_pct`.
    const effectiveValue = Number(offer.discount_value ?? offer.discount_pct ?? 0)
    const effectiveType = offer.discount_type || "percentage"

    let discountAmount: number
    if (effectiveType === "percentage") {
      discountAmount = (purchaseAmount * effectiveValue) / 100
    } else {
      discountAmount = effectiveValue
    }

    if (offer.max_discount_amount && discountAmount > offer.max_discount_amount) {
      discountAmount = offer.max_discount_amount
    }

    const finalAmount = Math.max(0, purchaseAmount - discountAmount)

    // Record usage (best-effort — table may not exist yet).
    let usageId: string | null = null
    let usageTimestamp = now.toISOString()
    try {
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
          used_at: usageTimestamp,
        })
        .select()
        .single()

      if (!usageError && usage) {
        usageId = usage.id
        usageTimestamp = usage.used_at
      }
    } catch {
      // ignore — usage logging is non-critical for the apply flow
    }

    // Bump the cumulative usage counter on the canonical table.
    await supabase
      .from("partner_offers")
      .update({
        current_total_uses: (offer.current_total_uses || 0) + 1,
      })
      .eq("id", discountId)

    // Award XP to teen members (best-effort).
    const { data: memberProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", memberId)
      .single()

    if (memberProfile?.role === "teen") {
      const xpEarned = Math.floor(finalAmount / 10)
      if (xpEarned > 0) {
        try {
          await supabase.rpc("add_user_xp", {
            p_user_id: memberId,
            p_xp_amount: xpEarned,
            p_source: "partner_purchase",
            p_source_id: usageId,
          })
        } catch {
          // ignore — XP path is non-critical
        }
      }
    }

    // Loyalty points by VIP tier (best-effort).
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
        platinum: 3,
      }
      const multiplier = pointsMultiplier[vipCard.tier.toLowerCase()] || 1
      const pointsEarned = Math.floor((finalAmount / 10) * multiplier)

      if (pointsEarned > 0) {
        try {
          await supabase.from("points_transactions").insert({
            profile_id: memberId,
            points_amount: pointsEarned,
            type: "earn",
            source: "partner_purchase",
            source_id: usageId,
            description: `Achat chez ${partner.company_name}`,
          })

          await supabase.from("user_points").upsert(
            {
              profile_id: memberId,
              total_points: supabase.rpc("increment_points", {
                p_profile_id: memberId,
                p_amount: pointsEarned,
              }),
            },
            { onConflict: "profile_id" }
          )
        } catch {
          // ignore — loyalty points are non-critical
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Réduction appliquée avec succès",
      data: {
        transactionId: usageId,
        purchaseAmount,
        discountAmount: Math.round(discountAmount * 100) / 100,
        finalAmount: Math.round(finalAmount * 100) / 100,
        discountName: offer.title,
        timestamp: usageTimestamp,
      },
    })
  } catch (error) {
    console.error("Partner apply-discount API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
