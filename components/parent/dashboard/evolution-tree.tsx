"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { TrendingUp, Award, Brain, Users, Heart, Sparkles, Shield, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { BentoCard } from "@/components/ui/bento-grid"

interface EvolutionTreeProps {
  teenName: string
  stats: {
    responsibility: number
    social: number
    creativity: number
    academic: number
  }
}

export function EvolutionTree({ teenName, stats }: EvolutionTreeProps) {
  const metrics = [
    { label: "Responsabilité", value: stats.responsibility, icon: Shield, color: "var(--gen-z-teal)", description: "Fiabilité & Engagement" },
    { label: "Social", value: stats.social, icon: Users, color: "var(--brand-soft)", description: "Crew & Community" },
    { label: "Créativité", value: stats.creativity, icon: Zap, color: "var(--accent-soft)", description: "Projets & Innovation" },
    { label: "Académie", value: stats.academic, icon: Brain, color: "var(--gen-z-lime)", description: "Quêtes de savoir" },
  ]

  return (
    <BentoCard cols={12} rows={1} variant="glass" tiltIntensity={3} className="border-white/5 shadow-2xl">
      <div className="flex flex-col gap-10 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gen-z-lime/10 flex items-center justify-center border border-gen-z-lime/20 shadow-inner">
              <TrendingUp className="h-7 w-7 text-gen-z-lime" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">Evolution Hub : {teenName}</h3>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Real-time skill mapping</p>
            </div>
          </div>
          <div className="hidden md:flex gap-2">
            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase text-zinc-400">
              Week #4 Analysis
            </div>
          </div>
        </div>

        {/* Tree Visualization (Simplified for 2026 aesthetics) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          {/* Connecting lines (Decoration) */}
          <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent hidden md:block" />
          
          {metrics.map((metric, idx) => (
            <motion.div 
              key={metric.label} 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="relative group flex flex-col items-center text-center space-y-4"
            >
              <div className="relative">
                {/* Glow ring */}
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 4, repeat: Infinity, delay: idx * 0.5 }}
                  className="absolute inset-0 rounded-full blur-xl"
                  style={{ backgroundColor: metric.color }}
                />
                
                <div className="relative w-20 h-20 rounded-full bg-zinc-900 border-4 border-zinc-950 flex items-center justify-center shadow-2xl z-10">
                  <metric.icon className="h-8 w-8" style={{ color: metric.color }} />
                </div>
                
                {/* Percentage circle */}
                <svg className="absolute inset-0 w-20 h-20 -rotate-90 z-20">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - metric.value / 100)}`}
                    className="transition-all duration-1000 ease-out"
                    style={{ color: metric.color }}
                  />
                </svg>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-black text-white uppercase tracking-widest">{metric.label}</span>
                <p className="text-[10px] text-zinc-500 font-medium leading-tight max-w-[120px]">{metric.description}</p>
                <div className="pt-2">
                  <span className="text-2xl font-black italic tracking-tighter" style={{ color: metric.color }}>{metric.value}%</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* AI Insight Box */}
        <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 backdrop-blur-xl flex flex-col md:flex-row items-center gap-6">
          <div className="w-12 h-12 rounded-full bg-brand-soft/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-brand-soft" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <p className="text-sm text-zinc-300 font-medium leading-relaxed italic">
              "AI ANALYST: {teenName} a débloqué le succès 'Team Leader' hier. Sa stat Sociale est à son maximum. Suggérez-lui un défi de 'Responsabilité' pour débloquer le prochain palier de top-up."
            </p>
          </div>
          <button className="px-6 py-3 rounded-xl bg-white text-black font-black text-xs uppercase tracking-widest hover:scale-105 transition-all">
            Action: Lancer Défi
          </button>
        </div>
      </div>
    </BentoCard>
  )
}
