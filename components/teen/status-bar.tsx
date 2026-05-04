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
        <div className="flex items-center justify-between gap-4 py-3 px-4 rounded-b-2xl bg-black/60 backdrop-blur-xl border-x border-b border-white/10">
          
          {/* Level & XP Progress */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <motion.div
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-gen-z-lavender to-gen-z-sky flex items-center justify-center font-black text-black text-sm shadow-lg"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                {level}
              </motion.div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gen-z-mint flex items-center justify-center">
                <TrendingUp className="w-2.5 h-2.5 text-black" />
              </div>
            </div>
            
            <div className="hidden sm:flex flex-col gap-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Level {level}
              </span>
              <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-gen-z-lavender to-gen-z-sky rounded-full"
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
                  ? "bg-orange-500/10 border border-orange-500/20" 
                  : "bg-zinc-800/50"
              )}
              whileHover={{ scale: 1.05 }}
            >
              <Flame 
                className={cn(
                  "w-4 h-4",
                  currentStreak > 0 ? "text-orange-500" : "text-zinc-500"
                )} 
              />
              <span className={cn(
                "font-black text-sm",
                currentStreak > 0 ? "text-orange-500" : "text-zinc-500"
              )}>
                {currentStreak}
              </span>
            </motion.div>

            {/* XP */}
            <motion.div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gen-z-lavender/10 border border-gen-z-lavender/20"
              whileHover={{ scale: 1.05 }}
            >
              <Zap className="w-4 h-4 text-gen-z-lavender fill-current" />
              <span className="font-black text-sm text-gen-z-lavender">
                {currentXp.toLocaleString()}
              </span>
            </motion.div>

            {/* Coins */}
            <motion.div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20"
              whileHover={{ scale: 1.05 }}
            >
              <Coins className="w-4 h-4 text-yellow-500" />
              <span className="font-black text-sm text-yellow-500">
                {coins.toLocaleString()}
              </span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Subtle glow effect */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gen-z-lavender/30 to-transparent" />
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
