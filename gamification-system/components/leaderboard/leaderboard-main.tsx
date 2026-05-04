"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Trophy, Crown, Medal, Star, TrendingUp, Users, MapPin,
  Calendar, Clock, ChevronRight, Flame, Zap, Search
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type LeaderboardEntry,
  type LeaderboardData,
  type LeaderboardType,
  type UserRank,
  RANK_TIERS,
  getRankTier,
} from "../../features/leaderboard/schema"
import { LeaderboardEntry as LeaderboardEntryComponent } from "./leaderboard-entry"
import { LeaderboardFilters } from "./leaderboard-filters"
import { UserRankCard } from "./user-rank-card"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface LeaderboardMainProps {
  initialData?: LeaderboardData
  currentTeenId?: string
  currentUserRank?: UserRank
  onTypeChange?: (type: LeaderboardType) => void
  onLoadMore?: () => void
  loading?: boolean
  className?: string
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export function LeaderboardMain({
  initialData,
  currentTeenId,
  currentUserRank,
  onTypeChange,
  onLoadMore,
  loading = false,
  className,
}: LeaderboardMainProps) {
  const [activeType, setActiveType] = useState<LeaderboardType>("all_time")
  const [searchQuery, setSearchQuery] = useState("")

  const handleTypeChange = (type: LeaderboardType) => {
    setActiveType(type)
    onTypeChange?.(type)
  }

  const entries = initialData?.entries || []
  const filteredEntries = searchQuery
    ? entries.filter((e) =>
        e.pseudo.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entries

  // Top 3 pour le podium
  const podiumEntries = filteredEntries.slice(0, 3)
  const listEntries = filteredEntries.slice(3)

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl">
            <Trophy className="w-8 h-8 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Classement</h1>
            <p className="text-sm text-zinc-400">
              {initialData?.total_participants || 0} participants
              {initialData?.period && ` • ${initialData.period.label}`}
            </p>
          </div>
        </div>
      </div>

      {/* User Rank Card (si connecté) */}
      {currentUserRank && currentTeenId && (
        <UserRankCard
          rank={currentUserRank}
          type={activeType}
        />
      )}

      {/* Filters */}
      <LeaderboardFilters
        activeType={activeType}
        onTypeChange={handleTypeChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-zinc-400">Chargement du classement...</p>
        </div>
      )}

      {/* Content */}
      {!loading && (
        <>
          {/* Podium (Top 3) */}
          {podiumEntries.length >= 3 && !searchQuery && (
            <Podium
              entries={podiumEntries}
              currentTeenId={currentTeenId}
            />
          )}

          {/* Rest of the list */}
          <div className="bg-zinc-900 rounded-2xl overflow-hidden">
            {/* List Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-zinc-800/50 text-xs text-zinc-500 font-medium">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-5 sm:col-span-4">Joueur</div>
              <div className="col-span-3 sm:col-span-2 text-center">Niveau</div>
              <div className="col-span-3 sm:col-span-3 text-right">XP</div>
              <div className="hidden sm:block sm:col-span-2 text-right">Streak</div>
            </div>

            {/* Entries */}
            <div className="divide-y divide-zinc-800">
              {listEntries.length === 0 && podiumEntries.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  Aucun participant trouvé
                </div>
              ) : (
                listEntries.map((entry, index) => (
                  <LeaderboardEntryComponent
                    key={entry.teen_id}
                    entry={entry}
                    rank={entry.rank}
                    isCurrentUser={entry.teen_id === currentTeenId}
                    animationDelay={index * 0.05}
                  />
                ))
              )}
            </div>

            {/* Load More */}
            {onLoadMore && listEntries.length >= 47 && (
              <button
                onClick={onLoadMore}
                className="w-full py-4 text-center text-cyan-400 hover:text-cyan-300 font-medium transition-colors bg-zinc-800/30"
              >
                Charger plus...
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ==========================================================================
   PODIUM COMPONENT
   ========================================================================== */

interface PodiumProps {
  entries: LeaderboardEntry[]
  currentTeenId?: string
}

function Podium({ entries, currentTeenId }: PodiumProps) {
  // Réorganiser pour afficher 2nd - 1er - 3ème
  const [first, second, third] = entries
  const orderedEntries = [second, first, third]

  return (
    <div className="relative">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 via-transparent to-transparent rounded-3xl" />

      <div className="relative grid grid-cols-3 gap-2 py-6 px-4">
        {orderedEntries.map((entry, index) => {
          const actualRank = index === 0 ? 2 : index === 1 ? 1 : 3
          const tier = getRankTier(actualRank)
          const isFirst = actualRank === 1
          const isCurrentUser = entry?.teen_id === currentTeenId

          if (!entry) return <div key={index} />

          return (
            <motion.div
              key={entry.teen_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "flex flex-col items-center",
                isFirst ? "order-2" : index === 0 ? "order-1" : "order-3"
              )}
            >
              {/* Rank Badge */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center mb-2",
                  `bg-gradient-to-br ${tier.gradient}`
                )}
              >
                {actualRank === 1 ? (
                  <Crown className="w-4 h-4 text-white" />
                ) : (
                  <span className="text-sm font-bold text-white">{actualRank}</span>
                )}
              </div>

              {/* Avatar */}
              <motion.div
                className={cn(
                  "relative rounded-full overflow-hidden border-4",
                  isFirst ? "w-24 h-24" : "w-16 h-16",
                  tier.borderColor,
                  isCurrentUser && "ring-2 ring-cyan-400 ring-offset-2 ring-offset-zinc-900"
                )}
                animate={isFirst ? {
                  scale: [1, 1.02, 1],
                  boxShadow: [
                    "0 0 20px rgba(234, 179, 8, 0)",
                    "0 0 40px rgba(234, 179, 8, 0.4)",
                    "0 0 20px rgba(234, 179, 8, 0)",
                  ],
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {entry.avatar_url ? (
                  <img
                    src={entry.avatar_url}
                    alt={entry.pseudo}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={cn(
                    "w-full h-full flex items-center justify-center text-white font-bold",
                    `bg-gradient-to-br ${tier.gradient}`,
                    isFirst ? "text-2xl" : "text-lg"
                  )}>
                    {entry.pseudo.charAt(0).toUpperCase()}
                  </div>
                )}
              </motion.div>

              {/* Name */}
              <p className={cn(
                "mt-2 font-bold truncate max-w-full px-2",
                isFirst ? "text-white text-lg" : "text-zinc-300 text-sm",
                isCurrentUser && "text-cyan-400"
              )}>
                {entry.pseudo}
              </p>

              {/* XP */}
              <div className="flex items-center gap-1 mt-1">
                <Zap className={cn("w-3 h-3", tier.color)} />
                <span className={cn("font-bold", isFirst ? "text-sm" : "text-xs", tier.color)}>
                  {formatNumber(entry.xp)} XP
                </span>
              </div>

              {/* Level */}
              <span className="text-xs text-zinc-500 mt-0.5">
                Niveau {entry.level}
              </span>
            </motion.div>
          )
        })}
      </div>

      {/* Podium Bars */}
      <div className="grid grid-cols-3 gap-2 px-4 -mt-2">
        {[2, 1, 3].map((rank, index) => {
          const height = rank === 1 ? "h-16" : rank === 2 ? "h-12" : "h-8"
          const tier = getRankTier(rank)

          return (
            <motion.div
              key={rank}
              className={cn(
                "rounded-t-lg",
                height,
                `bg-gradient-to-t ${tier.gradient}`,
                index === 0 ? "order-1" : index === 1 ? "order-2" : "order-3"
              )}
              initial={{ height: 0 }}
              animate={{ height: rank === 1 ? 64 : rank === 2 ? 48 : 32 }}
              transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
            />
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
