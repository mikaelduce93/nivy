"use client"

import { motion } from "framer-motion"
import {
  Zap,
  RotateCw,
  Flame,
  Crown,
  TrendingUp,
  Trophy,
  Target,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type WheelStats,
  type SpinHistoryEntry,
  WHEEL_REWARD_CONFIG,
  formatWheelReward,
  getStreakBonus,
} from "../../features/wheel/schema"

/* ==========================================================================
   WHEEL STATS OVERVIEW
   ========================================================================== */

interface WheelStatsOverviewProps {
  stats: WheelStats
  className?: string
}

export function WheelStatsOverview({ stats, className }: WheelStatsOverviewProps) {
  const streakBonus = getStreakBonus(stats.current_streak)

  const statCards = [
    {
      label: "Spins totaux",
      value: stats.total_spins,
      icon: RotateCw,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/20",
    },
    {
      label: "XP gagnés",
      value: stats.total_xp_earned.toLocaleString(),
      icon: Zap,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20",
    },
    {
      label: "Streak actuel",
      value: `${stats.current_streak}j`,
      icon: Flame,
      color: "text-orange-400",
      bgColor: "bg-orange-500/20",
      subtitle: `+${streakBonus.bonusPercent}% bonus`,
    },
    {
      label: "Jackpots gagnés",
      value: stats.jackpots_won,
      icon: Crown,
      color: "text-purple-400",
      bgColor: "bg-purple-500/20",
    },
  ]

  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
        >
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", stat.bgColor)}>
            <stat.icon className={cn("w-5 h-5", stat.color)} />
          </div>
          <p className={cn("text-2xl font-black", stat.color)}>{stat.value}</p>
          <p className="text-sm text-zinc-500">{stat.label}</p>
          {stat.subtitle && (
            <p className="text-xs text-zinc-400 mt-1">{stat.subtitle}</p>
          )}
        </motion.div>
      ))}
    </div>
  )
}

/* ==========================================================================
   STREAK DISPLAY
   ========================================================================== */

interface WheelStreakDisplayProps {
  currentStreak: number
  bestStreak: number
  multiplier: number
  className?: string
}

