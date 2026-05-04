"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Trophy, Flame, Target, ChevronRight, LayoutGrid } from "lucide-react"
import { cn } from "@/lib/utils"
import { useGamificationContext } from "./gamification-provider"
import { XPBar, XPMiniBar } from "./xp-bar"
import { StreakFlame, StreakCalendar } from "./streak-flame"
import { LevelBadge, LevelMilestones } from "./level-badge"
import { AchievementCard, AchievementProgressOverview } from "./achievement-unlock"
import { DailyChallenges, ChallengeStats } from "./daily-challenges"
import { PillarBalanceWidget, PillarMiniWidget, PillarDashboard, type PillarScores } from "./pillars"
import { usePillars } from "@/lib/hooks/use-pillars"
import { Card } from "@/components/ui/card"

/* ==========================================================================
   GAMIFICATION DASHBOARD - Vue complète
   ========================================================================== */

interface GamificationDashboardProps {
  teenId: string
  className?: string
}

export function GamificationDashboard({ teenId, className }: GamificationDashboardProps) {
  const {
    xp,
    streak,
    achievements,
    dailyChallenges,
    loading,
    showXPGain,
  } = useGamificationContext()

  // Pillar scores
  const { scores: pillarScores, loading: pillarsLoading } = usePillars({ teenId })

  const [activeTab, setActiveTab] = useState<"overview" | "challenges" | "achievements" | "pillars">("overview")

  if (loading) {
    return <GamificationDashboardSkeleton />
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header avec stats rapides */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white mb-1">Mon Parcours</h2>
          <p className="text-zinc-500">Continue à progresser chaque jour !</p>
        </div>

        <div className="flex items-center gap-4">
          {xp && <XPMiniBar currentXP={xp.total_xp} level={xp.level} />}
          {streak && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 rounded-full">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-orange-500 font-bold">{streak.current_streak}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="relative flex gap-2 flex-wrap p-1 bg-white/5 rounded-2xl border border-white/10 w-fit">
        {[
          { id: "overview", label: "Vue d'ensemble", icon: Sparkles, color: "from-cyan-500 to-blue-500" },
          { id: "pillars", label: "Piliers", icon: LayoutGrid, color: "from-emerald-500 to-teal-500" },
          { id: "challenges", label: "Defis", icon: Target, color: "from-orange-500 to-red-500" },
          { id: "achievements", label: "Achievements", icon: Trophy, color: "from-purple-500 to-pink-500" },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              className={cn(
                "relative px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300",
                isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
              onClick={() => setActiveTab(tab.id as any)}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabBackground"
                  className={cn("absolute inset-0 rounded-xl bg-gradient-to-r shadow-lg", tab.color)}
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon className={cn("w-4 h-4", isActive ? "animate-pulse" : "")} />
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30,
            duration: 0.3 
          }}
          className="relative z-10"
        >
        {activeTab === "overview" && (
          <OverviewTab
            xp={xp}
            streak={streak}
            achievements={achievements}
            dailyChallenges={dailyChallenges}
            teenId={teenId}
            pillarScores={pillarScores}
          />
        )}

        {activeTab === "challenges" && (
          <ChallengesTab
            challenges={dailyChallenges}
            teenId={teenId}
            onXPGain={showXPGain}
          />
        )}

        {activeTab === "achievements" && (
          <AchievementsTab achievements={achievements} />
        )}

        {activeTab === "pillars" && (
          <PillarsTab
            scores={pillarScores}
            loading={pillarsLoading}
          />
        )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ==========================================================================
   OVERVIEW TAB
   ========================================================================== */

interface OverviewTabProps {
  xp: any
  streak: any
  achievements: any[]
  dailyChallenges: any[]
  teenId: string
  pillarScores?: PillarScores | null
}

function OverviewTab({ xp, streak, achievements, dailyChallenges, pillarScores }: OverviewTabProps) {
  const unlockedAchievements = achievements.filter((a) => a.unlocked_at)
  const completedChallenges = dailyChallenges.filter((c) => c.status === "completed")

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* XP & Level Card */}
      <Card className="p-6 bg-gradient-to-br from-zinc-900 to-zinc-800 border-zinc-700">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Niveau & XP</h3>
            <p className="text-sm text-zinc-500">Continue à gagner de l'XP !</p>
          </div>
          {xp && <LevelBadge level={xp.level} size="lg" />}
        </div>

        {xp && (
          <>
            <XPBar
              currentXP={xp.total_xp}
              level={xp.level}
              xpToNextLevel={xp.xp_to_next_level}
              showLevel={false}
            />

            <div className="mt-6">
              <p className="text-sm text-zinc-500 mb-3">Jalons</p>
              <LevelMilestones currentLevel={xp.level} />
            </div>
          </>
        )}
      </Card>

      {/* Streak Card */}
      <Card className="p-6 bg-gradient-to-br from-zinc-900 to-zinc-800 border-zinc-700">
        <h3 className="text-lg font-bold text-white mb-4">Streak</h3>

        {streak && (
          <>
            <StreakFlame
              currentStreak={streak.current_streak}
              longestStreak={streak.longest_streak}
              lastActivityDate={streak.last_activity_date}
              size="lg"
            />

            <div className="mt-6">
              <p className="text-sm text-zinc-500 mb-3">Cette semaine</p>
              <StreakCalendar streakDays={[]} />
            </div>
          </>
        )}
      </Card>

      {/* Daily Challenges Mini */}
      <Card className="p-6 bg-gradient-to-br from-zinc-900 to-zinc-800 border-zinc-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Défis du jour</h3>
          <span className="text-cyan-400 font-bold">
            {completedChallenges.length}/{dailyChallenges.length}
          </span>
        </div>

        <ChallengeStats challenges={dailyChallenges} />

        <motion.button
          className="w-full mt-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium text-white flex items-center justify-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Voir tous les défis
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </Card>

      {/* Achievements Mini */}
      <Card className="p-6 bg-gradient-to-br from-zinc-900 to-zinc-800 border-zinc-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Achievements</h3>
          <span className="text-purple-400 font-bold">
            {unlockedAchievements.length}/{achievements.length}
          </span>
        </div>

        <AchievementProgressOverview
          total={achievements.length}
          unlocked={unlockedAchievements.length}
          className="!bg-transparent !p-0"
        />

        {/* Recent achievements */}
        {unlockedAchievements.slice(0, 3).map((achievement) => (
          <div
            key={achievement.id}
            className="flex items-center gap-3 mt-3 p-2 bg-zinc-800/50 rounded-lg"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-white font-medium truncate">
              {achievement.name}
            </span>
          </div>
        ))}
      </Card>

      {/* Piliers Mini - Spans full width */}
      {pillarScores && (
        <Card className="p-6 bg-gradient-to-br from-zinc-900 to-zinc-800 border-zinc-700 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Equilibre des Piliers</h3>
              <p className="text-sm text-zinc-500">Ecole, Sport & Creativite</p>
            </div>
            <PillarMiniWidget scores={pillarScores} />
          </div>
          <PillarBalanceWidget scores={pillarScores} className="!p-0 !bg-transparent !border-none" />
        </Card>
      )}
    </div>
  )
}

/* ==========================================================================
   CHALLENGES TAB
   ========================================================================== */

interface ChallengesTabProps {
  challenges: any[]
  teenId: string
  onXPGain: (amount: number, reason?: string) => void
}

function ChallengesTab({ challenges, teenId, onXPGain }: ChallengesTabProps) {
  return (
    <div className="space-y-6">
      <DailyChallenges
        challenges={challenges}
        teenId={teenId}
        onComplete={(challenge, xp) => {
          onXPGain(xp, `Défi complété: ${challenge.challenge?.title}`)
        }}
      />
    </div>
  )
}

/* ==========================================================================
   ACHIEVEMENTS TAB
   ========================================================================== */

interface AchievementsTabProps {
  achievements: any[]
}

function AchievementsTab({ achievements }: AchievementsTabProps) {
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all")

  const filteredAchievements = achievements.filter((a) => {
    if (filter === "unlocked") return a.unlocked_at
    if (filter === "locked") return !a.unlocked_at
    return true
  })

  const unlockedCount = achievements.filter((a) => a.unlocked_at).length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <AchievementProgressOverview
        total={achievements.length}
        unlocked={unlockedCount}
      />

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { id: "all", label: "Tous" },
          { id: "unlocked", label: "Débloqués" },
          { id: "locked", label: "À débloquer" },
        ].map((f) => (
          <motion.button
            key={f.id}
            className={cn(
              "px-4 py-2 rounded-xl font-medium transition-all",
              filter === f.id
                ? "bg-purple-500 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setFilter(f.id as any)}
          >
            {f.label}
          </motion.button>
        ))}
      </div>

      {/* List */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredAchievements.map((achievement, index) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <AchievementCard achievement={achievement} />
          </motion.div>
        ))}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400">Aucun achievement dans cette catégorie</p>
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   PILLARS TAB
   ========================================================================== */

interface PillarsTabProps {
  scores: PillarScores | null
  loading: boolean
}

function PillarsTab({ scores, loading }: PillarsTabProps) {
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-64 bg-zinc-800 rounded-2xl" />
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-zinc-800 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!scores) {
    return (
      <div className="text-center py-12">
        <LayoutGrid className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
        <p className="text-zinc-400">Impossible de charger les scores des piliers</p>
      </div>
    )
  }

  return <PillarDashboard scores={scores} />
}

/* ==========================================================================
   SKELETON
   ========================================================================== */

function GamificationDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-zinc-800 rounded w-1/3" />
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-32 bg-zinc-800 rounded-xl" />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-64 bg-zinc-800 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

/* ==========================================================================
   GAMIFICATION HEADER WIDGET - Pour navbar/header
   ========================================================================== */

interface GamificationHeaderWidgetProps {
  className?: string
}

export function GamificationHeaderWidget({ className }: GamificationHeaderWidgetProps) {
  const { xp, streak } = useGamificationContext()

  if (!xp && !streak) return null

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {xp && (
        <motion.div
          className="flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
        >
          <LevelBadge level={xp.level} size="sm" />
          <div className="hidden sm:block">
            <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(xp.total_xp % 100)}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {streak && streak.current_streak > 0 && (
        <motion.div
          className="flex items-center gap-1.5 px-2 py-1 bg-orange-500/10 rounded-full"
          whileHover={{ scale: 1.05 }}
        >
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-orange-500 font-bold text-sm">{streak.current_streak}</span>
        </motion.div>
      )}
    </div>
  )
}
