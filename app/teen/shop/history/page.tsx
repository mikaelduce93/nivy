import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { DarkSurface, NivEmpty } from "@/components/brand"
import { getT } from "@/lib/i18n/server"
import { purchaseStatusLabel } from "@/lib/i18n/status-labels"
import {
  ShoppingBag,
  ArrowLeft,
  Calendar,
  Gift,
  QrCode,
} from "lucide-react"
import Link from "next/link"

async function getPurchaseHistory(teenId: string) {
  const supabase = await createClient()

  const { data: purchases, error } = await supabase
    .from("shop_purchases")
    .select(`
      *,
      reward:reward_id (
        name,
        description,
        image_url,
        category
      )
    `)
    .eq("teen_id", teenId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching purchases:", error)
    return []
  }

  return purchases || []
}

async function getPurchaseStats(teenId: string) {
  const supabase = await createClient()

  const { data: purchases } = await supabase
    .from("shop_purchases")
    .select("coins_spent, status")
    .eq("teen_id", teenId)

  if (!purchases) return { total: 0, coinsSpent: 0, pending: 0, used: 0 }

  return {
    total: purchases.length,
    coinsSpent: purchases.reduce((sum, p) => sum + (p.coins_spent || 0), 0),
    pending: purchases.filter(p => p.status === "pending" || p.status === "ready").length,
    used: purchases.filter(p => p.status === "used" || p.status === "claimed").length
  }
}

// Vrai chemin d'image (Supabase storage / http) vs emoji fallback stocké en BDD.
function isImageUrl(value?: string | null): value is string {
  return !!value && /^(https?:\/\/|\/)/.test(value)
}

function RewardThumb({ image, className }: { image?: string | null; className: string }) {
  if (isImageUrl(image)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        className={`${className} object-cover`}
      />
    )
  }
  return (
    <div className={`${className} flex items-center justify-center text-3xl`}>
      {image || "🎁"}
    </div>
  )
}

export default async function ShopHistoryPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  const teenId = userInfo.teenData?.id
  if (!teenId) {
    redirect("/teen")
  }

  const t = await getT()
  const purchases = await getPurchaseHistory(teenId)
  const stats = await getPurchaseStats(teenId)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Pills statut mono UPPERCASE charte (lime ✓ utilisé, gold en cours, coral expiré).
  // Libellé centralisé via purchaseStatusLabel() ; ici on ne mappe que la couleur.
  const getStatusBadge = (status: string) => {
    const text = purchaseStatusLabel(status, t)
    switch (status) {
      case "ready":
        return { text, class: "border-lime bg-lime/15 text-ink" }
      case "pending":
        return { text, class: "border-gold bg-gold/15 text-ink" }
      case "used":
      case "claimed":
        return { text, class: "border-lime bg-lime/15 text-ink" }
      case "expired":
        return { text, class: "border-coral bg-coral/15 text-ink" }
      default:
        return { text, class: "border-line bg-paper-2 text-mute" }
    }
  }

  const StatusPill = ({ status }: { status: string }) => {
    const s = getStatusBadge(status)
    return (
      <span
        className={`inline-flex items-center rounded-full border-2 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${s.class}`}
      >
        {s.text}
      </span>
    )
  }

  const activeRewards = purchases.filter(
    (p: any) => p.status === "ready" || p.status === "pending"
  )

  return (
    <div className="min-h-screen bg-paper">
      <div className="container-wide py-12 space-y-8">
        {/* Back button */}
        <Button variant="ghost" asChild className="text-mute hover:text-ink">
          <Link href="/teen/wallet?tab=shop">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la boutique
          </Link>
        </Button>

        {/* Header */}
        <div>
          <span className="eyebrow tracking-[0.16em] text-mute">Boutique</span>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-ink">
            Mes <em className="font-semibold italic text-pink">achats</em>
          </h1>
          <p className="text-mute">Historique de tes achats dans la boutique</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StickerCard variant="panel" className="p-5">
            <p className="eyebrow text-mute">Total achats</p>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-ink">
              {stats.total}
            </p>
          </StickerCard>

          <StickerCard variant="panel" className="p-5">
            <p className="eyebrow text-mute">Coins dépensés</p>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-coral">
              ⊙ {stats.coinsSpent.toLocaleString("fr-FR")}
            </p>
          </StickerCard>

          <StickerCard variant="panel" className="p-5">
            <p className="eyebrow text-mute">À utiliser</p>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-gold">
              {stats.pending}
            </p>
          </StickerCard>

          <StickerCard variant="panel" className="p-5">
            <p className="eyebrow text-mute">Utilisés</p>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-lime">
              {stats.used}
            </p>
          </StickerCard>
        </div>

        {/* Récompenses à utiliser — codes de retrait en avant */}
        {activeRewards.length > 0 && (
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
              <Gift className="h-5 w-5 text-pink" />
              Récompenses à utiliser
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {activeRewards.map((purchase: any) => (
                <DarkSurface key={purchase.id} tone="pink" shadow className="p-5">
                  <div className="flex items-start gap-4">
                    <RewardThumb
                      image={purchase.reward?.image_url}
                      className="h-14 w-14 shrink-0 rounded-xl border-2 border-paper/30 bg-white/10"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-bold text-paper">
                        {purchase.reward?.name || "Récompense"}
                      </h3>
                      <p className="font-mono text-xs text-paper/60 mt-1">
                        Acheté le {formatDate(purchase.created_at)}
                      </p>
                      <div className="mt-2">
                        <StatusPill status={purchase.status} />
                      </div>
                    </div>
                  </div>
                  {purchase.redemption_code && (
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border-2 border-paper/30 bg-white/5 p-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <QrCode className="h-5 w-5 shrink-0 text-pink" />
                        <span className="font-mono text-sm font-bold tracking-wider text-paper truncate">
                          {purchase.redemption_code}
                        </span>
                      </div>
                    </div>
                  )}
                </DarkSurface>
              ))}
            </div>
          </div>
        )}

        {/* Historique complet */}
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
            <ShoppingBag className="h-5 w-5 text-gold" />
            Historique complet
          </h2>
          {purchases.length > 0 ? (
            <div className="space-y-3">
              {purchases.map((purchase: any) => (
                <StickerCard key={purchase.id} variant="panel" className="p-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4 min-w-0">
                      <RewardThumb
                        image={purchase.reward?.image_url}
                        className="h-12 w-12 shrink-0 rounded-xl border-2 border-ink bg-paper-2"
                      />
                      <div className="min-w-0">
                        <h3 className="font-display font-medium text-ink truncate">
                          {purchase.reward?.name || "Récompense"}
                        </h3>
                        <div className="flex items-center gap-2 font-mono text-xs text-mute">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(purchase.created_at)}</span>
                          {purchase.reward?.category && (
                            <>
                              <span>•</span>
                              <span>{purchase.reward.category}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-base font-bold tabular-nums text-coral">
                        ⊙ {(purchase.coins_spent || 0).toLocaleString("fr-FR")}
                      </span>
                      <StatusPill status={purchase.status} />
                    </div>
                  </div>
                </StickerCard>
              ))}
            </div>
          ) : (
            <NivEmpty
              mood="calm"
              title="Aucun achat"
              description="Tu n'as pas encore effectué d'achats dans la boutique. Découvre les rewards disponibles !"
              action={
                <Button asChild variant="pink">
                  <Link href="/teen/wallet?tab=shop">Découvrir la boutique</Link>
                </Button>
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
