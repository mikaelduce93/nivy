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
  params: { id: string }
}) {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "partner") {
    redirect("/auth/redirect")
  }

  const partnerId = userInfo.partnerData?.id
  if (!partnerId) {
    redirect("/partner")
  }

  const offer = await getOffer(params.id, partnerId)

  if (!offer) {
    notFound()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="text-zinc-400 hover:text-white">
          <Link href="/partner/offers">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-black text-white">Modifier l'offre</h1>
          <p className="text-zinc-400">Mettez à jour les détails de votre offre</p>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-xl flex items-center justify-between ${
        offer.status === "active"
          ? "bg-emerald-500/10 border border-emerald-500/30"
          : offer.status === "pending"
          ? "bg-amber-500/10 border border-amber-500/30"
          : "bg-zinc-800 border border-zinc-700"
      }`}>
        <div>
          <p className={`font-medium ${
            offer.status === "active" ? "text-emerald-400" :
            offer.status === "pending" ? "text-amber-400" : "text-zinc-400"
          }`}>
            Statut: {offer.status === "active" ? "Active" :
                     offer.status === "pending" ? "En attente" :
                     offer.status === "inactive" ? "Inactive" : offer.status}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Créée le {new Date(offer.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">{offer.usage_count || 0} utilisations</span>
        </div>
      </div>

      {/* Edit Form */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Détails de l'offre</CardTitle>
          <CardDescription className="text-zinc-400">
            Modifiez les informations de votre offre
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OfferEditForm
            offerId={params.id}
            partnerId={partnerId}
            initialData={{
              name: offer.name || "",
              description: offer.description || "",
              offerType: offer.offer_type || "reduction",
              value: offer.discount_value || 0,
              minPurchase: offer.min_purchase || 0,
              maxUsage: offer.max_usage || null,
              validFrom: offer.valid_from || "",
              validUntil: offer.valid_until || "",
              status: offer.status || "active",
              eligibleLevels: offer.eligible_levels || []
            }}
          />
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-zinc-900 border-red-500/30">
        <CardHeader>
          <CardTitle className="text-red-400">Zone de danger</CardTitle>
          <CardDescription className="text-zinc-400">
            Actions irréversibles
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">Supprimer cette offre</p>
            <p className="text-xs text-zinc-500">
              Cette action est irréversible. L'offre sera définitivement supprimée.
            </p>
          </div>
          <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
            Supprimer
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
