import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Wallet, TrendingUp, Gift, ArrowRight, ArrowDownToLine, Image as ImageIcon, QrCode, FileText } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { ShareButtons } from "@/components/ambassador/share-buttons"

async function getAmbassadorStats(profileId: string) {
  const supabase = await createClient()

  // Get ambassador data
  const { data: ambassador } = await supabase
    .from("ambassadors")
    .select("id, total_referrals, total_earnings, commission_rate")
    .eq("profile_id", profileId)
    .single()

  if (!ambassador) return null

  // Get referral code
  const { data: referralCode } = await supabase
    .from("referral_codes")
    .select("code")
    .eq("ambassador_id", ambassador.id)
    .eq("is_active", true)
    .single()

  // Get recent referrals (users who used this ambassador's code)
  const { data: recentReferrals } = await supabase
    .from("referral_usage")
    .select(`
      id,
      commission_amount,
      created_at,
      user:user_id (
        full_name
      )
    `)
    .eq("ambassador_id", ambassador.id)
    .order("created_at", { ascending: false })
    .limit(5)

  // Get this month's referrals count
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count: monthlyReferrals } = await supabase
    .from("referral_usage")
    .select("*", { count: "exact", head: true })
    .eq("ambassador_id", ambassador.id)
    .gte("created_at", startOfMonth.toISOString())

  return {
    totalReferrals: ambassador.total_referrals || 0,
    totalEarnings: ambassador.total_earnings || 0,
    commissionRate: ambassador.commission_rate || 15,
    referralCode: referralCode?.code || profileId.slice(0, 8).toUpperCase(),
    monthlyReferrals: monthlyReferrals || 0,
    recentReferrals: recentReferrals || []
  }
}

