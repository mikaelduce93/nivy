// V1.2 Wave 2 PT1 — TICKET-026
// Replace hardcoded mock with live Supabase reads against `partner_offers`
// (canonical table reconciled by migration 074). Filtered by the
// authenticated partner's id, server-rendered.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Tag, Edit } from "lucide-react"
import { EmptyState } from "@/components/ui/states/empty-state"
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
          <h1 className="text-3xl font-black text-ink">Mes Offres</h1>
          <p className="text-mute">Gérez vos offres exclusives Nivy</p>
        </div>
        <Card className="bg-card border-ink">
          <CardContent className="p-10 text-center">
            <p className="text-ink-2 font-semibold">
              Profil partenaire introuvable
            </p>
            <p className="text-sm text-mute mt-2">
              Votre compte n'est pas encore lié à une fiche partenaire active.
              Contactez le support pour finaliser votre onboarding.
            </p>
          </CardContent>
        </Card>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-ink">Mes Offres</h1>
          <p className="text-mute">Gérez vos offres exclusives Nivy</p>
        </div>
        <Button
          asChild
          className="bg-lime hover:bg-lime text-ink"
        >
          <Link href="/partner/offers/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle offre
          </Link>
        </Button>
      </div>

      {loadError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {loadError}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card border-ink">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black text-ink">
              {activeOffers.length}
            </p>
            <p className="text-sm text-mute">Offres actives</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-ink">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black text-lime">{totalUses}</p>
            <p className="text-sm text-mute">Utilisations totales</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-ink">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black text-ink">{offers.length}</p>
            <p className="text-sm text-mute">Total offres</p>
          </CardContent>
        </Card>
      </div>

      {/* Offers List */}
      <Card className="bg-card border-ink">
        <CardHeader>
          <CardTitle className="text-ink">Toutes les offres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {offers.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="Aucune offre publiée"
              description="Créez votre première offre pour attirer les membres Nivy."
              action={{ label: "Nouvelle offre", href: "/partner/offers/new" }}
            />
          ) : (
            offers.map((offer) => {
              const active = offer.is_active === true
              return (
                <div
                  key={offer.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    active
                      ? "bg-card border-ink hover:border-lime/30"
                      : "bg-background border-ink opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                        active ? "bg-lime/20" : "bg-card"
                      }`}
                    >
                      <Tag
                        className={`h-6 w-6 ${
                          active ? "text-lime" : "text-mute"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-ink">
                        {offer.title || "Offre sans titre"}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-mute">
                        <span className="px-2 py-0.5 rounded bg-card">
                          {discountTypeLabel(offer.discount_type)}
                        </span>
                        <span className="font-bold text-lime">
                          {formatDiscount(
                            offer.discount_value,
                            offer.discount_type,
                          )}
                        </span>
                        <span>
                          {offer.current_total_uses ?? 0} utilisations
                        </span>
                        <span>
                          {formatDate(offer.valid_from)} →{" "}
                          {formatDate(offer.valid_until)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded ${
                            active
                              ? "bg-lime/10 text-lime"
                              : "bg-card text-mute"
                          }`}
                        >
                          {active ? "Active" : "Désactivée"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/*
                      TODO (Wave 2 PT2+): wire inline toggle (PATCH is_active)
                      and delete confirmation. The PATCH/DELETE endpoints at
                      /api/partner/offers/[id] expect a different payload
                      shape (`name`, `offerType`, etc.) than partner_offers'
                      canonical column names; converting them is out of
                      this ticket's write-scope. For now the row links to
                      the existing edit page.
                    */}
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="text-mute hover:text-ink"
                      title="Modifier"
                    >
                      <Link
                        href={`/partner/offers/${offer.id}/edit`}
                        aria-label={`Modifier l'offre ${offer.title || "sans titre"}`}
                      >
                        <Edit className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
