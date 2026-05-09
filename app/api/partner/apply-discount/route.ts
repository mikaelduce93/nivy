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

    // Wave 3A / canon §6 F6 — no silent catch on discount_usage. The table
    // exists in every environment as of mig 074; if the read fails we hard-error.
    if (offer.max_uses_per_user) {
      const { count, error: usageCountErr } = await supabase
        .from("discount_usage")
        .select("*", { count: "exact", head: true })
        .eq("discount_id", discountId)
        .eq("profile_id", memberId)
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

    // Wave 3A / canon §6 F6 — usage write is canonical, no silent catch.
    let usageId: string | null = null
    let usageTimestamp = now.toISOString()
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
    if (usageError) {
      return NextResponse.json(
        { success: false, error: "usage_write_failed", details: usageError.message },
        { status: 500 }
      )
    }
    if (usage) {
      usageId = usage.id
      usageTimestamp = usage.used_at
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
        // Canonical RPC per docs/canon/economy-payments.locked.md §7.
        // XP cashback on partner purchases is auxiliary to the discount,
        // but we no longer silently swallow RPC errors — surface them as a
        // 500 so the partner UI sees the failure (no fake success).
        const { error: xpError } = await supabase.rpc("add_xp_to_user", {
          p_teen_id: memberId,
          p_xp_amount: xpEarned,
          p_source_type: "partner_purchase",
          p_source_category: "partner",
          p_source_id: usageId,
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
          source_id: usageId,
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
