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

  type TabId = "overview" | "challenges" | "achievements" | "pillars"
  const [activeTab, setActiveTab] = useState<TabId>("overview")

  if (loading) {
    return <GamificationDashboardSkeleton />
  }

  const tabs = [
    { id: "overview" as const, label: "Vue d'ensemble", icon: Sparkles, color: "from-teal to-teal" },
    { id: "pillars" as const, label: "Piliers", icon: LayoutGrid, color: "from-lime to-teal" },
    { id: "challenges" as const, label: "Defis", icon: Target, color: "from-coral to-destructive" },
    { id: "achievements" as const, label: "Achievements", icon: Trophy, color: "from-pink to-pink" },
  ]

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header avec stats rapides */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-ink mb-1">Mon Parcours</h2>
          <p className="text-mute">Continue à progresser chaque jour !</p>
        </div>

        <div className="flex items-center gap-4">
          {xp && <XPMiniBar currentXP={xp.total_xp} level={xp.level} />}
          {streak && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-coral/10 rounded-full">
              <Flame className="w-4 h-4 text-coral" />
              <span className="text-coral font-bold">{streak.current_streak}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="relative flex gap-2 flex-wrap p-1 bg-paper-2 rounded-2xl border border-ink w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              className={cn(
                "relative px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300",
                isActive ? "text-ink" : "text-mute hover:text-ink-2"
              )}
              onClick={() => setActiveTab(tab.id)}
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
      <Card className="p-6 bg-gradient-to-br from-paper-2 to-card border-ink">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-ink mb-1">Niveau & XP</h3>
            <p className="text-sm text-mute">Continue à gagner de l'XP !</p>
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
              <p className="text-sm text-mute mb-3">Jalons</p>
              <LevelMilestones currentLevel={xp.level} />
            </div>
          </>
        )}
      </Card>

      {/* Streak Card */}
      <Card className="p-6 bg-gradient-to-br from-paper-2 to-card border-ink">
        <h3 className="text-lg font-bold text-ink mb-4">Streak</h3>

        {streak && (
          <>
            <StreakFlame
              currentStreak={streak.current_streak}
              longestStreak={streak.longest_streak}
              lastActivityDate={streak.last_activity_date}
              size="lg"
            />

            <div className="mt-6">
              <p className="text-sm text-mute mb-3">Cette semaine</p>
              <StreakCalendar streakDays={[]} />
            </div>
          </>
        )}
      </Card>

      {/* Daily Challenges Mini */}
      <Card className="p-6 bg-gradient-to-br from-paper-2 to-card border-ink">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-ink">Défis du jour</h3>
          <span className="text-teal font-bold">
            {completedChallenges.length}/{dailyChallenges.length}
          </span>
        </div>

        <ChallengeStats challenges={dailyChallenges} />

        <motion.button
          className="w-full mt-4 py-3 bg-card hover:bg-muted rounded-xl font-medium text-ink flex items-center justify-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Voir tous les défis
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </Card>

      {/* Achievements Mini */}
      <Card className="p-6 bg-gradient-to-br from-paper-2 to-card border-ink">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-ink">Achievements</h3>
          <span className="text-pink font-bold">
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
            className="flex items-center gap-3 mt-3 p-2 bg-card rounded-lg"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink to-pink flex items-center justify-center">
              <Trophy className="w-4 h-4 text-ink" />
            </div>
            <span className="text-sm text-ink font-medium truncate">
              {achievement.name}
            </span>
          </div>
        ))}
      </Card>

      {/* Piliers Mini - Spans full width */}
      {pillarScores && (
        <Card className="p-6 bg-gradient-to-br from-paper-2 to-card border-ink md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-ink">Equilibre des Piliers</h3>
              <p className="text-sm text-mute">Ecole, Sport & Creativite</p>
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
        {([
          { id: "all", label: "Tous" },
          { id: "unlocked", label: "Débloqués" },
          { id: "locked", label: "À débloquer" },
        ] as const).map((f) => (
          <motion.button
            key={f.id}
            className={cn(
              "px-4 py-2 rounded-xl font-medium transition-all",
              filter === f.id
                ? "bg-pink text-ink"
                : "bg-card text-mute hover:text-ink"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setFilter(f.id)}
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
          <Trophy className="w-12 h-12 text-mute mx-auto mb-4" />
          <p className="text-mute">Aucun achievement dans cette catégorie</p>
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
        <div className="h-64 bg-card rounded-2xl" />
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-card rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!scores) {
    return (
      <div className="text-center py-12">
        <LayoutGrid className="w-12 h-12 text-mute mx-auto mb-4" />
        <p className="text-mute">Impossible de charger les scores des piliers</p>
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
      <div className="h-8 bg-card rounded w-1/3" />
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-32 bg-card rounded-xl" />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-64 bg-card rounded-2xl" />
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
            <div className="w-16 h-1.5 bg-card rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-teal to-teal rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(xp.total_xp % 100)}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {streak && streak.current_streak > 0 && (
        <motion.div
          className="flex items-center gap-1.5 px-2 py-1 bg-coral/10 rounded-full"
          whileHover={{ scale: 1.05 }}
        >
          <Flame className="w-4 h-4 text-coral" />
          <span className="text-coral font-bold text-sm">{streak.current_streak}</span>
        </motion.div>
      )}
    </div>
  )
}
