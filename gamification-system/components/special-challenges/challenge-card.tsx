/**
 * TEENS PARTY MOROCCO - Special Challenge Card
 * =============================================
 *
 * Carte d'affichage d'un défi spécial.
 */

"use client"

import { motion } from "framer-motion"
import {
  Camera,
  Brain,
  MapPin,
  Zap,
  Users,
  Sparkles,
  Clock,
  Trophy,
  ChevronRight,
  Check,
  Vote,
} from "lucide-react"
import {
  type SpecialChallenge,
  CHALLENGE_CATEGORY_CONFIG,
  CHALLENGE_STATUS_CONFIG,
  formatTimeRemaining,
} from "../../features/special-challenges"

/* ==========================================================================
   CATEGORY ICONS
   ========================================================================== */

const categoryIcons: Record<string, React.ReactNode> = {
  photo: <Camera className="w-5 h-5" />,
  quiz: <Brain className="w-5 h-5" />,
  geolocation: <MapPin className="w-5 h-5" />,
  flash: <Zap className="w-5 h-5" />,
  social: <Users className="w-5 h-5" />,
  creative: <Sparkles className="w-5 h-5" />,
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

interface SpecialChallengeCardProps {
  challenge: SpecialChallenge
  onClick?: () => void
  showParticipateButton?: boolean
  onParticipate?: () => void
}

export function SpecialChallengeCard({
  challenge,
  onClick,
  showParticipateButton = true,
  onParticipate,
}: SpecialChallengeCardProps) {
  const categoryConfig = CHALLENGE_CATEGORY_CONFIG[challenge.category]
  const timeRemaining = formatTimeRemaining(challenge.time_remaining_seconds)

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative p-4 rounded-2xl border overflow-hidden cursor-pointer ${
        challenge.is_flash
          ? "bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30"
          : "bg-zinc-900 border-zinc-800"
      }`}
    >
      {/* Flash Badge */}
      {challenge.is_flash && (
        <div className="absolute top-0 right-0 px-3 py-1 bg-yellow-500 text-black text-xs font-bold rounded-bl-xl">
          <Zap className="w-3 h-3 inline mr-1" />
          FLASH
        </div>
      )}

      {/* Participated Badge */}
      {challenge.has_participated && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${challenge.color}20` }}
        >
          <span style={{ color: challenge.color }}>
            {categoryIcons[challenge.category]}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${categoryConfig.color} bg-white/10`}
            >
              {categoryConfig.label}
            </span>
          </div>

          <h3 className="font-bold text-white truncate">{challenge.title}</h3>

          {challenge.description && (
            <p className="text-sm text-zinc-400 line-clamp-2 mt-1">
              {challenge.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 mt-3 text-xs">
            {/* Time */}
            <div
              className={`flex items-center gap-1 ${
                timeRemaining.urgent ? "text-red-400" : "text-zinc-400"
              }`}
            >
              <Clock className="w-3 h-3" />
              {timeRemaining.expired ? "Terminé" : timeRemaining.text}
            </div>

            {/* Participants */}
            <div className="flex items-center gap-1 text-zinc-400">
              <Users className="w-3 h-3" />
              {challenge.total_participants}
            </div>

            {/* XP */}
            <div className="flex items-center gap-1 text-yellow-400">
              <Zap className="w-3 h-3" />
              +{challenge.base_xp} XP
            </div>
          </div>
        </div>

        {/* Action */}
        {!challenge.has_participated && !timeRemaining.expired && (
          <ChevronRight className="w-5 h-5 text-zinc-500" />
        )}
      </div>

      {/* Participate Button */}
      {showParticipateButton &&
        !challenge.has_participated &&
        !timeRemaining.expired && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onParticipate?.()
            }}
            className="w-full mt-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Participer
          </button>
        )}
    </motion.div>
  )
}

/* ==========================================================================
   FLASH CHALLENGE CARD
   ========================================================================== */

interface FlashChallengeCardProps {
  challenge: SpecialChallenge
  onParticipate: () => void
}

export function FlashChallengeCard({
  challenge,
  onParticipate,
}: FlashChallengeCardProps) {
  const timeRemaining = formatTimeRemaining(challenge.time_remaining_seconds)

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative p-4 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 overflow-hidden"
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-transparent to-orange-500/10 animate-pulse" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-yellow-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-black" />
            </div>
            <span className="font-bold text-yellow-400">DÉFI FLASH</span>
          </div>

          {/* Timer */}
          <div
            className={`px-3 py-1 rounded-full ${
              timeRemaining.urgent
                ? "bg-red-500 text-white animate-pulse"
                : "bg-yellow-500/20 text-yellow-400"
            }`}
          >
            <Clock className="w-3 h-3 inline mr-1" />
            {timeRemaining.text}
          </div>
        </div>

        {/* Content */}
        <h3 className="text-xl font-bold text-white mb-2">{challenge.title}</h3>
        <p className="text-sm text-zinc-300 mb-4">{challenge.description}</p>

        {/* Rewards */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1 text-yellow-400">
            <Zap className="w-4 h-4" />
            <span className="font-bold">+{challenge.base_xp} XP</span>
          </div>
          <div className="flex items-center gap-1 text-purple-400">
            <Trophy className="w-4 h-4" />
            <span>Gagnant: +{challenge.winner_xp} XP</span>
          </div>
        </div>

        {/* Button */}
        {!challenge.has_participated ? (
          <button
            onClick={onParticipate}
            className="w-full py-3 rounded-xl bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition-colors"
          >
            Participer maintenant !
          </button>
        ) : (
          <div className="w-full py-3 rounded-xl bg-green-500/20 text-green-400 font-bold text-center flex items-center justify-center gap-2">
            <Check className="w-5 h-5" />
            Participation enregistrée
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   COMPACT CHALLENGE CARD
   ========================================================================== */

interface CompactChallengeCardProps {
  challenge: SpecialChallenge
  onClick?: () => void
}

export function CompactChallengeCard({
  challenge,
  onClick,
}: CompactChallengeCardProps) {
  const categoryConfig = CHALLENGE_CATEGORY_CONFIG[challenge.category]
  const timeRemaining = formatTimeRemaining(challenge.time_remaining_seconds)

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
        challenge.is_flash
          ? "bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20"
          : "bg-zinc-800/50 hover:bg-zinc-800"
      }`}
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${challenge.color}20` }}
      >
        <span style={{ color: challenge.color }}>
          {categoryIcons[challenge.category]}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{challenge.title}</p>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className={categoryConfig.color}>{categoryConfig.label}</span>
          <span>•</span>
          <span className={timeRemaining.urgent ? "text-red-400" : ""}>
            {timeRemaining.text}
          </span>
        </div>
      </div>

      {/* Status */}
      {challenge.has_participated ? (
        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="w-4 h-4 text-green-400" />
        </div>
      ) : (
        <div className="flex items-center gap-1 text-yellow-400 text-xs">
          <Zap className="w-3 h-3" />
          +{challenge.base_xp}
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   VOTING CHALLENGE CARD
   ========================================================================== */

interface VotingChallengeCardProps {
  challenge: SpecialChallenge
  onClick?: () => void
  submissionCount?: number
}

export function VotingChallengeCard({
  challenge,
  onClick,
  submissionCount = 0,
}: VotingChallengeCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 cursor-pointer"
    >
      <div className="flex items-center gap-2 mb-3">
        <Vote className="w-5 h-5 text-purple-400" />
        <span className="font-bold text-purple-400">VOTES EN COURS</span>
      </div>

      <h3 className="font-bold text-white mb-2">{challenge.title}</h3>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Users className="w-4 h-4" />
          {submissionCount} soumissions
        </div>

        <span className="text-sm text-purple-400">Voter maintenant →</span>
      </div>
    </motion.div>
  )
}
