"use client"

import { useState, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BookOpen,
  Dumbbell,
  Palette,
  Check,
  X,
  Clock,
  Zap,
  Play,
  ChevronRight,
  RefreshCw,
  Trophy,
  Timer,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { completeChallenge, skipChallenge } from "@/features/gamification"
import type { DailyChallenge } from "@/lib/hooks/use-gamification"

/* ==========================================================================
   CATEGORY CONFIG
   ========================================================================== */

const CATEGORY_CONFIG = {
  school: {
    icon: BookOpen,
    gradient: "from-blue-500 to-cyan-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    label: "School",
    color: "text-blue-400",
  },
  sport: {
    icon: Dumbbell,
    gradient: "from-green-500 to-emerald-500",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    label: "Sport",
    color: "text-green-400",
  },
  crea: {
    icon: Palette,
    gradient: "from-purple-500 to-pink-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    label: "Créa",
    color: "text-purple-400",
  },
}

/* ==========================================================================
   DAILY CHALLENGES LIST
   ========================================================================== */

interface DailyChallengesProps {
  challenges: DailyChallenge[]
  teenId: string
  onComplete?: (challenge: DailyChallenge, xpEarned: number) => void
  className?: string
}

export function DailyChallenges({
  challenges,
  teenId,
  onComplete,
  className,
}: DailyChallengesProps) {
  const completedCount = challenges.filter((c) => c.status === "completed").length
  const totalCount = challenges.length

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Défis du jour</h3>
          <p className="text-sm text-zinc-500">
            {completedCount} / {totalCount} complétés
          </p>
        </div>

        {/* Progress circle mini */}
        <div className="relative w-12 h-12">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="4"
              className="text-zinc-800"
            />
            <motion.circle
              cx="24"
              cy="24"
              r="20"
              fill="transparent"
              stroke="url(#challengeGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={126}
              initial={{ strokeDashoffset: 126 }}
              animate={{
                strokeDashoffset: 126 - (completedCount / totalCount) * 126 || 126,
              }}
              transition={{ duration: 0.5 }}
            />
            <defs>
              <linearGradient id="challengeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00d4ff" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-white">{completedCount}</span>
          </div>
        </div>
      </div>

      {/* Challenges list */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {challenges.map((challenge, index) => (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.1 }}
              layout
            >
              <DailyChallengeCard
                challenge={challenge}
                teenId={teenId}
                onComplete={onComplete}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* All completed state */}
      {completedCount === totalCount && totalCount > 0 && (
        <motion.div
          className="text-center py-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: 3 }}
          >
            <Trophy className="w-8 h-8 text-white" />
          </motion.div>
          <h4 className="text-xl font-bold text-white mb-2">Bravo !</h4>
          <p className="text-zinc-400">Tu as complété tous les défis du jour !</p>
        </motion.div>
      )}

      {/* Empty state */}
      {totalCount === 0 && (
        <div className="text-center py-8">
          <RefreshCw className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400">Aucun défi pour aujourd'hui</p>
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   SINGLE CHALLENGE CARD
   ========================================================================== */

interface DailyChallengeCardProps {
  challenge: DailyChallenge
  teenId: string
  onComplete?: (challenge: DailyChallenge, xpEarned: number) => void
}

function DailyChallengeCard({
  challenge,
  teenId,
  onComplete,
}: DailyChallengeCardProps) {
  const [isPending, startTransition] = useTransition()
  const [showTimer, setShowTimer] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  const category = challenge.challenge?.category as keyof typeof CATEGORY_CONFIG
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.school
  const Icon = config.icon

  const isCompleted = challenge.status === "completed"
  const isSkipped = challenge.status === "skipped"
  const validationType = challenge.challenge?.validation_type || "self_report"

  // Timer logic for timer validation
  const requiredSeconds = validationType === "timer" ?
    (challenge.challenge?.title?.includes("15") ? 15 * 60 :
     challenge.challenge?.title?.includes("20") ? 20 * 60 :
     challenge.challenge?.title?.includes("10") ? 10 * 60 : 15 * 60) : 0

  const handleComplete = () => {
    startTransition(async () => {
      const result = await completeChallenge({
        challengeId: challenge.id,
        teenId,
        validationData: {}
      })
      if (result.success) {
        onComplete?.(challenge, challenge.challenge?.xp_reward || 0)
      }
    })
  }

  const handleSkip = () => {
    startTransition(async () => {
      await skipChallenge(challenge.id, teenId)
    })
  }

  const handleStartTimer = () => {
    setShowTimer(true)
    setIsTimerRunning(true)
    setTimerSeconds(0)
  }

  // Timer effect
  useState(() => {
    if (!isTimerRunning) return

    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev >= requiredSeconds) {
          setIsTimerRunning(false)
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, 1000)

    return () => clearInterval(interval)
  })

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <motion.div
      className={cn(
        "relative p-4 rounded-2xl border transition-all",
        isCompleted
          ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30"
          : isSkipped
          ? "bg-zinc-900/50 border-zinc-800 opacity-50"
          : cn(config.bg, config.border)
      )}
      whileHover={!isCompleted && !isSkipped ? { scale: 1.02 } : {}}
    >
      <div className="flex items-start gap-4">
        {/* Category icon */}
        <motion.div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
            isCompleted
              ? "bg-gradient-to-br from-green-500 to-emerald-500"
              : isSkipped
              ? "bg-zinc-800"
              : `bg-gradient-to-br ${config.gradient}`
          )}
          animate={isCompleted ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          {isCompleted ? (
            <Check className="w-6 h-6 text-white" />
          ) : isSkipped ? (
            <X className="w-6 h-6 text-zinc-600" />
          ) : (
            <Icon className="w-6 h-6 text-white" />
          )}
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", config.bg, config.color)}>
              {config.label}
            </span>
            {validationType === "timer" && (
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Timer className="w-3 h-3" />
                {Math.floor(requiredSeconds / 60)} min
              </span>
            )}
          </div>

          <h4 className={cn(
            "font-bold mb-1",
            isCompleted || isSkipped ? "text-zinc-500" : "text-white"
          )}>
            {challenge.challenge?.title}
          </h4>

          {challenge.challenge?.description && (
            <p className="text-sm text-zinc-500 mb-2">
              {challenge.challenge.description}
            </p>
          )}

          {/* XP Reward */}
          <div className="flex items-center gap-2">
            <Zap className={cn("w-4 h-4", isCompleted ? "text-green-400" : "text-cyan-400")} />
            <span className={cn(
              "font-bold text-sm",
              isCompleted ? "text-green-400" : "text-cyan-400"
            )}>
              {isCompleted ? "+" : ""}{challenge.challenge?.xp_reward || 0} XP
            </span>

            {isCompleted && challenge.completed_at && (
              <span className="text-xs text-zinc-500 ml-auto">
                Complété à {new Date(challenge.completed_at).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {!isCompleted && !isSkipped && (
          <div className="flex flex-col gap-2">
            {validationType === "timer" && !showTimer ? (
              <motion.button
                className={cn(
                  "p-2 rounded-xl",
                  `bg-gradient-to-br ${config.gradient}`,
                  "text-white"
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleStartTimer}
                disabled={isPending}
              >
                <Play className="w-5 h-5" />
              </motion.button>
            ) : (
              <motion.button
                className="p-2 rounded-xl bg-green-500 text-white"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleComplete}
                disabled={isPending || (validationType === "timer" && timerSeconds < requiredSeconds)}
              >
                {isPending ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
              </motion.button>
            )}

            <motion.button
              className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSkip}
              disabled={isPending}
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>
        )}
      </div>

      {/* Timer display */}
      {showTimer && validationType === "timer" && !isCompleted && (
        <motion.div
          className="mt-4 pt-4 border-t border-zinc-800"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                className={cn(
                  "w-3 h-3 rounded-full",
                  isTimerRunning ? "bg-green-500" : "bg-zinc-600"
                )}
                animate={isTimerRunning ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-2xl font-mono font-bold text-white">
                {formatTime(timerSeconds)}
              </span>
              <span className="text-zinc-500">/ {formatTime(requiredSeconds)}</span>
            </div>

            {timerSeconds >= requiredSeconds && (
              <motion.span
                className="text-green-400 font-bold"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                Terminé !
              </motion.span>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mt-3">
            <motion.div
              className={cn("h-full rounded-full", `bg-gradient-to-r ${config.gradient}`)}
              style={{ width: `${Math.min((timerSeconds / requiredSeconds) * 100, 100)}%` }}
            />
          </div>
        </motion.div>
      )}

      {/* Completed overlay effect */}
      {isCompleted && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="absolute top-2 right-2">
            <motion.div
              className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
            >
              <Check className="w-4 h-4 text-white" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

/* ==========================================================================
   CHALLENGE CATEGORY FILTER
   ========================================================================== */

interface ChallengeCategoryFilterProps {
  selected: string | null
  onChange: (category: string | null) => void
  className?: string
}

export function ChallengeCategoryFilter({
  selected,
  onChange,
  className,
}: ChallengeCategoryFilterProps) {
  const categories = [
    { key: null, label: "Tous" },
    { key: "school", ...CATEGORY_CONFIG.school },
    { key: "sport", ...CATEGORY_CONFIG.sport },
    { key: "crea", ...CATEGORY_CONFIG.crea },
  ]

  return (
    <div className={cn("flex gap-2", className)}>
      {categories.map((cat) => {
        const isSelected = selected === cat.key
        const Icon = (cat as any).icon

        return (
          <motion.button
            key={cat.key || "all"}
            className={cn(
              "px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all",
              isSelected
                ? cat.key
                  ? cn(`bg-gradient-to-r ${(cat as any).gradient} text-white`)
                  : "bg-white text-black"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(cat.key)}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {cat.label}
          </motion.button>
        )
      })}
    </div>
  )
}

/* ==========================================================================
   CHALLENGE STATS OVERVIEW
   ========================================================================== */

interface ChallengeStatsProps {
  challenges: DailyChallenge[]
  className?: string
}

export function ChallengeStats({ challenges, className }: ChallengeStatsProps) {
  const stats = {
    total: challenges.length,
    completed: challenges.filter((c) => c.status === "completed").length,
    skipped: challenges.filter((c) => c.status === "skipped").length,
    pending: challenges.filter((c) => c.status === "pending").length,
    xpEarned: challenges
      .filter((c) => c.status === "completed")
      .reduce((sum, c) => sum + (c.challenge?.xp_reward || 0), 0),
  }

  return (
    <div className={cn("grid grid-cols-2 gap-4", className)}>
      <div className="bg-zinc-900 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <Check className="w-4 h-4 text-green-400" />
          <span className="text-sm text-zinc-500">Complétés</span>
        </div>
        <span className="text-2xl font-bold text-white">{stats.completed}</span>
      </div>

      <div className="bg-zinc-900 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span className="text-sm text-zinc-500">XP gagnés</span>
        </div>
        <span className="text-2xl font-bold text-cyan-400">+{stats.xpEarned}</span>
      </div>

      <div className="bg-zinc-900 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-yellow-400" />
          <span className="text-sm text-zinc-500">En attente</span>
        </div>
        <span className="text-2xl font-bold text-white">{stats.pending}</span>
      </div>

      <div className="bg-zinc-900 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <X className="w-4 h-4 text-red-400" />
          <span className="text-sm text-zinc-500">Passés</span>
        </div>
        <span className="text-2xl font-bold text-zinc-500">{stats.skipped}</span>
      </div>
    </div>
  )
}
