import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  Users,
  Calendar,
  ShieldCheck
} from "lucide-react"
import Link from "next/link"
import { BudgetLimitForm } from "@/components/parent/budget-limit-form"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatHero } from "@/components/brand"
import { NivCoach, NivEmpty } from "@/components/brand"
import { SegmentedProgress } from "@/components/ui/progress"
import { StatusBadge } from "@/components/ui/status-badge"

async function getParentBudgetData(profileId: string) {
  const supabase = await createClient()

  // Get linked teens
  const { data: teens } = await supabase
    .from("parent_teens_overview")
    .select("*")
    .eq("parent_id", profileId)

  if (!teens || teens.length === 0) {
    return { teens: [], budgets: [], totalSpentThisMonth: 0 }
  }

  const teenIds = teens.map((t: any) => t.teen_id)

  // Get budget limits
  const { data: budgetLimits } = await supabase
    .from("teen_budget_limits")
    .select("*")
    .in("teen_id", teenIds)

  // Get this month's spending
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  // bookings owner column is user_id (no teen_id); amount is total_amount.
  const { data: bookings } = await supabase
    .from("bookings")
    .select("user_id, total_amount, created_at")
    .in("user_id", teenIds)
    .gte("created_at", startOfMonth.toISOString())

  // Calculate spending per teen
  const spendingByTeen = new Map<string, number>()
  bookings?.forEach((b: any) => {
    const current = spendingByTeen.get(b.user_id) || 0
    spendingByTeen.set(b.user_id, current + (b.total_amount || 0))
  })

  const totalSpentThisMonth = bookings?.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0) || 0

  // Merge data
  const teensWithBudget = teens.map((teen: any) => {
    const budget = budgetLimits?.find((b: any) => b.teen_id === teen.teen_id)
    const spent = spendingByTeen.get(teen.teen_id) || 0

    return {
      ...teen,
      monthlyLimit: budget?.monthly_limit || 0,
      perEventLimit: budget?.per_event_limit || 0,
      requiresApproval: budget?.requires_approval ?? true,
      spentThisMonth: spent,
      remainingBudget: (budget?.monthly_limit || 0) - spent,
      budgetUsagePercent: budget?.monthly_limit ? Math.round((spent / budget.monthly_limit) * 100) : 0
    }
  })

  return {
    teens: teensWithBudget,
    budgets: budgetLimits || [],
    totalSpentThisMonth
  }
}

