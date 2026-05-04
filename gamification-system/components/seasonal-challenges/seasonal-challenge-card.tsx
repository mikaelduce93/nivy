/**
 * TEENS PARTY MOROCCO - Seasonal Challenge Card Component
 * ========================================================
 *
 * Cartes d'affichage des défis saisonniers.
 */

"use client"

import { motion } from "framer-motion"
import {
  Calendar,
  CalendarDays,
  Trophy,
  Star,
  Users,
  Heart,
  Sparkles,
  Layers,
  Zap,
  Clock,
  Check,
  Lock,
  ChevronRight,
  Gift,
  Award,
} from "lucide-react"
import {
  type SeasonalChallengeWithProgress,
  CHALLENGE_TYPE_CONFIG,
  CHALLENGE_CATEGORY_CONFIG,
  REWARD_TYPE_CONFIG,
  formatTimeRemaining,
} from "../../features/seasonal-challenges"

/* ==========================================================================
   ICON MAPPING
   ========================================================================== */

const typeIcons: Record<string, React.ReactNode> = {
  Calendar: <Calendar className="w-5 h-5" />,
  CalendarDays: <CalendarDays className="w-5 h-5" />,
  Trophy: <Trophy className="w-5 h-5" />,
  Star: <Star className="w-5 h-5" />,
}

const categoryIcons: Record<string, React.ReactNode> = {
  Users: <Users className="w-4 h-4" />,
  Calendar: <Calendar className="w-4 h-4" />,
  Heart: <Heart className="w-4 h-4" />,
  Sparkles: <Sparkles className="w-4 h-4" />,
  Layers: <Layers className="w-4 h-4" />,
}

/* ==========================================================================
   MAIN CHALLENGE CARD
   ========================================================================== */

interface SeasonalChallengeCardProps {
  challenge: SeasonalChallengeWithProgress
  onClick?: () => void
  onClaim?: () => void
}

