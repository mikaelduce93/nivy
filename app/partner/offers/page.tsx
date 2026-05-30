// V1.2 Wave 2 PT1 — TICKET-026
// Replace hardcoded mock with live Supabase reads against `partner_offers`
// (canonical table reconciled by migration 074). Filtered by the
// authenticated partner's id, server-rendered.
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatHero, NivEmpty } from "@/components/brand"
import { OfferRowActions } from "@/components/partner/offer-row-actions"
import { Plus, Tag } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"

type OfferRow = {
  id: string
  title: string | null
  discount_value: number | null
  discount_type: string | null
  valid_from: string | null
  valid_until: string | null
  current_total_uses: number | null
  is_active: boolean | null
  created_at: string | null
}

function formatDiscount(value: number | null, type: string | null): string {
  if (value == null) return "—"
  switch (type) {
    case "percentage":
      return `-${value}%`
    case "fixed":
      return `-${value} DH`
    case "free_item":
      return "Cadeau"
    case "bundle":
      return "Bundle"
    default:
      return `${value}`
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function discountTypeLabel(type: string | null): string {
  switch (type) {
    case "percentage":
      return "Réduction"
    case "fixed":
      return "Montant fixe"
    case "free_item":
      return "Cadeau"
    case "bundle":
      return "Bundle"
    default:
      return "Offre"
  }
}

export default async function PartnerOffersPage() {
  const userInfo = await getUserRole()

  if (!userInfo) {
    redirect("/auth/login")
  }

  const partnerId =
    userInfo.role === "partner" ? userInfo.partnerData?.id : null

  if (!partnerId) {
    return (
      <div className="space-y-6">
        <div>
          <p className="eyebrow tracking-[0.16em] text-mute">Tes offres</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Tes <em className="font-semibold italic text-pink">deals</em>
          </h1>
          <p className="text-mute">Gère tes offres exclusives Nivy</p>
        </div>
        <StickerCard className="p-10 text-center">
          <p className="font-display text-lg font-bold text-ink">
            Profil partenaire introuvable
          </p>
          <p className="mt-2 text-sm text-mute">
            Ton compte n'est pas encore lié à une fiche partenaire active.
            Contacte le support pour finaliser ton onboarding.
          </p>
        </StickerCard>
      </div>
    )
  }

  const supabase = await createClient()

  // Polish-F: wrap with try/catch and capture error so RLS / network failures
  // surface as a banner instead of a permanently-empty list.
  let offers: OfferRow[] = []
  let loadError: string | null = null
  try {
    const { data: offersRaw, error } = await supabase
      .from("partner_offers")
      .select(
        "id, title, discount_value, discount_type, valid_from, valid_until, current_total_uses, is_active, created_at",
      )
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
    if (error) {
      console.error("[partner/offers] partner_offers error:", error)
      loadError = "Impossible de charger les offres pour le moment."
    } else {
      offers = (offersRaw ?? []) as OfferRow[]
    }
  } catch (err) {
    console.error("[partner/offers] partner_offers threw:", err)
    loadError = "Impossible de charger les offres pour le moment."
  }

  const activeOffers = offers.filter((o) => o.is_active === true)
  const totalUses = offers.reduce(
    (sum, o) => sum + (o.current_total_uses ?? 0),
    0,
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow tracking-[0.16em] text-mute">Tes offres</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Tes <em className="font-semibold italic text-pink">deals</em>
          </h1>
          <p className="text-mute">Gère tes offres exclusives Nivy</p>
        </div>
        <Button asChild variant="pink">
          <Link href="/partner/offers/new">
            <Plus className="size-4" aria-hidden="true" />
            Nouvelle offre
          </Link>
        </Button>
      </div>

      {loadError && (
        <div
          role="alert"
          className="rounded-xl border-2 border-coral bg-coral/10 px-4 py-3 text-sm font-medium text-ink"
        >
          {loadError}
        </div>
      )}

      {/* Stats — hiérarchie 1-2-3 : un chiffre dominant + deux secondaires */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatHero
          eyebrow="Offres actives"
          value={activeOffers.length}
          tone="lime"
          icon={<Tag className="size-5" aria-hidden="true" />}
          meta={`${offers.length} au total`}
        />
        <StickerCard className="justify-center gap-1 p-5">
          <p className="eyebrow tracking-[0.16em] text-mute">
            Utilisations totales
          </p>
          <p className="font-display text-4xl font-extrabold tabular-nums text-coral">
            {totalUses}
          </p>
        </StickerCard>
        <StickerCard className="justify-center gap-1 p-5">
          <p className="eyebrow tracking-[0.16em] text-mute">Total offres</p>
          <p className="font-display text-4xl font-extrabold tabular-nums text-ink">
            {offers.length}
          </p>
        </StickerCard>
      </div>

      {/* Offers List */}
      {offers.length === 0 ? (
        <NivEmpty
          mood="calm"
          title="T'as pas encore de deal"
          description="Lance-toi et crée ta première offre pour attirer le crew Nivy."
          action={
            <Button asChild variant="pink">
              <Link href="/partner/offers/new">
                <Plus className="size-4" aria-hidden="true" />
                Nouvelle offre
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => {
            const active = offer.is_active === true
            return (
              <StickerCard
                key={offer.id}
                className="gap-4 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-2">
                    <h2 className="font-display text-lg font-bold text-ink">
                      {offer.title || "Offre sans titre"}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border-2 border-ink bg-gold/20 px-2.5 py-0.5 font-mono text-xs font-bold text-ink">
                        {formatDiscount(
                          offer.discount_value,
                          offer.discount_type,
                        )}
                      </span>
                      <span className="font-mono text-xs uppercase tracking-[0.12em] text-mute">
                        {discountTypeLabel(offer.discount_type)}
                      </span>
                      <span
                        className={`rounded-full border-2 border-ink px-2.5 py-0.5 font-mono text-xs font-bold ${
                          active ? "bg-lime/30 text-ink" : "bg-paper-2 text-mute"
                        }`}
                      >
                        {active ? "✓ Actif" : "En pause"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-mute">
                      <span>{offer.current_total_uses ?? 0} util.</span>
                      <span>
                        {formatDate(offer.valid_from)} →{" "}
                        {formatDate(offer.valid_until)}
                      </span>
                    </div>
                  </div>
                  <OfferRowActions
                    offerId={offer.id}
                    offerTitle={offer.title || "sans titre"}
                  />
                </div>
              </StickerCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
