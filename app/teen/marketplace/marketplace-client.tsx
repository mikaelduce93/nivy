"use client"

/**
 * MarketplaceClient — partner-vendor marketplace buy flow (V6, issue #241).
 *
 * Browse active partner-vendor listings and buy one with coins. On buy →
 * POST /api/teen/marketplace { action:'buy', listingId } → record_marketplace_sale.
 * The RPC result { success, error?, amount_coins, ... } is surfaced honestly
 * (never a fabricated success). Bought listings drop out of the local list and
 * appear under « Tes achats ».
 */
import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Loader2, ShoppingBag, CheckCircle2, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { Badge } from "@/components/ui/badge"
import { NivEmpty } from "@/components/brand"

export interface Listing {
  id: string
  title: string
  description: string | null
  priceCoins: number
  image: string | null
  category: string | null
  sellerName: string | null
}

export interface Purchase {
  id: string
  listingId: string | null
  amountCoins: number
  createdAt: string | null
}

interface Props {
  listings: Listing[]
  purchases: Purchase[]
  balance: number
}

type BuyState =
  | { kind: "idle" }
  | { kind: "buying"; listingId: string }
  | { kind: "done"; listingId: string }
  | { kind: "error"; listingId: string; message: string }

// Errors the RPC may forward → FR copy. Anything else falls back below.
const ERROR_COPY: Record<string, string> = {
  insufficient_balance: "Il te manque des coins pour cet article.",
  listing_unavailable: "Cet article n'est plus disponible.",
  not_a_partner_listing: "Cet article n'est pas vendu par un partenaire.",
  not_purchasable: "Cet article n'est pas achetable.",
}

export function MarketplaceClient({ listings, purchases, balance }: Props) {
  const router = useRouter()
  const [state, setState] = useState<BuyState>({ kind: "idle" })
  // Locally hide listings bought this session so the UI updates instantly.
  const [boughtIds, setBoughtIds] = useState<Set<string>>(new Set())

  const visibleListings = listings.filter((l) => !boughtIds.has(l.id))

  const buy = async (listing: Listing) => {
    setState({ kind: "buying", listingId: listing.id })
    try {
      const res = await fetch("/api/teen/marketplace", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "buy", listingId: listing.id }),
      })
      const json = await res.json()

      if (res.ok && json?.success === true) {
        setBoughtIds((prev) => new Set(prev).add(listing.id))
        setState({ kind: "done", listingId: listing.id })
        // Refresh the server balance + purchases without losing local state.
        router.refresh()
        return
      }

      const code = typeof json?.error === "string" ? json.error : ""
      const message =
        ERROR_COPY[code] ||
        (res.status === 401
          ? "Tu dois être connecté pour acheter."
          : "L'achat n'a pas pu être effectué.")
      setState({ kind: "error", listingId: listing.id, message })
    } catch (err) {
      console.error("[Marketplace] network error", err)
      setState({
        kind: "error",
        listingId: listing.id,
        message: "Connexion impossible. Vérifie ta connexion et réessaie.",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Solde coins */}
      <div className="flex items-center justify-between rounded-2xl border-2 border-ink bg-pink/10 px-4 py-3">
        <span className="font-mono text-xs font-bold uppercase tracking-wide text-mute">
          Ton solde
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-lg font-bold tabular-nums text-ink">
          ⊙ {balance.toLocaleString("fr-FR")}
        </span>
      </div>

      {/* Listings */}
      <section aria-label="Articles des partenaires">
        <h2 className="mb-3 font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
          À vendre
        </h2>

        {visibleListings.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Pas encore d'article"
            description="Nos partenaires n'ont pas encore mis d'article en vente. Reviens bientôt, la boutique se remplit !"
          />
        ) : (
          <div className="space-y-4">
            {visibleListings.map((listing) => {
              const isBuying = state.kind === "buying" && state.listingId === listing.id
              const isError = state.kind === "error" && state.listingId === listing.id
              const tooPoor = balance < listing.priceCoins
              const disabled = isBuying || tooPoor

              return (
                <StickerCard key={listing.id} className="gap-3 p-5">
                  <div className="flex items-start gap-4">
                    {listing.image ? (
                      <Image
                        src={listing.image}
                        alt=""
                        width={72}
                        height={72}
                        className="h-[72px] w-[72px] shrink-0 rounded-xl border-2 border-ink object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-muted">
                        <Package className="h-7 w-7 text-mute" aria-hidden />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-display font-bold leading-tight text-ink">
                          {listing.title}
                        </h3>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-ink bg-pink/15 px-3 py-1 font-mono text-sm font-bold text-ink">
                          ⊙ {listing.priceCoins.toLocaleString("fr-FR")}
                        </span>
                      </div>
                      {listing.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-ink-2">
                          {listing.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {listing.sellerName && (
                          <Badge variant="outline">{listing.sellerName}</Badge>
                        )}
                        {listing.category && (
                          <Badge variant="outline">{listing.category}</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {isError && state.kind === "error" && (
                    <p
                      role="alert"
                      aria-live="polite"
                      className="rounded-xl border-2 border-destructive bg-danger-soft px-3 py-2 text-sm font-semibold text-destructive"
                    >
                      {state.message}
                    </p>
                  )}

                  {!isError && tooPoor && (
                    <p className="text-xs font-semibold text-mute">
                      Il te manque des coins pour cet article.
                    </p>
                  )}

                  <Button
                    variant="pink"
                    size="sm"
                    disabled={disabled}
                    onClick={() => buy(listing)}
                    className="self-start"
                  >
                    {isBuying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Achat…
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="h-4 w-4" aria-hidden />
                        Acheter
                      </>
                    )}
                  </Button>
                </StickerCard>
              )
            })}
          </div>
        )}
      </section>

      {/* Tes achats */}
      {purchases.length > 0 && (
        <section aria-label="Tes achats">
          <h2 className="mb-3 font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
            Tes achats
          </h2>
          <div className="space-y-2">
            {purchases.map((p) => (
              <StickerCard
                key={p.id}
                variant="panel"
                className="flex-row items-center justify-between gap-3 p-4"
              >
                <span className="inline-flex items-center gap-2 text-sm font-bold text-ink">
                  <CheckCircle2 className="h-4 w-4 text-mute" aria-hidden />
                  Achat confirmé
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-sm font-bold tabular-nums text-ink">
                  ⊙ {p.amountCoins.toLocaleString("fr-FR")}
                </span>
              </StickerCard>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
