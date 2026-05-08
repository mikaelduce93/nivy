import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ShoppingBag,
  ArrowLeft,
  Coins,
  Calendar,
  Gift,
  CheckCircle,
  Clock,
  Package,
  QrCode,
  Filter
} from "lucide-react"
import Link from "next/link"
import { EmptyState } from "@/components/ui/states/empty-state"

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

export default async function ShopHistoryPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  const teenId = userInfo.teenData?.id
  if (!teenId) {
    redirect("/teen")
  }

  const purchases = await getPurchaseHistory(teenId)
  const stats = await getPurchaseStats(teenId)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return {
          icon: Package,
          text: "Prêt",
          class: "status-success"
        }
      case "pending":
        return {
          icon: Clock,
          text: "En cours",
          class: "status-warning"
        }
      case "used":
      case "claimed":
        return {
          icon: CheckCircle,
          text: "Utilisé",
          class: "bg-muted text-muted-foreground"
        }
      case "expired":
        return {
          icon: Clock,
          text: "Expiré",
          class: "status-destructive"
        }
      default:
        return {
          icon: Package,
          text: status,
          class: "bg-muted text-muted-foreground"
        }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container-wide py-12">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-muted-foreground hover:text-foreground">
          <Link href="/teen/shop">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la boutique
          </Link>
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-foreground">Mes Achats</h1>
            <p className="text-muted-foreground">Historique de tes achats dans la boutique</p>
          </div>
          <Button variant="outline" className="border-border text-muted-foreground hover:text-foreground">
            <Filter className="h-4 w-4 mr-2" />
            Filtrer
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-success font-medium">Total achats</p>
                  <p className="text-3xl font-black text-foreground">{stats.total}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-warning font-medium">Coins dépensés</p>
                  <p className="text-3xl font-black text-foreground">{stats.coinsSpent.toLocaleString()}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-warning/20 flex items-center justify-center">
                  <Coins className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-primary font-medium">À utiliser</p>
                  <p className="text-3xl font-black text-foreground">{stats.pending}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Package className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-info font-medium">Utilisés</p>
                  <p className="text-3xl font-black text-foreground">{stats.used}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-info/20 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-info" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Rewards */}
        {purchases.filter(p => p.status === "ready" || p.status === "pending").length > 0 && (
          <Card className="bg-card border-border mb-8">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Gift className="h-5 w-5 text-success" />
                Récompenses à utiliser
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {purchases
                  .filter(p => p.status === "ready" || p.status === "pending")
                  .map((purchase: any) => {
                    const status = getStatusBadge(purchase.status)
                    const StatusIcon = status.icon
                    return (
                      <div
                        key={purchase.id}
                        className="p-5 rounded-2xl bg-card border border-border"
                      >
                        <div className="flex items-start gap-4">
                          <div className="h-14 w-14 rounded-xl bg-success/20 flex items-center justify-center text-3xl">
                            {purchase.reward?.image_url || "🎁"}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-foreground">
                              {purchase.reward?.name || "Récompense"}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              Acheté le {formatDate(purchase.created_at)}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${status.class}`}>
                                <StatusIcon className="h-3 w-3" />
                                {status.text}
                              </span>
                            </div>
                          </div>
                          {purchase.redemption_code && (
                            <Button size="sm" variant="outline" className="border-border text-success">
                              <QrCode className="h-4 w-4 mr-1" />
                              Code
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Purchase History */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-warning" />
              Historique complet
            </CardTitle>
          </CardHeader>
          <CardContent>
            {purchases.length > 0 ? (
              <div className="space-y-3">
                {purchases.map((purchase: any) => {
                  const status = getStatusBadge(purchase.status)
                  const StatusIcon = status.icon
                  return (
                    <div
                      key={purchase.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-muted-foreground/40 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-muted/40 flex items-center justify-center text-2xl">
                          {purchase.reward?.image_url || "🎁"}
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">
                            {purchase.reward?.name || "Récompense"}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-warning">
                            <Coins className="h-4 w-4" />
                            <span className="font-bold">{purchase.coins_spent || 0}</span>
                          </div>
                        </div>
                        <span className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full ${status.class}`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.text}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={ShoppingBag}
                title="Aucun achat"
                description="Tu n'as pas encore effectué d'achats dans la boutique. Découvre les rewards disponibles !"
                action={{ label: "Découvrir la boutique", href: "/teen/shop" }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
