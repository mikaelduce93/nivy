"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Dumbbell, Zap, Flame, Trophy, Clock, Play, Check, Target, Heart, Timer, TrendingUp, Calendar, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { DefiCard } from "@/components/teen/defi-card"

export type ApiChallenge = {
  id: string
  // The DB column is `name` (not `title`). Kept both during migration so the
  // server mapping in page.tsx can pass either; we prefer `name` here.
  name?: string
  title?: string
  description: string | null
  challenge_type: string
  sport_category: string | null
  xp_reward: number
  objective_value: number
  duration_days?: number | null
  difficulty?: string | null
  icon?: string | null
  is_started: boolean
  is_completed: boolean
  progress: {
    progress_percent: number
    current_value: number
    completed: boolean
  } | null
}

export type ApiStats = {
  total: number
  started: number
  completed: number
  totalXpEarned: number
}

// CATEGORIES is a UI catalogue (filter chips), not a data array
const CATEGORIES = [
  { id: "all", label: "Tous", icon: Dumbbell },
  { id: "strength", label: "Force", icon: Target },
  { id: "cardio", label: "Cardio", icon: Heart },
  { id: "core", label: "Core", icon: Star },
]

interface Props {
  challenges: ApiChallenge[]
  stats: ApiStats
}

/**
 * Map an API physical challenge to the unified <DefiCard /> contract.
 * - title   ← challenge.name (DB column) || challenge.title (legacy alias)
 * - target  ← challenge.objective_value (DB schema; no `target_count` column exists)
 * - current ← challenge.progress.current_value (DB schema; no `current_count` column)
 * - status  ← is_completed ? "completed" : "active"
 * Note: the DB has no image_url column on physical_challenges — imageUrl stays undefined.
 *       The icon column may store an emoji ("💪") or non-lucide name, so we leave
 *       iconName unset and rely on the variant's default Dumbbell icon.
 */
function challengeToDefiProps(challenge: ApiChallenge) {
  const title = challenge.name ?? challenge.title ?? ""
  const target = Math.max(0, challenge.objective_value || 0)
  const current = Math.max(
    0,
    challenge.progress?.current_value ?? 0,
  )
  return {
    title,
    description: challenge.description ?? undefined,
    xpReward: challenge.xp_reward || 0,
    status: (challenge.is_completed ? "completed" : "active") as
      | "completed"
      | "active",
    progress: target > 0 ? { current, target } : undefined,
  }
}

export function DefisPhysiquesClient({ challenges, stats }: Props) {
  const [category, setCategory] = useState("all")
  const loading = false

  const dailyChallenges = challenges.filter((c) => c.challenge_type === "daily")
  const programs = challenges.filter((c) => c.challenge_type !== "daily")

  const filteredChallenges =
    category === "all" ? dailyChallenges : dailyChallenges.filter((c) => c.sport_category === category)

  const completedToday = dailyChallenges.filter((c) => c.is_completed).length
  const totalToday = dailyChallenges.length
  const todayPct = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0

  // TODO(data): expose teen-level workout history & weekly minutes via API.
  // For now derive what we can from stats; rest displayed as 0/empty.
  const totalWorkouts = stats.completed
  const totalXPEarned = stats.totalXpEarned
  const currentStreak = 0
  const minutesThisWeek = 0
  const workoutHistory: Array<{ id: string; name: string; date: string; duration: string; xp: number }> = []

  return (
    <div className="min-h-screen pb-32 space-y-8 pt-6">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">Défis Physiques</h1>
                <p className="text-zinc-500 text-sm font-medium">Bouge et gagne des XP</p>
              </div>
            </div>
          </div>

          {/* Streak */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="font-black text-orange-500">{currentStreak}</span>
            <span className="text-xs text-orange-500/70">jours</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="font-black text-xl">{totalWorkouts}</span>
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Workouts</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-gen-z-lavender" />
              <span className="font-black text-xl">{totalXPEarned.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">XP Total</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Timer className="w-4 h-4 text-gen-z-mint" />
              <span className="font-black text-xl">{minutesThisWeek}</span>
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Min/Semaine</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Check className="w-4 h-4 text-gen-z-coral" />
              <span className="font-black text-xl">{completedToday}/{totalToday}</span>
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Aujourd'hui</p>
          </motion.div>
        </div>
      </header>

      {/* Today's Progress */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 rounded-3xl bg-gradient-to-br from-orange-500/10 to-red-500/5 border border-orange-500/20"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg">Progression du jour</h3>
          <span className="text-sm text-orange-500 font-bold">{todayPct}%</span>
        </div>
        <Progress value={todayPct} className="h-3" />
        <p className="text-sm text-zinc-500 mt-3">
          {totalToday > 0 && completedToday === totalToday
            ? "Bravo! Tu as terminé tous les défis du jour! 🎉"
            : `${Math.max(0, totalToday - completedToday)} défis restants pour compléter ta journée`}
        </p>
      </motion.div>

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
                  ? "bg-orange-500 text-black"
                  : "bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              )}
            >
              <Icon className="w-4 h-4" />
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Daily Challenges — unified <DefiCard type="physical" /> */}
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase">Défis du Jour</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredChallenges.map((challenge, idx) => {
            const props = challengeToDefiProps(challenge)
            return (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <DefiCard type="physical" {...props} />
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Programs — unified <DefiCard type="physical" /> */}
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase">Programmes</h2>

        {programs.length === 0 && !loading && (
          <div className="p-8 rounded-3xl bg-zinc-900/50 border border-white/5 text-center">
            <Calendar className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">Aucun programme disponible.</p>
          </div>
        )}

        <div className="space-y-4">
          {programs.map((program, idx) => {
            const props = challengeToDefiProps(program)
            return (
              <motion.div
                key={program.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <DefiCard type="physical" {...props} />
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Workout History */}
      {/* TODO(data): no per-teen workout sessions endpoint yet — list stays empty until backend exists. */}
      {workoutHistory.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-black uppercase">Historique</h2>
          <div className="space-y-3">
            {workoutHistory.map((workout, idx) => (
              <motion.div
                key={workout.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5"
              >
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white truncate">{workout.name}</h4>
                  <div className="flex items-center gap-3 text-sm text-zinc-400">
                    <span>{workout.date}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {workout.duration}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-gen-z-lavender">
                  <Zap className="w-4 h-4" />
                  <span className="font-bold">+{workout.xp}</span>
                </div>
                <Check className="w-5 h-5 text-gen-z-mint" />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Quick Start */}
      <div className="flex gap-4">
        <Button className="flex-1 h-14 bg-orange-500 text-black font-bold hover:bg-orange-400">
          <Play className="w-5 h-5 mr-2" />
          Workout Rapide
        </Button>
        <Button variant="outline" className="flex-1 h-14">
          <TrendingUp className="w-5 h-5 mr-2" />
          Mes Stats
        </Button>
      </div>
    </div>
  )
}
