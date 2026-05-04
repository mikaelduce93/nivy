/**
 * TEENS PARTY MOROCCO - Event Challenge Card Component
 * =====================================================
 *
 * Cartes d'affichage des défis événementiels.
 */

"use client"

import { motion } from "framer-motion"
import {
  MapPin,
  Sunrise,
  Moon,
  Star,
  Camera,
  Users,
  Crown,
  Coffee,
  Music,
  Disc,
  Headphones,
  Share2,
  Heart,
  Compass,
  Zap,
  RotateCcw,
  Cake,
  Clock,
  Check,
  Lock,
  ChevronRight,
  AlertCircle,
} from "lucide-react"
import {
  type EventChallengeWithProgress,
  EVENT_CHALLENGE_TYPE_CONFIG,
  CHALLENGE_STATUS_CONFIG,
  getTimeRemaining,
} from "../../features/event-challenges"

/* ==========================================================================
   ICON MAPPING
   ========================================================================== */

const iconMap: Record<string, React.ReactNode> = {
  MapPin: <MapPin className="w-5 h-5" />,
  Sunrise: <Sunrise className="w-5 h-5" />,
  Moon: <Moon className="w-5 h-5" />,
  Star: <Star className="w-5 h-5" />,
  Camera: <Camera className="w-5 h-5" />,
  Users: <Users className="w-5 h-5" />,
  Crown: <Crown className="w-5 h-5" />,
  Coffee: <Coffee className="w-5 h-5" />,
  Music: <Music className="w-5 h-5" />,
  Disc: <Disc className="w-5 h-5" />,
  Headphones: <Headphones className="w-5 h-5" />,
  Share2: <Share2 className="w-5 h-5" />,
  Heart: <Heart className="w-5 h-5" />,
  Compass: <Compass className="w-5 h-5" />,
  Zap: <Zap className="w-5 h-5" />,
  RotateCcw: <RotateCcw className="w-5 h-5" />,
  Cake: <Cake className="w-5 h-5" />,
}

/* ==========================================================================
   MAIN CHALLENGE CARD
   ========================================================================== */

interface EventChallengeCardProps {
  challenge: EventChallengeWithProgress
  onClick?: () => void
  showProgress?: boolean
}