export default async function AmbassadorDashboardPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "ambassador") {
    redirect("/auth/redirect")
  }

  const stats = await getAmbassadorStats(userInfo.profileId)

  const commissionRate = stats?.commissionRate || userInfo.ambassadorData?.commissionRate || 15
  const referralCode = stats?.referralCode || userInfo.profileId.slice(0, 8).toUpperCase()
  const totalReferrals = stats?.totalReferrals || 0
  const totalEarnings = stats?.totalEarnings || 0
  const monthlyReferrals = stats?.monthlyReferrals || 0
  const recentReferrals = stats?.recentReferrals || []

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-8 text-white mb-8">
          <div className="relative z-10">
            <h1 className="text-3xl font-black mb-2">
              Bienvenue, {userInfo.fullName.split(" ")[0]} !
            </h1>
            <p className="text-white/80 text-lg">
              Partagez Teen Club et gagnez {commissionRate}% de commission sur chaque inscription
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-5 py-3">
                <p className="text-xs text-white/70">Votre code</p>
                <p className="text-2xl font-black font-mono tracking-wider">{referralCode}</p>
              </div>
              <ShareButtons referralCode={referralCode} />
            </div>
          </div>
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-400 font-medium">Filleuls</p>
                  <p className="text-3xl font-black text-white">{totalReferrals}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-emerald-500/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-400 font-medium">Commissions</p>
                  <p className="text-3xl font-black text-white">
                    {totalEarnings.toLocaleString()} DH
                  </p>
                </div>
                <Link href="/ambassador/withdrawals" className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/30 transition-colors">
                  <Wallet className="h-6 w-6 text-emerald-400" />
                </Link>
              </div>
              <Button asChild size="sm" className="w-full mt-3 bg-emerald-500 hover:bg-emerald-600 text-white">
                <Link href="/ambassador/withdrawals">
                  <ArrowDownToLine className="h-4 w-4 mr-2" />
                  Retirer
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-400 font-medium">Ce mois</p>
                  <p className="text-3xl font-black text-white">+{monthlyReferrals}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-400 font-medium">Taux</p>
                  <p className="text-3xl font-black text-white">{commissionRate}%</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Gift className="h-6 w-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Recent Referrals */}
          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg text-white">Derniers filleuls</CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
                <Link href="/ambassador/referrals">
                  Voir tout <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentReferrals.length > 0 ? (
                recentReferrals.slice(0, 3).map((referral: any, i: number) => {
                  const userName = referral.user?.full_name || "Utilisateur"
                  const date = new Date(referral.created_at)
                  const now = new Date()
                  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
                  const dateText = diffDays === 0 ? "Aujourd'hui" : diffDays === 1 ? "Hier" : `Il y a ${diffDays} jours`

                  return (
                    <div key={referral.id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-amber-500/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                          {userName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{userName}</p>
                          <p className="text-xs text-zinc-400">{dateText}</p>
                        </div>
                      </div>
                      <span className="text-xs px-3 py-1 rounded-full font-medium bg-emerald-500/20 text-emerald-400">
                        actif
                      </span>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-6">
                  <p className="text-zinc-500 mb-2">Pas encore de filleuls</p>
                  <p className="text-xs text-zinc-600">Partagez votre code pour commencer !</p>
                </div>
              )}
              <Button variant="ghost" className="w-full text-amber-400 hover:text-amber-300 hover:bg-amber-500/10" asChild>
                <Link href="/ambassador/referrals">Voir tous les filleuls</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Commission History */}
          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg text-white">Historique commissions</CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                <Link href="/ambassador/commissions">
                  Voir tout <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentReferrals.length > 0 ? (
                recentReferrals.slice(0, 3).map((referral: any, i: number) => {
                  const userName = referral.user?.full_name || "Utilisateur"
                  const date = new Date(referral.created_at)
                  const dateText = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

                  return (
                    <div key={referral.id} className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20">
                      <div>
                        <p className="font-black text-emerald-400">+{referral.commission_amount || 0} DH</p>
                        <p className="text-xs text-zinc-400">Inscription {userName}</p>
                      </div>
                      <p className="text-sm text-zinc-500">{dateText}</p>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-6">
                  <p className="text-zinc-500 mb-2">Pas encore de commissions</p>
                  <p className="text-xs text-zinc-600">Vos commissions apparaîtront ici</p>
                </div>
              )}
              <Button variant="ghost" className="w-full text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" asChild>
                <Link href="/ambassador/commissions">Voir tout l'historique</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-border mb-8">
          <CardHeader>
            <CardTitle className="text-lg text-white">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-auto py-6 flex-col border-border bg-card hover:bg-accent hover:border-amber-500/30" asChild>
                <Link href="/ambassador/marketing">
                  <ImageIcon className="h-8 w-8 mb-3 text-purple-400" />
                  <span className="text-white">Matériel Marketing</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-6 flex-col border-border bg-card hover:bg-accent hover:border-amber-500/30" asChild>
                <Link href="/ambassador/withdrawals">
                  <ArrowDownToLine className="h-8 w-8 mb-3 text-emerald-400" />
                  <span className="text-white">Retirer</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-6 flex-col border-border bg-card hover:bg-accent hover:border-amber-500/30" asChild>
                <Link href="/ambassador/referrals">
                  <Users className="h-8 w-8 mb-3 text-amber-400" />
                  <span className="text-white">Mes Filleuls</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-6 flex-col border-border bg-card hover:bg-accent hover:border-amber-500/30" asChild>
                <Link href="/ambassador/commissions">
                  <FileText className="h-8 w-8 mb-3 text-blue-400" />
                  <span className="text-white">Historique</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border-amber-500/20">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <span className="text-2xl">💡</span> Conseils pour gagner plus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-5 bg-card/80 rounded-xl border border-border">
                <p className="font-bold text-white mb-2">Partagez sur les réseaux</p>
                <p className="text-sm text-zinc-400">Instagram, TikTok, WhatsApp sont vos meilleurs alliés</p>
              </div>
              <div className="p-5 bg-card/80 rounded-xl border border-border">
                <p className="font-bold text-white mb-2">Parlez-en autour de vous</p>
                <p className="text-sm text-zinc-400">Famille, amis, collègues avec des ados</p>
              </div>
              <div className="p-5 bg-card/80 rounded-xl border border-border">
                <p className="font-bold text-white mb-2">Créez du contenu</p>
                <p className="text-sm text-zinc-400">Témoignages, photos d'events, stories</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
