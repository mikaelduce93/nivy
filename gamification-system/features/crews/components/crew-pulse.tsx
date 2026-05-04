
'use client'

import { motion } from 'framer-motion'
import { Users, TrendingUp } from 'lucide-react'

export function CrewPulse({ currentXP, targetXP }: { currentXP: number, targetXP: number }) {
  const progress = Math.min(100, (currentXP / targetXP) * 100)
  
  return (
    <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-500/20 rounded-xl p-3 flex items-center gap-3 relative overflow-hidden">
      <div className="absolute inset-0 bg-green-500/5 animate-pulse" />
      
      <div className="bg-green-500/20 p-2 rounded-lg z-10">
        <Users className="w-4 h-4 text-green-400" />
      </div>
      
      <div className="flex-1 z-10">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold text-green-300">Objectif Crew</span>
          <span className="text-[10px] text-green-400 font-mono">{currentXP} / {targetXP} XP</span>
        </div>
        <div className="h-1.5 bg-green-950 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1 }}
            className="h-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]"
          />
        </div>
      </div>
      
      <div className="z-10">
        <TrendingUp className="w-4 h-4 text-green-500 opacity-50" />
      </div>
    </div>
  )
}



