"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Ticket, CheckCircle2, Lock, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { Badge } from "@/components/ui/badge"
import { NivEmpty } from "@/components/brand"
import { fetchWithCSRF } from "@/lib/security/fetch-with-csrf"

export interface ShopOffer {
  id: string
  title: string
  description: string | null
  offerType: string | null
  discountPct: number | null
  priceCoins: number
  priceDh: number | null
  validUntil: string | null
  requiresVip: boolean
  minVipLevel: string | null
  soldOut: boolean
}

export interface ShopVoucher {
  id: string
  offerId: string
  code: string | null
  status: string | null
  createdAt: string | null
}

interface PartnerShopClientProps {
  offers: ShopOffer[]
  vouchers: ShopVoucher[]
  balance: number
}

type BuyState =
  | { kind: "idle" }
  | { kind: "buying"; offerId: string }
  | { kind: "done"; offerId: string; code: string; newBalance: number | null; xpEarned: number | null }
  | { kind: "error"; offerId: string; message: string }

const VOUCHER_STATUS_LABEL: Record<string, string> = {
  pending: "À utiliser",
  redeemed: "Utilisé",
  cancelled: "Annulé",
}

export function PartnerShopClient({ offers, vouchers, balance }: PartnerShopClientProps) {
  const router = useRouter()
  const [state, setState] = useState<BuyState>({ kind: "idle" })
  // Bons obtenus pendant cette session (rendus tout de suite, sans recharger).
  const [freshVouchers, setFreshVouchers] = useState<ShopVoucher[]>([])

  const allVouchers = [...freshVouchers, ...vouchers]

  const buy = async (offer: ShopOffer) => {
    setState({ kind: "buying", offerId: offer.id })
    try {
      const res = await fetchWithCSRF("/api/teen/partners/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId: offer.id }),
      })

      let payload: Record<string, unknown> = {}
      try {
        payload = await res.json()
      } catch {
        // pas de corps JSON
      }

      if (res.ok && payload.success === true) {
        const code = String(payload.redemption_code ?? "")
        const newBalance =
          typeof payload.new_balance === "number" ? payload.new_balance : null
        const xpEarned =
          typeof payload.xp_earned === "number" ? payload.xp_earned : null
        setFreshVouchers((prev) => [
          {
            id: String(payload.redemption_id ?? `${offer.id}-${Date.now()}`),
            offerId: offer.id,
            code: code || null,
            status: "pending",
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ])
        setState({ kind: "done", offerId: offer.id, code, newBalance, xpEarned })
        toast.success("Offre achetée ! Voici ton code.")
        // Rafraîchit le solde serveur (en-tête / wallet) sans perdre l'état local.
        router.refresh()
        return
      }

      // Échec honnête : message FR renvoyé par l'API (jamais de faux succès).
      const message =
        (payload.message as string | undefined) ||
        (res.status === 401
          ? "Tu dois être connecté pour acheter."
          : "L'achat n'a pas pu être effectué.")
      setState({ kind: "error", offerId: offer.id, message })
      toast.error(message)
    } catch (err) {
      console.error("[PartnerShop] network error", err)
      const message = "Connexion impossible. Vérifie ta connexion et réessaie."
      setState({ kind: "error", offerId: offer.id, message })
      toast.error(message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Solde coins */}
      <div className="flex items-center justify-between rounded-2xl border-2 border-ink bg-coral/10 px-4 py-3">
        <span className="font-mono text-xs font-bold uppercase tracking-wide text-mute">
          Ton solde
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-lg font-bold tabular-nums text-ink">
          ⊙ {balance.toLocaleString("fr-FR")}
        </span>
      </div>

      {/* Offres achetables */}
      <section aria-label="Offres de la boutique">
        <h2 className="mb-3 font-display text-xl font-extrabold tracking-tight text-ink">
          Offres
        </h2>

        {offers.length === 0 ? (
          <NivEmpty
            mood="happy"
            title="Pas encore d'offres ici"
            description="Cette boutique n'a pas encore d'offre à acheter avec tes coins. Reviens bientôt !"
          />
        ) : (
          <div className="space-y-4">
            {offers.map((offer) => {
              const isBuying = state.kind === "buying" && state.offerId === offer.id
              const isDone = state.kind === "done" && state.offerId === offer.id
              const isError = state.kind === "error" && state.offerId === offer.id
              const tooPoor = balance < offer.priceCoins
              const vipGated = offer.requiresVip
              const disabled =
                isBuying || isDone || offer.soldOut || vipGated || tooPoor

              return (
                <StickerCard key={offer.id} className="gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display font-bold leading-tight text-ink">
                        {offer.title}
                      </h3>
                      {offer.description && (
                        <p className="mt-1 text-sm text-ink-2">{offer.description}</p>
                      )}
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-ink bg-coral/15 px-3 py-1 font-mono text-sm font-bold text-ink">
                      ⊙ {offer.priceCoins.toLocaleString("fr-FR")}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {offer.discountPct && offer.discountPct > 0 && (
                      <Badge variant="lime">
                        <Tag className="h-3 w-3" aria-hidden />-{offer.discountPct}%
                      </Badge>
                    )}
                    {vipGated && (
                      <Badge variant="peach">
                        <Lock className="h-3 w-3" aria-hidden />
                        VIP{offer.minVipLevel ? ` ${offer.minVipLevel}` : ""}
                      </Badge>
                    )}
                    {offer.soldOut && <Badge variant="outline-destructive">Épuisé</Badge>}
                  </div>

                  {/* Succès : code de bon */}
                  {isDone && state.kind === "done" && (
                    <div className="rounded-xl border-2 border-ink bg-lime/20 p-3">
                      <p className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wide text-ink">
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                        Ton code
                      </p>
                      <p className="mt-1 select-all font-mono text-xl font-extrabold tracking-widest text-ink">
                        {state.code || "—"}
                      </p>
                      <p className="mt-1 text-xs text-mute">
                        Montre ce code chez le partenaire.
                        {typeof state.newBalance === "number"
                          ? ` Nouveau solde : ⊙ ${state.newBalance.toLocaleString("fr-FR")}.`
                          : ""}
                        {state.xpEarned ? ` +${state.xpEarned} XP.` : ""}
                      </p>
                    </div>
                  )}

                  {/* Erreur honnête */}
                  {isError && state.kind === "error" && (
                    <p className="rounded-xl border-2 border-destructive bg-danger-soft px-3 py-2 text-sm font-semibold text-destructive">
                      {state.message}
                    </p>
                  )}

                  {/* Raison du blocage (avant clic) */}
                  {!isDone && !offer.soldOut && (vipGated || tooPoor) && (
                    <p className="text-xs font-semibold text-mute">
                      {vipGated
                        ? "Réservée aux membres VIP."
                        : "Il te manque des coins pour cette offre."}
                    </p>
                  )}

                  {!isDone && (
                    <Button
                      variant="pink"
                      size="sm"
                      disabled={disabled}
                      onClick={() => buy(offer)}
                      className="self-start"
                    >
                      {isBuying ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          Achat…
                        </>
                      ) : offer.soldOut ? (
                        "Épuisé"
                      ) : (
                        <>
                          <Ticket className="h-4 w-4" aria-hidden />
                          Acheter
                        </>
                      )}
                    </Button>
                  )}
                </StickerCard>
              )
            })}
          </div>
        )}
      </section>

      {/* Bons de l'ado pour ce partenaire */}
      {allVouchers.length > 0 && (
        <section aria-label="Tes bons">
          <h2 className="mb-3 font-display text-xl font-extrabold tracking-tight text-ink">
            Tes bons
          </h2>
          <div className="space-y-2">
            {allVouchers.map((v) => (
              <StickerCard
                key={v.id}
                variant="panel"
                className="flex-row items-center justify-between gap-3 p-4"
              >
                <span className="inline-flex items-center gap-2 font-mono text-sm font-bold tracking-widest text-ink">
                  <Ticket className="h-4 w-4 text-mute" aria-hidden />
                  {v.code ?? "—"}
                </span>
                <Badge variant={v.status === "redeemed" ? "outline" : "lime"}>
                  {(v.status && VOUCHER_STATUS_LABEL[v.status]) || v.status || "—"}
                </Badge>
              </StickerCard>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
