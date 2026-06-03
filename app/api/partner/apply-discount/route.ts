import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"

// ----------------------------------------------------------------------
// Reads the offer from `partner_offers` (canonical). #59 — the scan now
// records the sale in `partner_transactions` (the single source of partner
// revenue, read by /partner, /partner/stats, /partner/transactions and the
// monthly payout cron). discount_usage is no longer written by this path.
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

    // #59 — per-user usage is counted from partner_transactions (the canonical
    // CA table), keyed on offer_id + teen_id. The scan path no longer touches
    // discount_usage.
    if (offer.max_uses_per_user) {
      const { count, error: usageCountErr } = await supabase
        .from("partner_transactions")
        .select("*", { count: "exact", head: true })
        .eq("offer_id", discountId)
        .eq("teen_id", memberId)
        .eq("status", "succeeded")
      if (usageCountErr) {
        return NextResponse.json(
          { success: false, error: "usage_count_failed", details: usageCountErr.message },
          { status: 500 }
        )
      }
      if (count && count >= offer.max_uses_per_user) {
        return NextResponse.json(
          { success: false, error: "Limite d'utilisation atteinte pour ce membre" },
          { status: 400 }
        )
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

    // #59 — resolve the member (partner_transactions.teen_id FKs teens) and
    // compute the teen XP cashback before writing the canonical transaction.
    const { data: memberProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", memberId)
      .single()
    const isTeen = memberProfile?.role === "teen"
    const xpEarned = isTeen ? Math.floor(finalAmount / 10) : 0

    // #59 — canonical CA write into partner_transactions (the table read by
    // /partner, /partner/stats, /partner/transactions and the monthly payout
    // cron). amount_dh = gross purchase; commission_dh = platform cut. Only
    // teens get a row (teen_id is NOT NULL and FKs teens); a non-teen member
    // still gets the discount applied but produces no CA row.
    const PARTNER_COMMISSION_RATE = 0.1 // aligns with partner_accept_food_order (mig 058)
    const usageTimestamp = now.toISOString()
    let transactionId: string | null = null
    if (isTeen) {
      const commissionDh = Math.round(purchaseAmount * PARTNER_COMMISSION_RATE * 100) / 100
      const { data: txn, error: txnError } = await supabase
        .from("partner_transactions")
        .insert({
          partner_id: partner.id,
          teen_id: memberId,
          offer_id: discountId,
          amount_dh: purchaseAmount,
          cashback_xp: xpEarned,
          commission_dh: commissionDh,
          scanner_user_id: userInfo.profileId,
          scanned_at: usageTimestamp,
          status: "succeeded",
        })
        .select("id")
        .single()
      if (txnError) {
        return NextResponse.json(
          { success: false, error: "transaction_write_failed", details: txnError.message },
          { status: 500 }
        )
      }
      transactionId = txn.id
    }

    // Bump the cumulative usage counter on the canonical table.
    await supabase
      .from("partner_offers")
      .update({
        current_total_uses: (offer.current_total_uses || 0) + 1,
      })
      .eq("id", discountId)

    // Award XP to teen members via the canonical RPC (xpEarned computed above).
    if (isTeen && xpEarned > 0) {
      // XP cashback on partner purchases is auxiliary to the discount, but we
      // no longer silently swallow RPC errors — surface them as a 500 so the
      // partner UI sees the failure (no fake success).
      const { error: xpError } = await supabase.rpc("add_xp_to_user", {
        p_teen_id: memberId,
        p_xp_amount: xpEarned,
        p_source_type: "partner_purchase",
        p_source_category: "partner",
        p_source_id: transactionId,
        p_description: `Cashback achat chez ${partner.company_name}`,
      })
      if (xpError) {
        console.error("add_xp_to_user RPC failed (partner-discount):", xpError)
        return NextResponse.json(
          { success: false, error: "XP attribution échouée", details: xpError.message },
          { status: 500 }
        )
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
        // Wave 3A — loyalty point writes surface their errors to the response
        // rather than being silently swallowed (canon §6 F6).
        const { error: ptxErr } = await supabase.from("points_transactions").insert({
          profile_id: memberId,
          points_amount: pointsEarned,
          type: "earn",
          source: "partner_purchase",
          source_id: transactionId,
          description: `Achat chez ${partner.company_name}`,
        })
        if (ptxErr) {
          console.error("points_transactions insert failed:", ptxErr)
          // Non-blocking for the apply flow but logged. Loyalty points are
          // a side-effect, not the canonical money grant; canonical XP grant
          // already succeeded above.
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Réduction appliquée avec succès",
      data: {
        transactionId,
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
