"use client"

import { motion } from "framer-motion"
import {
  Target,
  Trophy,
  Flame,
  Zap,
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type MissionStats,
  type MissionWithProgress,
  MISSION_TYPE_CONFIG,
} from "../../features/missions/schema"

/* ==========================================================================
   MISSION STATS OVERVIEW
   ========================================================================== */

interface MissionStatsOverviewProps {
  stats: MissionStats
  className?: string
}

export function MissionStatsOverview({
  stats,
  className,
}: MissionStatsOverviewProps) {
  const statCards = [
    {
      label: "Missions complétées",
      value: stats.total_completed,
      icon: CheckCircle,
      color: "text-green-400",
      bgColor: "bg-green-500/20",
    },
    {
      label: "XP gagnés",
      value: formatNumber(stats.total_xp_earned),
      icon: Zap,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20",
    },
    {
      label: "Streak actuel",
      value: `${stats.current_daily_streak}j`,
      icon: Flame,
      color: "text-orange-400",
      bgColor: "bg-orange-500/20",
    },
    {
      label: "Taux de complétion",
      value: `${stats.completion_rate}%`,
      icon: Target,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/20",
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
          <div className="flex items-center gap-3 mb-2">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                stat.bgColor
              )}
            >
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
          </div>
          <p className={cn("text-2xl font-black", stat.color)}>{stat.value}</p>
          <p className="text-sm text-zinc-500 mt-1">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  )
}

/* ==========================================================================
   DAILY PROGRESS CARD
   ========================================================================== */

interface DailyProgressCardProps {
  missions: MissionWithProgress[]
  className?: string
}

export function DailyProgressCard({
  missions,
  className,
}: DailyProgressCardProps) {
  const dailyMissions = missions.filter((m) => m.type === "daily")
  const completed = dailyMissions.filter(
    (m) => m.status === "completed" || m.status === "claimed"
  ).length
  const total = dailyMissions.length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  const allCompleted = completed === total && total > 0

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "relative overflow-hidden rounded-2xl p-6",
        "bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800",
        "border",
        allCompleted ? "border-green-500/50" : "border-zinc-800",
        className
      )}
    >
      {/* Background */}
      <div className="absolute top-0 right-0 w-48 h-48 opacity-10">
        <div className="absolute inset-0 rounded-full blur-3xl bg-gradient-to-br from-green-400 to-emerald-500" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">Missions du jour</h3>
              <p className="text-sm text-zinc-500">
                {completed}/{total} complétées
              </p>
            </div>
          </div>

          {allCompleted && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 px-3 py-1 bg-green-500/20 rounded-full"
            >
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-green-400">Terminé !</span>
            </motion.div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full",
                allCompleted
                  ? "bg-gradient-to-r from-green-400 to-emerald-500"
                  : "bg-gradient-to-r from-green-400 to-emerald-500"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Mini Progress Dots */}
        <div className="flex gap-2">
          {dailyMissions.map((mission, index) => {
            const isComplete =
              mission.status === "completed" || mission.status === "claimed"
            return (
              <motion.div
                key={mission.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "flex-1 h-2 rounded-full",
                  isComplete
                    ? "bg-green-500"
                    : mission.progress_percentage > 0
                    ? "bg-green-500/30"
                    : "bg-zinc-700"
                )}
              />
            )
          })}
        </div>

        {/* Reward Preview */}
        {!allCompleted && total > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <p className="text-sm text-zinc-500">
              Complète toutes les missions pour{" "}
              <span className="text-yellow-400 font-bold">
                +{dailyMissions.reduce((sum, m) => sum + m.xp_reward, 0)} XP
              </span>
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   MISSION STREAK DISPLAY
   ========================================================================== */

interface MissionStreakDisplayProps {
  currentStreak: number
  bestStreak: number
  className?: string
}

export function MissionStreakDisplay({
  currentStreak,
  bestStreak,
  className,
}: MissionStreakDisplayProps) {
  const streakLevel =
    currentStreak >= 30
      ? "legendary"
      : currentStreak >= 14
      ? "epic"
      : currentStreak >= 7
      ? "rare"
      : "common"

  const streakConfig = {
    common: {
      gradient: "from-yellow-400 to-orange-500",
      glow: "shadow-yellow-500/25",
      label: "Débutant",
    },
    rare: {
      gradient: "from-orange-400 to-red-500",
      glow: "shadow-orange-500/25",
      label: "En feu !",
    },
    epic: {
      gradient: "from-red-400 to-pink-500",
      glow: "shadow-red-500/25",
      label: "Infernal !",
    },
    legendary: {
      gradient: "from-purple-400 to-pink-500",
      glow: "shadow-purple-500/25",
      label: "Légendaire !",
    },
  }

  const config = streakConfig[streakLevel]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-2xl p-6",
        "bg-zinc-900 border border-zinc-800",
        className
      )}
    >
      <div className="flex items-center gap-6">
        {/* Flame Icon */}
        <motion.div
          className={cn(
            "relative w-20 h-20 rounded-2xl flex items-center justify-center",
            `bg-gradient-to-br ${config.gradient}`,
            `shadow-lg ${config.glow}`
          )}
          animate={
            currentStreak > 0
              ? {
                  scale: [1, 1.05, 1],
                }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Flame className="w-10 h-10 text-white" />
          {currentStreak >= 7 && (
            <motion.div
              className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center"
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <span className="text-xs">🔥</span>
            </motion.div>
          )}
        </motion.div>

        {/* Stats */}
        <div className="flex-1">
          <p className="text-sm text-zinc-500 mb-1">Streak actuel</p>
          <div className="flex items-baseline gap-2 mb-2">
            <span
              className={cn(
                "text-4xl font-black bg-gradient-to-r bg-clip-text text-transparent",
                config.gradient
              )}
            >
              {currentStreak}
            </span>
            <span className="text-zinc-500">jours</span>
          </div>
          <p className={cn("text-sm font-medium", `text-gradient-to-r ${config.gradient}`)}>
            {config.label}
          </p>
        </div>

        {/* Best Streak */}
        <div className="text-center">
          <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{bestStreak}</p>
          <p className="text-xs text-zinc-500">Record</p>
        </div>
      </div>

      {/* Next Milestone */}
      {currentStreak > 0 && currentStreak < 30 && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">
              Prochain palier:{" "}
              <span className="text-white font-medium">
                {currentStreak < 7
                  ? "7 jours"
                  : currentStreak < 14
                  ? "14 jours"
                  : "30 jours"}
              </span>
            </span>
            <span className="text-cyan-400">
              {currentStreak < 7
                ? 7 - currentStreak
                : currentStreak < 14
                ? 14 - currentStreak
                : 30 - currentStreak}{" "}
              jours restants
            </span>
          </div>
        </div>
      )}
    </motion.div>
  )
}

