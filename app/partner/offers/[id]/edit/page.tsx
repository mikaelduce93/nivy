import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { OfferEditForm } from "@/components/partner/offer-edit-form"
import { OfferDeleteZone } from "@/components/partner/offer-delete-zone"

async function getOffer(offerId: string, partnerId: string) {
  const supabase = await createClient()

  const { data: offer, error } = await supabase
    .from("partner_offers")
    .select("*")
    .eq("id", offerId)
    .eq("partner_id", partnerId)
    .single()

  if (error || !offer) {
    return null
  }

  return offer
}

export default async function EditOfferPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  // #50 — Next 16: params is a Promise and must be awaited.
  const { id } = await params
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "partner") {
    redirect("/auth/redirect")
  }

  const partnerId = userInfo.partnerData?.id
  if (!partnerId) {
    redirect("/partner")
  }

  const offer = await getOffer(id, partnerId)

  if (!offer) {
    notFound()
  }

  // #50 — canonical partner_offers.status ∈ {draft, pending_approval, approved,
  // rejected, paused, expired, archived}.
  const STATUS_LABELS: Record<string, string> = {
    draft: "Brouillon",
    pending_approval: "En modération",
    approved: "Live",
    rejected: "Rejetée",
    paused: "En pause",
    expired: "Expirée",
    archived: "Archivée",
  }
  const statusLabel = STATUS_LABELS[offer.status] || offer.status

  // Pill mono charte : token + préfixe selon l'état (live ✓ lime / modération
  // gold / autres mute), toujours bordure 2px ink.
  const statusPill =
    offer.status === "approved"
      ? "bg-lime/30 text-ink"
      : offer.status === "pending_approval"
        ? "bg-gold/25 text-ink"
        : "bg-paper-2 text-mute"
  const statusPrefix = offer.status === "approved" ? "✓ " : ""

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/partner/offers" aria-label="Retour aux offres">
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
        </Button>
        <div>
          <p className="eyebrow tracking-[0.16em] text-mute">Modifier</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Modifie ton <em className="font-semibold italic text-pink">deal</em>
          </h1>
          <p className="text-mute">Mets à jour les détails de ton offre</p>
        </div>
      </div>

      {/* Status Banner — pill mono dominante */}
      <StickerCard className="gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full border-2 border-ink px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.14em] ${statusPill}`}
          >
            {statusPrefix}
            {statusLabel}
          </span>
          <span className="font-mono text-xs text-mute">
            Créée le {new Date(offer.created_at).toLocaleDateString("fr-FR")}
          </span>
        </div>
        <span className="font-mono text-xs text-mute">
          {offer.current_total_uses || 0} utilisations
        </span>
      </StickerCard>

      {/* Edit Form */}
      <StickerCard className="gap-4 p-5">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            Détails de l&apos;offre
          </h2>
          <p className="text-sm text-mute">
            Modifie les informations de ton offre
          </p>
        </div>
        <OfferEditForm
          offerId={id}
          partnerId={partnerId}
          initialData={{
            title: offer.title || "",
            description: offer.description || "",
            offerType: offer.offer_type || "reduction",
            discountValue: offer.discount_value || 0,
            minPurchaseAmount: offer.min_purchase_amount || 0,
            maxTotalUses: offer.max_total_uses ?? null,
            maxUsesPerUser: offer.max_uses_per_user ?? null,
            requiresVip: offer.requires_vip ?? false,
            minVipLevel: offer.min_vip_level || "silver",
            validFrom: offer.valid_from || "",
            validUntil: offer.valid_until || "",
            status: offer.status || "pending_approval",
          }}
        />
      </StickerCard>

      {/* Danger Zone — réellement câblée (modal + DELETE) */}
      <OfferDeleteZone
        offerId={id}
        offerTitle={offer.title || "sans titre"}
      />
    </div>
  )
}
