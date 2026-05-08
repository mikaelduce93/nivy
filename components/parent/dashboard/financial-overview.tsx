"use client"

import { TrendingUp, TrendingDown, AlertTriangle, CreditCard, PieChart } from "lucide-react"
import { EnergyOrb } from "@/components/ui/energy-orb"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

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
  currency = "DH"
}: FinancialOverviewProps) {
  const spendingProgress = budgetLimit > 0 ? (monthlySpending / budgetLimit) * 100 : 0
  const isOverBudget = monthlySpending > budgetLimit && budgetLimit > 0
  
  // Calculate trend percentage
  const trend = previousMonthSpending > 0 
    ? ((monthlySpending - previousMonthSpending) / previousMonthSpending) * 100 
    : 0

  const sortedCategories = Object.entries(spendingByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4) // Top 4 categories

  return (
    <div className="p-8 md:p-12 space-y-10 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start gap-8 flex-1">
        <div className="space-y-8 flex-1">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-2xl">
              <CreditCard className="h-7 w-7 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-3xl font-black text-white tracking-tighter">Pilotage Financier</h3>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Vue d'ensemble en temps réel</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10">
            <div className="space-y-2">
              <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Dépenses du mois</p>
              <p className="text-5xl font-black text-white tracking-tighter">
                {monthlySpending.toLocaleString()} <span className="text-xl text-zinc-600 font-bold">{currency}</span>
              </p>
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-lg",
                  trend > 0 ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                )}
              >
                {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(trend).toFixed(1)}% vs mois dernier
              </motion.div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Prévision</p>
              <p className="text-5xl font-black text-white/40 tracking-tighter italic">
                {forecast.toLocaleString()} <span className="text-xl font-bold">{currency}</span>
              </p>
              <p className="text-xs font-black text-zinc-700 uppercase tracking-widest">Estimation fin de mois</p>
            </div>
          </div>
        </div>

        {/* Circular Liquid Gauge */}
        <div className="flex flex-col items-center gap-6">
          <EnergyOrb 
            value={spendingProgress} 
            max={100} 
            size={220} 
            color={isOverBudget ? "var(--accent-soft)" : "var(--gen-z-teal)"}
          >
            <div className="flex flex-col items-center">
              <span className="text-4xl font-black text-white leading-none tracking-tighter">
                {Math.round(spendingProgress)}%
              </span>
              <span className="text-xs font-black text-zinc-500 uppercase tracking-widest mt-2">CAPACITÉ</span>
            </div>
          </EnergyOrb>
          
          <AnimatePresence>
            {isOverBudget && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 shadow-2xl"
              >
                <AlertTriangle className="h-4 w-4 motion-safe:animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest">Dépassement Budget</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Category Breakdown - Elite Style */}
      <div className="space-y-8 pt-12 border-t border-white/5 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
              <PieChart className="h-5 w-5 text-purple-400" />
            </div>
            <h4 className="text-sm font-black text-white uppercase tracking-widest">Analyse par Catégorie</h4>
          </div>
          <span className="text-xs font-black text-zinc-600 uppercase tracking-widest">Top 4</span>
        </div>
        
        <div className="grid md:grid-cols-2 gap-x-16 gap-y-8">
          {sortedCategories.length > 0 ? (
            sortedCategories.map(([category, amount], idx) => (
              <motion.div 
                key={category} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx }}
                className="space-y-3 group cursor-default"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-zinc-500 uppercase tracking-widest group-hover:text-white transition-colors duration-300">
                    {category.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-black text-white tabular-nums">
                    {amount.toLocaleString()} <span className="text-zinc-600 text-xs">{currency}</span>
                  </span>
                </div>
                <div className="h-2 w-full bg-white/[0.03] rounded-full overflow-hidden border border-white/5 p-[1px]">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(amount / monthlySpending) * 100}%` }}
                    transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.2 + idx * 0.1 }}
                    className="h-full bg-gradient-to-r from-purple-500/40 via-indigo-500/60 to-purple-500/40 rounded-full group-hover:opacity-100 opacity-70 transition-opacity" 
                  />
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-2 py-10 flex flex-col items-center justify-center bg-white/[0.01] rounded-[2rem] border border-dashed border-white/5">
              <p className="text-xs text-zinc-700 font-black uppercase tracking-widest">En attente de données</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
