"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { TrendingUp, Award, Brain, Users, Heart } from "lucide-react"

interface EvolutionTrackerProps {
  teenName: string
  stats: {
    responsibility: number | null
    social: number | null
    creativity: number | null
    academic: number | null
  }
}

export function EvolutionTracker({ teenName, stats }: EvolutionTrackerProps) {
  const metrics = [
    { label: "Responsabilité", value: stats.responsibility, icon: Award, color: "var(--gen-z-teal)" },
    { label: "Vie Sociale", value: stats.social, icon: Users, color: "var(--brand-soft)" },
    { label: "Créativité", value: stats.creativity, icon: Heart, color: "var(--accent-soft)" },
    { label: "Académie", value: stats.academic, icon: Brain, color: "var(--gen-z-lime)" },
  ]

  return (
    <div className="rounded-[2.5rem] bg-white/5 backdrop-blur-2xl border border-white/10 p-8 shadow-2xl">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gen-z-lime/10 flex items-center justify-center border border-gen-z-lime/20">
              <TrendingUp className="h-5 w-5 text-gen-z-lime" />
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">Evolution de {teenName}</h3>
          </div>
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Weekly Analysis</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {metrics.map((metric, idx) => {
            const hasValue = typeof metric.value === "number"
            const displayValue = hasValue ? (metric.value as number) : 0
            return (
              <div key={metric.label} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <metric.icon className="h-3 w-3" style={{ color: metric.color }} />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{metric.label}</span>
                  </div>
                  <span className="text-xs font-black text-white">{hasValue ? `${displayValue}%` : "—"}</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden p-[1px]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${displayValue}%` }}
                    transition={{ duration: 1.5, ease: "circOut", delay: idx * 0.1 }}
                    className="h-full rounded-full opacity-80 shadow-[0_0_10px_-2px_currentColor]"
                    style={{ backgroundColor: metric.color, color: metric.color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
