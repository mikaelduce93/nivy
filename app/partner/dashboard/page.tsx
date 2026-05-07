import { BentoGrid, BentoCard } from "@/components/ui/bento-grid"
import { GlassCard } from "@/components/ui/glass-card"
import { AnimatedCounter } from "@/components/ui/animated-counter"
import { Button } from "@/components/ui/button"
import {
  Users,
  TrendingUp,
  DollarSign,
  Star,
  ArrowRight,
  Zap,
  Gift,
  MessageSquare,
  ChevronRight,
  Plus,
} from "lucide-react"
import { UniversalScanner } from "@/components/partner/universal-scanner"
import { ParallaxContainer, ParallaxLayer } from "@/components/ui/parallax-container"
import { MagneticButton } from "@/components/ui/magnetic-button"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

type StatColor = "emerald" | "blue" | "yellow" | "purple"

type ActivityIcon = typeof Zap | typeof Gift | typeof DollarSign | typeof Star

type ActivityItem = {
  id: string
  name: string
  user: string
  time: string
  amount: string
  icon: ActivityIcon
  color: string
}

function timeAgo(iso: string | null): string {
  if (!iso) return ""
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const diff = Math.max(0, Date.now() - then)
  const m = Math.round(diff / 60000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `il y a ${h}h`
  const d = Math.round(h / 24)
  return `il y a ${d}j`
}

function teenLabel(teenId: string | null): string {
  if (!teenId) return "Membre"
  return `Teen #${teenId.replace(/-/g, "").slice(0, 4).toUpperCase()}`
}

export default async function PartnerDashboard() {
  const userInfo = await getUserRole()

  if (!userInfo) {
    redirect("/auth/login")
  }

  const partnerId = userInfo.role === "partner" ? userInfo.partnerData?.id : null

  if (!partnerId) {
    return (
      <div className="min-h-screen bg-[#030303] text-white p-10">
        <div className="max-w-2xl mx-auto mt-20 text-center">
          <h1 className="text-3xl font-black mb-4">Profil partenaire introuvable</h1>
          <p className="text-zinc-400">
            Votre compte n'est pas encore lié à une fiche partenaire active. Contactez le support
            pour finaliser votre onboarding.
          </p>
        </div>
      </div>
    )
  }

  const supabase = await createClient()

  // Month-to-date window for KPIs.
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [
    { data: monthTxRaw },
    { data: recentTxRaw },
    { data: offersRaw },
  ] = await Promise.all([
    supabase
      .from("partner_transactions")
      .select("id, teen_id, amount_dh, cashback_xp, status, created_at")
      .eq("partner_id", partnerId)
      .gte("created_at", startOfMonth.toISOString()),
    supabase
      .from("partner_transactions")
      .select("id, teen_id, amount_dh, cashback_xp, status, created_at")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("partner_discounts")
      .select("id, discount_name, current_total_uses, is_active, valid_until")
      .eq("partner_id", partnerId)
      .eq("is_active", true)
      .order("current_total_uses", { ascending: false })
      .limit(2),
  ])

  const monthTx = (monthTxRaw ?? []) as {
    id: string
    teen_id: string | null
    amount_dh: number | null
    cashback_xp: number | null
    status: string | null
    created_at: string | null
  }[]
  const recentTx = (recentTxRaw ?? []) as typeof monthTx
  const offers = (offersRaw ?? []) as {
    id: string
    discount_name: string | null
    current_total_uses: number | null
  }[]

  const successful = monthTx.filter((t) => t.status === "succeeded" || t.status === null)
  const monthRevenue = Math.round(
    successful.reduce((s, r) => s + Number(r.amount_dh || 0), 0),
  )
  const uniqueTeens = new Set(successful.map((t) => t.teen_id).filter(Boolean)).size
  const totalCashbackXp = Math.round(
    successful.reduce((s, r) => s + Number(r.cashback_xp || 0), 0),
  )

  const stats: {
    label: string
    value: number
    prefix: string
    suffix: string
    icon: typeof DollarSign
    trend: string
    color: StatColor
    description: string
  }[] = [
    {
      label: "Chiffre d'Affaires",
      value: monthRevenue,
      prefix: "",
      suffix: " DH",
      icon: DollarSign,
      trend: "Mois en cours",
      color: "emerald",
      description: "Revenus ce mois",
    },
    {
      label: "Teens Accueillis",
      value: uniqueTeens,
      prefix: "",
      suffix: "",
      icon: Users,
      trend: "Uniques",
      color: "blue",
      description: "Membres distincts",
    },
    {
      label: "Transactions",
      value: successful.length,
      prefix: "",
      suffix: "",
      icon: Star,
      trend: "Validées",
      color: "yellow",
      description: "Opérations réussies",
    },
    {
      label: "XP Cashback",
      value: totalCashbackXp,
      prefix: "",
      suffix: " XP",
      icon: TrendingUp,
      trend: "Distribué",
      color: "purple",
      description: "Récompenses crédités",
    },
  ]

  const activeOffers = offers.map((o) => ({
    title: o.discount_name || "Offre",
    sales: o.current_total_uses || 0,
    status: "Active" as const,
    icon: Zap,
  }))

  const activity: ActivityItem[] = recentTx.map((tx) => {
    const xp = Number(tx.cashback_xp || 0)
    const dh = Number(tx.amount_dh || 0)
    const refunded = tx.status === "refunded"
    const icon: ActivityIcon = refunded ? MessageSquare : xp > 0 ? Zap : DollarSign
    const color = refunded
      ? "text-amber-400"
      : xp > 0
        ? "text-emerald-400"
        : "text-blue-400"
    const amount = refunded
      ? `-${Math.round(dh)} DH`
      : xp > 0
        ? `+${xp} XP`
        : `+${Math.round(dh)} DH`
    return {
      id: tx.id,
      name: refunded ? "Remboursement" : xp > 0 ? "Cashback Teen" : "Paiement Direct",
      user: teenLabel(tx.teen_id),
      time: timeAgo(tx.created_at),
      amount,
      icon,
      color,
    }
  })

  return (
    <ParallaxContainer className="min-h-screen bg-[#030303] text-white selection:bg-purple-500/30 overflow-hidden">
      {/* Dynamic Background Elements */}
      <ParallaxLayer speed={-0.15} className="z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      </ParallaxLayer>

      <div className="relative z-10 max-w-7xl mx-auto p-6 md:p-10 space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-purple-500/20">
                Partner Elite
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
              Tableau de Bord
            </h1>
            <p className="text-zinc-400 text-lg mt-2 font-medium">
              Pilotez votre croissance et gérez l'expérience Teen.
            </p>
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              className="h-14 px-8 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold transition-all"
            >
              Centre d'Aide
            </Button>
            <MagneticButton
              asChild
              className="h-14 px-8 rounded-2xl bg-white text-black hover:bg-zinc-200 font-black shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)]"
            >
              <Link href="/partner/offers/new">
                <Plus className="w-5 h-5 mr-2 stroke-[3px]" />
                Créer une Offre
              </Link>
            </MagneticButton>
          </div>
        </div>

        {/* Bento Grid */}
        <BentoGrid>
          {/* Scanner */}
          <BentoCard cols={8} rows={2} variant="default" className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-blue-600/5 pointer-events-none" />
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                    <Zap className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Validation Instantanée</h3>
                    <p className="text-sm text-zinc-500">Scannez le QR Code du Teen</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-tight">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 motion-safe:animate-pulse" />
                  Live
                </div>
              </div>

              <div className="flex-grow min-h-[300px]">
                <UniversalScanner />
              </div>
            </div>
          </BentoCard>

          {/* Status Card */}
          <BentoCard
            cols={4}
            rows={2}
            variant="accent"
            className="bg-gradient-to-br from-zinc-900 to-black border-white/5 ring-1 ring-white/10"
          >
            <div className="h-full flex flex-col justify-between py-4">
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-yellow-400/20 blur-2xl rounded-full motion-safe:animate-pulse" />
                    <Star className="w-20 h-20 text-yellow-400 relative z-10 fill-yellow-400/20 stroke-[1.5px]" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-3xl font-black tracking-tight">
                    {userInfo.partnerData?.companyName || "Partenaire"}
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed px-4">
                    {successful.length === 0
                      ? "Aucune transaction pour le moment — votre première vente apparaîtra ici."
                      : `${successful.length} transactions validées ce mois.`}
                  </p>
                </div>
              </div>

              <div className="space-y-4 px-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    Type
                  </span>
                  <span className="text-2xl font-black capitalize">
                    {userInfo.partnerData?.partnerType || "—"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  className="w-full text-zinc-500 hover:text-white hover:bg-white/5 text-xs font-bold rounded-xl h-10"
                  asChild
                >
                  <Link href="/partner/profile">
                    DÉTAILS DU COMPTE <ChevronRight className="w-3 h-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </BentoCard>

          {/* KPI Section */}
          {stats.map((stat, i) => (
            <BentoCard
              key={i}
              cols={3}
              rows={1}
              variant={i === 0 ? "glow" : "glass"}
              className="overflow-hidden group"
            >
              <div className="flex flex-col h-full justify-between">
                <div className="flex justify-between items-start">
                  <div
                    className={cn(
                      "p-3 rounded-2xl border",
                      stat.color === "emerald"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : stat.color === "blue"
                          ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                          : stat.color === "yellow"
                            ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                            : "bg-purple-500/10 border-purple-500/20 text-purple-400",
                    )}
                  >
                    <stat.icon className="w-6 h-6 stroke-[2.5px]" />
                  </div>
                  <div className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider bg-zinc-800 text-zinc-400 border border-white/5">
                    {stat.trend}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
                    {stat.label}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <AnimatedCounter
                      value={stat.value}
                      prefix={stat.prefix}
                      suffix={stat.suffix}
                      className="text-4xl font-black tracking-tighter"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-2 font-medium">{stat.description}</p>
                </div>
              </div>
            </BentoCard>
          ))}

          {/* Active Offers */}
          <BentoCard cols={6} rows={2} variant="glass" className="border-white/5">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black tracking-tight">Offres Actives</h3>
              <Button variant="ghost" className="text-zinc-400 hover:text-white group text-sm" asChild>
                <Link href="/partner/offers">
                  Gérer{" "}
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
            {activeOffers.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-zinc-300 font-semibold">Aucune offre active</p>
                <p className="text-sm text-zinc-500 mt-2">
                  Créez votre première offre pour attirer les membres Teen Club.
                </p>
                <Button className="mt-4 bg-purple-500 hover:bg-purple-400 text-white font-black rounded-xl" asChild>
                  <Link href="/partner/offers/new">
                    <Plus className="w-4 h-4 mr-2" /> Nouvelle offre
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {activeOffers.map((offer, i) => (
                  <GlassCard
                    key={i}
                    variant="hover"
                    className="p-5 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-purple-500/10 transition-colors">
                        <offer.icon className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="font-bold text-lg text-white">{offer.title}</p>
                        <p className="text-xs text-zinc-500 font-medium">
                          {offer.sales} utilisations
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs font-bold text-emerald-400">{offer.status}</div>
                        <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter">
                          STATUT
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </BentoCard>

          {/* Recent Activity */}
          <BentoCard cols={6} rows={2} variant="glass" className="border-white/5">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black tracking-tight">Transactions Récentes</h3>
              <Button variant="ghost" className="text-zinc-400 hover:text-white group text-sm" asChild>
                <Link href="/partner/transactions">
                  Historique{" "}
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
            {activity.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-zinc-300 font-semibold">Aucune transaction pour le moment</p>
                <p className="text-sm text-zinc-500 mt-2">
                  Les paiements et cashbacks apparaîtront ici en temps réel.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {activity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between group cursor-default"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <item.icon className={cn("w-5 h-5 relative z-10", item.color)} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">
                          {item.user} • {item.time}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={cn("text-base font-black tracking-tighter", item.color)}>
                        {item.amount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </BentoCard>
        </BentoGrid>

        {/* Quick Links */}
        <div className="flex flex-wrap gap-4 pt-10">
          {[
            { label: "Transactions", href: "/partner/transactions" },
            { label: "Statistiques", href: "/partner/stats" },
            { label: "Events", href: "/partner/events" },
            { label: "Support", href: "/partner/support" },
            { label: "Profil", href: "/partner/profile" },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="px-6 py-3 rounded-2xl bg-white/5 border border-white/5 text-xs font-bold text-zinc-500 hover:bg-white/10 hover:text-white hover:border-white/10 transition-all"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </ParallaxContainer>
  )
}
