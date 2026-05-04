"use client"

import { motion } from "framer-motion"
import { Crown, Medal, Star, Zap, Flame, TrendingUp, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { type LeaderboardEntry as LeaderboardEntryType, getRankTier } from "../../features/leaderboard/schema"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface LeaderboardEntryProps {
  entry: LeaderboardEntryType
  rank: number
  isCurrentUser?: boolean
  animationDelay?: number
  onClick?: () => void
  showCity?: boolean
  showStreak?: boolean
  compact?: boolean
  className?: string
}

/* ==========================================================================
   COMPONENT
   ========================================================================== */

export function LeaderboardEntry({
  entry,
  rank,
  isCurrentUser = false,
  animationDelay = 0,
  onClick,
  showCity = false,
  showStreak = true,
  compact = false,
  className,
}: LeaderboardEntryProps) {
  const tier = getRankTier(rank)

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: animationDelay }}
      className={cn(
        "grid grid-cols-12 gap-2 items-center px-4 py-3 transition-colors cursor-pointer",
        isCurrentUser
          ? "bg-cyan-500/10 border-l-2 border-cyan-500"
          : "hover:bg-zinc-800/50",
        compact ? "py-2" : "py-3",
        className
      )}
      onClick={onClick}
    >
      {/* Rank */}
      <div className="col-span-1 flex justify-center">
        <RankBadge rank={rank} />
      </div>

      {/* User Info */}
      <div className="col-span-5 sm:col-span-4 flex items-center gap-3 min-w-0">
        {/* Avatar */}
        <div
          className={cn(
            "relative flex-shrink-0 rounded-full overflow-hidden",
            compact ? "w-8 h-8" : "w-10 h-10",
            rank <= 3 && `ring-2 ${tier.borderColor}`,
            isCurrentUser && "ring-2 ring-cyan-400"
          )}
        >
          {entry.avatar_url ? (
            <img
              src={entry.avatar_url}
              alt={entry.pseudo}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className={cn(
                "w-full h-full flex items-center justify-center text-white font-bold",
                rank <= 3
                  ? `bg-gradient-to-br ${tier.gradient}`
                  : "bg-zinc-700"
              )}
            >
              {entry.pseudo.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Name & City */}
        <div className="min-w-0">
          <p
            className={cn(
              "font-bold truncate",
              isCurrentUser ? "text-cyan-400" : "text-white",
              compact ? "text-sm" : "text-base"
            )}
          >
            {entry.pseudo}
            {isCurrentUser && <span className="text-xs ml-1">(Toi)</span>}
          </p>

          {showCity && entry.city && (
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{entry.city}</span>
            </div>
          )}
        </div>
      </div>

      {/* Level */}
      <div className="col-span-3 sm:col-span-2 flex justify-center">
        <LevelBadge level={entry.level} compact={compact} />
      </div>

      {/* XP */}
      <div className="col-span-3 sm:col-span-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <Zap
            className={cn(
              "flex-shrink-0",
              compact ? "w-3 h-3" : "w-4 h-4",
              rank <= 3 ? tier.color : "text-cyan-400"
            )}
          />
          <span
            className={cn(
              "font-bold",
              compact ? "text-sm" : "text-base",
              rank <= 3 ? tier.color : "text-white"
            )}
          >
            {formatXP(entry.xp)}
          </span>
        </div>
      </div>

      {/* Streak */}
      {showStreak && (
        <div className="hidden sm:flex sm:col-span-2 items-center justify-end gap-1">
          {entry.current_streak > 0 && (
            <>
              <Flame
                className={cn(
                  "w-4 h-4",
                  entry.current_streak >= 30
                    ? "text-purple-400"
                    : entry.current_streak >= 7
                    ? "text-orange-400"
                    : "text-yellow-400"
                )}
              />
              <span className="text-sm text-zinc-400">
                {entry.current_streak}j
              </span>
            </>
          )}
        </div>
      )}
    </motion.div>
  )
}

/* ==========================================================================
   RANK BADGE
   ========================================================================== */