export default async function ParentBudgetPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  const { teens, totalSpentThisMonth } = await getParentBudgetData(userInfo.profileId)

  const totalMonthlyLimits = teens.reduce((sum: number, t: any) => sum + (t.monthlyLimit || 0), 0)
  const teenCount = teens.length
  const teensNearLimit = teens.filter((t: any) => t.budgetUsagePercent >= 80).length

  return (
    <div className="min-h-screen bg-paper">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header éditorial */}
        <div className="mb-8">
          <p className="eyebrow text-pink">Contrôle dépenses</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink">
            Fixe les <em className="font-semibold italic text-pink">limites</em>
          </h1>
          <p className="mt-2 text-mute">Définis des budgets de dépenses pour tes teens.</p>
        </div>

        {/* Hiérarchie 1-2-3 : budget total dominant + KPI secondaires */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <StatHero
            eyebrow="Budget total"
            value={totalMonthlyLimits.toLocaleString()}
            unit="DH"
            tone="lime"
            icon={<Wallet className="h-5 w-5" />}
            meta="ce mois"
          />
          <StickerCard className="justify-between p-5">
            <div className="flex items-center justify-between">
              <p className="eyebrow text-teal">Dépensé</p>
              <TrendingUp className="h-5 w-5 text-teal" />
            </div>
            <p className="mt-2 font-display text-3xl font-extrabold tabular-nums text-ink">
              <span className="font-mono">{totalSpentThisMonth.toLocaleString()}</span>
              <span className="ml-1 font-mono text-base text-mute">DH</span>
            </p>
            <p className="mt-1 font-mono text-xs text-mute">ce mois</p>
          </StickerCard>
          <div className="grid grid-cols-2 gap-4">
            <StickerCard className="justify-between p-5">
              <div className="flex items-center justify-between">
                <p className="eyebrow text-pink">Teens</p>
                <Users className="h-5 w-5 text-pink" />
              </div>
              <p className="mt-2 font-display text-3xl font-extrabold tabular-nums text-ink">
                {teenCount}
              </p>
            </StickerCard>
            <StickerCard className="justify-between p-5">
              <div className="flex items-center justify-between">
                <p className={`eyebrow ${teensNearLimit > 0 ? "text-coral" : "text-mute"}`}>Alertes</p>
                <AlertTriangle className={`h-5 w-5 ${teensNearLimit > 0 ? "text-coral" : "text-mute"}`} />
              </div>
              <p className="mt-2 font-display text-3xl font-extrabold tabular-nums text-ink">
                {teensNearLimit}
              </p>
              <p className="mt-1 font-mono text-xs text-mute">près du plafond</p>
            </StickerCard>
          </div>
        </div>

        {/* Teen Budget Cards */}
        <div className="space-y-6">
          <h2 className="font-display text-xl font-extrabold text-ink">Budgets par teen</h2>

          {teens.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {teens.map((teen: any) => {
                const usagePercent = teen.budgetUsagePercent
                const isNearLimit = usagePercent >= 80
                const isOverLimit = usagePercent >= 100
                // Segments charte : 10 paliers de 10 %, remplis selon usagePercent.
                const filledSegments = Math.min(Math.round(usagePercent / 10), 10)

                return (
                  <StickerCard key={teen.teen_id} variant="hover" className="p-5">
                    <div className="flex items-center justify-between pb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink bg-paper font-display text-lg font-extrabold text-ink">
                          {teen.teen_name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="font-display text-lg font-extrabold text-ink">{teen.teen_name}</p>
                          <p className="font-mono text-xs text-mute">
                            {teen.title_icon} {teen.title} • Niv. {teen.level}
                          </p>
                        </div>
                      </div>
                      {isOverLimit && <StatusBadge variant="danger" label="Dépassé" />}
                      {isNearLimit && !isOverLimit && (
                        <StatusBadge variant="warning" label="Presque atteint" />
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Budget Progress */}
                      {teen.monthlyLimit > 0 && (
                        <div>
                          <div className="mb-2 flex justify-between text-sm">
                            <span className="text-mute">Budget mensuel</span>
                            <span className="font-mono font-bold text-ink">
                              {teen.spentThisMonth.toLocaleString()} / {teen.monthlyLimit.toLocaleString()} DH
                            </span>
                          </div>
                          <SegmentedProgress steps={10} current={filledSegments} size="md" />
                          <p className="mt-1 font-mono text-xs text-mute">
                            {teen.remainingBudget > 0
                              ? `${teen.remainingBudget.toLocaleString()} DH restants`
                              : "Budget épuisé"}
                          </p>
                        </div>
                      )}

                      {/* Settings */}
                      <div className="grid grid-cols-2 gap-4 border-t-2 border-ink pt-4">
                        <div className="rounded-xl border-2 border-ink bg-paper p-4">
                          <div className="mb-1 flex items-center gap-2 text-mute">
                            <Calendar className="h-4 w-4" />
                            <span className="eyebrow">Limite mensuelle</span>
                          </div>
                          <p className="font-mono text-lg font-bold text-ink">
                            {teen.monthlyLimit > 0 ? `${teen.monthlyLimit.toLocaleString()} DH` : "Non définie"}
                          </p>
                        </div>
                        <div className="rounded-xl border-2 border-ink bg-paper p-4">
                          <div className="mb-1 flex items-center gap-2 text-mute">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="eyebrow">Approbation</span>
                          </div>
                          <p className="font-display text-lg font-bold text-ink">
                            {teen.requiresApproval ? "Requise" : "Auto"}
                          </p>
                        </div>
                      </div>

                      {/* Edit Form */}
                      <BudgetLimitForm
                        teenId={teen.teen_id}
                        teenName={teen.teen_name}
                        currentMonthlyLimit={teen.monthlyLimit}
                        currentPerEventLimit={teen.perEventLimit}
                        currentRequiresApproval={teen.requiresApproval}
                      />
                    </div>
                  </StickerCard>
                )
              })}
            </div>
          ) : (
            <NivEmpty
              title="Aucun teen lié"
              description="Lie d'abord des comptes teen pour gérer leur budget."
              action={
                <Button asChild variant="pink">
                  <Link href="/parent/teens/add">Ajouter un teen</Link>
                </Button>
              }
            />
          )}
        </div>

        {/* Tips — coach Niv */}
        <NivCoach
          mood="calm"
          className="mt-8"
          message={
            <div className="space-y-1">
              <p className="font-bold text-paper">Commence petit, ajuste après, wili.</p>
              <p>
                Mets un petit budget au début et augmente selon l&apos;usage. Garde
                l&apos;approbation manuelle pour les events coûteux, et jette un œil aux dépenses
                chaque semaine.
              </p>
            </div>
          }
        />
      </div>
    </div>
  )
}