/* ==========================================================================
   MISSIONS BY TYPE SUMMARY
   ========================================================================== */

interface MissionsByTypeSummaryProps {
  stats: MissionStats
  className?: string
}

export function MissionsByTypeSummary({
  stats,
  className,
}: MissionsByTypeSummaryProps) {
  const types = [
    {
      type: "daily" as const,
      count: stats.daily_completed,
    },
    {
      type: "weekly" as const,
      count: stats.weekly_completed,
    },
    {
      type: "monthly" as const,
      count: stats.monthly_completed,
    },
    {
      type: "seasonal" as const,
      count: stats.seasonal_completed,
    },
  ]

  return (
    <div className={cn("grid grid-cols-4 gap-3", className)}>
      {types.map(({ type, count }) => {
        const config = MISSION_TYPE_CONFIG[type]
        return (
          <div
            key={type}
            className="bg-zinc-800/50 rounded-xl p-3 text-center"
          >
            <div
              className={cn(
                "w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center",
                `bg-gradient-to-br ${config.gradient}`
              )}
            >
              <span className="text-white text-sm font-bold">
                {config.shortLabel.charAt(0)}
              </span>
            </div>
            <p className="text-lg font-bold text-white">{count}</p>
            <p className="text-xs text-zinc-500">{config.shortLabel}</p>
          </div>
        )
      })}
    </div>
  )
}

/* ==========================================================================
   UPCOMING MISSIONS WIDGET
   ========================================================================== */

interface UpcomingMissionsWidgetProps {
  missions: MissionWithProgress[]
  onViewAll?: () => void
  className?: string
}

export function UpcomingMissionsWidget({
  missions,
  onViewAll,
  className,
}: UpcomingMissionsWidgetProps) {
  // Get missions close to completion
  const almostComplete = missions
    .filter((m) => m.status === "active" && m.progress_percentage >= 50)
    .sort((a, b) => b.progress_percentage - a.progress_percentage)
    .slice(0, 3)

  if (almostComplete.length === 0) return null

  return (
    <div
      className={cn(
        "bg-zinc-900 border border-zinc-800 rounded-2xl p-4",
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-white">Presque terminées</h3>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-cyan-400 hover:text-cyan-300"
          >
            Voir tout
          </button>
        )}
      </div>

      <div className="space-y-3">
        {almostComplete.map((mission) => {
          const config = MISSION_TYPE_CONFIG[mission.type]
          return (
            <div
              key={mission.id}
              className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded-xl"
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  `bg-gradient-to-br ${config.gradient}`
                )}
              >
                <span className="text-white font-bold">
                  {mission.progress_percentage}%
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{mission.name}</p>
                <p className="text-xs text-zinc-500">
                  {mission.current_progress}/{mission.target_count}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-bold text-yellow-400">
                  {mission.xp_reward}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M"
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K"
  }
  return num.toString()
}
