"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Trophy, Coins, ChevronRight } from "lucide-react"
import Link from "next/link"

interface TeenCardProps {
  teen: {
    teen_id: string
    teen_name: string
    title: string
    level: number
    total_coins: number
  }
  budget: {
    spent: number
    limit: number
  }
  nextEvent?: {
    title: string
    date: string
  }
}

export function TeenCardEnhanced({ teen, budget, nextEvent }: TeenCardProps) {
  const budgetProgress = budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0
  const isOverBudget = budget.spent > budget.limit && budget.limit > 0

  return (
    <Link href={`/parent/teens/${teen.teen_id}`}>
      <div className="group relative p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/30 hover:bg-zinc-900/80 transition-all cursor-pointer">
        <div className="flex items-center gap-4 mb-4">
          {/* Avatar */}
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-emerald-500/10">
            {teen.teen_name?.charAt(0) || "?"}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-white group-hover:text-emerald-400 transition-colors">{teen.teen_name}</h4>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Trophy className="h-3 w-3 text-yellow-500" />
                    Lvl {teen.level}
                  </span>
                  <span>•</span>
                  <span>{teen.title}</span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800/50">
          {/* Budget Mini-View */}
          <div>
            <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
              <span>Budget</span>
              <span className={isOverBudget ? "text-red-400" : "text-emerald-400"}>
                {Math.round(budgetProgress)}%
              </span>
            </div>
            <Progress 
              value={Math.min(budgetProgress, 100)} 
              className={`h-1.5 ${isOverBudget ? "bg-red-900/20" : "bg-zinc-800"}`} 
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              {budget.spent} / {budget.limit || "∞"} DH
            </p>
          </div>

          {/* Gamification / Next Event */}
          <div className="flex flex-col justify-between">
            <div className="flex items-center justify-end gap-1.5 text-yellow-400">
              <span className="font-bold">{teen.total_coins.toLocaleString()}</span>
              <Coins className="h-3.5 w-3.5" />
            </div>
            {nextEvent ? (
              <div className="text-right">
                <p className="text-[10px] text-zinc-500 truncate max-w-[100px] ml-auto">
                  Prochain: {nextEvent.title}
                </p>
              </div>
            ) : (
               <p className="text-[10px] text-zinc-600 text-right italic">Aucun event</p>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}



