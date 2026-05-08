"use client"

import { useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import {
  Swords,
  Users,
  Trophy,
  Heart,
  Zap,
  Clock,
  Crown,
  Target,
  ChevronRight,
  Check,
  X,
  Loader2,
  Flame,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type FriendChallenge,
  type ChallengeMode,
  CHALLENGE_MODE_CONFIG,
  CHALLENGE_STATUS_CONFIG,
  getTimeRemaining,
  getRankedParticipants,
  getTeamScore,
  getCurrentLeader,
  calculateProgress,
} from "../../features/challenges/schema"

/* ==========================================================================
   ICON MAP
   ========================================================================== */

const MODE_ICONS: Record<ChallengeMode, React.ComponentType<{ className?: string }>> = {
  duel: Swords,
  team: Users,
  race: Trophy,
  coop: Heart,
}

/* ==========================================================================
   TYPES
   ========================================================================== */

interface ChallengeCardProps {
  challenge: FriendChallenge
  currentUserId?: string
  onAccept?: (challengeId: string) => Promise<void>
  onDecline?: (challengeId: string) => Promise<void>
  onClick?: () => void
  compact?: boolean
  className?: string
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export function ChallengeCard({
  challenge,
  currentUserId = "",
  onAccept,
  onDecline,
  onClick,
  compact = false,
  className,
}: ChallengeCardProps) {
  const [isAccepting, setIsAccepting] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)

  const ModeIcon = MODE_ICONS[challenge.mode]
  const statusConfig = CHALLENGE_STATUS_CONFIG[challenge.status]
  const timeRemaining = getTimeRemaining(challenge.ends_at)

  const isPending = challenge.status === "pending"
  const isActive = challenge.status === "active"
  const isCompleted = challenge.status === "completed"

  // Find current user's participant data
  const currentUserParticipant = challenge.participants.find(
    (p) => p.user_id === currentUserId
  )
  const isUserPending = currentUserParticipant?.status === "pending"
  const isUserWinner = challenge.winner_id === currentUserId ||
    (challenge.mode === "team" && challenge.winning_team === currentUserParticipant?.team)

  // Get leader/standings
  const leader = isActive ? getCurrentLeader(challenge) : null
  const isUserLeading = leader?.user_id === currentUserId

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onAccept || isAccepting) return
    setIsAccepting(true)
    try {
      await onAccept(challenge.challenge_id)
    } finally {
      setIsAccepting(false)
    }
  }

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onDecline || isDeclining) return
    setIsDeclining(true)
    try {
      await onDecline(challenge.challenge_id)
    } finally {
      setIsDeclining(false)
    }
  }

  if (compact) {
    return (
      <CompactChallengeCard
        challenge={challenge}
        currentUserId={currentUserId}
        onClick={onClick}
      />
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-2xl transition-all",
        "bg-zinc-900 border",
        isActive
          ? "border-green-500/30"
          : isPending
          ? "border-yellow-500/30"
          : isCompleted && isUserWinner
          ? "border-cyan-500/30"
          : "border-zinc-800",
        onClick && "cursor-pointer hover:border-zinc-700",
        className
      )}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.01 } : {}}
    >
      {/* Header */}
      <div
        className={cn(
          "relative px-4 py-3 border-b",
          isPending
            ? "bg-yellow-500/5 border-yellow-500/20"
            : isActive
            ? "bg-green-500/5 border-green-500/20"
            : isCompleted && isUserWinner
            ? "bg-cyan-500/5 border-cyan-500/20"
            : "bg-zinc-800/50 border-zinc-800"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mode Icon */}
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                `bg-${challenge.color}-500/20`
              )}
            >
              <ModeIcon className={cn("w-5 h-5", `text-${challenge.color}-400`)} />
            </div>

            {/* Title */}
            <div>
              <h3 className="font-bold text-white">{challenge.challenge_name}</h3>
              <div className="flex items-center gap-2 text-sm">
                <span className={statusConfig.color}>{statusConfig.label}</span>
                {isActive && !timeRemaining.expired && (
                  <span
                    className={cn(
                      "text-zinc-500",
                      timeRemaining.urgent && "text-red-400"
                    )}
                  >
                    • {timeRemaining.text}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stakes / Winner */}
          {challenge.stake_xp > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded-lg">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-bold text-yellow-400">
                {challenge.stake_xp}
              </span>
            </div>
          )}

          {isCompleted && isUserWinner && (
            <div className="flex items-center gap-1 px-3 py-1 bg-cyan-500/20 rounded-full">
              <Crown className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-cyan-400">Gagné !</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Participants / Progress */}
        {isActive && challenge.mode !== "team" && (
          <ParticipantStandings
            challenge={challenge}
            currentUserId={currentUserId}
          />
        )}

        {isActive && challenge.mode === "team" && (
          <TeamStandings challenge={challenge} currentUserId={currentUserId} />
        )}

        {/* Pending invitation actions */}
        {isPending && isUserPending && (
          <div className="flex gap-3 mt-4">
            <motion.button
              onClick={handleAccept}
              disabled={isAccepting || isDeclining}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold bg-green-500 text-white hover:bg-green-400"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isAccepting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Accepter
                </>
              )}
            </motion.button>
            <motion.button
              onClick={handleDecline}
              disabled={isAccepting || isDeclining}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold bg-zinc-700 text-white hover:bg-zinc-600"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isDeclining ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <X className="w-5 h-5" />
                  Refuser
                </>
              )}
            </motion.button>
          </div>
        )}

        {/* Completed results */}
        {isCompleted && (
          <CompletedResults
            challenge={challenge}
            currentUserId={currentUserId}
          />
        )}
      </div>

      {/* Active indicator */}
      {isActive && isUserLeading && (
        <motion.div
          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-green-500"
          layoutId={`leading-${challenge.challenge_id}`}
        />
      )}
    </motion.div>
  )
}

