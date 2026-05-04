/**
 * TEENS PARTY MOROCCO - Event Challenges List Component
 * ======================================================
 *
 * Liste complète des défis d'un événement avec filtres.
 */

"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Trophy,
  Zap,
  Check,
  Clock,
  Filter,
  ChevronDown,
  Flame,
  Target,
  Star,
  Lock,
} from "lucide-react"
import {
  type EventChallengeWithProgress,
  EVENT_CHALLENGE_TYPE_CONFIG,
  sortChallengesByPriority,
  groupChallengesByType,
} from "../../features/event-challenges"
import {
  EventChallengeCard,
  CompactChallengeCard,
  FeaturedChallengeCard,
  ChallengeProgressCard,
} from "./event-challenge-card"

/* ==========================================================================
   FILTER TYPES
   ========================================================================== */

type FilterType = "all" | "available" | "in_progress" | "completed" | "locked"

const filterConfig: Record<
  FilterType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  all: { label: "Tous", icon: <Target className="w-4 h-4" />, color: "text-white" },
  available: {
    label: "Disponibles",
    icon: <Flame className="w-4 h-4" />,
    color: "text-cyan-400",
  },
  in_progress: {
    label: "En cours",
    icon: <Clock className="w-4 h-4" />,
    color: "text-yellow-400",
  },
  completed: {
    label: "Complétés",
    icon: <Check className="w-4 h-4" />,
    color: "text-green-400",
  },
  locked: {
    label: "Verrouillés",
    icon: <Lock className="w-4 h-4" />,
    color: "text-zinc-500",
  },
}

/* ==========================================================================
   MAIN CHALLENGES LIST
   ========================================================================== */

interface EventChallengesListProps {
  challenges: EventChallengeWithProgress[]
  onChallengeClick?: (challenge: EventChallengeWithProgress) => void
  onChallengeComplete?: (challengeId: string) => void
  showFilters?: boolean
  showStats?: boolean
  compact?: boolean
}

