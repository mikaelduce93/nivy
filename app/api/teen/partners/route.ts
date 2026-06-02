import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/teen/partners
 * V6 boutiques partenaires (#232 / #231) — surface côté ado.
 *
 * Sans paramètre : liste les partenaires actifs (hub).
 * Avec `?id=<uuid>` : renvoie un partenaire + ses offres achetables (approuvées,
 *   actives) + les bons (vouchers) de l'ado pour ce partenaire.
 *
 * Lecture seule. Aucune écriture, aucun SQL/migration. L'achat passe par
 * /api/teen/partners/buy (RPC purchase_partner_offer).
 */

interface PartnerRow {
  id: string
  company_name: string | null
  partner_type: string | null
  sub_category: string | null
  status: string | null
}

interface PartnerDetailRow extends PartnerRow {
  phone: string | null
  website: string | null
  description: string | null
  business_hours: unknown
}

interface OfferRow {
  id: string
  partner_id: string
  title: string | null
  description: string | null
  offer_type: string | null
  discount_pct: number | null
  price_coins: number | null
  price_dh: number | null
  valid_from: string | null
  valid_until: string | null
  is_active: boolean | null
  status: string | null
  min_vip_level: string | null
  requires_vip: boolean | null
  max_uses_per_user: number | null
  max_total_uses: number | null
  current_total_uses: number | null
}

interface RedemptionRow {
  id: string
  offer_id: string
  code: string | null
  status: string | null
  created_at: string | null
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = request.nextUrl.searchParams.get("id")

    // --- Detail mode: one partner + its purchasable offers + teen's vouchers.
    if (id) {
      const { data: partner, error: partnerErr } = await supabase
        .from("partners")
        .select(
          "id, company_name, partner_type, sub_category, status, phone, website, description, business_hours",
        )
        .eq("id", id)
        .eq("status", "active")
        .maybeSingle<PartnerDetailRow>()

      if (partnerErr) {
        console.error("[teen/partners] partner fetch error:", partnerErr)
        return NextResponse.json({ error: "Failed to fetch partner" }, { status: 500 })
      }
      if (!partner) {
        return NextResponse.json({ error: "Partner not found" }, { status: 404 })
      }

      const { data: offers, error: offersErr } = await supabase
        .from("partner_offers")
        .select(
          "id, partner_id, title, description, offer_type, discount_pct, price_coins, price_dh, valid_from, valid_until, is_active, status, min_vip_level, requires_vip, max_uses_per_user, max_total_uses, current_total_uses",
        )
        .eq("partner_id", id)
        .eq("is_active", true)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .returns<OfferRow[]>()

      if (offersErr) {
        console.error("[teen/partners] offers fetch error:", offersErr)
        return NextResponse.json({ error: "Failed to fetch offers" }, { status: 500 })
      }

      // Teen's own vouchers for this partner (RLS restricts to their own rows).
      const { data: vouchers, error: vouchersErr } = await supabase
        .from("partner_offer_redemptions")
        .select("id, offer_id, code, status, created_at")
        .eq("teen_id", user.id)
        .eq("partner_id", id)
        .order("created_at", { ascending: false })
        .returns<RedemptionRow[]>()

      if (vouchersErr) {
        console.error("[teen/partners] vouchers fetch error:", vouchersErr)
      }

      return NextResponse.json({
        partner,
        offers: offers ?? [],
        vouchers: vouchers ?? [],
      })
    }

    // --- List mode: active partners for the hub.
    const { data: partners, error: listErr } = await supabase
      .from("partners")
      .select("id, company_name, partner_type, sub_category, status")
      .eq("status", "active")
      .order("company_name", { ascending: true })
      .limit(48)
      .returns<PartnerRow[]>()

    if (listErr) {
      console.error("[teen/partners] list fetch error:", listErr)
      return NextResponse.json({ error: "Failed to fetch partners" }, { status: 500 })
    }

    return NextResponse.json({ partners: partners ?? [] })
  } catch (error) {
    console.error("[teen/partners] unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
