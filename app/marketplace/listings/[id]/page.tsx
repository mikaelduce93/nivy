/**
 * /marketplace/listings/:id — listing detail + Buy CTA.
 */

import { notFound } from "next/navigation"
import Image from "next/image"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { BuyButton } from "./buy-button"

export const dynamic = "force-dynamic"

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

  return (
    <main className="min-h-screen mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">{listing.title}</h1>
      <div className="text-sm text-gray-600 mb-4">
        {listing.category} · {listing.condition ?? "—"} · {listing.city ?? "—"}
      </div>
      {/* TICKET-024 — destination half of the View Transitions morph.
          Pairs with the listing card on /marketplace. */}
      <div
        className="relative aspect-video bg-gray-100 mb-4 flex items-center justify-center text-gray-400 overflow-hidden"
        style={{ viewTransitionName: `vt-listing-${listing.id}` }}
      >
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
          <span>no image</span>
        )}
      </div>
      <p className="text-gray-800 whitespace-pre-line mb-4">{listing.description}</p>
      <div className="text-2xl font-bold mb-4">
        {listing.price_coins != null ? `${listing.price_coins} coins` : `${listing.price_dh} DH`}
      </div>
      {stats && (
        <div className="text-sm text-gray-600 mb-4">
          Vendeur : {stats.sold_count ?? 0} ventes · note {stats.rating_avg ?? 0}/5
          {stats.trust_badge ? <span className="ml-2 text-green-600">★ Nivy Guarantee</span> : null}
        </div>
      )}

      {listing.status === "active" ? (
        <BuyButton listingId={listing.id} />
      ) : (
        <p className="text-sm text-red-600">Annonce indisponible (statut : {listing.status}).</p>
      )}
    </main>
  )
}
