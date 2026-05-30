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

  // #33 — real ambassadors schema: keyed on user_id; code + commission_pct
  // live on the row. The old profile_id/total_referrals/total_earnings/
  // commission_rate columns and the referral_codes/referral_usage tables don't
  // match this flow. Referrals come from referral_attribution and earnings
  // from ambassador_commissions (both keyed on ambassadors.id).
  const { data: ambassador } = await supabase
    .from("ambassadors")
    .select("id, code, commission_pct")
    .eq("user_id", profileId)
    .maybeSingle()

  if (!ambassador) return null

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [{ count: totalReferrals }, { count: monthlyReferrals }, { data: commissions }] =
    await Promise.all([
      supabase
        .from("referral_attribution")
        .select("*", { count: "exact", head: true })
        .eq("ambassador_id", ambassador.id),
      supabase
        .from("referral_attribution")
        .select("*", { count: "exact", head: true })
        .eq("ambassador_id", ambassador.id)
        .gte("attributed_at", startOfMonth.toISOString()),
      supabase
        .from("ambassador_commissions")
        .select("id, amount_dh, created_at, referred_user_id")
        .eq("ambassador_id", ambassador.id)
        .order("created_at", { ascending: false }),
    ])

  const commissionRows = commissions || []
  const totalEarnings = commissionRows.reduce(
    (sum, c) => sum + (Number(c.amount_dh) || 0),
    0,
  )

  // Resolve referred-user names separately (no FK ambassador_commissions→profiles).
  const referredIds = [...new Set(commissionRows.map((c) => c.referred_user_id).filter(Boolean))]
  const nameById = new Map<string, string>()
  if (referredIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", referredIds)
    for (const p of profs || []) nameById.set(p.id, p.full_name || "Utilisateur")
  }

  const recentReferrals = commissionRows.slice(0, 5).map((c) => ({
    id: c.id,
    created_at: c.created_at,
    commission_amount: Number(c.amount_dh) || 0,
    user: { full_name: nameById.get(c.referred_user_id) || "Utilisateur" },
  }))

  return {
    totalReferrals: totalReferrals || 0,
    totalEarnings,
    commissionRate: Number(ambassador.commission_pct) || 10,
    referralCode: ambassador.code || profileId.slice(0, 8).toUpperCase(),
    monthlyReferrals: monthlyReferrals || 0,
    recentReferrals,
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gold via-coral to-destructive p-8 text-ink mb-8">
          <div className="relative z-10">
            <h1 className="text-3xl font-black mb-2">
              Bienvenue, {userInfo.fullName.split(" ")[0]} !
            </h1>
            <p className="text-ink/80 text-lg">
              Partagez Nivy et gagnez {commissionRate}% de commission sur chaque inscription
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <div className="bg-paper-2  rounded-xl px-5 py-3">
                <p className="text-xs text-ink/70">Votre code</p>
                <p className="text-2xl font-black font-mono tracking-wider">{referralCode}</p>
              </div>
              <ShareButtons referralCode={referralCode} />
            </div>
          </div>
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-paper-2 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-paper-2 blur-3xl" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-teal/20 to-teal/20 border-teal/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-teal font-medium">Filleuls</p>
                  <p className="text-3xl font-black text-ink">{totalReferrals}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-teal/20 flex items-center justify-center">
                  <Users className="h-6 w-6 text-teal" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-lime/20 to-lime/20 border-lime/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-lime font-medium">Commissions</p>
                  <p className="text-3xl font-black text-ink">
                    {totalEarnings.toLocaleString()} DH
                  </p>
                </div>
                <Link href="/ambassador/withdrawals" className="h-12 w-12 rounded-full bg-lime/20 flex items-center justify-center hover:bg-lime/30 transition-colors">
                  <Wallet className="h-6 w-6 text-lime" />
                </Link>
              </div>
              <Button asChild size="sm" className="w-full mt-3 bg-lime hover:bg-lime text-ink">
                <Link href="/ambassador/withdrawals">
                  <ArrowDownToLine className="h-4 w-4 mr-2" />
                  Retirer
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink/20 to-pink/20 border-pink/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-pink font-medium">Ce mois</p>
                  <p className="text-3xl font-black text-ink">+{monthlyReferrals}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-pink/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-pink" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gold/20 to-coral/20 border-gold/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gold font-medium">Taux</p>
                  <p className="text-3xl font-black text-ink">{commissionRate}%</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gold/20 flex items-center justify-center">
                  <Gift className="h-6 w-6 text-gold" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Recent Referrals */}
          <Card className="bg-gradient-to-br from-paper-2 to-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg text-ink">Derniers filleuls</CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-gold hover:text-gold hover:bg-gold/10">
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
                    <div key={referral.id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-gold/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gold to-coral flex items-center justify-center text-ink font-bold text-lg">
                          {userName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-ink">{userName}</p>
                          <p className="text-xs text-mute">{dateText}</p>
                        </div>
                      </div>
                      <span className="text-xs px-3 py-1 rounded-full font-medium bg-lime/20 text-lime">
                        actif
                      </span>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-6">
                  <p className="text-mute mb-2">Pas encore de filleuls</p>
                  <p className="text-xs text-mute">Partagez votre code pour commencer !</p>
                </div>
              )}
              <Button variant="ghost" className="w-full text-gold hover:text-gold hover:bg-gold/10" asChild>
                <Link href="/ambassador/referrals">Voir tous les filleuls</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Commission History */}
          <Card className="bg-gradient-to-br from-paper-2 to-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg text-ink">Historique commissions</CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-lime hover:text-lime hover:bg-lime/10">
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
                    <div key={referral.id} className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-lime/10 to-lime/10 border border-lime/20">
                      <div>
                        <p className="font-black text-lime">+{referral.commission_amount || 0} DH</p>
                        <p className="text-xs text-mute">Inscription {userName}</p>
                      </div>
                      <p className="text-sm text-mute">{dateText}</p>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-6">
                  <p className="text-mute mb-2">Pas encore de commissions</p>
                  <p className="text-xs text-mute">Vos commissions apparaîtront ici</p>
                </div>
              )}
              <Button variant="ghost" className="w-full text-lime hover:text-lime hover:bg-lime/10" asChild>
                <Link href="/ambassador/commissions">Voir tout l'historique</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-gradient-to-br from-paper-2 to-card border-border mb-8">
          <CardHeader>
            <CardTitle className="text-lg text-ink">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-auto py-6 flex-col border-border bg-card hover:bg-accent hover:border-gold/30" asChild>
                <Link href="/ambassador/marketing">
                  <ImageIcon className="h-8 w-8 mb-3 text-pink" />
                  <span className="text-ink">Matériel Marketing</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-6 flex-col border-border bg-card hover:bg-accent hover:border-gold/30" asChild>
                <Link href="/ambassador/withdrawals">
                  <ArrowDownToLine className="h-8 w-8 mb-3 text-lime" />
                  <span className="text-ink">Retirer</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-6 flex-col border-border bg-card hover:bg-accent hover:border-gold/30" asChild>
                <Link href="/ambassador/referrals">
                  <Users className="h-8 w-8 mb-3 text-gold" />
                  <span className="text-ink">Mes Filleuls</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-6 flex-col border-border bg-card hover:bg-accent hover:border-gold/30" asChild>
                <Link href="/ambassador/commissions">
                  <FileText className="h-8 w-8 mb-3 text-teal" />
                  <span className="text-ink">Historique</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="bg-gradient-to-r from-gold/10 via-coral/10 to-destructive/10 border-gold/20">
          <CardHeader>
            <CardTitle className="text-lg text-ink flex items-center gap-2">
              <span className="text-2xl">💡</span> Conseils pour gagner plus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-5 bg-card/80 rounded-xl border border-border">
                <p className="font-bold text-ink mb-2">Partagez sur les réseaux</p>
                <p className="text-sm text-mute">Instagram, TikTok, WhatsApp sont vos meilleurs alliés</p>
              </div>
              <div className="p-5 bg-card/80 rounded-xl border border-border">
                <p className="font-bold text-ink mb-2">Parlez-en autour de vous</p>
                <p className="text-sm text-mute">Famille, amis, collègues avec des ados</p>
              </div>
              <div className="p-5 bg-card/80 rounded-xl border border-border">
                <p className="font-bold text-ink mb-2">Créez du contenu</p>
                <p className="text-sm text-mute">Témoignages, photos d'events, stories</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
