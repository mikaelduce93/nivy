"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Gamepad2, Zap, Clock, Trophy, Play, Users, Flame, Target, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type GameType = {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  color: string
  base_xp: number
  is_daily: boolean
  cooldown_minutes: number
  min_players: number
  max_players: number
}

export type GameStats = {
  today_played: number
  today_xp: number
  total_wins: number
  win_streak: number
}

const CATEGORIES = [
  { id: "all", label: "Tous", icon: Gamepad2 },
  { id: "daily", label: "Quotidien", icon: Clock },
  { id: "brain", label: "Cerveau", icon: Target },
  { id: "pvp", label: "PvP", icon: Users },
]

interface Props {
  games: GameType[]
  stats: GameStats
}

export function GamesClient({ games, stats }: Props) {
  const [category, setCategory] = useState("all")

  const dailyGames = games.filter((g) => g.is_daily)
  const challengeGames = games.filter((g) => !g.is_daily && g.max_players > 1)

  const todayPlayed = stats.today_played
  const totalXpToday = stats.today_xp
  const winStreak = stats.win_streak
  const totalWins = stats.total_wins

  return (
    <div className="min-h-screen pb-32 space-y-8 pt-6">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-soft to-pink-500 flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">Games</h1>
                <p className="text-zinc-500 text-sm font-medium">Joue et gagne des XP</p>
              </div>
            </div>
          </div>

          {/* Win streak badge */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="font-black text-orange-500">{winStreak}</span>
            <span className="text-xs text-orange-500/70">wins</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Play className="w-4 h-4 text-accent-soft" />
              <span className="font-black text-xl">{todayPlayed}</span>
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Joués aujourd'hui</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-brand-soft" />
              <span className="font-black text-xl">+{totalXpToday}</span>
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">XP aujourd'hui</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="font-black text-xl">{totalWins}</span>
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Victoires</p>
          </motion.div>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap",
                  category === cat.id
                    ? "bg-accent-soft text-black"
                    : "bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                )}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            )
          })}
        </div>
      </header>

      {/* Daily Games */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black uppercase">Jeux Quotidiens</h2>
          <span className="text-sm text-zinc-500">Reset dans 8h</span>
        </div>

        {dailyGames.length === 0 ? (
          <div className="p-8 rounded-3xl bg-zinc-900/50 border border-white/5 text-center">
            <Gamepad2 className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">Aucun jeu disponible.</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dailyGames.map((game, idx) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className="relative p-6 rounded-3xl border transition-all cursor-pointer bg-zinc-900/50 border-white/5 hover:border-accent-soft/50"
            >
              <div className="flex items-start gap-4">
                <div className="text-5xl">{game.icon || "🎮"}</div>
                <div className="flex-1">
                  <h3 className="font-black text-lg text-white">{game.name}</h3>
                  <p className="text-sm text-zinc-400 mb-3">{game.description}</p>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-brand-soft" />
                    <span className="font-bold text-brand-soft">+{game.base_xp} XP</span>
                  </div>
                </div>
              </div>

              <Button className="w-full mt-4 bg-accent-soft text-black font-bold">
                <Play className="w-4 h-4 mr-2" />
                Jouer
              </Button>
            </motion.div>
          ))}
        </div>
        )}
      </section>

      {/* Challenge Games */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black uppercase">Défis Multijoueur</h2>
        </div>

        {challengeGames.length === 0 ? null : (
          <div className="space-y-4">
            {challengeGames.map((game, idx) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-r from-accent-soft/10 to-transparent border border-accent-soft/20 cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="text-5xl">{game.icon || "🎮"}</div>
                  <div className="flex-1">
                    <h3 className="font-black text-lg text-white">{game.name}</h3>
                    <p className="text-sm text-zinc-400">{game.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-brand-soft mb-1">
                      <Zap className="w-4 h-4" />
                      <span className="font-black">+{game.base_xp} XP</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Users className="w-3 h-3" />
                      <span>max {game.max_players}</span>
                    </div>
                  </div>
                  <Button className="bg-white text-black font-bold">
                    Rejoindre
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Featured Event */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border border-yellow-500/30"
      >
        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-500 text-xs font-black uppercase">
          Event Spécial
        </div>
        <div className="flex items-center gap-6">
          <div className="text-6xl">🏆</div>
          <div className="flex-1">
            <h3 className="text-2xl font-black text-white mb-2">Tournoi Weekend</h3>
            <p className="text-zinc-400 mb-4">Affronte les meilleurs joueurs et gagne des prix exclusifs!</p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                <span className="font-bold text-yellow-500">1000 XP</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-zinc-400" />
                <span className="text-zinc-400">342 inscrits</span>
              </div>
            </div>
          </div>
          <Button className="bg-yellow-500 text-black font-bold hover:bg-yellow-400">
            S'inscrire
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