export function SeasonalChallengeCard({
  challenge,
  onClick,
  onClaim,
}: SeasonalChallengeCardProps) {
  const typeConfig = CHALLENGE_TYPE_CONFIG[challenge.challenge_type]
  const categoryConfig = CHALLENGE_CATEGORY_CONFIG[challenge.category]
  const rewardConfig = challenge.reward_type ? REWARD_TYPE_CONFIG[challenge.reward_type] : null

  const status = challenge.user_progress?.status || "available"
  const isCompleted = status === "completed"
  const isClaimed = status === "claimed"
  const isInProgress = status === "in_progress"
  const isLocked = status === "locked"
  const isClaimable = isCompleted && !challenge.user_progress?.claimed_at

  const progressPercentage = challenge.progress_percentage

  return (
    <motion.div
      whileHover={!isLocked && !isClaimed ? { scale: 1.02 } : {}}
      whileTap={!isLocked && !isClaimed ? { scale: 0.98 } : {}}
      onClick={!isLocked && !isClaimed ? onClick : undefined}
      className={`relative p-4 rounded-2xl border overflow-hidden transition-all ${
        isClaimed
          ? "bg-zinc-800/30 border-zinc-700 opacity-60"
          : isClaimable
          ? "bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/50"
          : isCompleted
          ? "bg-green-500/10 border-green-500/30"
          : isLocked
          ? "bg-zinc-900/50 border-zinc-800 opacity-50"
          : isInProgress
          ? "bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border-cyan-500/30"
          : "bg-zinc-900 border-zinc-800"
      } ${!isLocked && !isClaimed ? "cursor-pointer" : ""}`}
    >
      {/* Type Badge */}
      <div className="absolute top-3 right-3">
        <span
          className={`text-xs px-2 py-1 rounded-full bg-white/10 ${typeConfig.color}`}
        >
          {typeConfig.label}
        </span>
      </div>

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isClaimed
              ? "bg-zinc-700"
              : isCompleted
              ? "bg-green-500/20"
              : isLocked
              ? "bg-zinc-800"
              : "bg-white/10"
          }`}
          style={
            !isClaimed && !isCompleted && !isLocked && challenge.color
              ? { backgroundColor: `${challenge.color}20` }
              : {}
          }
        >
          <span
            className={
              isClaimed
                ? "text-zinc-500"
                : isCompleted
                ? "text-green-400"
                : isLocked
                ? "text-zinc-600"
                : ""
            }
            style={
              !isClaimed && !isCompleted && !isLocked && challenge.color
                ? { color: challenge.color }
                : {}
            }
          >
            {typeIcons[typeConfig.icon] || <Trophy className="w-5 h-5" />}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pr-16">
          <h3
            className={`font-bold truncate ${
              isClaimed
                ? "text-zinc-500"
                : isCompleted
                ? "text-green-400"
                : isLocked
                ? "text-zinc-500"
                : "text-white"
            }`}
          >
            {challenge.title}
          </h3>

          {challenge.description && (
            <p
              className={`text-sm line-clamp-2 mt-1 ${
                isLocked ? "text-zinc-600" : "text-zinc-400"
              }`}
            >
              {challenge.description}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 mt-2 text-xs">
            {/* Category */}
            <span className={`flex items-center gap-1 ${categoryConfig.color}`}>
              {categoryIcons[categoryConfig.icon]}
              {categoryConfig.label}
            </span>

            {/* XP */}
            <span
              className={`flex items-center gap-1 ${
                isClaimed ? "text-zinc-600" : "text-yellow-400"
              }`}
            >
              <Zap className="w-3 h-3" />
              {isClaimed
                ? `${challenge.user_progress?.xp_earned || 0} XP gagné`
                : `+${challenge.xp_reward} XP`}
            </span>

            {/* Time */}
            {challenge.end_date && !isClaimed && !isCompleted && (
              <span className="flex items-center gap-1 text-zinc-500">
                <Clock className="w-3 h-3" />
                {formatTimeRemaining(challenge.end_date)}
              </span>
            )}
          </div>
        </div>

        {/* Status Icon */}
        {isClaimed ? (
          <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center">
            <Check className="w-4 h-4 text-zinc-500" />
          </div>
        ) : isCompleted ? (
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        ) : isLocked ? (
          <Lock className="w-5 h-5 text-zinc-600" />
        ) : (
          <ChevronRight className="w-5 h-5 text-zinc-500" />
        )}
      </div>

      {/* Progress Bar */}
      {!isClaimed && !isLocked && challenge.target_count > 1 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-zinc-400">Progression</span>
            <span className={isCompleted ? "text-green-400" : "text-white"}>
              {challenge.user_progress?.current_count || 0}/{challenge.target_count}
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              className={`h-full rounded-full ${
                isCompleted
                  ? "bg-green-500"
                  : "bg-gradient-to-r from-cyan-500 to-purple-500"
              }`}
            />
          </div>
        </div>
      )}

      {/* Claim Button */}
      {isClaimable && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClaim?.()
          }}
          className="w-full mt-4 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <Gift className="w-4 h-4" />
          Réclamer la récompense
        </button>
      )}

      {/* Reward Preview */}
      {rewardConfig && !isClaimed && (
        <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center gap-2 text-xs text-zinc-500">
          <Award className="w-3 h-3" />
          <span>Récompense: {rewardConfig.label}</span>
        </div>
      )}
    </motion.div>
  )
}

/* ==========================================================================
   COMPACT CHALLENGE CARD
   ========================================================================== */

interface CompactSeasonalCardProps {
  challenge: SeasonalChallengeWithProgress
  onClick?: () => void
}

export function CompactSeasonalCard({
  challenge,
  onClick,
}: CompactSeasonalCardProps) {
  const typeConfig = CHALLENGE_TYPE_CONFIG[challenge.challenge_type]
  const status = challenge.user_progress?.status || "available"
  const isCompleted = status === "completed" || status === "claimed"
  const isLocked = status === "locked"

  return (
    <div
      onClick={!isLocked ? onClick : undefined}
      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
        isCompleted
          ? "bg-green-500/10"
          : isLocked
          ? "bg-zinc-800/30 opacity-50"
          : "bg-zinc-800/50 hover:bg-zinc-800"
      } ${!isLocked ? "cursor-pointer" : ""}`}
    >
      {/* Icon */}
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          isCompleted ? "bg-green-500/20" : isLocked ? "bg-zinc-700" : "bg-white/10"
        }`}
      >
        <span className={isCompleted ? "text-green-400" : isLocked ? "text-zinc-500" : typeConfig.color}>
          {typeIcons[typeConfig.icon] || <Trophy className="w-4 h-4" />}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className={`font-medium truncate ${
            isCompleted ? "text-green-400" : isLocked ? "text-zinc-500" : "text-white"
          }`}
        >
          {challenge.title}
        </p>
        <p className="text-xs text-zinc-500">{typeConfig.label}</p>
      </div>

      {/* Status */}
      {isCompleted ? (
        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="w-4 h-4 text-green-400" />
        </div>
      ) : isLocked ? (
        <Lock className="w-4 h-4 text-zinc-600" />
      ) : (
        <div className="flex items-center gap-1 text-yellow-400 text-xs">
          <Zap className="w-3 h-3" />
          +{challenge.xp_reward}
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   DAILY CHALLENGE CARD
   ========================================================================== */

interface DailyChallengeCardProps {
  challenge: SeasonalChallengeWithProgress
  onClick?: () => void
}

export function DailyChallengeCard({
  challenge,
  onClick,
}: DailyChallengeCardProps) {
  const categoryConfig = CHALLENGE_CATEGORY_CONFIG[challenge.category]
  const isCompleted =
    challenge.user_progress?.status === "completed" ||
    challenge.user_progress?.status === "claimed"

  return (
    <motion.div
      whileHover={!isCompleted ? { scale: 1.02 } : {}}
      whileTap={!isCompleted ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={`p-3 rounded-xl border transition-all cursor-pointer ${
        isCompleted
          ? "bg-green-500/10 border-green-500/30"
          : "bg-zinc-800/50 border-zinc-700 hover:border-cyan-500/50"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Check */}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isCompleted ? "bg-green-500" : "bg-zinc-700"
          }`}
        >
          {isCompleted ? (
            <Check className="w-5 h-5 text-white" />
          ) : (
            <span className="text-lg">{categoryIcons[categoryConfig.icon]}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <p
            className={`font-medium ${
              isCompleted ? "text-green-400 line-through" : "text-white"
            }`}
          >
            {challenge.title}
          </p>
        </div>

        {/* XP */}
        <div
          className={`flex items-center gap-1 text-sm ${
            isCompleted ? "text-green-400" : "text-yellow-400"
          }`}
        >
          <Zap className="w-4 h-4" />
          {isCompleted ? "✓" : `+${challenge.xp_reward}`}
        </div>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   SPECIAL CHALLENGE BANNER
   ========================================================================== */

interface SpecialChallengeBannerProps {
  challenge: SeasonalChallengeWithProgress
  onClick?: () => void
}

export function SpecialChallengeBanner({
  challenge,
  onClick,
}: SpecialChallengeBannerProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className="relative p-4 rounded-2xl bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 border border-white/10 cursor-pointer overflow-hidden"
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-transparent to-cyan-500/10 animate-pulse" />

      <div className="relative flex items-center gap-4">
        {/* Icon */}
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
          <Star className="w-7 h-7 text-white" />
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 font-bold">
              SPÉCIAL
            </span>
            {challenge.end_date && (
              <span className="text-xs text-zinc-400">
                {formatTimeRemaining(challenge.end_date)}
              </span>
            )}
          </div>
          <h3 className="font-bold text-white">{challenge.title}</h3>
          {challenge.description && (
            <p className="text-sm text-zinc-400">{challenge.description}</p>
          )}
        </div>

        {/* XP */}
        <div className="text-right">
          <div className="flex items-center gap-1 text-yellow-400 font-bold">
            <Zap className="w-5 h-5" />
            +{challenge.xp_reward}
          </div>
          {challenge.bonus_xp && (
            <p className="text-xs text-purple-400">
              +{challenge.bonus_xp} bonus
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
