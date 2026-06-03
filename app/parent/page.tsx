import { Suspense } from "react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ControlCenter } from "@/components/parent/dashboard/control-center"
import { UpcomingEvents } from "@/components/parent/dashboard/upcoming-events"
import { ParentalApprovalList } from "@/components/parent/parental-approval-list"
import { TeenSponsorHeader } from "@/components/parent/dashboard/teen-sponsor-header"
import {
  LazyFinancialOverview,
  LazyEvolutionTracker,
  LazySponsorChallengeForm,
} from "./lazy-components"
import { SkeletonCard } from "@/components/ui/skeletons/presets"
import { CreditCard, TrendingUp, ShieldCheck, History } from 'lucide-react'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatHero, NivCoach } from "@/components/brand"
import { MeshBackground } from "@/components/ui/effects/mesh-background"

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
      .in("user_id", teenIds)
      .neq("status", "cancelled")
    bookings = data || []
  }

  // 4. Récupérer les approbations en attente
  const { data: pendingApprovals } = await supabase
    .from("parental_approvals")
    .select("*")
    .eq("parent_id", userInfo.profileId)
    .eq("status", "pending")
    // #30 — real sort column is requested_at (no created_at on parental_approvals).
    .order("requested_at", { ascending: false })

  // Attach the teen display name (parental_approvals has no teen_name column) so
  // the approval cards show "de <teen>" rather than the generic fallback.
  const teenNameById = new Map<string, string>(
    (teens ?? []).map((t: any) => [
      t.teen_id,
      t.full_name || t.teen_name || t.first_name || "ton enfant",
    ]),
  )
  const approvalsWithNames = (pendingApprovals ?? []).map((a: any) => ({
    ...a,
    teen_name: teenNameById.get(a.teen_id) ?? a.teen_name ?? null,
  }))

  // --- TRAITEMENT DES DONNÉES ---
  const currentMonthBookings = bookings.filter((b: any) => new Date(b.created_at) >= startOfCurrentMonth)
  const monthlySpending = currentMonthBookings.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0)
  const totalBudgetLimit = budgetLimits.reduce((sum: number, b: any) => sum + (b.monthly_limit || 0), 0)

  const spendingByCategory: Record<string, number> = {}
  currentMonthBookings.forEach((b: any) => {
    const cat = b.event?.category || "autres"
    spendingByCategory[cat] = (spendingByCategory[cat] || 0) + (b.total_amount || 0)
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
        .in("user_id", teenIds)
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
    <div className="relative min-h-screen overflow-x-hidden bg-paper text-ink">
      <MeshBackground />

      <div className="relative z-10 mx-auto max-w-7xl space-y-10 px-4 py-12 md:px-8 pb-24">
        {/* Header — cockpit parent */}
        <header className="space-y-8">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="eyebrow tracking-[0.16em]">Espace parent</p>
              <h1 className="mt-2 font-display text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-4xl md:text-6xl">
                Centre de <em className="font-semibold italic text-pink">contrôle</em>
              </h1>
              <p className="mt-2 text-lg text-mute">
                Suivi de {teens?.length || 0} profil{(teens?.length || 0) > 1 ? "s" : ""} en temps réel.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
              <StatHero
                eyebrow="Budget famille"
                value={(totalBudgetLimit - monthlySpending).toLocaleString("fr-FR")}
                unit="DH"
                tone="teal"
                size="md"
              />
              <StickerCard className="justify-center p-4">
                <ControlCenter pendingCount={approvalsWithNames.length} activePermissionsCount={0} teensCount={teenIds.length} />
              </StickerCard>
            </div>
          </div>

          <NivCoach
            mood="happy"
            message={`Salam ! Tu suis ${teens?.length || 0} ado${(teens?.length || 0) > 1 ? "s" : ""}. Je te signale tout ce qui demande ton attention.`}
          />

          <section>
            <TeenSponsorHeader teens={teens || []} />
          </section>
        </header>

        {/* Approvals */}
        <Suspense fallback={<SkeletonCard noImage lines={3} className="min-h-[180px] border-2 border-ink" />}>
          {approvalsWithNames.length > 0 && (
            <section>
              <ParentalApprovalList requests={approvalsWithNames} />
            </section>
          )}
        </Suspense>

        {/* Evolution + financial */}
        <Suspense
          fallback={
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <SkeletonCard noImage lines={6} className="min-h-[400px] border-2 border-ink lg:col-span-8" />
              <SkeletonCard noImage lines={5} className="min-h-[400px] border-2 border-ink lg:col-span-4" />
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left — evolution */}
            <div className="space-y-8 lg:col-span-8">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-3 font-display text-lg font-extrabold">
                  <TrendingUp className="size-5 text-lime" aria-hidden="true" />
                  Analyse de progression
                </h3>
                <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-lime">En direct</span>
              </div>

              <div className="space-y-8">
                {teens?.map((teen: any) => (
                  <div key={teen.teen_id} className="space-y-6">
                    <LazyEvolutionTracker
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

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <LazySponsorChallengeForm teenId={teen.teen_id} teenName={teen.full_name || "ton teen"} />
                      {(() => {
                        const teenLimit = budgetLimits.find((bl: any) => bl.teen_id === teen.teen_id)
                        const monthly = teenLimit?.monthly_limit
                        const hasLimit = typeof monthly === "number" && monthly > 0
                        return (
                          <StickerCard className="justify-center p-5">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="eyebrow">Limite active</p>
                                {hasLimit ? (
                                  <p className="font-display text-2xl font-extrabold tabular-nums text-teal">
                                    {monthly.toLocaleString("fr-FR")} DH <span className="font-mono text-xs text-mute">/mois</span>
                                  </p>
                                ) : (
                                  <p className="text-sm text-mute">Limites non configurées</p>
                                )}
                              </div>
                              <Button asChild variant="outline" size="sm">
                                <Link href="/parent/budget">{hasLimit ? "Ajuster" : "Configurer"}</Link>
                              </Button>
                            </div>
                          </StickerCard>
                        )
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — financial */}
            <div className="space-y-8 lg:col-span-4">
              <h3 className="flex items-center gap-3 font-display text-lg font-extrabold">
                <CreditCard className="size-5 text-teal" aria-hidden="true" />
                Gestion budget
              </h3>

              <StickerCard className="overflow-hidden p-0">
                <LazyFinancialOverview
                  monthlySpending={monthlySpending}
                  budgetLimit={totalBudgetLimit}
                  previousMonthSpending={0}
                  forecast={0}
                  spendingByCategory={spendingByCategory}
                />
              </StickerCard>

              <div className="grid grid-cols-2 gap-4">
                <Button asChild variant="outline" className="h-20 flex-col gap-1">
                  <Link href="/parent/history">
                    <History className="size-6 text-teal" aria-hidden="true" />
                    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em]">Historique</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-20 flex-col gap-1">
                  <Link href="/parent/settings">
                    <ShieldCheck className="size-6 text-teal" aria-hidden="true" />
                    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em]">Sécurité</span>
                  </Link>
                </Button>
              </div>

              <StickerCard className="overflow-hidden p-0">
                <UpcomingEvents events={upcomingEvents} />
              </StickerCard>
            </div>
          </div>
        </Suspense>
      </div>
    </div>
  )
}
