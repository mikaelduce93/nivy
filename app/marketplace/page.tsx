/**
 * /marketplace — discover feed (Wave 2.4 C2C marketplace).
 *
 * Server-rendered list of active listings. Filters via search params:
 *   ?category=clothing&city=Casablanca&max_price=500&search=jacket
 */

import Link from "next/link"
import Image from "next/image"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

const CATEGORIES = [
  "clothing","books","school","sport","gaming","art","crafts","tickets","services","other",
] as const

interface Listing {
  id: string
  title: string
  category: string
  price_coins: number | null
  price_dh: number | null
  images: string[] | null
  condition: string | null
  city: string | null
  seller_user_id: string
}

async function getListings(params: Record<string, string | undefined>) {
  const sb = createServiceRoleClient()
  let q = sb
    .from("marketplace_listings")
    .select("id, title, category, price_coins, price_dh, images, condition, city, seller_user_id")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(48)
  if (params.category) q = q.eq("category", params.category)
  if (params.city) q = q.eq("city", params.city)
  if (params.max_price) {
    const n = Number(params.max_price)
    if (Number.isFinite(n) && n > 0) q = q.lte("price_coins", n)
  }
  if (params.search) q = q.ilike("title", `%${params.search}%`)
  const { data } = await q
  return (data ?? []) as Listing[]
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const listings = await getListings(sp)

  return (
    <main className="min-h-screen mx-auto max-w-5xl px-4 py-8">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Marketplace</h1>
          <p className="text-sm text-gray-600">Achète et vends en toute sécurité entre teens.</p>
        </div>
        <Link
          href="/marketplace/sell"
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Vendre
        </Link>
      </header>

      <form className="mb-6 flex flex-wrap gap-2 items-end" method="GET">
        <input
          name="search"
          placeholder="Rechercher…"
          defaultValue={sp.search ?? ""}
          className="rounded border px-3 py-2 text-sm"
        />
        <select name="category" defaultValue={sp.category ?? ""} className="rounded border px-3 py-2 text-sm">
          <option value="">Toutes catégories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          name="city"
          placeholder="Ville"
          defaultValue={sp.city ?? ""}
          className="rounded border px-3 py-2 text-sm"
        />
        <input
          name="max_price"
          type="number"
          placeholder="Prix max (coins)"
          defaultValue={sp.max_price ?? ""}
          className="rounded border px-3 py-2 text-sm w-40"
        />
        <button className="rounded bg-gray-800 text-white px-4 py-2 text-sm">Filtrer</button>
        <Link href="/marketplace/my-listings" className="ml-auto text-sm text-blue-600 underline">
          Mes annonces
        </Link>
        <Link href="/marketplace/orders" className="text-sm text-blue-600 underline">
          Mes commandes
        </Link>
      </form>

      {listings.length === 0 ? (
        <p className="text-gray-500">Aucune annonce active pour le moment.</p>
      ) : (
        <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {listings.map((l, idx) => (
            <li key={l.id} className="border rounded-lg overflow-hidden bg-white">
              <Link href={`/marketplace/listings/${l.id}`} className="block">
                <div className="relative aspect-square bg-gray-100 flex items-center justify-center text-gray-400 overflow-hidden">
                  {l.images && l.images[0] ? (
                    <Image
                      src={l.images[0]}
                      alt={l.title}
                      fill
                      // First 3 cards are above-the-fold on most viewports → mark
                      // as LCP candidates. Lower-priority for the rest.
                      priority={idx < 3}
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-xs">no image</span>
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <div className="font-semibold truncate">{l.title}</div>
                  <div className="text-sm text-gray-600">
                    {l.price_coins != null ? `${l.price_coins} coins` : `${l.price_dh} DH`}
                  </div>
                  <div className="text-xs text-gray-500">
                    {l.city ?? "—"} · {l.condition ?? l.category}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
