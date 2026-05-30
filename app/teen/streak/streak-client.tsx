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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-coral to-destructive flex items-center justify-center">
            <Flame className="w-6 h-6 text-ink" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">Streak</h1>
            <p className="text-mute text-sm font-medium">Ta régularité quotidienne</p>
          </div>
        </div>
      </header>

      {/* Main Streak Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br from-coral/20 to-destructive/10 border border-coral/30"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-coral/10 rounded-full blur-[100px]" />

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-mute uppercase tracking-wider font-bold">Streak Actuelle</p>
              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-7xl font-black text-coral">{currentStreak}</span>
                <span className="text-2xl text-mute">jours</span>
              </div>
              {streakMultiplier > 1 && (
                <div className="flex items-center gap-2 mt-4">
                  <Flame className="w-5 h-5 text-coral" />
                  <span className="text-coral font-bold">x{streakMultiplier.toFixed(1)} multiplicateur XP actif!</span>
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-coral to-destructive flex items-center justify-center mb-4">
                <Flame className="w-16 h-16 text-ink" />
              </div>
              <p className="text-sm text-mute">Meilleur: <span className="font-bold text-ink">{bestStreak} jours</span></p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="p-4 rounded-2xl bg-ink/20 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-brand-soft" />
                <span className="font-black text-xl">{totalStreakXP}</span>
              </div>
              <p className="text-[10px] text-mute uppercase tracking-wider">XP Streak</p>
            </div>
            <div className="p-4 rounded-2xl bg-ink/20 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-gold" />
                <span className="font-black text-xl">{unlockedCount}</span>
              </div>
              <p className="text-[10px] text-mute uppercase tracking-wider">Badges</p>
            </div>
            <div className="p-4 rounded-2xl bg-ink/20 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Target className="w-4 h-4 text-success-soft" />
                <span className="font-black text-xl">{daysToNextMilestone}</span>
              </div>
              <p className="text-[10px] text-mute uppercase tracking-wider">Au prochain</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Today's Progress */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black uppercase">Progression du jour</h2>
          <span className="text-sm text-success-soft font-bold">{Math.round(dailyProgress)}% complété</span>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-ink">
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
                      ? "bg-success-soft/10 border-success-soft/30"
                      : "bg-card border-ink"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                    task.completed
                      ? "bg-success-soft border-success-soft"
                      : "border-line"
                  )}>
                    {task.completed && <Check className="w-5 h-5 text-ink" />}
                  </div>
                  <div className="flex-1">
                    <h4 className={cn(
                      "font-bold",
                      task.completed ? "text-mute line-through" : "text-ink"
                    )}>
                      {task.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1 text-brand-soft">
                    <Zap className="w-4 h-4" />
                    <span className="font-bold">+{task.xp}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {dailyProgress < 100 && dailyTasks.length > 0 && (
            <Button className="w-full mt-6 bg-coral text-ink font-bold hover:bg-coral">
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
                "relative p-6 rounded-2xl border text-center transition-all",
                milestone.unlocked
                  ? "bg-gradient-to-br from-coral/10 to-destructive/5 border-coral/30"
                  : "bg-card border-ink opacity-60"
              )}
            >
              {!milestone.unlocked && (
                <div className="absolute top-3 right-3">
                  <Lock className="w-4 h-4 text-mute" />
                </div>
              )}

              <div className="text-5xl mb-4">{milestone.badge}</div>
              <h4 className="font-black text-ink mb-1">{milestone.title}</h4>
              <p className="text-sm text-mute mb-3">{milestone.days} jours</p>

              <div className="flex items-center justify-center gap-2 text-brand-soft">
                <Zap className="w-4 h-4" />
                <span className="font-bold">+{milestone.xpReward} XP</span>
              </div>

              {milestone.unlocked && (
                <div className="flex items-center justify-center gap-1 mt-3 text-success-soft text-sm">
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
          <div className="p-6 rounded-2xl bg-card border border-ink">
            <EmptyState
              preset="feed"
              size="small"
              title="Pas encore d'historique"
              description="Connecte-toi chaque jour pour construire ton historique de streak."
            />
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-card border border-ink">
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
                      ? "bg-gradient-to-br from-coral to-destructive"
                      : "bg-card"
                  )}
                >
                  {day.completed ? (
                    <Flame className="w-4 h-4 text-ink" />
                  ) : (
                    <span className="text-mute text-xs">✕</span>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-6 text-sm">
              <span className="text-mute">{streakHistory.length} derniers jours</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-gradient-to-br from-coral to-destructive" />
                  <span className="text-mute">Actif</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-card" />
                  <span className="text-mute">Manqué</span>
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
        className="p-6 rounded-2xl bg-gradient-to-r from-brand-soft/10 to-pink/5 border border-brand-soft/20"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-soft/20 flex items-center justify-center">
            <Clock className="w-7 h-7 text-brand-soft" />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-ink">Protection Streak</h3>
            <p className="text-sm text-mute">Utilise un pass pour ne pas perdre ta streak si tu manques un jour</p>
          </div>
          <div className="text-right">
            <p className="font-black text-2xl text-brand-soft">{streakPasses}</p>
            <p className="text-xs text-mute">disponibles</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
