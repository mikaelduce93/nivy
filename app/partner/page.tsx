import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingBag, Users, TrendingUp, QrCode, Tag, Plus, ArrowRight, BarChart3, Store } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { GrainOverlay, MeshGradient, GlowBlob } from "@/components/ui/gen-z-effects"
import { StaggerContainer, StaggerItem, PulseGlow, Float } from "@/components/ui/micro-interactions"
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid"
import { ParallaxContainer, ParallaxLayer } from "@/components/ui/parallax-container"
import { MagneticButton } from "@/components/ui/magnetic-button"

async function getPartnerStats(partnerEmail: string) {
  const supabase = await createClient()

  // Get partner info
  const { data: partner } = await supabase
    .from("partners")
    .select("id, company_name, partner_type")
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
    <div className="relative min-h-screen bg-[#050505] text-white selection:bg-gen-z-lavender/30 overflow-x-hidden">
      {/* 1. BUSINESS ELITE BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <MeshGradient className="opacity-25" />
        <ParallaxLayer speed={-0.08}>
          <GlowBlob color="var(--gen-z-lavender)" size={900} className="-top-[10%] -right-[15%] opacity-20" />
        </ParallaxLayer>
        <ParallaxLayer speed={0.12}>
          <GlowBlob color="var(--gen-z-sky)" size={700} className="bottom-[5%] -left-[10%] opacity-15" />
        </ParallaxLayer>
        <GrainOverlay opacity={0.05} />
      </div>

      <ParallaxContainer className="relative z-10 container-wide py-12 px-4 md:px-8 max-w-[1600px] mx-auto space-y-12">
        
        {/* 2. PARTNER HERO CARD */}
        <StaggerItem>
          <div className="relative overflow-hidden rounded-[3rem] bg-zinc-900/40 border border-white/10 p-10 md:p-16 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] backdrop-blur-3xl group">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gen-z-lavender/10 rounded-full blur-[150px] -mr-48 -mt-48 transition-all duration-700 group-hover:bg-gen-z-lavender/20" />
            
            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-12">
              <div className="flex items-center gap-8 text-center md:text-left flex-col md:flex-row">
                <Float>
                  <div className="text-7xl bg-white/5 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white/10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative z-10 drop-shadow-2xl">{typeIcons[partnerType]}</span>
                  </div>
                </Float>
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gen-z-lavender/10 text-gen-z-lavender text-xs font-black tracking-widest uppercase border border-gen-z-lavender/20">
                    <Store className="w-4 h-4" /> Accès Partenaire Premium
                  </div>
                  <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">{companyName}</h1>
                  <p className="text-zinc-500 text-xl font-medium tracking-tight">Espace Partenaire • Casablanca</p>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-6">
                <PulseGlow color="var(--gen-z-lavender)">
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
            className="flex flex-col justify-center border-gen-z-lavender/20 bg-gradient-to-br from-gen-z-lavender/10 to-transparent"
          >
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs font-black uppercase text-gen-z-lavender tracking-widest">Chiffre d'Affaires</p>
              <div className="w-10 h-10 rounded-xl bg-gen-z-lavender/20 flex items-center justify-center border border-gen-z-lavender/20">
                <TrendingUp className="w-5 h-5 text-gen-z-lavender" />
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
              <Users className="w-5 h-5 text-gen-z-sky opacity-50" />
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

          {/* Active Offers Feed */}
          <BentoCard 
            cols={6} 
            rows={2} 
            variant="glass"
            tiltIntensity={2}
            className="border-white/5 flex flex-col p-0"
          >
            <div className="p-8 pb-4 flex items-center justify-between">
              <h3 className="text-xl font-black tracking-tighter flex items-center gap-3">
                <Tag className="w-6 h-6 text-gen-z-coral" /> OFFRES ACTIVES
              </h3>
              <div className="px-3 py-1 rounded-full bg-gen-z-coral/10 text-gen-z-coral text-xs font-black uppercase tracking-widest">
                {activeOffersCount} EN LIGNE
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-4 custom-scrollbar">
              {activeOffers.length > 0 ? (
                  activeOffers.map((offer: any) => (
                  <div key={offer.id} className="group relative p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 hover:border-gen-z-coral/30 hover:bg-white/[0.05] transition-all duration-500 cursor-default">
                    <div className="flex items-center justify-between relative z-10">
                      <div className="space-y-1">
                        <p className="font-black text-white text-lg group-hover:text-gen-z-coral transition-colors">{offer.discount_name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                            {offer.discount_type === 'percentage' ? `${offer.discount_value}% RÉDUCTION` : `-${offer.discount_value} DH`}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black text-white tabular-nums">{offer.current_total_uses || 0}</p>
                        <p className="text-xs font-bold text-zinc-600 uppercase tracking-tighter">UTILISATIONS</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-700 font-black uppercase tracking-widest py-20">
                  Aucune campagne active
                </div>
              )}
            </div>
          </BentoCard>

          {/* Realtime Transaction Feed */}
          <BentoCard 
            cols={6} 
            rows={2} 
            variant="glass"
            tiltIntensity={2}
            className="border-white/5 flex flex-col p-0"
          >
            <div className="p-8 pb-4 flex items-center justify-between">
              <h3 className="text-xl font-black tracking-tighter flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-gen-z-sky" /> FIL EN DIRECT
              </h3>
              <Button variant="ghost" size="sm" asChild className="text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white">
                <Link href="/partner/transactions">Tout voir <ArrowRight className="h-3 w-3 ml-2" /></Link>
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-4 custom-scrollbar">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((tx: any) => {
                  const customerName = tx.profile?.full_name || "Member"
                  const date = new Date(tx.used_at)
                  const timeText = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

                  return (
                    <div key={tx.id} className="flex items-center justify-between p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 hover:border-gen-z-sky/30 transition-all duration-500">
                      <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-gen-z-sky via-gen-z-lavender to-gen-z-coral flex items-center justify-center text-black font-black text-2xl shadow-xl">
                          {customerName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-white text-lg tracking-tight">{customerName}</p>
                          <p className="text-xs font-black text-zinc-600 uppercase tracking-widest">{timeText} • VALIDÉ</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-white tabular-nums">{tx.final_amount} <span className="text-sm">DH</span></p>
                        <div className="inline-block px-2 py-0.5 rounded-lg bg-gen-z-lime/10 text-gen-z-lime text-xs font-black uppercase tracking-tighter mt-1">
                          -{tx.discount_amount} DH
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-700 font-black uppercase tracking-widest py-20">
                  En attente de transaction
                </div>
              )}
            </div>
          </BentoCard>

          {/* Action Dock (Bottom Full Width) */}
          <BentoCard cols={12} rows={1} variant="default" className="p-4 border-white/5 bg-zinc-900/20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-full">
              {[
                { label: "SCAN QR", icon: QrCode, color: "var(--gen-z-lime)", href: "/partner/scanner" },
                { label: "CAMPAGNE", icon: Tag, color: "var(--gen-z-coral)", href: "/partner/offers/new" },
                { label: "ANALYTICS", icon: TrendingUp, color: "var(--gen-z-lavender)", href: "/partner/stats" },
                { label: "SUPPORT VIP", icon: Users, color: "var(--gen-z-sky)", href: "/partner/support" }
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
