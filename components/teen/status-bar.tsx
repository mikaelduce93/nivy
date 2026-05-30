"use client"

import { motion } from "framer-motion"
import { Flame, Coins, Zap, TrendingUp } from "lucide-react"
import { useGamification } from "@/lib/hooks/use-gamification"
import { cn } from "@/lib/utils"

interface StatusBarProps {
  teenId?: string
  initialData?: {
    level?: number
    xp?: number
    xpToNext?: number
    streak?: number
    coins?: number
  }
}

export function StatusBar({ teenId, initialData }: StatusBarProps) {
  const { xp, streak, loading } = useGamification({ teenId })

  const level = xp?.level ?? initialData?.level ?? 1
  const currentXp = xp?.total_xp ?? initialData?.xp ?? 0
  const xpToNext = xp?.xp_to_next_level ?? initialData?.xpToNext ?? 100
  const currentStreak = streak?.current_streak ?? initialData?.streak ?? 0
  const coins = initialData?.coins ?? 0

  // Calculate progress percentage
  const progressPercent = xpToNext > 0 ? Math.min(100, Math.round((currentXp % xpToNext) / xpToNext * 100)) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-40 w-full"
    >
      {/* Glass container */}
      <div className="relative mx-auto max-w-[1600px] px-4">
        <div className="flex items-center justify-between gap-4 py-3 px-4 rounded-b-2xl bg-ink/60  border-x border-b border-ink">
          
          {/* Level & XP Progress */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <motion.div
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-soft to-info-soft flex items-center justify-center font-black text-ink text-sm shadow-lg"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                {level}
              </motion.div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-success-soft flex items-center justify-center">
                <TrendingUp className="w-2.5 h-2.5 text-ink" />
              </div>
            </div>
            
            <div className="hidden sm:flex flex-col gap-1">
              <span className="text-[10px] font-bold text-mute uppercase tracking-wider">
                Level {level}
              </span>
              <div className="w-24 h-1.5 bg-card rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-brand-soft to-info-soft rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Streak */}
            <motion.div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all",
                currentStreak > 0 
                  ? "bg-coral/10 border border-coral/20" 
                  : "bg-card"
              )}
              whileHover={{ scale: 1.05 }}
            >
              <Flame 
                className={cn(
                  "w-4 h-4",
                  currentStreak > 0 ? "text-coral" : "text-mute"
                )} 
              />
              <span className={cn(
                "font-black text-sm",
                currentStreak > 0 ? "text-coral" : "text-mute"
              )}>
                {currentStreak}
              </span>
            </motion.div>

            {/* XP */}
            <motion.div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-soft/10 border border-brand-soft/20"
              whileHover={{ scale: 1.05 }}
            >
              <Zap className="w-4 h-4 text-brand-soft fill-current" />
              <span className="font-black text-sm text-brand-soft">
                {currentXp.toLocaleString()}
              </span>
            </motion.div>

            {/* Coins */}
            <motion.div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gold/10 border border-gold/20"
              whileHover={{ scale: 1.05 }}
            >
              <Coins className="w-4 h-4 text-gold" />
              <span className="font-black text-sm text-gold">
                {coins.toLocaleString()}
              </span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Subtle glow effect */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-soft/30 to-transparent" />
    </motion.div>
  )
}

// Server-friendly wrapper that accepts serialized data
export function StatusBarServer({ 
  level, 
  xp, 
  xpToNext,
  streak, 
  coins,
  teenId
}: { 
  level: number
  xp: number
  xpToNext: number
  streak: number
  coins: number
  teenId?: string
}) {
  return (
    <StatusBar 
      teenId={teenId}
      initialData={{ level, xp, xpToNext, streak, coins }} 
    />
  )
}
