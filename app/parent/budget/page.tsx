import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  Settings,
  Users,
  Calendar,
  ShieldCheck
} from "lucide-react"
import Link from "next/link"
import { BudgetLimitForm } from "@/components/parent/budget-limit-form"
import { EmptyState } from "@/components/ui/states/empty-state"

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

  const { data: bookings } = await supabase
    .from("bookings")
    .select("teen_id, total_price, created_at")
    .in("teen_id", teenIds)
    .gte("created_at", startOfMonth.toISOString())

  // Calculate spending per teen
  const spendingByTeen = new Map<string, number>()
  bookings?.forEach((b: any) => {
    const current = spendingByTeen.get(b.teen_id) || 0
    spendingByTeen.set(b.teen_id, current + (b.total_price || 0))
  })

  const totalSpentThisMonth = bookings?.reduce((sum: number, b: any) => sum + (b.total_price || 0), 0) || 0

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">Gestion du Budget</h1>
            <p className="text-zinc-400">Définissez des limites de dépenses pour vos teens</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-emerald-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-400 font-medium">Budget Total</p>
                  <p className="text-3xl font-black text-white">{totalMonthlyLimits.toLocaleString()} DH</p>
                  <p className="text-xs text-zinc-500">ce mois</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-400 font-medium">Dépensé</p>
                  <p className="text-3xl font-black text-white">{totalSpentThisMonth.toLocaleString()} DH</p>
                  <p className="text-xs text-zinc-500">ce mois</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-400 font-medium">Teens</p>
                  <p className="text-3xl font-black text-white">{teenCount}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-zinc-900 ${teensNearLimit > 0 ? "bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30" : "border-zinc-800"}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-medium ${teensNearLimit > 0 ? "text-orange-400" : "text-zinc-400"}`}>
                    Alertes
                  </p>
                  <p className="text-3xl font-black text-white">{teensNearLimit}</p>
                  <p className="text-xs text-zinc-500">près du plafond</p>
                </div>
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${teensNearLimit > 0 ? "bg-orange-500/20" : "bg-zinc-800"}`}>
                  <AlertTriangle className={`h-6 w-6 ${teensNearLimit > 0 ? "text-orange-400" : "text-zinc-500"}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Teen Budget Cards */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white">Budgets par Teen</h2>

          {teens.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {teens.map((teen: any) => {
                const usagePercent = teen.budgetUsagePercent
                const isNearLimit = usagePercent >= 80
                const isOverLimit = usagePercent >= 100

                return (
                  <Card
                    key={teen.teen_id}
                    className={`bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 ${
                      isOverLimit ? "border-red-500/50" : isNearLimit ? "border-orange-500/50" : ""
                    }`}
                  >
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-lg">
                          {teen.teen_name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <CardTitle className="text-lg text-white">{teen.teen_name}</CardTitle>
                          <p className="text-xs text-zinc-400">
                            {teen.title_icon} {teen.title} • Niv. {teen.level}
                          </p>
                        </div>
                      </div>
                      {isOverLimit && (
                        <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">
                          Dépassé
                        </span>
                      )}
                      {isNearLimit && !isOverLimit && (
                        <span className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-400">
                          Presque atteint
                        </span>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Budget Progress */}
                      {teen.monthlyLimit > 0 && (
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-zinc-400">Budget mensuel</span>
                            <span className="text-white font-bold">
                              {teen.spentThisMonth.toLocaleString()} / {teen.monthlyLimit.toLocaleString()} DH
                            </span>
                          </div>
                          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOverLimit ? "bg-red-500" : isNearLimit ? "bg-orange-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(usagePercent, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-zinc-500 mt-1">
                            {teen.remainingBudget > 0
                              ? `${teen.remainingBudget.toLocaleString()} DH restants`
                              : "Budget épuisé"}
                          </p>
                        </div>
                      )}

                      {/* Settings */}
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                        <div className="bg-zinc-800 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-zinc-400 mb-1">
                            <Calendar className="h-4 w-4" />
                            <span className="text-xs">Limite mensuelle</span>
                          </div>
                          <p className="text-lg font-bold text-white">
                            {teen.monthlyLimit > 0 ? `${teen.monthlyLimit.toLocaleString()} DH` : "Non définie"}
                          </p>
                        </div>
                        <div className="bg-zinc-800 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-zinc-400 mb-1">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="text-xs">Approbation</span>
                          </div>
                          <p className="text-lg font-bold text-white">
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
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="Aucun teen lié"
              description="Liez d'abord des comptes teen pour gérer leur budget."
              action={{ label: "Ajouter un teen", href: "/parent/teens/add" }}
            />
          )}
        </div>

        {/* Tips */}
        <Card className="mt-8 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border-emerald-500/20">
          <CardContent className="p-6">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-xl">💡</span> Conseils de gestion
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-zinc-900/80 rounded-xl border border-zinc-800">
                <p className="font-bold text-white mb-1">Commencez petit</p>
                <p className="text-xs text-zinc-400">Définissez un petit budget au début et ajustez selon l'utilisation</p>
              </div>
              <div className="p-4 bg-zinc-900/80 rounded-xl border border-zinc-800">
                <p className="font-bold text-white mb-1">Approbation pour les gros achats</p>
                <p className="text-xs text-zinc-400">Gardez l'approbation manuelle pour les events coûteux</p>
              </div>
              <div className="p-4 bg-zinc-900/80 rounded-xl border border-zinc-800">
                <p className="font-bold text-white mb-1">Vérifiez régulièrement</p>
                <p className="text-xs text-zinc-400">Consultez les dépenses chaque semaine</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
