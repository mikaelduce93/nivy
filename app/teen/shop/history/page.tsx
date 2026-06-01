import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { DarkSurface, NivEmpty } from "@/components/brand"
import { getT } from "@/lib/i18n/server"
import { purchaseStatusLabel } from "@/lib/i18n/status-labels"
import { getUserPurchases } from "@/gamification-system/features/shop/actions"
import type { UserPurchase } from "@/gamification-system/features/shop/schema"
import {
  ShoppingBag,
  ArrowLeft,
  Calendar,
  Gift,
  QrCode,
  Zap,
} from "lucide-react"
import Link from "next/link"

// Code de retrait : le système canonique (table user_purchases) n'a pas de
// colonne dédiée — on dérive un code de référence des 8 premiers caractères du
// purchase_id (uppercase), affiché à l'ado comme le code à présenter.
function refCode(purchaseId: string): string {
  return purchaseId.slice(0, 8).toUpperCase()
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
  const { data: purchases } = await getUserPurchases(undefined, true)

  const stats = {
    total: purchases.length,
    xpSpent: purchases.reduce((sum, p) => sum + (p.xp_spent || 0), 0),
    usable: purchases.filter((p) => p.is_usable).length,
    used: purchases.filter((p) => p.status === "used").length,
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  // Pills statut mono UPPERCASE charte. Libellé centralisé via
  // purchaseStatusLabel() pour les statuts connus ; les statuts canoniques
  // absents du bundle i18n (completed/refunded) ont un libellé FR local.
  const STATUS_FR: Partial<Record<UserPurchase["status"], string>> = {
    completed: "Disponible",
    refunded: "Remboursé",
  }
  const statusText = (status: UserPurchase["status"]) =>
    STATUS_FR[status] ?? purchaseStatusLabel(status, t)

  // completed/used → lime, pending → gold, expired/refunded → coral/mute.
  const getStatusClass = (status: UserPurchase["status"]) => {
    switch (status) {
      case "completed":
      case "used":
        return "border-lime bg-lime/15 text-ink"
      case "pending":
        return "border-gold bg-gold/15 text-ink"
      case "expired":
      case "refunded":
        return "border-coral bg-coral/15 text-ink"
      default:
        return "border-line bg-paper-2 text-mute"
    }
  }

  const StatusPill = ({ status }: { status: UserPurchase["status"] }) => (
    <span
      className={`inline-flex items-center rounded-full border-2 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${getStatusClass(status)}`}
    >
      {statusText(status)}
    </span>
  )

  const usableRewards = purchases.filter((p) => p.is_usable)

  return (
    <div className="min-h-screen bg-paper">
      <div className="container-wide py-12 space-y-8">
        {/* Back button */}
        <Button variant="ghost" asChild className="text-mute hover:text-ink">
          <Link href="/teen/wallet?tab=history">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au wallet
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
            <p className="eyebrow text-mute">XP dépensés</p>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-gold">
              {stats.xpSpent.toLocaleString("fr-FR")}
            </p>
          </StickerCard>

          <StickerCard variant="panel" className="p-5">
            <p className="eyebrow text-mute">À utiliser</p>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-gold">
              {stats.usable}
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
        {usableRewards.length > 0 && (
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
              <Gift className="h-5 w-5 text-pink" />
              Récompenses à utiliser
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {usableRewards.map((purchase) => (
                <DarkSurface key={purchase.purchase_id} tone="pink" shadow className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-paper/30 bg-white/10 text-3xl">
                      {purchase.reward_icon || "🎁"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-bold text-paper">
                        {purchase.reward_name || "Récompense"}
                      </h3>
                      <p className="font-mono text-xs text-paper/60 mt-1">
                        Acheté le {formatDate(purchase.purchased_at)}
                      </p>
                      <div className="mt-2">
                        <StatusPill status={purchase.status} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border-2 border-paper/30 bg-white/5 p-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <QrCode className="h-5 w-5 shrink-0 text-pink" />
                      <span className="font-mono text-sm font-bold tracking-wider text-paper truncate">
                        {refCode(purchase.purchase_id)}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-paper/60">
                      Code à présenter
                    </span>
                  </div>
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
              {purchases.map((purchase) => (
                <StickerCard key={purchase.purchase_id} variant="panel" className="p-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-paper-2 text-2xl">
                        {purchase.reward_icon || "🎁"}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display font-medium text-ink truncate">
                          {purchase.reward_name || "Récompense"}
                        </h3>
                        <div className="flex items-center gap-2 font-mono text-xs text-mute">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(purchase.purchased_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 font-mono text-base font-bold tabular-nums text-gold">
                        <Zap className="h-4 w-4" />
                        −{(purchase.xp_spent || 0).toLocaleString("fr-FR")} XP
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
