/**
 * TEENS PARTY MOROCCO - Crew Leaderboard
 * =======================================
 *
 * Classement des crews.
 */

"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Trophy,
  TrendingUp,
  Clock,
  Calendar,
  Users,
  Crown,
  Medal,
  Zap,
  ChevronRight,
} from "lucide-react"
import {
  type CrewLeaderboardEntry,
  getCrewTier,
  formatCrewXp,
} from "../../features/crews"
import { LeaderboardCrewCard } from "./crew-card"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface CrewLeaderboardProps {
  entries: CrewLeaderboardEntry[]
  period: "all_time" | "weekly" | "monthly"
  onPeriodChange: (period: "all_time" | "weekly" | "monthly") => void
  userCrewId?: string
  onSelectCrew?: (crew: CrewLeaderboardEntry) => void
  isLoading?: boolean
}

/* ==========================================================================
   PERIOD CONFIG
   ========================================================================== */

const PERIOD_CONFIG = {
  all_time: { label: "Tout temps", icon: Trophy },
  weekly: { label: "Cette semaine", icon: Clock },
  monthly: { label: "Ce mois", icon: Calendar },
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export function CrewLeaderboard({
  entries,
  period,
  onPeriodChange,
  userCrewId,
  onSelectCrew,
  isLoading = false,
}: CrewLeaderboardProps) {
  // Find user's crew position
  const userCrewIndex = userCrewId
    ? entries.findIndex((e) => e.crew_id === userCrewId)
    : -1
  const userCrew = userCrewIndex >= 0 ? entries[userCrewIndex] : null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-400" />
          Classement des Crews
        </h2>
      </div>

      {/* Period Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(Object.keys(PERIOD_CONFIG) as Array<keyof typeof PERIOD_CONFIG>).map(
          (p) => {
            const config = PERIOD_CONFIG[p]
            const Icon = config.icon

            return (
              <button
                key={p}
                onClick={() => onPeriodChange(p)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                  period === p
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {config.label}
              </button>
            )
          }
        )}
      </div>

      {/* User's Crew Position (if not in top) */}
      {userCrew && userCrewIndex >= 10 && (
        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
          <p className="text-xs text-cyan-400 mb-2">Ton crew</p>
          <LeaderboardCrewCard
            entry={userCrew}
            isUserCrew
            onClick={() => onSelectCrew?.(userCrew)}
          />
        </div>
      )}

      {/* Top 3 Podium */}
      {entries.length >= 3 && !isLoading && (
        <div className="grid grid-cols-3 gap-2 py-4">
          {/* Second Place */}
          <PodiumPlace
            entry={entries[1]}
            rank={2}
            isUserCrew={entries[1].crew_id === userCrewId}
            onClick={() => onSelectCrew?.(entries[1])}
          />

          {/* First Place */}
          <PodiumPlace
            entry={entries[0]}
            rank={1}
            isUserCrew={entries[0].crew_id === userCrewId}
            onClick={() => onSelectCrew?.(entries[0])}
          />

          {/* Third Place */}
          <PodiumPlace
            entry={entries[2]}
            rank={3}
            isUserCrew={entries[2].crew_id === userCrewId}
            onClick={() => onSelectCrew?.(entries[2])}
          />
        </div>
      )}

      {/* Rest of Leaderboard */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-zinc-800/50 animate-pulse"
            />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
            <Users className="w-8 h-8 text-zinc-600" />
          </div>
          <p className="text-zinc-400">
            Aucun crew pour le moment
          </p>
        </div>
      ) : (
        <motion.div
          className="space-y-2"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.03 },
            },
          }}
        >
          {entries.slice(3).map((entry) => (
            <motion.div
              key={entry.crew_id}
              variants={{
                hidden: { opacity: 0, x: -20 },
                visible: { opacity: 1, x: 0 },
              }}
            >
              <LeaderboardCrewCard
                entry={entry}
                isUserCrew={entry.crew_id === userCrewId}
                onClick={() => onSelectCrew?.(entry)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}

/* ==========================================================================
   PODIUM PLACE
   ========================================================================== */

interface PodiumPlaceProps {
  entry: CrewLeaderboardEntry
  rank: 1 | 2 | 3
  isUserCrew?: boolean
  onClick?: () => void
}

function PodiumPlace({ entry, rank, isUserCrew, onClick }: PodiumPlaceProps) {
  const tier = getCrewTier(entry.total_xp)

  const podiumConfig = {
    1: {
      height: "h-24",
      bg: "bg-yellow-500",
      icon: Crown,
      iconColor: "text-yellow-400",
    },
    2: {
      height: "h-20",
      bg: "bg-zinc-400",
      icon: Medal,
      iconColor: "text-zinc-400",
    },
    3: {
      height: "h-16",
      bg: "bg-amber-700",
      icon: Medal,
      iconColor: "text-amber-600",
    },
  }

  const config = podiumConfig[rank]
  const Icon = config.icon

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex flex-col items-center cursor-pointer ${
        rank === 1 ? "order-2" : rank === 2 ? "order-1 mt-4" : "order-3 mt-6"
      }`}
    >
      {/* Avatar */}
      <div className="relative mb-2">
        <div
          className={`w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden border-2 ${
            isUserCrew ? "border-cyan-400" : "border-transparent"
          }`}
          style={{ backgroundColor: `${entry.color}30` }}
        >
          {entry.avatar_url ? (
            <img
              src={entry.avatar_url}
              alt={entry.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Users className="w-7 h-7" style={{ color: entry.color }} />
          )}
        </div>

        {/* Rank Badge */}
        <div
          className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${config.bg}`}
        >
          <span className="font-bold text-sm text-black">{rank}</span>
        </div>
      </div>

      {/* Name */}
      <p
        className={`text-sm font-medium text-center truncate w-full ${
          isUserCrew ? "text-cyan-400" : "text-white"
        }`}
      >
        {entry.name}
      </p>

      {/* XP */}
      <p className="text-xs text-yellow-400 flex items-center gap-1">
        <Zap className="w-3 h-3" />
        {formatCrewXp(entry.total_xp)}
      </p>

      {/* Podium */}
      <div className={`w-full ${config.height} ${config.bg} rounded-t-lg mt-2 opacity-20`} />
    </motion.div>
  )
}

/* ==========================================================================
   MINI CREW LEADERBOARD
   ========================================================================== */

interface MiniCrewLeaderboardProps {
  entries: CrewLeaderboardEntry[]
  maxDisplayed?: number
  userCrewId?: string
  onViewAll: () => void
}

export function MiniCrewLeaderboard({
  entries,
  maxDisplayed = 5,
  userCrewId,
  onViewAll,
}: MiniCrewLeaderboardProps) {
  const displayedEntries = entries.slice(0, maxDisplayed)
  const userCrewEntry = userCrewId
    ? entries.find((e) => e.crew_id === userCrewId)
    : null

  return (
    <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Top Crews
        </h3>
        <button
          onClick={onViewAll}
          className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
        >
          Voir tout
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {displayedEntries.map((entry, index) => {
          const isUserCrew = entry.crew_id === userCrewId
          const tier = getCrewTier(entry.total_xp)

          return (
            <div
              key={entry.crew_id}
              className={`flex items-center gap-3 p-2 rounded-lg ${
                isUserCrew ? "bg-cyan-500/10" : ""
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0
                    ? "bg-yellow-500 text-black"
                    : index === 1
                    ? "bg-zinc-400 text-black"
                    : index === 2
                    ? "bg-amber-700 text-white"
                    : "bg-zinc-700 text-zinc-400"
                }`}
              >
                {index + 1}
              </span>

              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: `${entry.color}30` }}
              >
                {entry.avatar_url ? (
                  <img
                    src={entry.avatar_url}
                    alt={entry.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Users className="w-4 h-4" style={{ color: entry.color }} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    isUserCrew ? "text-cyan-400" : "text-white"
                  }`}
                >
                  {entry.name}
                </p>
              </div>

              <span className="text-xs text-yellow-400 font-medium">
                {formatCrewXp(entry.total_xp)}
              </span>
            </div>
          )
        })}

        {/* User's crew if not in top */}
        {userCrewEntry &&
          !displayedEntries.find((e) => e.crew_id === userCrewId) && (
            <>
              <div className="border-t border-zinc-800 my-2" />
              <div className="flex items-center gap-3 p-2 rounded-lg bg-cyan-500/10">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-zinc-700 text-zinc-400">
                  {userCrewEntry.rank}
                </span>

                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: `${userCrewEntry.color}30` }}
                >
                  {userCrewEntry.avatar_url ? (
                    <img
                      src={userCrewEntry.avatar_url}
                      alt={userCrewEntry.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users
                      className="w-4 h-4"
                      style={{ color: userCrewEntry.color }}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-cyan-400">
                    {userCrewEntry.name}
                    <span className="text-xs text-zinc-400 ml-1">(ton crew)</span>
                  </p>
                </div>

                <span className="text-xs text-yellow-400 font-medium">
                  {formatCrewXp(userCrewEntry.total_xp)}
                </span>
              </div>
            </>
          )}
      </div>
    </div>
  )
}