export function WheelStreakDisplay({
  currentStreak,
  bestStreak,
  multiplier,
  className,
}: WheelStreakDisplayProps) {
  const streakBonus = getStreakBonus(currentStreak)
  const progressToNext = currentStreak > 0
    ? ((currentStreak % 7) / 7) * 100
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "bg-gradient-to-br from-orange-500/10 to-red-500/10",
        "border border-orange-500/30 rounded-2xl p-6",
        className
      )}
    >
      <div className="flex items-center gap-6">
        {/* Flame Icon */}
        <motion.div
          className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center"
          animate={
            currentStreak > 0
              ? { scale: [1, 1.05, 1] }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Flame className="w-10 h-10 text-white" />
          {currentStreak >= 7 && (
            <motion.span
              className="absolute -top-2 -right-2 text-2xl"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              🔥
            </motion.span>
          )}
        </motion.div>

        {/* Stats */}
        <div className="flex-1">
          <p className="text-sm text-zinc-500 mb-1">Streak actuel</p>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-black text-orange-400">
              {currentStreak}
            </span>
            <span className="text-zinc-500">jours</span>
          </div>

          {/* Multiplier */}
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-green-400 font-medium">
              ×{multiplier.toFixed(2)} bonus XP
            </span>
          </div>
        </div>

        {/* Best Streak */}
        <div className="text-center">
          <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{bestStreak}</p>
          <p className="text-xs text-zinc-500">Record</p>
        </div>
      </div>

      {/* Progress to next milestone */}
      {currentStreak > 0 && currentStreak < 30 && (
        <div className="mt-4 pt-4 border-t border-orange-500/20">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-400">
              Prochain palier: <span className="text-white">{streakBonus.nextMilestone} jours</span>
            </span>
            <span className="text-orange-400">
              {streakBonus.nextMilestone - currentStreak} jours restants
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressToNext}%` }}
            />
          </div>
        </div>
      )}
    </motion.div>
  )
}

/* ==========================================================================
   SPIN HISTORY
   ========================================================================== */

interface SpinHistoryListProps {
  history: SpinHistoryEntry[]
  className?: string
}

export function SpinHistoryList({ history, className }: SpinHistoryListProps) {
  if (history.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <RotateCw className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-500">Aucun spin pour le moment</p>
        <p className="text-sm text-zinc-600">Tourne la roue pour commencer !</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {history.map((entry, index) => {
        const config = WHEEL_REWARD_CONFIG[entry.reward_type]
        const isToday = new Date(entry.spun_at).toDateString() === new Date().toDateString()

        return (
          <motion.div
            key={entry.spin_id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "flex items-center gap-4 p-3 rounded-xl",
              "bg-zinc-800/50 border border-zinc-700/50"
            )}
          >
            {/* Color indicator */}
            <div
              className="w-3 h-12 rounded-full"
              style={{ backgroundColor: entry.segment_color }}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn("font-bold", config.color)}>
                  {entry.segment_name}
                </span>
                {isToday && (
                  <span className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full">
                    Aujourd'hui
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-500">
                {formatWheelReward(entry.reward_type, entry.reward_value)}
              </p>
            </div>

            {/* XP & Time */}
            <div className="text-right">
              {entry.xp_earned > 0 && (
                <div className="flex items-center gap-1 text-yellow-400">
                  <Zap className="w-4 h-4" />
                  <span className="font-bold">+{entry.xp_earned}</span>
                </div>
              )}
              <p className="text-xs text-zinc-500">
                {formatRelativeTime(entry.spun_at)}
              </p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

/* ==========================================================================
   JACKPOT DISPLAY
   ========================================================================== */

interface JackpotDisplayProps {
  amount: number
  minPool: number
  isWinnable: boolean
  className?: string
}

export function JackpotDisplay({
  amount,
  minPool,
  isWinnable,
  className,
}: JackpotDisplayProps) {
  const progressPercent = Math.min(100, (amount / minPool) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-2xl p-6",
        "bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10",
        "border",
        isWinnable ? "border-yellow-500/50" : "border-yellow-500/20",
        className
      )}
    >
      {/* Animated background */}
      {isWinnable && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">Jackpot</h3>
              <p className="text-sm text-zinc-500">
                {isWinnable ? "Peut être gagné !" : `Minimum: ${minPool.toLocaleString()} XP`}
              </p>
            </div>
          </div>

          {isWinnable && (
            <motion.span
              className="px-3 py-1 bg-yellow-500 text-black text-sm font-bold rounded-full"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ACTIF
            </motion.span>
          )}
        </div>

        {/* Amount */}
        <div className="text-center mb-4">
          <motion.p
            className="text-5xl font-black text-yellow-400"
            animate={isWinnable ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {amount.toLocaleString()}
          </motion.p>
          <p className="text-yellow-400/60 font-medium">XP</p>
        </div>

        {/* Progress bar */}
        {!isWinnable && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-500">Progression</span>
              <span className="text-yellow-400">{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   WHEEL WIDGET (for dashboard)
   ========================================================================== */

interface WheelWidgetProps {
  canSpinDaily: boolean
  bonusSpins: number
  currentStreak: number
  nextSpinIn: string | null
  onNavigate?: () => void
  className?: string
}

export function WheelWidget({
  canSpinDaily,
  bonusSpins,
  currentStreak,
  nextSpinIn,
  onNavigate,
  className,
}: WheelWidgetProps) {
  const canSpin = canSpinDaily || bonusSpins > 0

  return (
    <motion.div
      onClick={onNavigate}
      className={cn(
        "relative overflow-hidden rounded-2xl p-4 transition-all",
        "bg-gradient-to-br from-cyan-500/10 to-purple-500/10",
        "border border-cyan-500/30",
        onNavigate && "cursor-pointer hover:border-cyan-500/50",
        className
      )}
      whileHover={onNavigate ? { scale: 1.02 } : {}}
    >
      <div className="flex items-center gap-4">
        {/* Wheel Icon */}
        <motion.div
          className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center",
            canSpin
              ? "bg-gradient-to-br from-cyan-500 to-purple-500"
              : "bg-zinc-700"
          )}
          animate={canSpin ? { rotate: [0, 10, -10, 0] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <RotateCw className="w-7 h-7 text-white" />
        </motion.div>

        {/* Content */}
        <div className="flex-1">
          <h4 className="font-bold text-white">Roue de la Fortune</h4>
          {canSpin ? (
            <p className="text-sm text-cyan-400">
              {canSpinDaily ? "Spin quotidien disponible !" : `${bonusSpins} spin bonus`}
            </p>
          ) : (
            <p className="text-sm text-zinc-500">
              Prochain spin dans {nextSpinIn || "..."}
            </p>
          )}
        </div>

        {/* Streak */}
        {currentStreak > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 rounded-lg">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-bold text-orange-400">{currentStreak}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 60) return `Il y a ${minutes}m`
  if (hours < 24) return `Il y a ${hours}h`
  if (days < 7) return `Il y a ${days}j`
  return date.toLocaleDateString("fr-FR")
}