/* ==========================================================================
   PARTICIPANT STANDINGS
   ========================================================================== */

function ParticipantStandings({
  challenge,
  currentUserId,
}: {
  challenge: FriendChallenge
  currentUserId: string
}) {
  const ranked = getRankedParticipants(challenge.participants)
  const progress = challenge.target_value
    ? calculateProgress(challenge.user_score, challenge.target_value)
    : null

  return (
    <div className="space-y-3">
      {/* Progress bar if there's a target */}
      {progress !== null && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-zinc-500">Objectif</span>
            <span className="text-white">
              {challenge.user_score} / {challenge.target_value}
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-green-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Standings */}
      {ranked.slice(0, 3).map((participant, index) => {
        const isCurrentUser = participant.user_id === currentUserId

        return (
          <div
            key={participant.user_id}
            className={cn(
              "flex items-center gap-3 p-2 rounded-xl",
              isCurrentUser
                ? "bg-cyan-500/10 border border-cyan-500/30"
                : "bg-zinc-800/50"
            )}
          >
            {/* Rank */}
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center font-bold",
                participant.rank === 1
                  ? "bg-yellow-500/20 text-yellow-400"
                  : participant.rank === 2
                  ? "bg-zinc-400/20 text-zinc-400"
                  : "bg-orange-500/20 text-orange-400"
              )}
            >
              {participant.rank}
            </div>

            {/* Avatar */}
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-zinc-700">
              {participant.avatar_url ? (
                <Image
                  src={participant.avatar_url}
                  alt={participant.pseudo}
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold">
                  {participant.pseudo.charAt(0)}
                </div>
              )}
            </div>

            {/* Name */}
            <span
              className={cn(
                "flex-1 font-medium truncate",
                isCurrentUser ? "text-cyan-400" : "text-white"
              )}
            >
              {participant.pseudo}
              {isCurrentUser && " (Toi)"}
            </span>

            {/* Score */}
            <span className="font-bold text-white">{participant.score}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ==========================================================================
   TEAM STANDINGS
   ========================================================================== */

function TeamStandings({
  challenge,
  currentUserId,
}: {
  challenge: FriendChallenge
  currentUserId: string
}) {
  const teamAScore = getTeamScore(challenge.participants, "a")
  const teamBScore = getTeamScore(challenge.participants, "b")
  const userTeam = challenge.user_team

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Team A */}
      <div
        className={cn(
          "p-3 rounded-xl border",
          userTeam === "a"
            ? "bg-cyan-500/10 border-cyan-500/30"
            : "bg-zinc-800/50 border-zinc-700"
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-zinc-400">Équipe A</span>
          {userTeam === "a" && (
            <span className="text-xs text-cyan-400">Ton équipe</span>
          )}
        </div>
        <p className="text-2xl font-black text-white">{teamAScore}</p>
        <div className="flex -space-x-2 mt-2">
          {challenge.participants
            .filter((p) => p.team === "a")
            .slice(0, 4)
            .map((p) => (
              <div
                key={p.user_id}
                className="relative w-6 h-6 rounded-full bg-zinc-700 border-2 border-zinc-900 overflow-hidden"
              >
                {p.avatar_url ? (
                  <Image
                    src={p.avatar_url}
                    alt=""
                    aria-hidden
                    fill
                    sizes="24px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-white">
                    {p.pseudo.charAt(0)}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* Team B */}
      <div
        className={cn(
          "p-3 rounded-xl border",
          userTeam === "b"
            ? "bg-purple-500/10 border-purple-500/30"
            : "bg-zinc-800/50 border-zinc-700"
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-zinc-400">Équipe B</span>
          {userTeam === "b" && (
            <span className="text-xs text-purple-400">Ton équipe</span>
          )}
        </div>
        <p className="text-2xl font-black text-white">{teamBScore}</p>
        <div className="flex -space-x-2 mt-2">
          {challenge.participants
            .filter((p) => p.team === "b")
            .slice(0, 4)
            .map((p) => (
              <div
                key={p.user_id}
                className="relative w-6 h-6 rounded-full bg-zinc-700 border-2 border-zinc-900 overflow-hidden"
              >
                {p.avatar_url ? (
                  <Image
                    src={p.avatar_url}
                    alt=""
                    aria-hidden
                    fill
                    sizes="24px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-white">
                    {p.pseudo.charAt(0)}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   COMPLETED RESULTS
   ========================================================================== */

function CompletedResults({
  challenge,
  currentUserId,
}: {
  challenge: FriendChallenge
  currentUserId: string
}) {
  const winner = challenge.participants.find((p) => p.user_id === challenge.winner_id)
  const userParticipant = challenge.participants.find((p) => p.user_id === currentUserId)
  const isUserWinner =
    challenge.winner_id === currentUserId ||
    (challenge.mode === "team" && challenge.winning_team === userParticipant?.team)

  return (
    <div className="text-center">
      {challenge.is_draw ? (
        <div className="py-4">
          <div className="text-2xl mb-2">🤝</div>
          <p className="font-bold text-white">Égalité !</p>
        </div>
      ) : winner ? (
        <div className="py-4">
          <Crown className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
          <p className="font-bold text-white">
            {isUserWinner ? "Tu as gagné !" : `${winner.pseudo} a gagné !`}
          </p>
          {userParticipant && (
            <div className="flex items-center justify-center gap-1 mt-2 text-yellow-400">
              <Zap className="w-4 h-4" />
              <span className="font-bold">
                +{isUserWinner ? challenge.stake_xp * 2 || 500 : 100} XP
              </span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

/* ==========================================================================
   COMPACT CARD
   ========================================================================== */

export function CompactChallengeCard({
  challenge,
  onClick,
}: {
  challenge: FriendChallenge
  currentUserId?: string
  onClick?: () => void
}) {
  const ModeIcon = MODE_ICONS[challenge.mode]
  const statusConfig = CHALLENGE_STATUS_CONFIG[challenge.status]
  const timeRemaining = getTimeRemaining(challenge.ends_at)

  return (
    <motion.div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-all",
        "bg-zinc-800/50 border border-zinc-700/50",
        "hover:bg-zinc-800 hover:border-zinc-600",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
      whileHover={{ x: 4 }}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          `bg-${challenge.color}-500/20`
        )}
      >
        <ModeIcon className={cn("w-5 h-5", `text-${challenge.color}-400`)} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{challenge.challenge_name}</p>
        <div className="flex items-center gap-2 text-xs">
          <span className={statusConfig.color}>{statusConfig.label}</span>
          {challenge.status === "active" && (
            <span className="text-zinc-500">{timeRemaining.text}</span>
          )}
        </div>
      </div>

      <ChevronRight className="w-5 h-5 text-zinc-500" />
    </motion.div>
  )
}