export function EventChallengesList({
  challenges,
  onChallengeClick,
  onChallengeComplete,
  showFilters = true,
  showStats = true,
  compact = false,
}: EventChallengesListProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all")
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Stats
  const stats = useMemo(() => {
    const total = challenges.length
    const completed = challenges.filter(
      (c) => c.user_progress?.status === "completed"
    ).length
    const inProgress = challenges.filter(
      (c) => c.user_progress?.status === "in_progress"
    ).length
    const available = challenges.filter(
      (c) => c.is_available && c.user_progress?.status !== "completed"
    ).length
    const locked = challenges.filter(
      (c) => !c.is_available && c.user_progress?.status !== "completed"
    ).length
    const totalXp = challenges.reduce((sum, c) => sum + c.xp_reward, 0)
    const earnedXp = challenges.reduce(
      (sum, c) => sum + (c.user_progress?.xp_earned || 0),
      0
    )

    return { total, completed, inProgress, available, locked, totalXp, earnedXp }
  }, [challenges])

  // Filtered challenges
  const filteredChallenges = useMemo(() => {
    let filtered = [...challenges]

    switch (activeFilter) {
      case "available":
        filtered = filtered.filter(
          (c) => c.is_available && c.user_progress?.status !== "completed"
        )
        break
      case "in_progress":
        filtered = filtered.filter(
          (c) => c.user_progress?.status === "in_progress"
        )
        break
      case "completed":
        filtered = filtered.filter(
          (c) => c.user_progress?.status === "completed"
        )
        break
      case "locked":
        filtered = filtered.filter(
          (c) => !c.is_available && c.user_progress?.status !== "completed"
        )
        break
    }

    return sortChallengesByPriority(filtered)
  }, [challenges, activeFilter])

  // Featured challenge (first available non-completed with highest XP)
  const featuredChallenge = useMemo(() => {
    return challenges
      .filter((c) => c.is_available && c.user_progress?.status !== "completed")
      .sort((a, b) => b.xp_reward - a.xp_reward)[0]
  }, [challenges])

  // In progress challenges
  const inProgressChallenges = useMemo(() => {
    return challenges.filter((c) => c.user_progress?.status === "in_progress")
  }, [challenges])

  return (
    <div className="space-y-6">
      {/* Stats */}
      {showStats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-zinc-800/50 text-center">
            <p className="text-2xl font-bold text-white">
              {stats.completed}/{stats.total}
            </p>
            <p className="text-xs text-zinc-400">Complétés</p>
          </div>
          <div className="p-3 rounded-xl bg-zinc-800/50 text-center">
            <p className="text-2xl font-bold text-yellow-400">
              {stats.earnedXp}
            </p>
            <p className="text-xs text-zinc-400">XP gagnés</p>
          </div>
          <div className="p-3 rounded-xl bg-zinc-800/50 text-center">
            <p className="text-2xl font-bold text-cyan-400">{stats.available}</p>
            <p className="text-xs text-zinc-400">Disponibles</p>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {showStats && (
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-zinc-400">Progression</span>
            <span className="text-white font-medium">
              {Math.round((stats.completed / stats.total) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${(stats.completed / stats.total) * 100}%`,
              }}
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
            />
          </div>
        </div>
      )}

      {/* Featured Challenge */}
      {!compact && featuredChallenge && activeFilter === "all" && (
        <FeaturedChallengeCard
          challenge={featuredChallenge}
          onClick={() => onChallengeClick?.(featuredChallenge)}
        />
      )}

      {/* In Progress */}
      {!compact && inProgressChallenges.length > 0 && activeFilter === "all" && (
        <div className="space-y-3">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            En cours
          </h3>
          {inProgressChallenges.map((challenge) => (
            <ChallengeProgressCard
              key={challenge.id}
              challenge={challenge}
              onComplete={() => onChallengeComplete?.(challenge.id)}
            />
          ))}
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>{filterConfig[activeFilter].label}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                isFilterOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 mt-2 p-2 rounded-xl bg-zinc-800 border border-zinc-700 shadow-xl z-10 min-w-[200px]"
              >
                {(Object.keys(filterConfig) as FilterType[]).map((filter) => {
                  const config = filterConfig[filter]
                  const count =
                    filter === "all"
                      ? stats.total
                      : filter === "available"
                      ? stats.available
                      : filter === "in_progress"
                      ? stats.inProgress
                      : filter === "completed"
                      ? stats.completed
                      : stats.locked

                  return (
                    <button
                      key={filter}
                      onClick={() => {
                        setActiveFilter(filter)
                        setIsFilterOpen(false)
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-colors ${
                        activeFilter === filter
                          ? "bg-zinc-700 text-white"
                          : "text-zinc-400 hover:bg-zinc-700/50 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={config.color}>{config.icon}</span>
                        <span>{config.label}</span>
                      </div>
                      <span className="text-xs text-zinc-500">{count}</span>
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Challenges List */}
      <div className={compact ? "space-y-2" : "space-y-3"}>
        {filteredChallenges.length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">Aucun défi dans cette catégorie</p>
          </div>
        ) : compact ? (
          filteredChallenges.map((challenge) => (
            <CompactChallengeCard
              key={challenge.id}
              challenge={challenge}
              onClick={() => onChallengeClick?.(challenge)}
            />
          ))
        ) : (
          filteredChallenges.map((challenge) => (
            <EventChallengeCard
              key={challenge.id}
              challenge={challenge}
              onClick={() => onChallengeClick?.(challenge)}
            />
          ))
        )}
      </div>
    </div>
  )
}

/* ==========================================================================
   GROUPED CHALLENGES LIST
   ========================================================================== */

interface GroupedChallengesListProps {
  challenges: EventChallengeWithProgress[]
  onChallengeClick?: (challenge: EventChallengeWithProgress) => void
}

export function GroupedChallengesList({
  challenges,
  onChallengeClick,
}: GroupedChallengesListProps) {
  const grouped = useMemo(() => groupChallengesByType(challenges), [challenges])

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([type, typeChallenges]) => {
        const config = EVENT_CHALLENGE_TYPE_CONFIG[type]
        const completedCount = typeChallenges.filter(
          (c) => c.user_progress?.status === "completed"
        ).length

        return (
          <div key={type} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className={`font-bold flex items-center gap-2 ${config?.color || "text-white"}`}>
                {config?.label || type}
              </h3>
              <span className="text-xs text-zinc-500">
                {completedCount}/{typeChallenges.length}
              </span>
            </div>

            <div className="space-y-2">
              {typeChallenges.map((challenge) => (
                <CompactChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  onClick={() => onChallengeClick?.(challenge)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ==========================================================================
   CHALLENGE SUMMARY WIDGET
   ========================================================================== */

interface ChallengeSummaryWidgetProps {
  challenges: EventChallengeWithProgress[]
  onClick?: () => void
}

export function ChallengeSummaryWidget({
  challenges,
  onClick,
}: ChallengeSummaryWidgetProps) {
  const stats = useMemo(() => {
    const total = challenges.length
    const completed = challenges.filter(
      (c) => c.user_progress?.status === "completed"
    ).length
    const available = challenges.filter(
      (c) => c.is_available && c.user_progress?.status !== "completed"
    ).length
    const totalXp = challenges.reduce(
      (sum, c) => sum + (c.user_progress?.xp_earned || 0),
      0
    )

    return { total, completed, available, totalXp }
  }, [challenges])

  const percentage = Math.round((stats.completed / stats.total) * 100)

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 cursor-pointer"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-cyan-400" />
          <span className="font-bold text-white">Défis de l'événement</span>
        </div>
        <span className="text-sm text-cyan-400">{percentage}%</span>
      </div>

      {/* Progress */}
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-zinc-400">
            <span className="text-white font-bold">{stats.completed}</span>/
            {stats.total} complétés
          </span>
          {stats.available > 0 && (
            <span className="text-cyan-400">
              {stats.available} disponibles
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-yellow-400">
          <Zap className="w-4 h-4" />
          <span className="font-bold">{stats.totalXp}</span>
        </div>
      </div>
    </motion.div>
  )
}
