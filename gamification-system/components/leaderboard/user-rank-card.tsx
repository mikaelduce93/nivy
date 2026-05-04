"use client"

import { motion } from "framer-motion"
import { Trophy, TrendingUp, Zap, Crown, Medal, Star, ArrowUp, ArrowDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { type UserRank, type LeaderboardType, getRankTier } from "../../features/leaderboard/schema"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface UserRankCardProps {
  rank: UserRank
  type: LeaderboardType
  previousRank?: number
  className?: string
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export function UserRankCard({
  rank,
  type,
  previousRank,
  className,
}: UserRankCardProps) {
  const tier = getRankTier(rank.rank)
  const rankChange = previousRank ? previousRank - rank.rank : 0

  const getTypeLabel = () => {
    switch (type) {
      case "weekly":
        return "cette semaine"
      case "monthly":
        return "ce mois"
      case "friends":
        return "entre amis"
      default:
        return "au classement général"
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-2xl p-6",
        "bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800",
        "border",
        tier.borderColor,
        className
      )}
    >
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
        <div
          className={cn(
            "absolute inset-0 rounded-full blur-3xl",
            `bg-gradient-to-br ${tier.gradient}`
          )}
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Ton classement</h3>
          <span className="text-sm text-zinc-500">{getTypeLabel()}</span>
        </div>

        {/* Main Rank Display */}
        <div className="flex items-center gap-6">
          {/* Rank Badge */}
          <div className="relative">
            <motion.div
              className={cn(
                "w-24 h-24 rounded-2xl flex items-center justify-center",
                `bg-gradient-to-br ${tier.gradient}`
              )}
              animate={rank.rank <= 3 ? {
                boxShadow: [
                  "0 0 0px rgba(255,255,255,0)",
                  "0 0 30px rgba(255,255,255,0.3)",
                  "0 0 0px rgba(255,255,255,0)",
                ],
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {rank.rank === 1 ? (
                <Crown className="w-12 h-12 text-white" />
              ) : rank.rank <= 3 ? (
                <Medal className="w-12 h-12 text-white" />
              ) : rank.rank <= 10 ? (
                <Star className="w-12 h-12 text-white" />
              ) : (
                <span className="text-4xl font-black text-white">
                  #{rank.rank}
                </span>
              )}
            </motion.div>

            {/* Rank Change Badge */}
            {rankChange !== 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn(
                  "absolute -top-2 -right-2 flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-bold",
                  rankChange > 0
                    ? "bg-green-500 text-white"
                    : "bg-red-500 text-white"
                )}
              >
                {rankChange > 0 ? (
                  <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowDown className="w-3 h-3" />
                )}
                {Math.abs(rankChange)}
              </motion.div>
            )}
          </div>

          {/* Stats */}
          <div className="flex-1 space-y-3">
            {/* Rank Position */}
            <div>
              <p className="text-sm text-zinc-500 mb-1">Position</p>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-3xl font-black", tier.color)}>
                  #{rank.rank}
                </span>
                <span className="text-zinc-500">
                  / {rank.total_participants}
                </span>
              </div>
            </div>

            {/* Percentile */}
            <div>
              <p className="text-sm text-zinc-500 mb-1">Top</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-cyan-400">
                  {rank.percentile.toFixed(1)}%
                </span>
                <PercentileBar percentile={rank.percentile} />
              </div>
            </div>

            {/* XP */}
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="font-bold text-white">{formatNumber(rank.xp)} XP</span>
            </div>
          </div>
        </div>

        {/* Motivation Message */}
        <RankMotivation rank={rank.rank} percentile={rank.percentile} />
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   PERCENTILE BAR
   ========================================================================== */

interface PercentileBarProps {
  percentile: number
}

function PercentileBar({ percentile }: PercentileBarProps) {
  // Inverser le percentile (1% = meilleur)
  const progress = 100 - percentile

  return (
    <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden max-w-[100px]">
      <motion.div
        className="h-full bg-gradient-to-r from-cyan-500 to-green-500 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </div>
  )
}

/* ==========================================================================
   RANK MOTIVATION MESSAGE
   ========================================================================== */

interface RankMotivationProps {
  rank: number
  percentile: number
}

function RankMotivation({ rank, percentile }: RankMotivationProps) {
  let message = ""
  let color = "text-zinc-400"

  if (rank === 1) {
    message = "🏆 Tu domines le classement !"
    color = "text-yellow-400"
  } else if (rank <= 3) {
    message = "🥇 Tu es sur le podium, continue !"
    color = "text-yellow-400"
  } else if (rank <= 10) {
    message = "⭐ Top 10 ! Le podium est proche !"
    color = "text-cyan-400"
  } else if (percentile <= 10) {
    message = "🔥 Tu es dans le top 10% !"
    color = "text-orange-400"
  } else if (percentile <= 25) {
    message = "💪 Tu es dans le top 25% !"
    color = "text-green-400"
  } else if (percentile <= 50) {
    message = "📈 Continue à progresser !"
    color = "text-blue-400"
  } else {
    message = "🚀 Relève des défis pour grimper !"
    color = "text-purple-400"
  }

  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className={cn("mt-4 text-center font-medium", color)}
    >
      {message}
    </motion.p>
  )
}

/* ==========================================================================
   COMPACT RANK DISPLAY (pour header/nav)
   ========================================================================== */

interface CompactRankDisplayProps {
  rank: number
  type?: LeaderboardType
  onClick?: () => void
  className?: string
}

export function CompactRankDisplay({
  rank,
  type = "all_time",
  onClick,
  className,
}: CompactRankDisplayProps) {
  const tier = getRankTier(rank)

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors",
        tier.bgColor,
        "hover:opacity-80",
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {rank <= 3 ? (
        rank === 1 ? (
          <Crown className="w-4 h-4 text-yellow-400" />
        ) : (
          <Medal className={cn("w-4 h-4", tier.color)} />
        )
      ) : (
        <Trophy className={cn("w-4 h-4", tier.color)} />
      )}
      <span className={cn("font-bold", tier.color)}>#{rank}</span>
    </motion.button>
  )
}

/* ==========================================================================
   ALL RANKS OVERVIEW (tous les types)
   ========================================================================== */

interface AllRanksOverviewProps {
  ranks: Record<LeaderboardType, UserRank>
  className?: string
}

export function AllRanksOverview({ ranks, className }: AllRanksOverviewProps) {
  const rankTypes: { type: LeaderboardType; label: string }[] = [
    { type: "all_time", label: "Global" },
    { type: "weekly", label: "Semaine" },
    { type: "monthly", label: "Mois" },
  ]

  return (
    <div className={cn("grid grid-cols-3 gap-4", className)}>
      {rankTypes.map(({ type, label }) => {
        const rankData = ranks[type]
        if (!rankData) return null

        const tier = getRankTier(rankData.rank)

        return (
          <div
            key={type}
            className={cn(
              "bg-zinc-800/50 rounded-xl p-4 text-center",
              "border",
              tier.borderColor
            )}
          >
            <p className="text-xs text-zinc-500 mb-2">{label}</p>
            <p className={cn("text-2xl font-black", tier.color)}>
              #{rankData.rank}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Top {rankData.percentile.toFixed(0)}%
            </p>
          </div>
        )
      })}
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
