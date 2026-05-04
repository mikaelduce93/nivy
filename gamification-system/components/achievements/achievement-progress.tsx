"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { Trophy, Zap, Star, Award } from "lucide-react"
import { cn } from "@/lib/utils"
import { RARITY_CONFIG, type AchievementRarity } from "../../features/achievements/schema"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface AchievementProgressOverviewProps {
  total: number
  unlocked: number
  pointsTotal?: number
  pointsEarned?: number
  byRarity?: Record<AchievementRarity, { total: number; unlocked: number }>
  className?: string
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export function AchievementProgressOverview({
  total,
  unlocked,
  pointsTotal = 0,
  pointsEarned = 0,
  byRarity,
  className,
}: AchievementProgressOverviewProps) {
  const percentage = total > 0 ? (unlocked / total) * 100 : 0
  const pointsPercentage = pointsTotal > 0 ? (pointsEarned / pointsTotal) * 100 : 0

  return (
    <div className={cn("bg-zinc-900 rounded-2xl p-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl">
            <Trophy className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Progression</h3>
            <p className="text-sm text-zinc-500">Tes achievements</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-2xl font-black text-white">
            {unlocked}
            <span className="text-zinc-500 text-lg font-normal">/{total}</span>
          </p>
          <p className="text-sm text-zinc-500">{Math.round(percentage)}% complété</p>
        </div>
      </div>

      {/* Main Progress Bar */}
      <div className="mb-6">
        <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full relative"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            />
          </motion.div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Achievements Stats */}
        <div className="bg-zinc-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-zinc-400">Débloqués</span>
          </div>
          <p className="text-xl font-bold text-white">{unlocked}</p>
          <p className="text-xs text-zinc-500">{total - unlocked} restants</p>
        </div>

        {/* Points Stats */}
        <div className="bg-zinc-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-zinc-400">Points</span>
          </div>
          <p className="text-xl font-bold text-cyan-400">{pointsEarned}</p>
          <p className="text-xs text-zinc-500">/{pointsTotal} pts</p>
        </div>
      </div>

      {/* Rarity Breakdown */}
      {byRarity && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-zinc-400 mb-3">Par rareté</h4>
          {(["mythic", "legendary", "epic", "rare", "common"] as const).map((rarity) => {
            const data = byRarity[rarity]
            if (!data || data.total === 0) return null

            const rarityPercentage = (data.unlocked / data.total) * 100

            return (
              <RarityProgressBar
                key={rarity}
                rarity={rarity}
                unlocked={data.unlocked}
                total={data.total}
                percentage={rarityPercentage}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   RARITY PROGRESS BAR
   ========================================================================== */

interface RarityProgressBarProps {
  rarity: AchievementRarity
  unlocked: number
  total: number
  percentage: number
}

function RarityProgressBar({
  rarity,
  unlocked,
  total,
  percentage,
}: RarityProgressBarProps) {
  const config = RARITY_CONFIG[rarity]

  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "text-xs font-medium w-20 truncate",
          config.labelColor
        )}
      >
        {config.label}
      </span>

      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", `bg-gradient-to-r ${config.gradient}`)}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, delay: 0.1 }}
        />
      </div>

      <span className="text-xs text-zinc-500 w-12 text-right">
        {unlocked}/{total}
      </span>
    </div>
  )
}

/* ==========================================================================
   COMPACT PROGRESS BADGE
   ========================================================================== */

interface AchievementProgressBadgeProps {
  total: number
  unlocked: number
  className?: string
}

export function AchievementProgressBadge({
  total,
  unlocked,
  className,
}: AchievementProgressBadgeProps) {
  const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-full",
        className
      )}
    >
      <Trophy className="w-4 h-4 text-yellow-400" />
      <span className="text-sm font-medium text-white">
        {unlocked}/{total}
      </span>
      <span className="text-xs text-zinc-500">({percentage}%)</span>
    </div>
  )
}

/* ==========================================================================
   CIRCULAR PROGRESS
   ========================================================================== */

interface CircularAchievementProgressProps {
  total: number
  unlocked: number
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
}

export function CircularAchievementProgress({
  total,
  unlocked,
  size = "md",
  showLabel = true,
  className,
}: CircularAchievementProgressProps) {
  const percentage = total > 0 ? (unlocked / total) * 100 : 0

  const sizeConfig = {
    sm: { size: 60, strokeWidth: 4, fontSize: "text-xs" },
    md: { size: 80, strokeWidth: 6, fontSize: "text-sm" },
    lg: { size: 120, strokeWidth: 8, fontSize: "text-lg" },
  }

  const config = sizeConfig[size]
  const radius = (config.size - config.strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={config.size}
        height={config.size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          fill="none"
          className="text-zinc-800"
        />

        {/* Progress circle */}
        <motion.circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          stroke="url(#achievementGradient)"
          strokeWidth={config.strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="achievementGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Trophy className={cn("text-cyan-400 mb-1", size === "sm" ? "w-4 h-4" : "w-5 h-5")} />
        {showLabel && (
          <span className={cn("font-bold text-white", config.fontSize)}>
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    </div>
  )
}

/* ==========================================================================
   NEXT ACHIEVEMENTS PREVIEW
   ========================================================================== */

interface NextAchievementsPreviewProps {
  achievements: Array<{
    id: string
    name: string
    icon: string
    rarity: AchievementRarity
    percentage_complete: number
  }>
  onViewAll?: () => void
  className?: string
}

export function NextAchievementsPreview({
  achievements,
  onViewAll,
  className,
}: NextAchievementsPreviewProps) {
  if (achievements.length === 0) {
    return null
  }

  return (
    <div className={cn("bg-zinc-900 rounded-2xl p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-zinc-400">Prochains à débloquer</h4>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Voir tous
          </button>
        )}
      </div>

      <div className="space-y-3">
        {achievements.slice(0, 3).map((achievement) => {
          const config = RARITY_CONFIG[achievement.rarity]

          return (
            <div key={achievement.id} className="flex items-center gap-3">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  "bg-zinc-800"
                )}
              >
                <Zap className="w-4 h-4 text-zinc-500" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{achievement.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", `bg-gradient-to-r ${config.gradient}`)}
                      style={{ width: `${achievement.percentage_complete}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500">
                    {Math.round(achievement.percentage_complete)}%
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
