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
  Star
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

async function getTopupHistory(parentId: string) {
  const supabase = await createClient()

  const { data: history, error } = await supabase
    .from("coin_transactions")
    .select(`
      *,
      teen:user_id (
        full_name
      )
    `)
    .eq("source_user_id", parentId)
    .eq("transaction_type", "topup")
    .order("created_at", { ascending: false })
    .limit(10)

  if (error) {
    console.error("Error fetching topup history:", error)
    return []
  }

  return history || []
}

export default async function ParentTopupPage({
  searchParams,
}: {
  searchParams: { teen?: string }
}) {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  const teens = await getLinkedTeens(userInfo.profileId)
  const history = await getTopupHistory(userInfo.profileId)
  const selectedTeenId = searchParams.teen || ""

  const topupPackages = [
    {
      id: "pack1",
      coins: 100,
      price: 50,
      popular: false,
      bonus: 0,
      icon: Coins,
      color: "from-yellow-500/20 to-orange-500/20",
      borderColor: "border-yellow-500/30"
    },
    {
      id: "pack2",
      coins: 250,
      price: 100,
      popular: true,
      bonus: 25,
      icon: Star,
      color: "from-emerald-500/20 to-teal-500/20",
      borderColor: "border-emerald-500/30"
    },
    {
      id: "pack3",
      coins: 500,
      price: 180,
      popular: false,
      bonus: 75,
      icon: Zap,
      color: "from-purple-500/20 to-pink-500/20",
      borderColor: "border-purple-500/30"
    },
    {
      id: "pack4",
      coins: 1000,
      price: 300,
      popular: false,
      bonus: 200,
      icon: Sparkles,
      color: "from-blue-500/20 to-cyan-500/20",
      borderColor: "border-blue-500/30"
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
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-zinc-400 hover:text-white">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white">Recharger les Coins</h1>
          <p className="text-zinc-400">Ajoutez des coins au compte de votre teen</p>
        </div>

        {teens.length === 0 ? (
          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
            <CardContent className="py-16 text-center">
              <CreditCard className="h-16 w-16 mx-auto mb-4 text-zinc-700" />
              <h3 className="text-xl font-bold text-white mb-2">Aucun teen lié</h3>
              <p className="text-zinc-400 mb-6">
                Vous devez d'abord lier un teen à votre compte
              </p>
              <Button asChild className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <Link href="/parent/teens/add">Ajouter un Teen</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Teen Selection & Packages */}
              <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Coins className="h-5 w-5 text-yellow-400" />
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
                      className={`bg-gradient-to-br ${pack.color} ${pack.borderColor} bg-zinc-900 relative overflow-hidden`}
                    >
                      {pack.popular && (
                        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs px-2 py-1 rounded-bl-lg font-bold">
                          POPULAIRE
                        </div>
                      )}
                      <CardContent className="p-5 text-center">
                        <div className="h-12 w-12 mx-auto rounded-full bg-zinc-900/50 flex items-center justify-center mb-3">
                          <Icon className="h-6 w-6 text-yellow-400" />
                        </div>
                        <p className="text-3xl font-black text-white mb-1">{pack.coins}</p>
                        <p className="text-xs text-zinc-400 mb-2">coins</p>
                        {pack.bonus > 0 && (
                          <p className="text-xs text-emerald-400 mb-2">+{pack.bonus} bonus</p>
                        )}
                        <p className="text-lg font-bold text-emerald-400">{pack.price} DH</p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Teen Balances */}
              <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Coins className="h-4 w-4 text-yellow-400" />
                    Soldes actuels
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {teens.map((teen: any) => (
                    <div
                      key={teen.teen_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-zinc-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold">
                          {teen.teen_name?.charAt(0) || "?"}
                        </div>
                        <span className="text-white font-medium">{teen.teen_name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-400 font-black">{teen.total_coins || 0}</p>
                        <p className="text-xs text-zinc-500">coins</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recent Topups */}
              <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <History className="h-4 w-4 text-blue-400" />
                    Dernières recharges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {history.length > 0 ? (
                    <div className="space-y-3">
                      {history.slice(0, 5).map((item: any) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-zinc-800"
                        >
                          <div>
                            <p className="text-white text-sm font-medium">
                              {item.teen?.full_name || "Teen"}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {formatDate(item.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-emerald-400">
                            <span className="font-bold">+{item.amount}</span>
                            <Coins className="h-4 w-4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-zinc-500 py-4 text-sm">
                      Aucune recharge récente
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Info */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <Gift className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-emerald-400">Bonus fidélité</p>
                    <p className="text-xs text-zinc-400 mt-1">
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
