"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Trophy, Zap, Crown, Medal, TrendingUp, Users, Calendar, Filter, ChevronUp, ChevronDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Static leaderboard data
const LEADERBOARD = [
  { rank: 1, name: "Salma K.", xp: 8250, level: 15, badge: "🏆", trend: "up", change: 2, avatar: null },
  { rank: 2, name: "Omar B.", xp: 7820, level: 14, badge: "🥈", trend: "same", change: 0, avatar: null },
  { rank: 3, name: "Nadia L.", xp: 7650, level: 14, badge: "🥉", trend: "up", change: 1, avatar: null },
  { rank: 4, name: "Youssef M.", xp: 6420, level: 12, trend: "down", change: 1, avatar: null },
  { rank: 5, name: "Toi", xp: 5450, level: 11, trend: "up", change: 3, avatar: null, isYou: true },
  { rank: 6, name: "Amina R.", xp: 5200, level: 10, trend: "down", change: 2, avatar: null },
  { rank: 7, name: "Karim H.", xp: 4980, level: 10, trend: "up", change: 1, avatar: null },
  { rank: 8, name: "Leila M.", xp: 4750, level: 9, trend: "same", change: 0, avatar: null },
  { rank: 9, name: "Ahmed S.", xp: 4520, level: 9, trend: "down", change: 3, avatar: null },
  { rank: 10, name: "Sara T.", xp: 4300, level: 8, trend: "up", change: 2, avatar: null },
]

const TIMEFRAMES = [
  { id: "weekly", label: "Cette semaine" },
  { id: "monthly", label: "Ce mois" },
  { id: "all_time", label: "Tout temps" },
]

const CATEGORIES = [
  { id: "global", label: "Global", icon: Trophy },
  { id: "friends", label: "Amis", icon: Users },
  { id: "city", label: "Ma ville", icon: Medal },
]