export function EventChallengeCard({
  challenge,
  onClick,
  showProgress = true,
}: EventChallengeCardProps) {
  const typeConfig = EVENT_CHALLENGE_TYPE_CONFIG[challenge.challenge_type?.slug || "check_in"]
  const statusConfig = CHALLENGE_STATUS_CONFIG[challenge.user_progress?.status || "available"]
  const timeRemaining = getTimeRemaining(challenge.end_time)

  const isCompleted = challenge.user_progress?.status === "completed"
  const isInProgress = challenge.user_progress?.status === "in_progress"
  const isLocked = !challenge.is_available && !isCompleted

  return (
    <motion.div
      whileHover={!isLocked ? { scale: 1.02 } : {}}
      whileTap={!isLocked ? { scale: 0.98 } : {}}
      onClick={!isLocked ? onClick : undefined}
      className={`relative p-4 rounded-2xl border overflow-hidden transition-all ${
        isCompleted
          ? "bg-green-500/10 border-green-500/30"
          : isLocked
          ? "bg-zinc-900/50 border-zinc-800 opacity-60"
          : isInProgress
          ? "bg-yellow-500/10 border-yellow-500/30"
          : `bg-gradient-to-br ${typeConfig.bgGradient} border-zinc-700`
      } ${!isLocked ? "cursor-pointer" : ""}`}
    >
      {/* Completed Badge */}
      {isCompleted && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Locked Badge */}
      {isLocked && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center">
          <Lock className="w-4 h-4 text-zinc-400" />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isCompleted
              ? "bg-green-500/20"
              : isLocked
              ? "bg-zinc-800"
              : "bg-white/10"
          }`}
        >
          <span className={isCompleted ? "text-green-400" : isLocked ? "text-zinc-500" : typeConfig.color}>
            {iconMap[typeConfig.icon] || <Zap className="w-5 h-5" />}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3
            className={`font-bold truncate ${
              isCompleted
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

          {/* Stats */}
          <div className="flex items-center gap-4 mt-3 text-xs">
            {/* Time */}
            {!isCompleted && !timeRemaining.expired && challenge.end_time && (
              <div
                className={`flex items-center gap-1 ${
                  timeRemaining.urgent ? "text-red-400" : "text-zinc-400"
                }`}
              >
                <Clock className="w-3 h-3" />
                {timeRemaining.text}
              </div>
            )}

            {/* XP */}
            <div
              className={`flex items-center gap-1 ${
                isCompleted
                  ? "text-green-400"
                  : isLocked
                  ? "text-zinc-600"
                  : "text-yellow-400"
              }`}
            >
              <Zap className="w-3 h-3" />
              {isCompleted ? (
                <span>+{challenge.user_progress?.xp_earned || challenge.xp_reward} XP gagné</span>
              ) : (
                <span>+{challenge.xp_reward} XP</span>
              )}
            </div>
          </div>
        </div>

        {/* Arrow */}
        {!isCompleted && !isLocked && (
          <ChevronRight className="w-5 h-5 text-zinc-500" />
        )}
      </div>

      {/* Progress Bar */}
      {showProgress && isInProgress && challenge.target_count > 1 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Progression</span>
            <span>
              {challenge.user_progress?.current_count || 0}/{challenge.target_count}
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${challenge.progress_percentage}%` }}
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
            />
          </div>
        </div>
      )}
    </motion.div>
  )
}

/* ==========================================================================
   COMPACT CHALLENGE CARD
   ========================================================================== */

interface CompactChallengeCardProps {
  challenge: EventChallengeWithProgress
  onClick?: () => void
}

export function CompactChallengeCard({
  challenge,
  onClick,
}: CompactChallengeCardProps) {
  const typeConfig = EVENT_CHALLENGE_TYPE_CONFIG[challenge.challenge_type?.slug || "check_in"]
  const isCompleted = challenge.user_progress?.status === "completed"
  const isLocked = !challenge.is_available && !isCompleted

  return (
    <div
      onClick={!isLocked ? onClick : undefined}
      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
        isCompleted
          ? "bg-green-500/10"
          : isLocked
          ? "bg-zinc-800/30 opacity-60"
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
          {iconMap[typeConfig.icon] || <Zap className="w-4 h-4" />}
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
   FEATURED CHALLENGE CARD
   ========================================================================== */

interface FeaturedChallengeCardProps {
  challenge: EventChallengeWithProgress
  onClick?: () => void
}

export function FeaturedChallengeCard({
  challenge,
  onClick,
}: FeaturedChallengeCardProps) {
  const typeConfig = EVENT_CHALLENGE_TYPE_CONFIG[challenge.challenge_type?.slug || "check_in"]
  const timeRemaining = getTimeRemaining(challenge.end_time)

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative p-5 rounded-2xl bg-gradient-to-br ${typeConfig.bgGradient} border border-white/10 cursor-pointer overflow-hidden`}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
        <span className="scale-[4] block">
          {iconMap[typeConfig.icon]}
        </span>
      </div>

      <div className="relative">
        {/* Label */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs font-bold px-2 py-1 rounded-full bg-white/10 ${typeConfig.color}`}>
            DÉFI SPÉCIAL
          </span>
          {timeRemaining.urgent && !timeRemaining.expired && (
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-500 text-white animate-pulse">
              {timeRemaining.text}
            </span>
          )}
        </div>

        {/* Icon & Title */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center">
            <span className={typeConfig.color}>
              {iconMap[typeConfig.icon] || <Zap className="w-7 h-7" />}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{challenge.title}</h3>
            <p className={`text-sm ${typeConfig.color}`}>{typeConfig.label}</p>
          </div>
        </div>

        {/* Description */}
        {challenge.description && (
          <p className="text-sm text-zinc-300 mb-4">{challenge.description}</p>
        )}

        {/* Rewards */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-yellow-400 font-bold">
            <Zap className="w-5 h-5" />
            +{challenge.xp_reward} XP
          </div>
          {challenge.bonus_xp && (
            <div className="flex items-center gap-1 text-purple-400">
              <Star className="w-4 h-4" />
              Bonus: +{challenge.bonus_xp} XP
            </div>
          )}
        </div>

        {/* CTA */}
        <button className="w-full mt-4 py-3 rounded-xl bg-white/20 text-white font-bold hover:bg-white/30 transition-colors">
          Relever le défi →
        </button>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   CHALLENGE PROGRESS CARD
   ========================================================================== */

interface ChallengeProgressCardProps {
  challenge: EventChallengeWithProgress
  onComplete?: () => void
}

export function ChallengeProgressCard({
  challenge,
  onComplete,
}: ChallengeProgressCardProps) {
  const typeConfig = EVENT_CHALLENGE_TYPE_CONFIG[challenge.challenge_type?.slug || "check_in"]
  const progress = challenge.user_progress
  const percentage = challenge.progress_percentage

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
          <span className="text-yellow-400">
            {iconMap[typeConfig.icon] || <Zap className="w-5 h-5" />}
          </span>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white">{challenge.title}</h3>
          <p className="text-sm text-yellow-400">En cours</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">{percentage}%</p>
          <p className="text-xs text-zinc-400">
            {progress?.current_count || 0}/{challenge.target_count}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-3 bg-zinc-800 rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
        />
      </div>

      {/* XP */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span>+{challenge.xp_reward} XP à la complétion</span>
        </div>

        {percentage >= 100 && onComplete && (
          <button
            onClick={onComplete}
            className="px-4 py-2 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-400 transition-colors"
          >
            Réclamer !
          </button>
        )}
      </div>
    </div>
  )
}