interface RankBadgeProps {
  rank: number
  size?: "sm" | "md" | "lg"
}

export function RankBadge({ rank, size = "md" }: RankBadgeProps) {
  const tier = getRankTier(rank)

  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
  }

  if (rank === 1) {
    return (
      <motion.div
        className={cn(
          "flex items-center justify-center rounded-full",
          `bg-gradient-to-br ${tier.gradient}`,
          sizeClasses[size]
        )}
        animate={{
          scale: [1, 1.1, 1],
          boxShadow: [
            "0 0 0px rgba(234, 179, 8, 0)",
            "0 0 15px rgba(234, 179, 8, 0.5)",
            "0 0 0px rgba(234, 179, 8, 0)",
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Crown className="w-4 h-4 text-white" />
      </motion.div>
    )
  }

  if (rank === 2 || rank === 3) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full",
          `bg-gradient-to-br ${tier.gradient}`,
          sizeClasses[size]
        )}
      >
        <Medal className="w-4 h-4 text-white" />
      </div>
    )
  }

  if (rank <= 10) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full font-bold text-white",
          tier.bgColor,
          sizeClasses[size]
        )}
      >
        {rank}
      </div>
    )
  }

  return (
    <span className={cn("font-medium text-zinc-400", sizeClasses[size].split(" ")[2])}>
      {rank}
    </span>
  )
}

/* ==========================================================================
   LEVEL BADGE
   ========================================================================== */

interface LevelBadgeProps {
  level: number
  compact?: boolean
}

export function LevelBadge({ level, compact = false }: LevelBadgeProps) {
  // Déterminer la couleur basée sur le niveau
  const getColor = () => {
    if (level >= 50) return "from-purple-400 to-pink-500"
    if (level >= 25) return "from-yellow-400 to-orange-500"
    if (level >= 10) return "from-cyan-400 to-blue-500"
    return "from-zinc-400 to-zinc-500"
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 py-0.5 rounded-full",
        `bg-gradient-to-r ${getColor()}`,
        compact ? "text-xs" : "text-sm"
      )}
    >
      <TrendingUp className={cn("text-white", compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
      <span className="font-bold text-white">{level}</span>
    </div>
  )
}

/* ==========================================================================
   COMPACT LEADERBOARD ENTRY (pour widget)
   ========================================================================== */

interface CompactLeaderboardEntryProps {
  entry: LeaderboardEntryType
  rank: number
  isCurrentUser?: boolean
  onClick?: () => void
}

export function CompactLeaderboardEntry({
  entry,
  rank,
  isCurrentUser = false,
  onClick,
}: CompactLeaderboardEntryProps) {
  const tier = getRankTier(rank)

  return (
    <motion.div
      className={cn(
        "flex items-center gap-3 p-2 rounded-xl transition-colors cursor-pointer",
        isCurrentUser ? "bg-cyan-500/10" : "hover:bg-zinc-800/50"
      )}
      whileHover={{ x: 4 }}
      onClick={onClick}
    >
      {/* Rank */}
      <RankBadge rank={rank} size="sm" />

      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full overflow-hidden flex-shrink-0",
          rank <= 3 && `ring-2 ${tier.borderColor}`
        )}
      >
        {entry.avatar_url ? (
          <img
            src={entry.avatar_url}
            alt={entry.pseudo}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-zinc-700 flex items-center justify-center text-white font-bold text-sm">
            {entry.pseudo.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Name */}
      <span
        className={cn(
          "font-medium truncate flex-1",
          isCurrentUser ? "text-cyan-400" : "text-white"
        )}
      >
        {entry.pseudo}
      </span>

      {/* XP */}
      <span className={cn("text-sm font-bold", tier.color)}>
        {formatXP(entry.xp)}
      </span>
    </motion.div>
  )
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

function formatXP(xp: number): string {
  if (xp >= 1000000) {
    return (xp / 1000000).toFixed(1) + "M"
  }
  if (xp >= 1000) {
    return (xp / 1000).toFixed(1) + "K"
  }
  return xp.toString()
}
