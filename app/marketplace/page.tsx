/**
 * /marketplace — discover feed (Wave 2.4 C2C marketplace).
 *
 * Server-rendered list of active listings. Filters via search params:
 *   ?category=clothing&city=Casablanca&max_price=500&search=jacket
 */

import Link from "next/link"
import Image from "next/image"
import { Search, Plus } from "lucide-react"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { NivEmpty } from "@/components/brand"

export const dynamic = "force-dynamic"

const CATEGORIES = [
  "clothing","books","school","sport","gaming","art","crafts","tickets","services","other",
] as const

// Libellés FR des catégories (mapping présentation — slugs serveur inchangés).
const CATEGORY_LABELS: Record<string, string> = {
  clothing: "Vêtements",
  books: "Livres",
  school: "Scolaire",
  sport: "Sport",
  gaming: "Gaming",
  art: "Art",
  crafts: "Fait main",
  tickets: "Billets",
  services: "Services",
  other: "Autre",
}

const CONDITION_LABELS: Record<string, string> = {
  new: "Neuf",
  like_new: "Comme neuf",
  good: "Bon état",
  fair: "Correct",
  poor: "Usé",
}

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
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-24">
        {/* Hero éditorial */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow tracking-[0.18em] text-mute">Marketplace Nivy</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Achète &amp; vends entre <em className="font-semibold italic text-pink">ton crew</em>
            </h1>
            <p className="mt-2 text-mute">En toute sécurité, entre teens vérifiés.</p>
          </div>
          <Button asChild variant="pink" className="shadow-stkr-md">
            <Link href="/marketplace/sell">
              <Plus className="size-4" aria-hidden="true" />
              Vendre un article
            </Link>
          </Button>
        </header>

        {/* Onglets espace perso */}
        <nav className="mb-6 flex flex-wrap gap-2" aria-label="Mon espace marketplace">
          <Link
            href="/marketplace/my-listings"
            className="inline-flex min-h-touch items-center rounded-xl border-2 border-ink bg-white px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-ink shadow-stkr-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-pink"
          >
            Mes annonces
          </Link>
          <Link
            href="/marketplace/orders"
            className="inline-flex min-h-touch items-center rounded-xl border-2 border-ink bg-white px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-ink shadow-stkr-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-pink"
          >
            Mes commandes
          </Link>
        </nav>

        {/* Barre de filtres (GET natif préservé) */}
        <form className="mb-8 flex flex-wrap items-end gap-3" method="GET">
          <label className="flex min-w-[180px] flex-1 flex-col gap-1.5">
            <span className="eyebrow tracking-[0.16em]">Rechercher</span>
            <span className="flex h-11 items-center rounded-xl border-2 border-line bg-white px-3 transition-colors focus-within:border-ink">
              <Search className="size-4 text-mute" aria-hidden="true" />
              <input
                name="search"
                placeholder="Un sweat, une manette…"
                defaultValue={sp.search ?? ""}
                className="ml-2 h-full w-full bg-transparent text-sm outline-none placeholder:text-mute"
              />
            </span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow tracking-[0.16em]">Catégorie</span>
            <select
              name="category"
              defaultValue={sp.category ?? ""}
              className="h-11 rounded-xl border-2 border-line bg-white px-3 text-sm font-medium text-ink outline-none transition-colors focus:border-ink"
            >
              <option value="">Toutes catégories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow tracking-[0.16em]">Ville</span>
            <input
              name="city"
              placeholder="Casablanca…"
              defaultValue={sp.city ?? ""}
              className="h-11 w-40 rounded-xl border-2 border-line bg-white px-3 text-sm outline-none transition-colors placeholder:text-mute focus:border-ink"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow tracking-[0.16em]">Prix max</span>
            <input
              name="max_price"
              type="number"
              placeholder="⊙ coins"
              defaultValue={sp.max_price ?? ""}
              className="h-11 w-36 rounded-xl border-2 border-line bg-white px-3 font-mono text-sm outline-none transition-colors placeholder:text-mute focus:border-ink"
            />
          </label>
          <Button type="submit" variant="outline" className="h-11">Filtrer</Button>
        </form>

        {listings.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Aucune annonce pour le moment"
            description="Sois le premier à proposer un article à ton crew."
            action={
              <Button asChild variant="pink">
                <Link href="/marketplace/sell">Mets ton premier article en vente</Link>
              </Button>
            }
          />
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
            {listings.map((l, idx) => (
              <li key={l.id}>
                {/* TICKET-024 — View Transitions morph anchor. Pairs with the
                    hero on /marketplace/listings/[id]. */}
                <Link
                  href={`/marketplace/listings/${l.id}`}
                  className="block focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40"
                  style={{ viewTransitionName: `vt-listing-${l.id}` }}
                >
                  <StickerCard variant="hover" className="overflow-hidden">
                    <div className="relative aspect-square overflow-hidden border-b-2 border-ink bg-paper-2">
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
                        <span className="flex h-full items-center justify-center text-xs text-mute">
                          Pas de photo
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 p-3">
                      <div className="truncate font-display font-bold">{l.title}</div>
                      <div className="font-mono text-lg font-bold tabular-nums">
                        {l.price_coins != null ? (
                          <span className="text-coral">⊙ {l.price_coins}</span>
                        ) : (
                          <span className="text-ink">{l.price_dh} DH</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {l.condition ? (
                          <span className="rounded-full border-2 border-ink bg-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink">
                            {CONDITION_LABELS[l.condition] ?? l.condition}
                          </span>
                        ) : null}
                        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-mute">
                          {l.city ?? CATEGORY_LABELS[l.category] ?? l.category}
                        </span>
                      </div>
                    </div>
                  </StickerCard>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  )
}
