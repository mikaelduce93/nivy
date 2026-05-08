import { Suspense } from "react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ShoppingBag, Users, TrendingUp, QrCode, Tag, Plus, Store } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { GrainOverlay, MeshGradient, GlowBlob } from "@/components/ui/gen-z-effects"
import { StaggerItem, PulseGlow, Float } from "@/components/ui/micro-interactions"
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid"
import { ParallaxContainer, ParallaxLayer } from "@/components/ui/parallax-container"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { PartnerAwaitingApproval } from "@/components/dashboard/partner/awaiting-approval"
import {
  LazyPartnerActiveOffersFeed,
  LazyPartnerLiveTransactionsFeed,
} from "./lazy-components"
import { SkeletonCard } from "@/components/ui/skeletons/presets"

// Statuses that mean the partner is fully onboarded and may use the dashboard.
// Anything else (pending, in_review, rejected, suspended) renders the
// awaiting-approval state instead of the live dashboard.
const PARTNER_ACTIVE_STATUSES = new Set(["active", "verified", "approved"])

async function getPartnerStats(partnerEmail: string) {
  const supabase = await createClient()

  // Get partner info — include status so we can render the
  // "awaiting approval" first-run state when it isn't active yet.
  const { data: partner } = await supabase
    .from("partners")
    .select("id, company_name, partner_type, status, created_at")
    .eq("email", partnerEmail)
    .single()

  if (!partner) return null

  // Get active discounts count
  const { count: activeOffersCount } = await supabase
    .from("partner_discounts")
    .select("*", { count: "exact", head: true })
    .eq("partner_id", partner.id)
    .eq("is_active", true)
    .gte("valid_until", new Date().toISOString().split("T")[0])

  // Get this month's transactions
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: transactions, count: transactionsCount } = await supabase
    .from("discount_usage")
    .select(`
      id,
      purchase_amount,
      discount_amount,
      final_amount,
      used_at,
      profile:profile_id (
        full_name
      )
    `, { count: "exact" })
    .in("discount_id", (
      await supabase
        .from("partner_discounts")
        .select("id")
        .eq("partner_id", partner.id)
    ).data?.map(d => d.id) || [])
    .gte("used_at", startOfMonth.toISOString())
    .order("used_at", { ascending: false })

  const totalRevenue = transactions?.reduce((sum, t) => sum + (t.final_amount || 0), 0) || 0
  const uniqueCustomers = new Set(transactions?.map(t => (t.profile as unknown as { full_name?: string } | null)?.full_name)).size

  const { data: offers } = await supabase
    .from("partner_discounts")
    .select("id, discount_name, discount_type, discount_value, current_total_uses")
    .eq("partner_id", partner.id)
    .eq("is_active", true)
    .gte("valid_until", new Date().toISOString().split("T")[0])
    .order("current_total_uses", { ascending: false })
    .limit(3)

  return {
    partnerId: partner.id,
    companyName: partner.company_name,
    partnerType: partner.partner_type,
    status: (partner.status as string | null) ?? "pending",
    createdAt: partner.created_at as string | null,
    transactionsCount: transactionsCount || 0,
    uniqueCustomers,
    totalRevenue,
    activeOffersCount: activeOffersCount || 0,
    activeOffers: offers || [],
    recentTransactions: transactions?.slice(0, 3) || []
  }
}

