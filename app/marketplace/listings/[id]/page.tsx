/**
 * /marketplace/listings/:id — listing detail + Buy CTA.
 */

import { notFound } from "next/navigation"
import Image from "next/image"
import { Star, ShieldCheck } from "lucide-react"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { StickerCard } from "@/components/ui/sticker-card"
import { Niv } from "@/components/brand"
import { BuyButton } from "./buy-button"

export const dynamic = "force-dynamic"

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

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sb = createServiceRoleClient()

  const { data: listing } = await sb
    .from("marketplace_listings")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (!listing) notFound()

  // bump views
  if (listing.status === "active") {
    await sb
      .from("marketplace_listings")
      .update({ views_count: (listing.views_count ?? 0) + 1 })
      .eq("id", id)
  }

  const { data: stats } = await sb
    .from("user_seller_stats")
    .select("sold_count, rating_avg, trust_badge")
    .eq("user_id", listing.seller_user_id)
    .maybeSingle()

  const rating = Number(stats?.rating_avg ?? 0)

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main className="mx-auto max-w-2xl space-y-6 px-4 pb-20 pt-24">
        <header>
          <p className="eyebrow tracking-[0.16em] text-mute">
            {CATEGORY_LABELS[listing.category] ?? listing.category}
            {listing.city ? ` · ${listing.city}` : ""}
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">{listing.title}</h1>
        </header>

        {/* Galerie — TICKET-024 : moitié destination du morph View Transitions.
            Pairs with the listing card on /marketplace. */}
        <StickerCard
          className="overflow-hidden p-0"
          style={{ viewTransitionName: `vt-listing-${listing.id}` }}
        >
          <div className="relative aspect-video bg-paper-2">
            {Array.isArray(listing.images) && listing.images[0] ? (
              <Image
                src={listing.images[0]}
                alt={listing.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 672px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <Niv mood="calm" size={88} />
                <span className="font-mono text-xs uppercase tracking-[0.1em] text-mute">Pas de photo</span>
              </div>
            )}
          </div>
        </StickerCard>

        {/* Carte d'achat — prix + état */}
        <StickerCard className="gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-display text-3xl font-extrabold tabular-nums">
              {listing.price_coins != null ? (
                <span className="text-coral">⊙ {listing.price_coins}</span>
              ) : (
                <span className="text-ink">{listing.price_dh} DH</span>
              )}
            </div>
            {listing.condition ? (
              <span className="rounded-full border-2 border-ink bg-white px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink">
                {CONDITION_LABELS[listing.condition] ?? listing.condition}
              </span>
            ) : null}
          </div>
          {listing.description ? (
            <p className="whitespace-pre-line text-ink">{listing.description}</p>
          ) : null}
        </StickerCard>

        {/* Carte vendeur — trust */}
        {stats && (
          <StickerCard variant="panel" className="gap-3 p-5">
            <p className="eyebrow tracking-[0.16em] text-mute">Vendeur</p>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="font-display text-xl font-extrabold tabular-nums text-ink">{stats.sold_count ?? 0}</p>
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-mute">ventes</p>
              </div>
              <div className="flex items-center gap-1" aria-label={`Note ${rating} sur 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`size-4 ${n <= Math.round(rating) ? "fill-gold text-gold" : "text-line"}`}
                    aria-hidden="true"
                  />
                ))}
                <span className="ml-1 font-mono text-sm font-bold tabular-nums text-ink">{rating}/5</span>
              </div>
              {stats.trust_badge ? (
                <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-lime px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ink">
                  <ShieldCheck className="size-3.5" aria-hidden="true" />
                  Nivy Guarantee
                </span>
              ) : null}
            </div>
          </StickerCard>
        )}

        {listing.status === "active" ? (
          <BuyButton listingId={listing.id} />
        ) : (
          <div className="flex items-start gap-3 rounded-2xl border-2 border-ink bg-coral/15 p-4 shadow-stkr-sm">
            <p className="text-sm font-medium text-ink">
              Cette annonce n&apos;est plus disponible.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
