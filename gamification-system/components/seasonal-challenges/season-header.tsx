/**
 * TEENS PARTY MOROCCO - Season Header Component
 * ==============================================
 *
 * En-tête de saison avec statistiques.
 */

"use client"

import { motion } from "framer-motion"
import {
  Snowflake,
  Flower,
  Sun,
  Leaf,
  Trophy,
  Zap,
  Target,
  Calendar,
  Clock,
  Award,
} from "lucide-react"
import {
  type Season,
  type SeasonWithChallenges,
  SEASON_CONFIG,
  getDaysRemaining,
  formatTimeRemaining,
} from "../../features/seasonal-challenges"

/* ==========================================================================
   ICON MAPPING
   ========================================================================== */

const seasonIcons: Record<string, React.ReactNode> = {
  Snowflake: <Snowflake className="w-8 h-8" />,
  Flower: <Flower className="w-8 h-8" />,
  Sun: <Sun className="w-8 h-8" />,
  Leaf: <Leaf className="w-8 h-8" />,
}

/* ==========================================================================
   MAIN SEASON HEADER
   ========================================================================== */

interface SeasonHeaderProps {
  season: Season
  stats?: {
    total_challenges: number
    completed: number
    total_xp_earned: number
  }
}

export function SeasonHeader({ season, stats }: SeasonHeaderProps) {
  const seasonType = season.slug.split("_")[0] // 'winter', 'spring', etc.
  const config = SEASON_CONFIG[seasonType] || SEASON_CONFIG.winter
  const daysRemaining = getDaysRemaining(season.end_date)
  const completionPercentage = stats
    ? Math.round((stats.completed / stats.total_challenges) * 100)
    : 0

  return (
    <div
      className={`relative p-6 rounded-2xl bg-gradient-to-br ${config.gradient} border border-white/10 overflow-hidden`}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 opacity-10 scale-150">
        {seasonIcons[config.icon]}
      </div>

      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: `${config.color}20` }}
          >
            <span style={{ color: config.color }}>
              {seasonIcons[config.icon]}
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{season.name}</h2>
            <p className="text-zinc-400">{season.description}</p>
          </div>
        </div>

        {/* Time Remaining */}
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-zinc-400" />
          <span className="text-zinc-400">
            {daysRemaining > 0 ? (
              <>
                <span className="text-white font-bold">{daysRemaining}</span> jours restants
              </>
            ) : (
              "Saison terminée"
            )}
          </span>
        </div>

        {/* Stats */}
        {stats && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-black/20">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-zinc-400">Complétés</span>
                </div>
                <p className="text-xl font-bold text-white">
                  {stats.completed}/{stats.total_challenges}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-black/20">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-zinc-400">XP gagnés</span>
                </div>
                <p className="text-xl font-bold text-yellow-400">
                  {stats.total_xp_earned.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-black/20">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-zinc-400">Progression</span>
                </div>
                <p className="text-xl font-bold text-purple-400">
                  {completionPercentage}%
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="h-3 bg-black/30 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercentage}%` }}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${config.color}, ${config.color}80)`,
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ==========================================================================
   COMPACT SEASON BADGE
   ========================================================================== */

interface SeasonBadgeProps {
  season: Season
  size?: "sm" | "md" | "lg"
}

export function SeasonBadge({ season, size = "md" }: SeasonBadgeProps) {
  const seasonType = season.slug.split("_")[0]
  const config = SEASON_CONFIG[seasonType] || SEASON_CONFIG.winter

  const sizeClasses = {
    sm: "px-2 py-1 text-xs gap-1",
    md: "px-3 py-1.5 text-sm gap-2",
    lg: "px-4 py-2 text-base gap-2",
  }

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  }

  return (
    <div
      className={`inline-flex items-center rounded-full ${sizeClasses[size]}`}
      style={{ backgroundColor: `${config.color}20`, color: config.color }}
    >
      <span className={iconSizes[size]}>{config.emoji}</span>
      <span className="font-medium">{season.name}</span>
    </div>
  )
}

/* ==========================================================================
   SEASON PROGRESS CARD
   ========================================================================== */

interface SeasonProgressCardProps {
  season: Season
  stats: {
    total_challenges: number
    completed: number
    total_xp_earned: number
  }
  onClick?: () => void
}

export function SeasonProgressCard({
  season,
  stats,
  onClick,
}: SeasonProgressCardProps) {
  const seasonType = season.slug.split("_")[0]
  const config = SEASON_CONFIG[seasonType] || SEASON_CONFIG.winter
  const percentage = Math.round((stats.completed / stats.total_challenges) * 100)

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-4 rounded-2xl bg-gradient-to-br ${config.gradient} border border-white/10 cursor-pointer`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${config.color}20` }}
        >
          <span className="text-xl">{config.emoji}</span>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white">{season.name}</h3>
          <p className="text-xs text-zinc-400">
            {formatTimeRemaining(season.end_date)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-white">{percentage}%</p>
        </div>
      </div>

      {/* Progress */}
      <div className="h-2 bg-black/30 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${percentage}%`,
            backgroundColor: config.color,
          }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mt-3 text-xs text-zinc-400">
        <span>
          {stats.completed}/{stats.total_challenges} défis
        </span>
        <span className="flex items-center gap-1 text-yellow-400">
          <Zap className="w-3 h-3" />
          {stats.total_xp_earned} XP
        </span>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   SEASON REWARDS PREVIEW
   ========================================================================== */

interface SeasonRewardsPreviewProps {
  totalChallenges: number
  completedChallenges: number
  rewards: Array<{
    threshold: number
    label: string
    icon: string
    unlocked: boolean
  }>
}

export function SeasonRewardsPreview({
  totalChallenges,
  completedChallenges,
  rewards,
}: SeasonRewardsPreviewProps) {
  return (
    <div className="p-4 rounded-2xl bg-zinc-800/50 border border-zinc-700">
      <h3 className="font-bold text-white mb-4 flex items-center gap-2">
        <Award className="w-5 h-5 text-yellow-400" />
        Récompenses de saison
      </h3>

      <div className="space-y-3">
        {rewards.map((reward, index) => {
          const progress = Math.min(
            100,
            (completedChallenges / reward.threshold) * 100
          )

          return (
            <div key={index} className="relative">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{reward.icon}</span>
                  <span
                    className={`text-sm ${
                      reward.unlocked ? "text-yellow-400" : "text-zinc-400"
                    }`}
                  >
                    {reward.label}
                  </span>
                </div>
                <span className="text-xs text-zinc-500">
                  {completedChallenges}/{reward.threshold}
                </span>
              </div>
              <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    reward.unlocked
                      ? "bg-yellow-500"
                      : "bg-gradient-to-r from-cyan-500 to-purple-500"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
