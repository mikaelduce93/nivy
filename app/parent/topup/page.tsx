import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CreditCard,
  ArrowLeft,
  Coins,
  Zap,
  Gift,
  History,
  CheckCircle,
  Sparkles,
  Star,
  ShieldCheck,
  ShieldAlert
} from "lucide-react"
import Link from "next/link"
import { TopupForm } from "@/components/parent/topup-form"

async function getLinkedTeens(parentId: string) {
  const supabase = await createClient()

  const { data: teens, error } = await supabase
    .from("parent_teens_overview")
    .select("*")
    .eq("parent_id", parentId)

  if (error) {
    console.error("Error fetching teens:", error)
    return []
  }

  return teens || []
}

async function getParentSignature(parentId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("e_signatures")
    .select("id, created_at, parent_full_name")
    .eq("parent_id", parentId)
    .eq("terms_accepted", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("Error fetching parent signature:", error)
    return null
  }

  return data
}

async function getTopupHistory(parentId: string) {
  const supabase = await createClient()

  // coin_transactions has no source_user_id column — schema is
  // (teen_id, transaction_type, amount, ...). We resolve linked teens first
  // then read their top-up transactions. Whitepaper §5: every parent top-up
  // writes a `topup` row with source_type = 'parent_topup'.
  const { data: linkedTeens } = await supabase
    .from("parent_teen_links")
    .select("teen_id, teens:teen_id(profiles:user_id(full_name))")
    .eq("parent_id", parentId)
    .eq("status", "active")

  const teenIds = (linkedTeens ?? []).map((l: any) => l.teen_id)
  if (teenIds.length === 0) return []

  const teenNameMap = new Map<string, string>(
    (linkedTeens ?? []).map((l: any) => [
      l.teen_id,
      l.teens?.profiles?.full_name ?? "Teen",
    ])
  )

  const { data: history, error } = await supabase
    .from("coin_transactions")
    .select("id, teen_id, amount, transaction_type, description, created_at")
    .in("teen_id", teenIds)
    .eq("transaction_type", "topup")
    .order("created_at", { ascending: false })
    .limit(10)

  if (error) {
    console.error("Error fetching topup history:", error)
    return []
  }

  return (history ?? []).map((row: any) => ({
    ...row,
    teen: { full_name: teenNameMap.get(row.teen_id) ?? "Teen" },
  }))
}