export default async function PartnerDashboardPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "partner") {
    redirect("/auth/redirect")
  }

  const stats = await getPartnerStats(userInfo.email)

  const companyName = stats?.companyName || userInfo.partnerData?.companyName || "Entreprise"
  const partnerType = stats?.partnerType || userInfo.partnerData?.partnerType || "retail"
  const partnerStatus = stats?.status ?? "pending"

  // Gate the live dashboard behind admin approval. New partners land
  // here right after submitting their KYC and need a clear "what
  // happens next" screen instead of empty stats / broken CTAs.
  if (!PARTNER_ACTIVE_STATUSES.has(partnerStatus)) {
    return (
      <PartnerAwaitingApproval
        companyName={companyName}
        status={partnerStatus}
        submittedAt={stats?.createdAt ?? null}
      />
    )
  }

  const transactionsCount = stats?.transactionsCount || 0
  const uniqueCustomers = stats?.uniqueCustomers || 0
  const totalRevenue = stats?.totalRevenue || 0
  const activeOffersCount = stats?.activeOffersCount || 0
  const activeOffers = stats?.activeOffers || []
  const recentTransactions = stats?.recentTransactions || []

  const typeIcons: Record<string, string> = {
    retail: "🛍️",
    venue: "🍽️",
    club: "🏃",
    education: "📚",
  }

  return (
    <div className="relative min-h-screen bg-[#050505] text-white selection:bg-brand-soft/30 overflow-x-hidden">
      {/* 1. BUSINESS ELITE BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <MeshGradient className="opacity-25" />
        <ParallaxLayer speed={-0.08}>
          <GlowBlob color="var(--brand-soft)" size={900} className="-top-[10%] -right-[15%] opacity-20" />
        </ParallaxLayer>
        <ParallaxLayer speed={0.12}>
          <GlowBlob color="var(--info-soft)" size={700} className="bottom-[5%] -left-[10%] opacity-15" />
        </ParallaxLayer>
        <GrainOverlay opacity={0.05} />
      </div>

      <ParallaxContainer className="relative z-10 container-wide py-12 px-4 md:px-8 max-w-[1600px] mx-auto space-y-12">
        
        {/* 2. PARTNER HERO CARD */}
        <StaggerItem>
          <div className="relative overflow-hidden rounded-[3rem] bg-zinc-900/40 border border-white/10 p-10 md:p-16 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] backdrop-blur-3xl group">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-soft/10 rounded-full blur-[150px] -mr-48 -mt-48 transition-all duration-700 group-hover:bg-brand-soft/20" />
            
            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-12">
              <div className="flex items-center gap-8 text-center md:text-left flex-col md:flex-row">
                <Float>
                  <div className="text-7xl bg-white/5 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white/10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative z-10 drop-shadow-2xl">{typeIcons[partnerType]}</span>
                  </div>
                </Float>
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-soft/10 text-brand-soft text-xs font-black tracking-widest uppercase border border-brand-soft/20">
                    <Store className="w-4 h-4" /> Accès Partenaire Premium
                  </div>
                  <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">{companyName}</h1>
                  <p className="text-zinc-500 text-xl font-medium tracking-tight">Espace Partenaire • Casablanca</p>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-6">
                <PulseGlow color="var(--brand-soft)">
                  <MagneticButton className="h-20 px-10 bg-white text-black hover:bg-white/90 font-black rounded-3xl shadow-2xl shadow-white/10 transition-all text-lg tracking-tighter" asChild intensity={0.2}>
                    <Link href="/partner/offers/new">
                      <Plus className="h-6 w-6 mr-3 stroke-[3]" /> NOUVELLE OFFRE
                    </Link>
                  </MagneticButton>
                </PulseGlow>
                <Button variant="outline" className="h-20 px-10 border-white/10 bg-white/5 hover:bg-white/10 text-white font-black rounded-3xl backdrop-blur-xl transition-all text-lg tracking-tighter" asChild>
                  <Link href="/partner/scanner">
                    <QrCode className="h-6 w-6 mr-3" /> SCANNER
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </StaggerItem>

        {/* 3. PERFORMANCE HUB (Bento) */}
        <BentoGrid className="auto-rows-[minmax(220px,auto)]">
          
          {/* Main Revenue Card */}
          <BentoCard 
            cols={6} 
            rows={1} 
            variant="accent"
            tiltIntensity={3}
            className="flex flex-col justify-center border-brand-soft/20 bg-gradient-to-br from-brand-soft/10 to-transparent"
          >
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs font-black uppercase text-brand-soft tracking-widest">Chiffre d'Affaires</p>
              <div className="w-10 h-10 rounded-xl bg-brand-soft/20 flex items-center justify-center border border-brand-soft/20">
                <TrendingUp className="w-5 h-5 text-brand-soft" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-6xl font-black text-white tracking-tighter tabular-nums">{totalRevenue.toLocaleString()}</p>
              <span className="text-2xl font-bold text-zinc-600 uppercase tracking-tighter">DH</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-emerald-400">
              <div className="w-2 h-2 rounded-full bg-emerald-400 motion-safe:animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest">+12.5% vs mois dernier</span>
            </div>
          </BentoCard>

          {/* Customer Volume */}
          <BentoCard 
            cols={3} 
            rows={1} 
            variant="default"
            tiltIntensity={6}
            className="bg-zinc-900/60 border-white/5"
          >
            <div className="flex items-center justify-between mb-10">
              <p className="text-xs font-black uppercase text-zinc-500 tracking-widest">Clients</p>
              <Users className="w-5 h-5 text-info-soft opacity-50" />
            </div>
            <p className="text-5xl font-black text-white tracking-tighter tabular-nums">{uniqueCustomers}</p>
            <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest mt-2">Utilisateurs actifs</p>
          </BentoCard>

          {/* Transactions Count */}
          <BentoCard 
            cols={3} 
            rows={1} 
            variant="default"
            tiltIntensity={6}
            className="bg-zinc-900/60 border-white/5"
          >
            <div className="flex items-center justify-between mb-10">
              <p className="text-xs font-black uppercase text-zinc-500 tracking-widest">Transactions</p>
              <ShoppingBag className="w-5 h-5 text-gen-z-lime opacity-50" />
            </div>
            <p className="text-5xl font-black text-white tracking-tighter tabular-nums">{transactionsCount}</p>
            <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest mt-2">Ce mois-ci</p>
          </BentoCard>

          {/*
            Active Offers Feed — below-the-fold. Streamed via Suspense and
            lazy-loaded as its own client chunk. Skeleton mirrors the
            real card height to avoid CLS.
          */}
          <BentoCard
            cols={6}
            rows={2}
            variant="glass"
            tiltIntensity={2}
            className="border-white/5 flex flex-col p-0"
          >
            <Suspense
              fallback={
                <SkeletonCard
                  noImage
                  lines={5}
                  className="min-h-[440px] border-white/0 bg-transparent"
                />
              }
            >
              <LazyPartnerActiveOffersFeed
                offers={activeOffers as any}
                activeCount={activeOffersCount}
              />
            </Suspense>
          </BentoCard>

          {/*
            Realtime Transaction Feed — below-the-fold. Streamed via Suspense
            so the hero + KPI strip can paint without waiting for the
            transaction client bundle.
          */}
          <BentoCard
            cols={6}
            rows={2}
            variant="glass"
            tiltIntensity={2}
            className="border-white/5 flex flex-col p-0"
          >
            <Suspense
              fallback={
                <SkeletonCard
                  noImage
                  lines={5}
                  className="min-h-[440px] border-white/0 bg-transparent"
                />
              }
            >
              <LazyPartnerLiveTransactionsFeed
                transactions={recentTransactions as any}
              />
            </Suspense>
          </BentoCard>

          {/* Action Dock (Bottom Full Width) */}
          <BentoCard cols={12} rows={1} variant="default" className="p-4 border-white/5 bg-zinc-900/20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-full">
              {[
                { label: "SCAN QR", icon: QrCode, color: "var(--gen-z-lime)", href: "/partner/scanner" },
                { label: "CAMPAGNE", icon: Tag, color: "var(--accent-soft)", href: "/partner/offers/new" },
                { label: "ANALYTICS", icon: TrendingUp, color: "var(--brand-soft)", href: "/partner/stats" },
                { label: "SUPPORT VIP", icon: Users, color: "var(--info-soft)", href: "/partner/support" }
              ].map((action) => (
                <Button key={action.label} variant="outline" className="h-full py-10 flex-col gap-4 rounded-[2.5rem] bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-white/20 transition-all duration-500 group relative overflow-hidden" asChild>
                  <Link href={action.href}>
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-2xl relative z-10" style={{ backgroundColor: `${action.color}15`, border: `1px solid ${action.color}20` }}>
                      <action.icon className="h-8 w-8" style={{ color: action.color }} />
                    </div>
                    <span className="text-xs font-black text-zinc-400 group-hover:text-white uppercase tracking-[0.2em] relative z-10 transition-colors">{action.label}</span>
                  </Link>
                </Button>
              ))}
            </div>
          </BentoCard>

        </BentoGrid>
      </ParallaxContainer>
    </div>
  )
}
