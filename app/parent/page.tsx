import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { FinancialOverview } from "@/components/parent/dashboard/financial-overview"
import { ControlCenter } from "@/components/parent/dashboard/control-center"
import { UpcomingEvents } from "@/components/parent/dashboard/upcoming-events"
import { TeenCardEnhanced } from "@/components/parent/dashboard/teen-card-enhanced"
import { SmartInsights } from "@/components/parent/dashboard/smart-insights"
import { GrainOverlay, MeshGradient, GlowBlob } from "@/components/ui/gen-z-effects"
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid"
import { ParallaxContainer, ParallaxLayer } from "@/components/ui/parallax-container"
import { StaggerItem } from "@/components/ui/micro-interactions"
import { SponsorChallengeForm } from "@/components/parent/sponsor-challenge-form"
import { EvolutionTracker } from "@/components/parent/dashboard/evolution-tracker"
import { ParentalApprovalList } from "@/components/parent/parental-approval-list"
import { TeenSponsorHeader } from "@/components/parent/dashboard/teen-sponsor-header"
import { CreditCard, TrendingUp, Zap, ShieldCheck, History } from 'lucide-react'
import { AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function ParentDashboardPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  const supabase = await createClient()

  // 1. Récupérer les teens liés
  const { data: teens } = await supabase
    .from("parent_teens_overview")
    .select("*")
    .eq("parent_id", userInfo.profileId)

  const teenIds = teens?.map((t: any) => t.teen_id) || []

  // 2. Récupérer les limites de budget
  let budgetLimits: any[] = []
  if (teenIds.length > 0) {
    const { data } = await supabase
      .from("teen_budget_limits")
      .select("*")
      .in("teen_id", teenIds)
    budgetLimits = data || []
  }

  // 3. Récupérer les bookings
  const today = new Date()
  const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  
  let bookings: any[] = []
  if (teenIds.length > 0) {
    const { data } = await supabase
      .from("bookings")
      .select("*, event:events(title, category, event_date, venue_name, event_start)")
      .in("teen_id", teenIds)
      .neq("status", "cancelled")
    bookings = data || []
  }

  // 4. Récupérer les approbations en attente
  const { data: pendingApprovals } = await supabase
    .from("parental_approvals")
    .select("*")
    .eq("parent_id", userInfo.profileId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  // --- TRAITEMENT DES DONNÉES ---
  const currentMonthBookings = bookings.filter((b: any) => new Date(b.created_at) >= startOfCurrentMonth)
  const monthlySpending = currentMonthBookings.reduce((sum: number, b: any) => sum + (b.total_price || 0), 0)
  const totalBudgetLimit = budgetLimits.reduce((sum: number, b: any) => sum + (b.monthly_limit || 0), 0)

  const spendingByCategory: Record<string, number> = {}
  currentMonthBookings.forEach((b: any) => {
    const cat = b.event?.category || "autres"
    spendingByCategory[cat] = (spendingByCategory[cat] || 0) + (b.total_price || 0)
  })

  // --- 5. STATS PAR TEEN (responsibility / social / creativity / academic) ---
  // Audit fix: previously hardcoded {65,88,42,75} for every teen. Now computed
  // from real tables over the last 30 days. Each metric degrades to null on
  // query failure so EvolutionTracker can render a dash instead of a fake %.
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  type TeenStats = {
    responsibility: number | null
    social: number | null
    creativity: number | null
    academic: number | null
  }
  const statsByTeen: Record<string, TeenStats> = {}

  await Promise.all(
    teenIds.map(async (teenId: string) => {
      const stats: TeenStats = {
        responsibility: null,
        social: null,
        creativity: null,
        academic: null,
      }

      // Responsibility: chore completion rate over last 30 days.
      // parent_chore_completions has no parent_id directly; we filter via
      // parent_chores joined on chore_id where parent_id = current parent.
      try {
        const { data: choreIdsRows } = await supabase
          .from("parent_chores")
          .select("id")
          .eq("parent_id", userInfo.profileId)
          .eq("teen_id", teenId)
        const choreIds = (choreIdsRows ?? []).map((r: any) => r.id)
        if (choreIds.length === 0) {
          stats.responsibility = 0
        } else {
          const { data: comps } = await supabase
            .from("parent_chore_completions")
            .select("parent_verified, created_at")
            .in("chore_id", choreIds)
            .eq("teen_id", teenId)
            .gte("created_at", since30)
          const total = comps?.length ?? 0
          const verified = (comps ?? []).filter((c: any) => c.parent_verified === true).length
          stats.responsibility = total === 0 ? 0 : Math.round((verified / total) * 100)
        }
      } catch (err) {
        console.error("[parent] responsibility stat failed for", teenId, err)
        stats.responsibility = null
      }

      // Social: feed_posts authored + feed_likes given in last 30 days,
      // normalized to 0-100 (cap at 50 actions = 100%).
      try {
        const [{ count: postsCount }, { count: likesCount }] = await Promise.all([
          supabase
            .from("feed_posts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", teenId)
            .gte("created_at", since30),
          supabase
            .from("feed_likes")
            .select("id", { count: "exact", head: true })
            .eq("user_id", teenId)
            .gte("created_at", since30),
        ])
        const actions = (postsCount ?? 0) + (likesCount ?? 0)
        stats.social = Math.min(100, Math.round((actions / 50) * 100))
      } catch (err) {
        console.error("[parent] social stat failed for", teenId, err)
        stats.social = null
      }

      // Creativity: feed_posts of creative type (creation/photo/video) in last 30d,
      // normalized to 0-100 (cap at 10 = 100%).
      // Note: creator_submissions table does not yet exist (planned, see whitepaper §28).
      try {
        const { count: creativeCount } = await supabase
          .from("feed_posts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", teenId)
          .in("post_type", ["creation", "photo", "video"])
          .gte("created_at", since30)
        stats.creativity = Math.min(100, Math.round(((creativeCount ?? 0) / 10) * 100))
      } catch (err) {
        console.error("[parent] creativity stat failed for", teenId, err)
        stats.creativity = null
      }

      // Academic: average quiz score over last 30 days.
      try {
        const { data: attempts } = await supabase
          .from("quiz_attempts")
          .select("score")
          .eq("teen_id", teenId)
          .gte("created_at", since30)
        if (!attempts || attempts.length === 0) {
          stats.academic = 0
        } else {
          const sum = attempts.reduce((s: number, a: any) => s + (a.score || 0), 0)
          stats.academic = Math.round(sum / attempts.length)
        }
      } catch (err) {
        console.error("[parent] academic stat failed for", teenId, err)
        stats.academic = null
      }

      statsByTeen[teenId] = stats
    })
  )

  // --- 6. UPCOMING EVENTS ---
  // Audit fix: previously hardcoded `events={[]}`. Now real bookings
  // joined to events for this parent's teens, only future-dated.
  let upcomingEvents: Array<{
    id: string
    title: string
    event_date: string
    venue_name?: string
    start_time?: string
  }> = []
  try {
    if (teenIds.length > 0) {
      const nowIso = new Date().toISOString()
      const { data: upcomingRows } = await supabase
        .from("bookings")
        .select("id, event:events(id, title, event_date, venue_name, event_start)")
        .in("teen_id", teenIds)
        .neq("status", "cancelled")
      upcomingEvents = (upcomingRows ?? [])
        .map((b: any) => b.event)
        .filter((e: any) => e && e.event_date && new Date(e.event_date).toISOString() > nowIso)
        .sort((a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
        .slice(0, 10)
        .map((e: any) => ({
          id: e.id,
          title: e.title,
          event_date: e.event_date,
          venue_name: e.venue_name ?? undefined,
          start_time: e.event_start ?? undefined,
        }))
    }
  } catch (err) {
    console.error("[parent] upcoming events query failed:", err)
    upcomingEvents = []
  }

  return (
    <div className="relative min-h-screen bg-[#020408] text-white selection:bg-gen-z-teal/30 overflow-x-hidden">
      {/* 1. ULTRA-PREMIUM BACKGROUND */}
      {/* V1.4 a11y: gate parallax background on prefers-reduced-motion (WCAG 2.3.3). */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none overflow-hidden motion-reduce:hidden"
      >
        <MeshGradient className="opacity-30" />
        <ParallaxLayer speed={-0.05}>
          <GlowBlob color="var(--gen-z-teal)" size={1000} className="-top-[20%] -left-[10%] opacity-20" />
        </ParallaxLayer>
        <GrainOverlay opacity={0.04} />
      </div>

      <ParallaxContainer className="relative z-10 container-wide py-16 px-4 md:px-8 max-w-[1600px] mx-auto space-y-16 pb-32">
        
        {/* SECTION 1: THE SPONSOR COCKPIT (HEADER) */}
        <header className="relative space-y-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gen-z-teal/10 text-gen-z-teal text-xs font-black tracking-widest uppercase border border-gen-z-teal/20">
                <Zap className="w-4 h-4 fill-current" /> ESPACE PARENT ACTIF
              </div>
              <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">Centre de <span className="text-gen-z-gradient-soft">Contrôle</span></h1>
              <p className="text-zinc-500 text-lg md:text-xl font-medium">Suivi de {teens?.length || 0} profil{(teens?.length || 0) > 1 ? 's' : ''} en temps réel.</p>
            </div>
            
            {/* Quick Financial Overview */}
            <div className="flex items-center gap-10 bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-8 rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.5)]">
              <div className="text-right">
                <span className="text-xs font-black text-zinc-500 uppercase tracking-widest leading-none">Budget Famille</span>
                <p className="text-4xl font-black text-white mt-2 tabular-nums">{(totalBudgetLimit - monthlySpending).toLocaleString()} <span className="text-sm font-bold text-zinc-500">DH</span></p>
              </div>
              <div className="w-px h-16 bg-white/10" />
              <ControlCenter pendingCount={pendingApprovals?.length || 0} activePermissionsCount={0} teensCount={teenIds.length} />
            </div>
          </div>

          {/* Teen Selector Avatars (Stories Style) */}
          <section className="pt-4">
            <TeenSponsorHeader teens={teens || []} />
          </section>
        </header>

        {/* SECTION 2: CRITICAL ACTION STREAM (APPROVALS) */}
        <AnimatePresence>
          {pendingApprovals && pendingApprovals.length > 0 && (
            <StaggerItem>
              <section className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 to-transparent blur-2xl opacity-50" />
                <ParentalApprovalList requests={pendingApprovals} />
              </section>
            </StaggerItem>
          )}
        </AnimatePresence>

        {/* SECTION 3: EVOLUTION & PERFORMANCE FEED */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Tactical Evolution */}
          <div className="lg:col-span-8 space-y-10">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-gen-z-lime" />
                Analyse de Progression
              </h3>
              <span className="text-xs font-bold text-gen-z-lime uppercase tracking-wider">En direct</span>
            </div>
            
            <div className="space-y-10">
              {teens?.map((teen: any) => (
                <div key={teen.teen_id} className="space-y-8 animate-fade-in-up">
                  <EvolutionTracker
                    teenName={teen.full_name || teen.teen_name || teen.first_name || "Teen"}
                    stats={
                      statsByTeen[teen.teen_id] ?? {
                        responsibility: null,
                        social: null,
                        creativity: null,
                        academic: null,
                      }
                    }
                  />
                  
                  {/* Strategic Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SponsorChallengeForm 
                      teenId={teen.teen_id} 
                      teenName={teen.full_name || "ton teen"} 
                    />
                    {/* Audit fix (V4 P1): previously hardcoded "Limite Active 500 DH /mois".
                        Now reads the real teen_budget_limits row for this teen and falls
                        back to an honest "Limites non configurées" copy when none exists. */}
                    {(() => {
                      const teenLimit = budgetLimits.find((bl: any) => bl.teen_id === teen.teen_id)
                      const monthly = teenLimit?.monthly_limit
                      const hasLimit = typeof monthly === "number" && monthly > 0
                      return (
                        <BentoCard cols={12} rows={1} variant="default" className="bg-zinc-900/40 border-white/5 flex flex-col justify-center h-full">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-black text-white uppercase tracking-widest">Limite Active</p>
                              {hasLimit ? (
                                <p className="text-2xl font-black text-gen-z-teal">
                                  {monthly.toLocaleString()} DH <span className="text-xs text-zinc-500">/mois</span>
                                </p>
                              ) : (
                                <p className="text-sm font-bold text-zinc-400">Limites non configurées</p>
                              )}
                            </div>
                            <Button variant="outline" className="rounded-xl border-white/10 text-xs font-black uppercase">
                              {hasLimit ? "Ajuster" : "Configurer"}
                            </Button>
                          </div>
                        </BentoCard>
                      )
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Financial Pilot & Logs */}
          <div className="lg:col-span-4 space-y-10">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-gen-z-teal" />
              Gestion Budget
            </h3>
            
            <BentoCard cols={12} rows={2} variant="glass" className="p-0 border-white/5 shadow-2xl overflow-hidden">
              <FinancialOverview 
                monthlySpending={monthlySpending}
                budgetLimit={totalBudgetLimit}
                previousMonthSpending={0}
                forecast={0}
                spendingByCategory={spendingByCategory}
              />
            </BentoCard>

            <div className="grid grid-cols-2 gap-4">
              <Button className="h-20 rounded-3xl bg-info-soft/10 border border-info-soft/20 flex flex-col gap-1 items-center justify-center group hover:bg-info-soft/20 transition-all">
                <History className="w-6 h-6 text-info-soft group-hover:scale-110 motion-safe:transition-transform" />
                <span className="text-xs font-black uppercase text-white tracking-widest">Historique</span>
              </Button>
              <Button className="h-20 rounded-3xl bg-accent-soft/10 border border-accent-soft/20 flex flex-col gap-1 items-center justify-center group hover:bg-accent-soft/20 transition-all">
                <ShieldCheck className="w-6 h-6 text-accent-soft group-hover:scale-110 motion-safe:transition-transform" />
                <span className="text-xs font-black uppercase text-white tracking-widest">Sécurité</span>
              </Button>
            </div>

            <BentoCard cols={12} rows={1} variant="accent" tiltIntensity={5} className="bg-gradient-to-br from-zinc-900 to-black">
              <UpcomingEvents events={upcomingEvents} />
            </BentoCard>
          </div>
        </div>

      </ParallaxContainer>
    </div>
  )
}
