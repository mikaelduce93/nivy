import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { DarkSurface, StatHero, NivCoach, NivEmpty } from "@/components/brand"
import { Users, Wallet, TrendingUp, Gift, ArrowRight, ArrowDownToLine, Image as ImageIcon, FileText } from "lucide-react"
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

  const firstName = userInfo.fullName.split(" ")[0]

  return (
    <div className="min-h-screen bg-paper">
      <div className="container mx-auto px-6 py-32">
        {/* Hero éditorial */}
        <div className="mb-8 grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-stretch">
          <div className="flex flex-col justify-center">
            <span className="eyebrow tracking-[0.16em] text-pink">Ambassadeur</span>
            <h1 className="mt-2 font-display text-4xl font-extrabold leading-tight tracking-tight text-ink">
              Salut {firstName}, <em className="font-semibold italic text-pink">gagne</em> du cash réel à chaque inscription.
            </h1>
            <p className="mt-3 max-w-lg text-mute">
              Partage ton code Nivy et touche {commissionRate}% de commission sur chaque famille que tu ramènes.
            </p>
          </div>

          {/* Code parrain — surface sombre, le produit (Mono géant) */}
          <StatHero
            eyebrow="Ton code parrain"
            value={<span className="font-mono tracking-wider">{referralCode}</span>}
            tone="pink"
            size="sm"
            meta={
              <div className="mt-3 flex flex-wrap gap-3">
                <ShareButtons referralCode={referralCode} />
              </div>
            }
          />
        </div>

        {/* KPI — cartes sticker (1 dominant en surface sombre : commissions) */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StickerCard className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="eyebrow tracking-[0.16em] text-mute">Filleuls</span>
                <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-ink">{totalReferrals}</p>
              </div>
              <Users className="h-6 w-6 text-teal" />
            </div>
          </StickerCard>

          {/* Commissions — surface sombre (argent) */}
          <DarkSurface tone="lime" shadow className="p-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow tracking-[0.16em] text-paper/60">Commissions</span>
              <Wallet className="h-5 w-5 text-lime" />
            </div>
            <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-lime">
              {totalEarnings.toLocaleString()} <span className="font-mono text-sm text-paper/60">DH</span>
            </p>
            <Button asChild variant="lime" size="sm" className="mt-3 w-full">
              <Link href="/ambassador/withdrawals">
                <ArrowDownToLine className="h-4 w-4 mr-2" />
                Retirer
              </Link>
            </Button>
          </DarkSurface>

          <StickerCard className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="eyebrow tracking-[0.16em] text-mute">Ce mois</span>
                <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-ink">+{monthlyReferrals}</p>
              </div>
              <TrendingUp className="h-6 w-6 text-pink" />
            </div>
          </StickerCard>

          <StickerCard className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="eyebrow tracking-[0.16em] text-mute">Taux</span>
                <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-ink">{commissionRate}%</p>
              </div>
              <Gift className="h-6 w-6 text-gold" />
            </div>
          </StickerCard>
        </div>

        {/* Content Grid */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          {/* Derniers filleuls */}
          <StickerCard className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold text-ink">Derniers filleuls</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/ambassador/referrals">
                  Voir tout <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="space-y-3">
              {recentReferrals.length > 0 ? (
                recentReferrals.slice(0, 3).map((referral: any) => {
                  const userName = referral.user?.full_name || "Utilisateur"
                  const date = new Date(referral.created_at)
                  const now = new Date()
                  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
                  const dateText = diffDays === 0 ? "Aujourd'hui" : diffDays === 1 ? "Hier" : `Il y a ${diffDays} jours`

                  return (
                    <div key={referral.id} className="flex items-center justify-between rounded-xl border-2 border-line bg-white p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink bg-pink font-display text-lg font-extrabold text-ink">
                          {userName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-ink">{userName}</p>
                          <p className="font-mono text-xs text-mute">{dateText}</p>
                        </div>
                      </div>
                      <span className="rounded-full border-2 border-ink bg-lime px-3 py-1 font-mono text-xs font-semibold text-on-bright">
                        actif
                      </span>
                    </div>
                  )
                })
              ) : (
                <NivEmpty
                  title="Pas encore de filleuls"
                  description="Partage ton code pour ramener ta première famille."
                />
              )}
              <Button variant="outline" className="w-full" asChild>
                <Link href="/ambassador/referrals">Voir tous les filleuls</Link>
              </Button>
            </div>
          </StickerCard>

          {/* Historique commissions */}
          <StickerCard className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold text-ink">Historique commissions</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/ambassador/commissions">
                  Voir tout <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="space-y-3">
              {recentReferrals.length > 0 ? (
                recentReferrals.slice(0, 3).map((referral: any) => {
                  const userName = referral.user?.full_name || "Utilisateur"
                  const date = new Date(referral.created_at)
                  const dateText = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

                  return (
                    <div key={referral.id} className="flex items-center justify-between rounded-xl border-2 border-line bg-white p-4">
                      <div>
                        <p className="font-mono text-lg font-bold tabular-nums text-lime">+{referral.commission_amount || 0} DH</p>
                        <p className="text-xs text-mute">Inscription {userName}</p>
                      </div>
                      <p className="font-mono text-sm text-mute">{dateText}</p>
                    </div>
                  )
                })
              ) : (
                <NivEmpty
                  title="Pas encore de commissions"
                  description="Tes gains apparaîtront ici dès la première inscription."
                />
              )}
              <Button variant="outline" className="w-full" asChild>
                <Link href="/ambassador/commissions">Voir tout l'historique</Link>
              </Button>
            </div>
          </StickerCard>
        </div>

        {/* Actions rapides */}
        <StickerCard className="mb-8 p-6">
          <h2 className="mb-4 font-display text-lg font-extrabold text-ink">Actions rapides</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Button variant="outline" className="h-auto flex-col py-6" asChild>
              <Link href="/ambassador/marketing">
                <ImageIcon className="mb-3 h-8 w-8 text-pink" />
                <span>Matériel marketing</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-6" asChild>
              <Link href="/ambassador/withdrawals">
                <ArrowDownToLine className="mb-3 h-8 w-8 text-lime" />
                <span>Retirer</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-6" asChild>
              <Link href="/ambassador/referrals">
                <Users className="mb-3 h-8 w-8 text-gold" />
                <span>Mes filleuls</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-6" asChild>
              <Link href="/ambassador/commissions">
                <FileText className="mb-3 h-8 w-8 text-teal" />
                <span>Historique</span>
              </Link>
            </Button>
          </div>
        </StickerCard>

        {/* Coach Niv — conseils */}
        <NivCoach
          mood="hype"
          message={
            <div className="space-y-2">
              <p className="font-semibold text-paper">Mes 3 conseils pour gagner plus :</p>
              <ul className="list-disc space-y-1 pl-4 text-paper/80">
                <li>Partage ton code sur Insta, TikTok et WhatsApp — c'est là que ça convertit.</li>
                <li>Parles-en autour de toi : familles, amis, voisins avec des ados.</li>
                <li>Crée du contenu : stories d'events, témoignages, photos.</li>
              </ul>
            </div>
          }
        />
      </div>
    </div>
  )
}
