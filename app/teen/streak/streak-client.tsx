"use client"

import { motion } from "framer-motion"
import { Flame, Zap, Trophy, Target, Check, Lock, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { EmptyState } from "@/components/ui/states/empty-state"

interface Milestone {
  days: number
  xpReward: number
  badge: string
  title: string
  unlocked: boolean
}

interface StreakDay {
  date: string
  completed: boolean
  xpEarned: number
}

interface DailyTask {
  id: string
  title: string
  completed: boolean
  xp: number
}

interface StreakClientProps {
  currentStreak: number
  bestStreak: number
  streakMultiplier: number
  streakPasses: number
  milestones: Milestone[]
  streakHistory: StreakDay[]
  dailyTasks: DailyTask[]
}

export function StreakClient({
  currentStreak,
  bestStreak,
  streakMultiplier,
  streakPasses,
  milestones,
  streakHistory,
  dailyTasks,
}: StreakClientProps) {
  const nextMilestone = milestones.find((m) => !m.unlocked)
  const daysToNextMilestone = nextMilestone ? nextMilestone.days - currentStreak : 0
  const unlockedCount = milestones.filter((m) => m.unlocked).length

  const totalStreakXP = streakHistory
    .filter((d) => d.completed)
    .reduce((sum, d) => sum + d.xpEarned, 0)

  const completedTasks = dailyTasks.filter((t) => t.completed).length
  const dailyProgress = dailyTasks.length > 0
    ? (completedTasks / dailyTasks.length) * 100
    : 0

  return (
    <div className="space-y-8 pt-6">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <Flame className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">Streak</h1>
            <p className="text-zinc-500 text-sm font-medium">Ta régularité quotidienne</p>
          </div>
        </div>
      </header>

      {/* Main Streak Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-orange-500/20 to-red-500/10 border border-orange-500/30"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[100px]" />

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400 uppercase tracking-wider font-bold">Streak Actuelle</p>
              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-7xl font-black text-orange-500">{currentStreak}</span>
                <span className="text-2xl text-zinc-500">jours</span>
              </div>
              {streakMultiplier > 1 && (
                <div className="flex items-center gap-2 mt-4">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span className="text-orange-500 font-bold">x{streakMultiplier.toFixed(1)} multiplicateur XP actif!</span>
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-4">
                <Flame className="w-16 h-16 text-black" />
              </div>
              <p className="text-sm text-zinc-400">Meilleur: <span className="font-bold text-white">{bestStreak} jours</span></p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="p-4 rounded-2xl bg-black/20 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-gen-z-lavender" />
                <span className="font-black text-xl">{totalStreakXP}</span>
              </div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">XP Streak</p>
            </div>
            <div className="p-4 rounded-2xl bg-black/20 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="font-black text-xl">{unlockedCount}</span>
              </div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Badges</p>
            </div>
            <div className="p-4 rounded-2xl bg-black/20 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Target className="w-4 h-4 text-gen-z-mint" />
                <span className="font-black text-xl">{daysToNextMilestone}</span>
              </div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Au prochain</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Today's Progress */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black uppercase">Progression du jour</h2>
          <span className="text-sm text-gen-z-mint font-bold">{Math.round(dailyProgress)}% complété</span>
        </div>

        <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5">
          <Progress value={dailyProgress} className="h-3 mb-6" />

          {dailyTasks.length === 0 ? (
            <EmptyState
              preset="quests"
              size="small"
              title="Missions du jour à venir"
              description="Les missions quotidiennes se chargent une fois connecté."
            />
          ) : (
            <div className="space-y-3">
              {dailyTasks.map((task, idx) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                    task.completed
                      ? "bg-gen-z-mint/10 border-gen-z-mint/30"
                      : "bg-zinc-800/50 border-white/5"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                    task.completed
                      ? "bg-gen-z-mint border-gen-z-mint"
                      : "border-zinc-500"
                  )}>
                    {task.completed && <Check className="w-5 h-5 text-black" />}
                  </div>
                  <div className="flex-1">
                    <h4 className={cn(
                      "font-bold",
                      task.completed ? "text-zinc-400 line-through" : "text-white"
                    )}>
                      {task.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1 text-gen-z-lavender">
                    <Zap className="w-4 h-4" />
                    <span className="font-bold">+{task.xp}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {dailyProgress < 100 && dailyTasks.length > 0 && (
            <Button className="w-full mt-6 bg-orange-500 text-black font-bold hover:bg-orange-400">
              <Flame className="w-4 h-4 mr-2" />
              Compléter pour maintenir la streak
            </Button>
          )}
        </div>
      </section>

      {/* Milestones */}
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase">Objectifs</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {milestones.map((milestone, idx) => (
            <motion.div
              key={milestone.days}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                "relative p-6 rounded-3xl border text-center transition-all",
                milestone.unlocked
                  ? "bg-gradient-to-br from-orange-500/10 to-red-500/5 border-orange-500/30"
                  : "bg-zinc-900/50 border-white/5 opacity-60"
              )}
            >
              {!milestone.unlocked && (
                <div className="absolute top-3 right-3">
                  <Lock className="w-4 h-4 text-zinc-500" />
                </div>
              )}

              <div className="text-5xl mb-4">{milestone.badge}</div>
              <h4 className="font-black text-white mb-1">{milestone.title}</h4>
              <p className="text-sm text-zinc-400 mb-3">{milestone.days} jours</p>

              <div className="flex items-center justify-center gap-2 text-gen-z-lavender">
                <Zap className="w-4 h-4" />
                <span className="font-bold">+{milestone.xpReward} XP</span>
              </div>

              {milestone.unlocked && (
                <div className="flex items-center justify-center gap-1 mt-3 text-gen-z-mint text-sm">
                  <Check className="w-4 h-4" />
                  <span className="font-bold">Débloqué</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* History */}
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase">Historique</h2>

        {streakHistory.length === 0 ? (
          <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5">
            <EmptyState
              preset="feed"
              size="small"
              title="Pas encore d'historique"
              description="Connecte-toi chaque jour pour construire ton historique de streak."
            />
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5">
            <div className="grid grid-cols-10 gap-2">
              {streakHistory.map((day, idx) => (
                <motion.div
                  key={day.date}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className={cn(
                    "aspect-square rounded-xl flex items-center justify-center transition-all",
                    day.completed
                      ? "bg-gradient-to-br from-orange-500 to-red-500"
                      : "bg-zinc-800"
                  )}
                >
                  {day.completed ? (
                    <Flame className="w-4 h-4 text-white" />
                  ) : (
                    <span className="text-zinc-600 text-xs">✕</span>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-6 text-sm">
              <span className="text-zinc-500">{streakHistory.length} derniers jours</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-gradient-to-br from-orange-500 to-red-500" />
                  <span className="text-zinc-400">Actif</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-zinc-800" />
                  <span className="text-zinc-400">Manqué</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Streak Protection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-3xl bg-gradient-to-r from-gen-z-lavender/10 to-purple-500/5 border border-gen-z-lavender/20"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gen-z-lavender/20 flex items-center justify-center">
            <Clock className="w-7 h-7 text-gen-z-lavender" />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-white">Protection Streak</h3>
            <p className="text-sm text-zinc-400">Utilise un pass pour ne pas perdre ta streak si tu manques un jour</p>
          </div>
          <div className="text-right">
            <p className="font-black text-2xl text-gen-z-lavender">{streakPasses}</p>
            <p className="text-xs text-zinc-500">disponibles</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