export default function LeaderboardPage() {
  const [timeframe, setTimeframe] = useState("weekly")
  const [category, setCategory] = useState("global")

  // Find user's position
  const userRank = LEADERBOARD.find(p => p.isYou)
  const top3 = LEADERBOARD.slice(0, 3)
  const rest = LEADERBOARD.slice(3)

  return (
    <div className="min-h-screen pb-32 space-y-8 pt-6">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">Classement</h1>
                <p className="text-zinc-500 text-sm font-medium">Les meilleurs joueurs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Your Rank Card */}
        {userRank && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-3xl bg-gradient-to-br from-gen-z-lavender/10 to-purple-500/5 border border-gen-z-lavender/20"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gen-z-lavender flex items-center justify-center text-black font-black text-2xl">
                #{userRank.rank}
              </div>
              <div className="flex-1">
                <h3 className="font-black text-white text-lg">Ta position</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-gen-z-lavender">
                    <Zap className="w-4 h-4" />
                    <span className="font-bold">{userRank.xp.toLocaleString()} XP</span>
                  </span>
                  <span className="text-zinc-400">•</span>
                  <span className="text-zinc-400">Niveau {userRank.level}</span>
                </div>
              </div>
              {userRank.trend === "up" && (
                <div className="flex items-center gap-1 text-gen-z-mint">
                  <ChevronUp className="w-5 h-5" />
                  <span className="font-bold">+{userRank.change}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2 flex-1">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all",
                    category === cat.id
                      ? "bg-yellow-500 text-black"
                      : "bg-zinc-900/50 text-zinc-400 hover:text-white"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {cat.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={cn(
                  "px-3 py-2 rounded-xl text-sm transition-all",
                  timeframe === tf.id
                    ? "bg-white/10 text-white font-bold"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Podium - Top 3 */}
      <section className="py-8">
        <div className="flex items-end justify-center gap-4">
          {/* 2nd Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gen-z-lavender to-gen-z-sky flex items-center justify-center text-xl font-bold text-white mb-2">
              {top3[1].name.charAt(0)}
            </div>
            <span className="font-bold text-sm text-white mb-1">{top3[1].name}</span>
            <span className="text-xs text-zinc-400 mb-2">{top3[1].xp.toLocaleString()} XP</span>
            <div className="w-24 h-24 rounded-t-xl bg-gradient-to-t from-zinc-400 to-zinc-500 flex items-end justify-center pb-3">
              <span className="text-3xl">{top3[1].badge}</span>
            </div>
          </motion.div>

          {/* 1st Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <Crown className="w-8 h-8 text-yellow-500 mb-2" />
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center text-2xl font-bold text-black mb-2">
              {top3[0].name.charAt(0)}
            </div>
            <span className="font-bold text-white mb-1">{top3[0].name}</span>
            <span className="text-sm text-yellow-500 mb-2">{top3[0].xp.toLocaleString()} XP</span>
            <div className="w-28 h-32 rounded-t-xl bg-gradient-to-t from-yellow-500 to-amber-500 flex items-end justify-center pb-3">
              <span className="text-4xl">{top3[0].badge}</span>
            </div>
          </motion.div>

          {/* 3rd Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gen-z-lavender to-gen-z-sky flex items-center justify-center text-xl font-bold text-white mb-2">
              {top3[2].name.charAt(0)}
            </div>
            <span className="font-bold text-sm text-white mb-1">{top3[2].name}</span>
            <span className="text-xs text-zinc-400 mb-2">{top3[2].xp.toLocaleString()} XP</span>
            <div className="w-24 h-20 rounded-t-xl bg-gradient-to-t from-amber-700 to-amber-800 flex items-end justify-center pb-3">
              <span className="text-3xl">{top3[2].badge}</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Rest of Leaderboard */}
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase">Classement complet</h2>

        <div className="space-y-3">
          {rest.map((player, idx) => (
            <motion.div
              key={player.rank}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                "flex items-center gap-4 p-4 rounded-2xl border transition-colors",
                player.isYou 
                  ? "bg-gen-z-lavender/10 border-gen-z-lavender/30" 
                  : "bg-zinc-900/50 border-white/5"
              )}
            >
              {/* Rank */}
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-black",
                player.isYou ? "bg-gen-z-lavender text-black" : "bg-zinc-800 text-white"
              )}>
                {player.rank}
              </div>

              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gen-z-lavender to-gen-z-sky flex items-center justify-center text-lg font-bold text-white">
                {player.name.charAt(0)}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className={cn(
                    "font-bold",
                    player.isYou ? "text-gen-z-lavender" : "text-white"
                  )}>
                    {player.name}
                  </h4>
                  <span className="text-xs text-zinc-500">Lvl {player.level}</span>
                </div>
              </div>

              {/* XP */}
              <div className="flex items-center gap-2 text-gen-z-lavender">
                <Zap className="w-4 h-4" />
                <span className="font-black">{player.xp.toLocaleString()}</span>
              </div>

              {/* Trend */}
              <div className={cn(
                "flex items-center gap-1 w-12 justify-end",
                player.trend === "up" ? "text-gen-z-mint" :
                player.trend === "down" ? "text-gen-z-coral" : "text-zinc-500"
              )}>
                {player.trend === "up" && <ChevronUp className="w-4 h-4" />}
                {player.trend === "down" && <ChevronDown className="w-4 h-4" />}
                {player.trend === "same" && <Minus className="w-4 h-4" />}
                {player.change > 0 && <span className="text-sm font-bold">{player.change}</span>}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Load More */}
      <div className="flex justify-center">
        <Button variant="outline" className="rounded-xl">
          Voir plus
        </Button>
      </div>

      {/* Weekly Reset Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 text-center"
      >
        <Calendar className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
        <p className="text-zinc-400">Le classement est réinitialisé chaque lundi</p>
        <p className="text-sm text-zinc-500 mt-1">Prochain reset dans 4 jours</p>
      </motion.div>
    </div>
  )
}
