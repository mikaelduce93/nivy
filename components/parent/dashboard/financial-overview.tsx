"use client"

import { TrendingUp, TrendingDown, AlertTriangle, CreditCard, PieChart } from "lucide-react"
import { SegmentedProgress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface FinancialOverviewProps {
  monthlySpending: number
  budgetLimit: number
  previousMonthSpending: number
  forecast: number
  spendingByCategory: Record<string, number>
  currency?: string
}

export function FinancialOverview({
  monthlySpending,
  budgetLimit,
  previousMonthSpending,
  forecast,
  spendingByCategory,
  currency = "DH",
}: FinancialOverviewProps) {
  const spendingProgress = budgetLimit > 0 ? (monthlySpending / budgetLimit) * 100 : 0
  const isOverBudget = monthlySpending > budgetLimit && budgetLimit > 0

  const trend = previousMonthSpending > 0
    ? ((monthlySpending - previousMonthSpending) / previousMonthSpending) * 100
    : 0

  const sortedCategories = Object.entries(spendingByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)

  const capacitySteps = 10
  const capacityCurrent = Math.min(capacitySteps, Math.round((spendingProgress / 100) * capacitySteps))

  return (
    <div className="flex h-full flex-col gap-7 p-6 sm:p-8">
      <div>
        <p className="flex items-center gap-2 eyebrow tracking-[0.16em]">
          <CreditCard className="size-4 text-lime" aria-hidden="true" />
          Pilotage
        </p>
        <h3 className="mt-1 font-display text-2xl font-extrabold tracking-tight">
          Pilotage <em className="font-semibold italic text-pink">financier</em>
        </h3>
      </div>

      {/* LE chiffre hero : dépenses du mois (domine) */}
      <div>
        <p className="eyebrow">Dépenses du mois</p>
        <p className="font-display text-4xl font-extrabold leading-none tabular-nums sm:text-5xl">
          {monthlySpending.toLocaleString("fr-FR")} <span className="font-mono text-lg font-medium text-mute sm:text-xl">{currency}</span>
        </p>
        {previousMonthSpending > 0 && (
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-0.5 font-mono text-xs font-bold uppercase tracking-[0.1em]">
            {trend > 0 ? <TrendingUp className="size-3 text-coral" aria-hidden="true" /> : <TrendingDown className="size-3 text-lime" aria-hidden="true" />}
            <span className={trend > 0 ? "text-coral" : "text-lime"}>{Math.abs(trend).toFixed(1)}% vs mois dernier</span>
          </span>
        )}
      </div>

      {/* Capacité budget — secondaire */}
      <div className="rounded-2xl border-2 border-ink bg-paper-2 p-4">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Capacité budget</p>
          <p className={cn("font-display text-2xl font-extrabold tabular-nums", isOverBudget ? "text-coral" : "text-teal")}>
            {Math.round(spendingProgress)}%
          </p>
        </div>
        <SegmentedProgress steps={capacitySteps} current={capacityCurrent} size="md" className="mt-2" />
        {isOverBudget && (
          <span className="mt-3 inline-flex items-center gap-2 rounded-xl border-2 border-destructive bg-danger-soft px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.1em] text-destructive">
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            Dépassement budget
          </span>
        )}
        {forecast > 0 && (
          <p className="mt-3 font-mono text-xs text-mute">
            Prévision fin de mois : <span className="font-bold text-ink">{forecast.toLocaleString("fr-FR")} {currency}</span>
          </p>
        )}
      </div>

      {/* Catégories */}
      <div className="space-y-4 border-t-2 border-dashed border-line pt-6">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 font-display font-bold">
            <PieChart className="size-4 text-pink" aria-hidden="true" />
            Analyse par catégorie
          </p>
          <span className="eyebrow">Top 4</span>
        </div>

        {sortedCategories.length > 0 ? (
          <div className="space-y-3">
            {sortedCategories.map(([category, amount]) => (
              <div key={category} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-mute">{category.replace("_", " ")}</span>
                  <span className="font-display text-sm font-bold tabular-nums">
                    {amount.toLocaleString("fr-FR")} <span className="text-mute">{currency}</span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full border-2 border-ink bg-paper-2">
                  <div
                    className="h-full rounded-full bg-pink"
                    style={{ width: `${monthlySpending > 0 ? (amount / monthlySpending) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-line py-8 text-center">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-mute">En attente de données</p>
          </div>
        )}
      </div>
    </div>
  )
}
