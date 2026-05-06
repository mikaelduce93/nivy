"use client"

/**
 * TEENS PARTY MOROCCO - Leaderboard Client Component
 * ===================================================
 */

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Trophy,
  Medal,
  Crown,
  Users,
  Zap,
  Calendar,
  Globe,
} from "lucide-react"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface LeaderboardEntry {
  id: string
  pseudo: string
  avatar_url: string | null
  xp: number
  level: number
}

interface CrewEntry {
  id: string
  name: string
  slug: string
  color: string
  avatar_url: string | null
  total_xp: number
  current_level: number
}

interface LeaderboardClientProps {
  allTimeLeaderboard: LeaderboardEntry[]
  weeklyLeaderboard: LeaderboardEntry[]
  crewLeaderboard: CrewEntry[]
  userId: string
  myRank: number
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export function LeaderboardClient({
  allTimeLeaderboard,
  weeklyLeaderboard,
  crewLeaderboard,
  userId,
  myRank,
}: LeaderboardClientProps) {
  const [activeTab, setActiveTab] = useState<"all-time" | "weekly" | "crews">("all-time")

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex gap-2 justify-center">
        {([
          { id: "all-time", label: "Tous les temps", icon: Globe },
          { id: "weekly", label: "Cette semaine", icon: Calendar },
          { id: "crews", label: "Crews", icon: Users },
        ] as const).map((tab) => {
          const TabIcon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              <TabIcon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Leaderboard Content */}
      {activeTab === "all-time" && (
        <PlayerLeaderboard entries={allTimeLeaderboard} userId={userId} />
      )}

      {activeTab === "weekly" && (
        <PlayerLeaderboard entries={weeklyLeaderboard} userId={userId} />
      )}

      {activeTab === "crews" && (
        <CrewLeaderboard entries={crewLeaderboard} />
      )}
    </div>
  )
}

/* ==========================================================================
   PLAYER LEADERBOARD
   ========================================================================== */

function PlayerLeaderboard({ entries, userId }: { entries: LeaderboardEntry[]; userId: string }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
        <p className="text-zinc-500">Aucun joueur dans le classement</p>
      </div>
    )
  }

  // Top 3
  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <div className="space-y-8">
      {/* Top 3 Podium */}
      <div className="flex justify-center items-end gap-4">
        {/* 2nd Place */}
        {top3[1] && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <div className="relative">
              <img
                src={top3[1].avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[1].id}`}
                alt={top3[1].pseudo}
                className="w-20 h-20 rounded-full border-4 border-zinc-400 mx-auto"
              />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-zinc-400 flex items-center justify-center text-black font-bold">
                2
              </div>
            </div>
            <p className="font-bold text-white mt-4">{top3[1].pseudo}</p>
            <p className="text-sm text-yellow-400">{top3[1].xp.toLocaleString()} XP</p>
            <div className="w-24 h-24 mt-2 rounded-t-lg bg-zinc-400/20 mx-auto" />
          </motion.div>
        )}

        {/* 1st Place */}
        {top3[0] && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="relative">
              <Crown className="w-8 h-8 text-yellow-400 absolute -top-6 left-1/2 -translate-x-1/2" />
              <img
                src={top3[0].avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[0].id}`}
                alt={top3[0].pseudo}
                className="w-24 h-24 rounded-full border-4 border-yellow-400 mx-auto"
              />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold">
                1
              </div>
            </div>
            <p className="font-bold text-white mt-4 text-lg">{top3[0].pseudo}</p>
            <p className="text-sm text-yellow-400 font-bold">{top3[0].xp.toLocaleString()} XP</p>
            <div className="w-28 h-32 mt-2 rounded-t-lg bg-yellow-400/20 mx-auto" />
          </motion.div>
        )}

        {/* 3rd Place */}
        {top3[2] && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <div className="relative">
              <img
                src={top3[2].avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[2].id}`}
                alt={top3[2].pseudo}
                className="w-16 h-16 rounded-full border-4 border-amber-700 mx-auto"
              />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center text-white font-bold">
                3
              </div>
            </div>
            <p className="font-bold text-white mt-4">{top3[2].pseudo}</p>
            <p className="text-sm text-yellow-400">{top3[2].xp.toLocaleString()} XP</p>
            <div className="w-20 h-16 mt-2 rounded-t-lg bg-amber-700/20 mx-auto" />
          </motion.div>
        )}
      </div>

      {/* Rest of the list */}
      <div className="max-w-2xl mx-auto space-y-2">
        {rest.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: (index + 3) * 0.02 }}
            className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
              entry.id === userId
                ? "bg-cyan-500/20 border border-cyan-500/30"
                : "bg-zinc-800/50 hover:bg-zinc-800"
            }`}
          >
            {/* Rank */}
            <div className="w-8 text-center font-bold text-zinc-500">
              {index + 4}
            </div>

            {/* Avatar */}
            <img
              src={entry.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.id}`}
              alt={entry.pseudo}
              className="w-10 h-10 rounded-full"
            />

            {/* Info */}
            <div className="flex-1">
              <p className={`font-medium ${entry.id === userId ? "text-cyan-400" : "text-white"}`}>
                {entry.pseudo}
                {entry.id === userId && " (Toi)"}
              </p>
              <p className="text-xs text-zinc-500">Niveau {entry.level}</p>
            </div>

            {/* XP */}
            <div className="flex items-center gap-1 text-yellow-400">
              <Zap className="w-4 h-4" />
              <span className="font-bold">{entry.xp.toLocaleString()}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ==========================================================================
   CREW LEADERBOARD
   ========================================================================== */

function CrewLeaderboard({ entries }: { entries: CrewEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
        <p className="text-zinc-500">Aucun crew dans le classement</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      {entries.map((crew, index) => (
        <motion.div
          key={crew.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50"
        >
          {/* Rank */}
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
            index === 0 ? "bg-yellow-500 text-black" :
            index === 1 ? "bg-zinc-400 text-black" :
            index === 2 ? "bg-amber-700 text-white" :
            "bg-zinc-700 text-zinc-400"
          }`}>
            {index + 1}
          </div>

          {/* Crew Avatar */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white"
            style={{ backgroundColor: crew.color }}
          >
            {crew.name.charAt(0)}
          </div>

          {/* Info */}
          <div className="flex-1">
            <p className="font-bold text-white">{crew.name}</p>
            <p className="text-xs text-zinc-500">Niveau {crew.current_level}</p>
          </div>

          {/* XP */}
          <div className="text-right">
            <p className="font-bold text-yellow-400">{crew.total_xp.toLocaleString()} XP</p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
