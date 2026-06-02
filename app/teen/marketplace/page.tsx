/**
 * /teen/marketplace — Partner-vendor marketplace (V6, issue #241).
 *
 * Teen-facing slice: browse PARTNER-VENDOR listings and buy one with coins.
 * (The existing top-level /marketplace is the C2C feature — a different
 * pillar — and is NOT touched here.)
 *
 * Server component: loads active partner-vendor listings (seller_id NOT NULL,
 * status='active') joined to their seller display_name, the teen's own
 * purchases (marketplace_sales WHERE buyer_teen_id = teen), and the teen's
 * coin balance. The client component handles the buy interaction
 * (POST /api/teen/marketplace → record_marketplace_sale) and honest result
 * display. Charte paper hero + StickerCard.
 *
 * Empty state is expected and correct when no partner-vendor listing is seeded.
 * Scope d'écriture : ce fichier + ./marketplace-client. Lecture seule en DB.
 */
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Store } from "lucide-react"
import { MarketplaceClient, type Listing, type Purchase } from "./marketplace-client"

export const dynamic = "force-dynamic"

interface ListingRow {
  id: string
  title: string | null
  description: string | null
  price_coins: number | null
  images: string[] | null
  category: string | null
  seller_id: string | null
  created_at: string | null
}

interface SaleRow {
  id: string
  listing_id: string | null
  amount_coins: number | null
  net_coins: number | null
  created_at: string | null
}

export default async function TeenMarketplacePage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/login")
  const supabase = await createClient()
  const teenId = userInfo.profileId

  // Partner-vendor listings only (seller_id NOT NULL), buyable now.
  const { data: listingRows } = await supabase
    .from("marketplace_listings")
    .select("id, title, description, price_coins, images, category, seller_id, created_at")
    .not("seller_id", "is", null)
    .eq("status", "active")
    .order("created_at", { ascending: false })

  const rows = (listingRows ?? []) as ListingRow[]

  // Resolve seller display names in one batch.
  const sellerIds = Array.from(
    new Set(rows.map((r) => r.seller_id).filter(Boolean))
  ) as string[]

  const sellerNames = new Map<string, string | null>()
  if (sellerIds.length > 0) {
    const { data: sellers } = await supabase
      .from("marketplace_sellers")
      .select("id, display_name")
      .in("id", sellerIds)
    for (const s of (sellers ?? []) as Array<{ id: string; display_name: string | null }>) {
      sellerNames.set(s.id, s.display_name)
    }
  }

  const listings: Listing[] = rows.map((r) => ({
    id: r.id,
    title: r.title ?? "Article",
    description: r.description,
    priceCoins: r.price_coins ?? 0,
    image: r.images?.[0] ?? null,
    category: r.category,
    sellerName: r.seller_id ? sellerNames.get(r.seller_id) ?? null : null,
  }))

  // The teen's own purchases (RLS: buyer_teen_id = auth.uid()).
  const { data: saleRows } = await supabase
    .from("marketplace_sales")
    .select("id, listing_id, amount_coins, net_coins, created_at")
    .eq("buyer_teen_id", teenId)
    .order("created_at", { ascending: false })

  const purchases: Purchase[] = ((saleRows ?? []) as SaleRow[]).map((s) => ({
    id: s.id,
    listingId: s.listing_id,
    amountCoins: s.amount_coins ?? 0,
    createdAt: s.created_at,
  }))

  const balance = userInfo.teenData?.coins ?? 0

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-4 pb-24 pt-6 md:p-8">
      <header className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-pink/20">
          <Store className="h-7 w-7 text-ink" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="eyebrow tracking-[0.16em]">Marketplace</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            La <em className="font-semibold italic text-pink">boutique</em>
          </h1>
          <p className="mt-1 text-sm text-mute">
            Des articles proposés par nos partenaires, à acheter avec tes coins.
          </p>
        </div>
      </header>

      <MarketplaceClient listings={listings} purchases={purchases} balance={balance} />
    </div>
  )
}
