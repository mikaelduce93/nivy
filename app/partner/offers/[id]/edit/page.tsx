import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Tag } from "lucide-react"
import Link from "next/link"
import { OfferEditForm } from "@/components/partner/offer-edit-form"

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
    pending_approval: "En attente de modération",
    approved: "Approuvée",
    rejected: "Rejetée",
    paused: "En pause",
    expired: "Expirée",
    archived: "Archivée",
  }
  const statusLabel = STATUS_LABELS[offer.status] || offer.status

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="text-mute hover:text-ink">
          <Link href="/partner/offers">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-black text-ink">Modifier l'offre</h1>
          <p className="text-mute">Mettez à jour les détails de votre offre</p>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-xl flex items-center justify-between ${
        offer.status === "approved"
          ? "bg-lime/10 border border-lime/30"
          : offer.status === "pending_approval"
          ? "bg-gold/10 border border-gold/30"
          : "bg-card border border-ink"
      }`}>
        <div>
          <p className={`font-medium ${
            offer.status === "approved" ? "text-lime" :
            offer.status === "pending_approval" ? "text-gold" : "text-mute"
          }`}>
            Statut: {statusLabel}
          </p>
          <p className="text-xs text-mute mt-1">
            Créée le {new Date(offer.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-mute">{offer.current_total_uses || 0} utilisations</span>
        </div>
      </div>

      {/* Edit Form */}
      <Card className="bg-card border-ink">
        <CardHeader>
          <CardTitle className="text-ink">Détails de l'offre</CardTitle>
          <CardDescription className="text-mute">
            Modifiez les informations de votre offre
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-card border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Zone de danger</CardTitle>
          <CardDescription className="text-mute">
            Actions irréversibles
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-ink font-medium">Supprimer cette offre</p>
            <p className="text-xs text-mute">
              Cette action est irréversible. L'offre sera définitivement supprimée.
            </p>
          </div>
          <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10">
            Supprimer
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