export default async function ParentTopupPage({
  searchParams,
}: {
  // Next 16: searchParams is async. Mirrors fix already shipped on /parent/e-signature.
  searchParams: Promise<{ teen?: string }>
}) {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  const [teens, history, parentSignature, params] = await Promise.all([
    getLinkedTeens(userInfo.profileId),
    getTopupHistory(userInfo.profileId),
    getParentSignature(userInfo.profileId),
    searchParams,
  ])
  const selectedTeenId = params.teen || ""
  const hasSigned = !!parentSignature

  const topupPackages = [
    {
      id: "pack1",
      coins: 100,
      price: 50,
      popular: false,
      bonus: 0,
      icon: Coins,
      color: "from-gold/20 to-coral/20",
      borderColor: "border-gold/30"
    },
    {
      id: "pack2",
      coins: 250,
      price: 100,
      popular: true,
      bonus: 25,
      icon: Star,
      color: "from-lime/20 to-teal/20",
      borderColor: "border-lime/30"
    },
    {
      id: "pack3",
      coins: 500,
      price: 180,
      popular: false,
      bonus: 75,
      icon: Zap,
      color: "from-pink/20 to-pink/20",
      borderColor: "border-pink/30"
    },
    {
      id: "pack4",
      coins: 1000,
      price: 300,
      popular: false,
      bonus: 200,
      icon: Sparkles,
      color: "from-teal/20 to-teal/20",
      borderColor: "border-teal/30"
    }
  ]

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-ink">Recharger les Coins</h1>
          <p className="text-mute">Ajoutez des coins au compte de votre teen</p>
        </div>

        {teens.length === 0 ? (
          <Card className="bg-gradient-to-br from-paper-2 to-card border-ink">
            <CardContent className="py-16 text-center">
              <CreditCard className="h-16 w-16 mx-auto mb-4 text-ink" />
              <h3 className="text-xl font-bold text-ink mb-2">Aucun teen lié</h3>
              <p className="text-mute mb-6">
                Vous devez d'abord lier un teen à votre compte
              </p>
              <Button asChild className="bg-lime hover:bg-lime text-ink">
                <Link href="/parent/teens/add">Ajouter un Teen</Link>
              </Button>
            </CardContent>
          </Card>
        ) : !hasSigned ? (
          <Card className="bg-gradient-to-br from-gold/10 to-coral/10 border-gold/30">
            <CardContent className="py-16 px-6 text-center">
              <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gold/20 flex items-center justify-center">
                <ShieldAlert className="h-8 w-8 text-gold" />
              </div>
              <h3 className="text-xl font-bold text-ink mb-2">
                Autorisation parentale requise
              </h3>
              <p className="text-mute mb-2 max-w-xl mx-auto">
                Avant de pouvoir recharger des coins pour vos teens,
                nous devons recueillir votre signature électronique
                et vérifier votre identité.
              </p>
              <p className="text-mute text-sm mb-6 max-w-xl mx-auto">
                Cette étape est obligatoire conformément à la loi 09-08 et
                la CNDP. Elle ne sera demandée qu'une seule fois.
              </p>
              <Button
                asChild
                className="bg-gradient-to-r from-teal to-teal hover:from-teal hover:to-teal text-ink"
              >
                <Link
                  href={`/parent/e-signature?redirect=${encodeURIComponent(
                    selectedTeenId
                      ? `/parent/topup?teen=${selectedTeenId}`
                      : "/parent/topup"
                  )}${selectedTeenId ? `&teen=${selectedTeenId}` : ""}`}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Signer l'autorisation
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Teen Selection & Packages */}
              <Card className="bg-gradient-to-br from-paper-2 to-card border-ink">
                <CardHeader>
                  <CardTitle className="text-ink flex items-center gap-2">
                    <Coins className="h-5 w-5 text-gold" />
                    Choisir un pack
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TopupForm
                    teens={teens}
                    packages={topupPackages}
                    selectedTeenId={selectedTeenId}
                    parentId={userInfo.profileId}
                  />
                </CardContent>
              </Card>

              {/* Packages Display */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {topupPackages.map((pack) => {
                  const Icon = pack.icon
                  return (
                    <Card
                      key={pack.id}
                      className={`bg-gradient-to-br ${pack.color} ${pack.borderColor} bg-card relative overflow-hidden`}
                    >
                      {pack.popular && (
                        <div className="absolute top-0 right-0 bg-lime text-ink text-xs px-2 py-1 rounded-bl-lg font-bold">
                          POPULAIRE
                        </div>
                      )}
                      <CardContent className="p-5 text-center">
                        <div className="h-12 w-12 mx-auto rounded-full bg-card flex items-center justify-center mb-3">
                          <Icon className="h-6 w-6 text-gold" />
                        </div>
                        <p className="text-3xl font-black text-ink mb-1">{pack.coins}</p>
                        <p className="text-xs text-mute mb-2">coins</p>
                        {pack.bonus > 0 && (
                          <p className="text-xs text-lime mb-2">+{pack.bonus} bonus</p>
                        )}
                        <p className="text-lg font-bold text-lime">{pack.price} DH</p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Teen Balances */}
              <Card className="bg-gradient-to-br from-paper-2 to-card border-ink">
                <CardHeader>
                  <CardTitle className="text-ink text-base flex items-center gap-2">
                    <Coins className="h-4 w-4 text-gold" />
                    Soldes actuels
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {teens.map((teen: any) => (
                    <div
                      key={teen.teen_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-lime to-teal flex items-center justify-center text-ink font-bold">
                          {teen.teen_name?.charAt(0) || "?"}
                        </div>
                        <span className="text-ink font-medium">{teen.teen_name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-gold font-black">{teen.total_coins || 0}</p>
                        <p className="text-xs text-mute">coins</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recent Topups */}
              <Card className="bg-gradient-to-br from-paper-2 to-card border-ink">
                <CardHeader>
                  <CardTitle className="text-ink text-base flex items-center gap-2">
                    <History className="h-4 w-4 text-teal" />
                    Dernières recharges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {history.length > 0 ? (
                    <div className="space-y-3">
                      {history.slice(0, 5).map((item: any) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-card"
                        >
                          <div>
                            <p className="text-ink text-sm font-medium">
                              {item.teen?.full_name || "Teen"}
                            </p>
                            <p className="text-xs text-mute">
                              {formatDate(item.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-lime">
                            <span className="font-bold">+{item.amount}</span>
                            <Coins className="h-4 w-4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-mute py-4 text-sm">
                      Aucune recharge récente
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Info */}
              <div className="p-4 bg-lime/10 border border-lime/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <Gift className="h-5 w-5 text-lime shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-lime">Bonus fidélité</p>
                    <p className="text-xs text-mute mt-1">
                      Plus vous rechargez, plus vous gagnez de coins bonus !
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
