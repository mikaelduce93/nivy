/**
 * V6 — Partner-vendor marketplace (issue #241).
 *
 * Teen-facing slice of the marketplace: browse PARTNER-VENDOR listings and buy
 * one. (register_seller / accrue_payout are admin/service-only and are NOT
 * exposed here.)
 *
 * GET  /api/teen/marketplace
 *   - listings: active partner-vendor listings (marketplace_listings WHERE
 *     seller_id IS NOT NULL AND status='active'), enriched with the seller's
 *     display_name from marketplace_sellers.
 *   - purchases: the teen's own sales (marketplace_sales WHERE
 *     buyer_teen_id = user.id).
 *
 * POST /api/teen/marketplace
 *   - action 'buy' → record_marketplace_sale(p_listing_id, p_buyer_teen_id,
 *     p_idempotency_key). Buyer is the teen (user.id) and we pass a fresh
 *     crypto.randomUUID() idempotency key. The RPC returns jsonb
 *     { success, error?, sale_id, amount_coins, commission_coins, net_coins }
 *     which we forward honestly (no fabricated success). Known errors:
 *     insufficient_balance, listing_unavailable, not_a_partner_listing,
 *     not_purchasable.
 *
 * Auth: the teen's id === auth.uid() === user.id (per the RPC contract).
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// ---------------------------------------------------------------------------
// GET — partner-vendor listings + the teen's purchases
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Partner-vendor listings only (seller_id IS NOT NULL) that are buyable now.
    const { data: listingsData, error: listErr } = await supabase
      .from("marketplace_listings")
      .select("id, title, description, price_coins, images, category, seller_id, created_at")
      .not("seller_id", "is", null)
      .eq("status", "active")
      .order("created_at", { ascending: false })

    if (listErr) {
      console.error("Error fetching marketplace listings:", listErr)
      return NextResponse.json({ error: "Failed to fetch listings" }, { status: 500 })
    }

    const listings = listingsData ?? []

    // Resolve seller display names in one batch.
    const sellerIds = Array.from(
      new Set(listings.map((l) => l.seller_id).filter(Boolean))
    ) as string[]

    const sellerNames = new Map<string, string | null>()
    if (sellerIds.length > 0) {
      const { data: sellers } = await supabase
        .from("marketplace_sellers")
        .select("id, display_name")
        .in("id", sellerIds)
      for (const s of sellers ?? []) {
        sellerNames.set(s.id, s.display_name ?? null)
      }
    }

    const enrichedListings = listings.map((l) => ({
      ...l,
      seller_name: l.seller_id ? sellerNames.get(l.seller_id) ?? null : null,
    }))

    // The teen's own purchases (RLS: buyer_teen_id = auth.uid()).
    const { data: purchases } = await supabase
      .from("marketplace_sales")
      .select("id, listing_id, amount_coins, commission_coins, net_coins, created_at")
      .eq("buyer_teen_id", user.id)
      .order("created_at", { ascending: false })

    return NextResponse.json({
      success: true,
      listings: enrichedListings,
      purchases: purchases ?? [],
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST — dispatch to the live marketplace RPCs
// ---------------------------------------------------------------------------
interface PostBody {
  action?: "buy"
  listingId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PostBody
    const { action } = body

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (action === "buy") {
      const { listingId } = body
      if (!listingId) {
        return NextResponse.json({ error: "listingId is required" }, { status: 400 })
      }
      const { data, error } = await supabase.rpc("record_marketplace_sale", {
        p_listing_id: listingId,
        p_buyer_teen_id: user.id,
        p_idempotency_key: crypto.randomUUID(),
      })
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      }
      // RPC returns { success, error?, ... } — forward it honestly.
      return NextResponse.json(data, { status: data?.success ? 200 : 400 })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
