"use client"

import { useEffect, useState } from "react"
import { Flame, Zap, Trophy, Target, Check, Lock } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SegmentedProgress } from "@/components/ui/progress"
import { StickerCard } from "@/components/ui/sticker-card"
import { Niv, DarkSurface, NivCelebration } from "@/components/brand"
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
  milestones: Milestone[]
  streakHistory: StreakDay[]
  dailyTasks: DailyTask[]
}

export function StreakClient({
  currentStreak,
  bestStreak,
  milestones,
  streakHistory,
  dailyTasks,
}: StreakClientProps) {
  const nextMilestone = milestones.find((m) => !m.unlocked)
  const daysToNextMilestone = nextMilestone ? nextMilestone.days - currentStreak : 0
  const unlockedCount = milestones.filter((m) => m.unlocked).length

  const totalStreakXP = streakHistory.filter((d) => d.completed).reduce((sum, d) => sum + d.xpEarned, 0)

  const completedTasks = dailyTasks.filter((t) => t.completed).length

  // #187 — moment de pic « premier franchissement de milestone ». Le streak
  // est exactement sur un palier (3/7/14…) : on monte <NivCelebration> une
  // seule fois par palier (garde localStorage), pas à chaque visite.
  const crossedMilestone = milestones.find((m) => m.days === currentStreak)
  const [showStreakPeak, setShowStreakPeak] = useState(false)
  useEffect(() => {
    if (!crossedMilestone) return
    const key = `nivy.streak.celebrated.${crossedMilestone.days}`
    try {
      if (window.localStorage.getItem(key)) return
      window.localStorage.setItem(key, "1")
    } catch {
      // localStorage indispo (mode privé) : on célèbre quand même cette session.
    }
    setShowStreakPeak(true)
  }, [crossedMilestone])

  return (
    <div className="space-y-8 pt-6">
      {/* #187 — pic premier streak : surface sombre charte plein écran. */}
      {showStreakPeak && crossedMilestone && (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- backdrop click-to-dismiss sur une overlay role=dialog (pré-existant)
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Palier de streak atteint"
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink/80 p-4"
          onClick={() => setShowStreakPeak(false)}
        >
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <NivCelebration
              tone="pink"
              palette="reward"
              title={`Streak ${crossedMilestone.badge}`}
              value={<>{currentStreak} j</>}
              caption={`${crossedMilestone.title} — +${crossedMilestone.xpReward} XP. Ne lâche rien !`}
              action={
                <Button variant="pink" onClick={() => setShowStreakPeak(false)}>
                  Continuer
                </Button>
              }
            />
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center gap-4">
        <Niv mood="hype" size={72} />
        <div>
          <p className="eyebrow tracking-[0.16em]">Streak 🔥</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            Ta <em className="font-semibold italic text-pink">streak</em>
          </h1>
          <p className="text-sm text-mute">Ta régularité quotidienne.</p>
        </div>
      </header>

      {/* Main streak hero — surface sombre ponctuelle */}
      <DarkSurface tone="pink" shadow className="p-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div>
            <p className="eyebrow tracking-[0.16em] text-paper/60">Streak actuelle</p>
            <p className="mt-2 flex items-baseline gap-3 font-display font-extrabold leading-none text-pink">
              <span className="text-7xl tabular-nums">{currentStreak}</span>
              <span className="text-2xl text-paper/60">jours</span>
            </p>
            {/* #201 Stop the lies — bannière « xN multiplicateur XP actif ! »
                retirée : le multiplicateur n'était jamais appliqué au calcul XP. */}
          </div>
          <div className="text-center">
            <span className="mx-auto grid size-28 place-items-center rounded-2xl border-2 border-paper/30">
              <Flame className="size-14 text-pink" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm text-paper/60">Meilleur : <span className="font-bold text-paper">{bestStreak} jours</span></p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4">
          <DarkStat icon={Zap} color="text-gold" value={totalStreakXP} label="XP streak" />
          <DarkStat icon={Trophy} color="text-gold" value={unlockedCount} label="Badges" />
          <DarkStat icon={Target} color="text-teal" value={daysToNextMilestone} label="Au prochain" />
        </div>
      </DarkSurface>

      {/* Today's progress */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="eyebrow tracking-[0.16em]">Progression du jour</p>
          <span className="font-mono text-sm font-bold text-lime">
            {dailyTasks.length ? `${completedTasks}/${dailyTasks.length}` : "0/0"}
          </span>
        </div>

        <StickerCard className="gap-6 p-6">
          <SegmentedProgress steps={Math.max(1, dailyTasks.length)} current={completedTasks} size="md" />

          {dailyTasks.length === 0 ? (
            <EmptyState preset="quests" size="small" title="Défis du jour à venir" description="Tes défis quotidiens apparaîtront ici une fois assignés." />
          ) : (
            <div className="space-y-3">
              {dailyTasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center gap-4 rounded-xl border-2 p-4",
                    task.completed ? "border-lime bg-success-soft" : "border-line bg-white"
                  )}
                >
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-full border-2", task.completed ? "border-lime bg-lime" : "border-ink bg-white")}>
                    {task.completed && <Check className="size-5 text-ink" strokeWidth={3} aria-hidden="true" />}
                  </span>
                  <h4 className={cn("flex-1 font-bold", task.completed ? "text-mute line-through" : "text-ink")}>{task.title}</h4>
                  <span className="flex items-center gap-1 font-mono font-bold text-gold">
                    <Zap className="size-4" aria-hidden="true" />+{task.xp}
                  </span>
                </div>
              ))}
            </div>
          )}

          {completedTasks < dailyTasks.length && dailyTasks.length > 0 && (
            <Button asChild variant="pink" className="w-full">
              <Link href="/teen/daily"><Flame className="mr-2 size-4" aria-hidden="true" />Compléter pour maintenir la streak</Link>
            </Button>
          )}
        </StickerCard>
      </section>

      {/* Milestones */}
      <section className="space-y-4">
        <p className="eyebrow tracking-[0.16em]">Objectifs</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {milestones.map((milestone) => (
            <StickerCard key={milestone.days} className={cn("relative items-center gap-1 p-6 text-center", !milestone.unlocked && "opacity-60")}>
              {!milestone.unlocked && <Lock className="absolute right-3 top-3 size-4 text-mute" aria-hidden="true" />}
              <div className="text-5xl" aria-hidden="true">{milestone.badge}</div>
              <h4 className="font-display font-extrabold text-ink">{milestone.title}</h4>
              <p className="text-sm text-mute">{milestone.days} jours</p>
              <span className="mt-1 flex items-center gap-1 font-mono font-bold text-gold">
                <Zap className="size-4" aria-hidden="true" />+{milestone.xpReward} XP
              </span>
              {milestone.unlocked && (
                <span className="mt-1 flex items-center gap-1 font-mono text-sm font-bold text-lime">
                  <Check className="size-4" aria-hidden="true" />Débloqué
                </span>
              )}
            </StickerCard>
          ))}
        </div>
      </section>

      {/* History */}
      <section className="space-y-4">
        <p className="eyebrow tracking-[0.16em]">Historique</p>
        {streakHistory.length === 0 ? (
          <StickerCard className="p-6">
            <EmptyState preset="feed" size="small" title="Pas encore d'historique" description="Connecte-toi chaque jour pour construire ton historique de streak." />
          </StickerCard>
        ) : (
          <StickerCard className="gap-6 p-6">
            <div className="grid grid-cols-10 gap-2">
              {streakHistory.map((day) => (
                <div key={day.date} className={cn("grid aspect-square place-items-center rounded-xl border-2 border-ink", day.completed ? "bg-pink" : "bg-paper-2")}>
                  {day.completed ? <Flame className="size-4 text-ink" aria-hidden="true" /> : <span className="text-xs text-mute">✕</span>}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between font-mono text-sm">
              <span className="text-mute">{streakHistory.length} derniers jours</span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-2 text-mute"><span className="size-3 rounded border-2 border-ink bg-pink" />Actif</span>
                <span className="flex items-center gap-2 text-mute"><span className="size-3 rounded border-2 border-ink bg-paper-2" />Manqué</span>
              </div>
            </div>
          </StickerCard>
        )}
      </section>

      {/* #201 Stop the lies — carte « Protection streak » retirée : la colonne
          `streak_passes` n'existe pas (valeur toujours 0) et aucun mécanisme de
          pass n'est implémenté. À réintroduire quand la feature existera. */}
    </div>
  )
}

function DarkStat({ icon: Icon, color, value, label }: { icon: typeof Zap; color: string; value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-paper/15 bg-paper/5 p-4 text-center">
      <div className="flex items-center justify-center gap-2">
        <Icon className={cn("size-4", color)} aria-hidden="true" />
        <span className="font-display text-xl font-extrabold tabular-nums text-paper">{value}</span>
      </div>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/60">{label}</p>
    </div>
  )
}
