/**
 * TEENS PARTY MOROCCO - Challenge Detail Modal
 * =============================================
 *
 * Modal affichant les détails complets d'un défi.
 */

"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Swords,
  Users,
  Trophy,
  Heart,
  Clock,
  Zap,
  Target,
  Send,
  MessageCircle,
  Crown,
  Medal,
  TrendingUp,
  AlertCircle,
  Loader2,
  ChevronDown,
} from "lucide-react"
import {
  type FriendChallenge,
  type ChallengeParticipant,
  CHALLENGE_MODE_CONFIG,
  CHALLENGE_STATUS_CONFIG,
  OBJECTIVE_TYPE_CONFIG,
  getTimeRemaining,
  getRankedParticipants,
  getTeamScore,
  calculateProgress,
} from "../../features/challenges"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface ChallengeMessage {
  id: string
  user_id: string
  pseudo: string
  avatar_url: string | null
  message: string
  message_type: "text" | "taunt" | "cheer"
  created_at: string
}

interface ChallengeDetailModalProps {
  isOpen: boolean
  onClose: () => void
  challenge: FriendChallenge | null
  currentUserId: string
  messages: ChallengeMessage[]
  onSendMessage: (message: string, type: "text" | "taunt" | "cheer") => Promise<void>
  onAccept?: () => Promise<void>
  onDecline?: () => Promise<void>
  isLoadingMessages?: boolean
}

/* ==========================================================================
   ICONS
   ========================================================================== */

const modeIcons: Record<string, React.ReactNode> = {
  duel: <Swords className="w-5 h-5" />,
  team: <Users className="w-5 h-5" />,
  race: <Trophy className="w-5 h-5" />,
  coop: <Heart className="w-5 h-5" />,
}

/* ==========================================================================
   QUICK MESSAGE PRESETS
   ========================================================================== */

const TAUNTS = [
  "Tu vas perdre !",
  "Trop facile...",
  "Je suis imbattable !",
  "Abandonne maintenant !",
]

const CHEERS = [
  "Allez, on peut le faire !",
  "Bien joué !",
  "Continue comme ça !",
  "On y est presque !",
]

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export function ChallengeDetailModal({
  isOpen,
  onClose,
  challenge,
  currentUserId,
  messages,
  onSendMessage,
  onAccept,
  onDecline,
  isLoadingMessages = false,
}: ChallengeDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"leaderboard" | "chat">("leaderboard")
  const [messageInput, setMessageInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [showQuickMessages, setShowQuickMessages] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    if (activeTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, activeTab])

  if (!isOpen || !challenge) return null

  const timeRemaining = getTimeRemaining(challenge.ends_at)
  const modeConfig = CHALLENGE_MODE_CONFIG[challenge.mode]
  const statusConfig = CHALLENGE_STATUS_CONFIG[challenge.status]
  const objectiveConfig = OBJECTIVE_TYPE_CONFIG[
    challenge.challenge_type_slug.includes("xp")
      ? "xp_total"
      : challenge.challenge_type_slug.includes("challenge")
      ? "challenges_completed"
      : challenge.challenge_type_slug.includes("event")
      ? "events_attended"
      : challenge.challenge_type_slug.includes("streak")
      ? "streak_days"
      : challenge.challenge_type_slug.includes("mission")
      ? "missions_completed"
      : "xp_total"
  ]

  const rankedParticipants = getRankedParticipants(challenge.participants)
  const currentUserParticipant = challenge.participants.find(
    (p) => p.user_id === currentUserId
  )

  const handleSendMessage = async (type: "text" | "taunt" | "cheer" = "text") => {
    if (!messageInput.trim() && type === "text") return

    setIsSending(true)
    const msg = type === "text" ? messageInput : messageInput
    await onSendMessage(msg, type)
    setMessageInput("")
    setIsSending(false)
    setShowQuickMessages(false)
  }

  const handleQuickMessage = async (msg: string, type: "taunt" | "cheer") => {
    setIsSending(true)
    await onSendMessage(msg, type)
    setIsSending(false)
    setShowQuickMessages(false)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-lg max-h-[90vh] bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="relative p-4 border-b border-zinc-800"
            style={{
              background: `linear-gradient(135deg, ${challenge.color}15, transparent)`,
            }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${challenge.color}20` }}
              >
                <span className={modeConfig.color}>{modeIcons[challenge.mode]}</span>
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white truncate">
                  {challenge.challenge_name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}
                  >
                    {statusConfig.label}
                  </span>
                  <span className={`text-xs ${modeConfig.color}`}>
                    {modeConfig.description}
                  </span>
                </div>
              </div>
            </div>

            {/* Time and Progress */}
            {challenge.status === "active" && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="p-2 rounded-lg bg-zinc-800/50">
                  <div className="flex items-center gap-1 text-xs text-zinc-400">
                    <Clock className="w-3 h-3" />
                    Temps restant
                  </div>
                  <p
                    className={`font-bold ${
                      timeRemaining.urgent ? "text-red-400" : "text-white"
                    }`}
                  >
                    {timeRemaining.text}
                  </p>
                </div>

                {challenge.target_value && currentUserParticipant && (
                  <div className="p-2 rounded-lg bg-zinc-800/50">
                    <div className="flex items-center gap-1 text-xs text-zinc-400">
                      <Target className="w-3 h-3" />
                      Ta progression
                    </div>
                    <p className="font-bold text-cyan-400">
                      {calculateProgress(
                        currentUserParticipant.score,
                        challenge.target_value
                      )}
                      %
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Stake */}
            {challenge.stake_xp > 0 && (
              <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-yellow-400 font-medium">
                  Mise : {challenge.stake_xp} XP
                </span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === "leaderboard"
                  ? "text-white border-b-2 border-cyan-500"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Trophy className="w-4 h-4" />
                Classement
              </div>
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === "chat"
                  ? "text-white border-b-2 border-cyan-500"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Chat
                {messages.length > 0 && (
                  <span className="px-1.5 py-0.5 text-xs rounded-full bg-zinc-700">
                    {messages.length}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "leaderboard" ? (
              <div className="space-y-4">
                {/* Team Mode */}
                {challenge.mode === "team" ? (
                  <TeamStandings challenge={challenge} currentUserId={currentUserId} />
                ) : (
                  /* Individual Leaderboard */
                  <div className="space-y-2">
                    {rankedParticipants.map((p, index) => (
                      <ParticipantRow
                        key={p.user_id}
                        participant={p}
                        rank={p.rank}
                        isCurrentUser={p.user_id === currentUserId}
                        targetValue={challenge.target_value}
                        objectiveUnit={objectiveConfig.unit}
                        showProgress={challenge.status === "active"}
                      />
                    ))}
                  </div>
                )}

                {/* Completed Challenge Results */}
                {challenge.status === "completed" && (
                  <CompletedChallengeResults
                    challenge={challenge}
                    currentUserId={currentUserId}
                  />
                )}
              </div>
            ) : (
              /* Chat Tab */
              <div className="space-y-3">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-zinc-400 text-sm">
                      Aucun message pour le moment
                    </p>
                    <p className="text-zinc-500 text-xs">
                      Sois le premier à envoyer un message !
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      message={msg}
                      isCurrentUser={msg.user_id === currentUserId}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Chat Input (only in chat tab and for active challenges) */}
          {activeTab === "chat" && challenge.status === "active" && (
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
              {/* Quick Messages */}
              <AnimatePresence>
                {showQuickMessages && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-3 overflow-hidden"
                  >
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-400">Provocation</p>
                      <div className="flex flex-wrap gap-2">
                        {TAUNTS.map((taunt) => (
                          <button
                            key={taunt}
                            onClick={() => handleQuickMessage(taunt, "taunt")}
                            disabled={isSending}
                            className="px-3 py-1 text-xs rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                          >
                            {taunt}
                          </button>
                        ))}
                      </div>

                      <p className="text-xs text-zinc-400 mt-2">Encouragement</p>
                      <div className="flex flex-wrap gap-2">
                        {CHEERS.map((cheer) => (
                          <button
                            key={cheer}
                            onClick={() => handleQuickMessage(cheer, "cheer")}
                            disabled={isSending}
                            className="px-3 py-1 text-xs rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                          >
                            {cheer}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowQuickMessages(!showQuickMessages)}
                  className={`p-2 rounded-lg transition-colors ${
                    showQuickMessages
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "bg-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${
                      showQuickMessages ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <input
                  type="text"
                  placeholder="Envoie un message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
                />

                <button
                  onClick={() => handleSendMessage("text")}
                  disabled={!messageInput.trim() || isSending}
                  className="p-2 bg-cyan-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-600 transition-colors"
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Pending Actions */}
          {challenge.status === "pending" && !challenge.is_creator && onAccept && onDecline && (
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
              <div className="flex gap-3">
                <button
                  onClick={onDecline}
                  className="flex-1 py-3 bg-zinc-800 text-zinc-400 font-semibold rounded-xl hover:bg-zinc-700 transition-colors"
                >
                  Refuser
                </button>
                <button
                  onClick={onAccept}
                  className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
                >
                  Accepter
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ==========================================================================
   PARTICIPANT ROW
   ========================================================================== */

function ParticipantRow({
  participant,
  rank,
  isCurrentUser,
  targetValue,
  objectiveUnit,
  showProgress,
}: {
  participant: ChallengeParticipant & { rank: number }
  rank: number
  isCurrentUser: boolean
  targetValue: number | null
  objectiveUnit: string
  showProgress: boolean
}) {
  const progress = targetValue
    ? calculateProgress(participant.score, targetValue)
    : 0

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl ${
        isCurrentUser
          ? "bg-cyan-500/10 border border-cyan-500/30"
          : "bg-zinc-800/50"
      }`}
    >
      {/* Rank */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
          rank === 1
            ? "bg-yellow-500 text-black"
            : rank === 2
            ? "bg-zinc-400 text-black"
            : rank === 3
            ? "bg-amber-700 text-white"
            : "bg-zinc-700 text-zinc-400"
        }`}
      >
        {rank === 1 ? <Crown className="w-4 h-4" /> : rank}
      </div>

      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden">
        {participant.avatar_url ? (
          <img
            src={participant.avatar_url}
            alt={participant.pseudo}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold">
            {participant.pseudo.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className={`font-medium truncate ${
            isCurrentUser ? "text-cyan-400" : "text-white"
          }`}
        >
          {participant.pseudo}
          {isCurrentUser && " (toi)"}
        </p>
        {showProgress && targetValue && (
          <div className="mt-1">
            <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Score */}
      <div className="text-right">
        <p className="text-white font-bold flex items-center gap-1">
          <Zap className="w-4 h-4 text-yellow-400" />
          {participant.score.toLocaleString()}
        </p>
        {targetValue && (
          <p className="text-xs text-zinc-400">
            / {targetValue.toLocaleString()} {objectiveUnit}
          </p>
        )}
      </div>

      {/* Winner badge */}
      {participant.is_winner && (
        <Medal className="w-5 h-5 text-yellow-400" />
      )}
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
  const teamAMembers = challenge.participants.filter((p) => p.team === "a")
  const teamBMembers = challenge.participants.filter((p) => p.team === "b")

  return (
    <div className="space-y-4">
      {/* Team Scores */}
      <div className="grid grid-cols-2 gap-4">
        <div
          className={`p-4 rounded-xl border ${
            challenge.winning_team === "a"
              ? "bg-cyan-500/10 border-cyan-500/30"
              : "bg-zinc-800/50 border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-cyan-400">Équipe A</span>
            {challenge.winning_team === "a" && (
              <Crown className="w-5 h-5 text-yellow-400" />
            )}
          </div>
          <p className="text-2xl font-bold text-white">{teamAScore.toLocaleString()}</p>
          <p className="text-xs text-zinc-400">{teamAMembers.length} membres</p>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            challenge.winning_team === "b"
              ? "bg-purple-500/10 border-purple-500/30"
              : "bg-zinc-800/50 border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-purple-400">Équipe B</span>
            {challenge.winning_team === "b" && (
              <Crown className="w-5 h-5 text-yellow-400" />
            )}
          </div>
          <p className="text-2xl font-bold text-white">{teamBScore.toLocaleString()}</p>
          <p className="text-xs text-zinc-400">{teamBMembers.length} membres</p>
        </div>
      </div>

      {/* Team Members */}
      <div className="space-y-2">
        <p className="text-sm text-zinc-400 font-medium">Membres par équipe</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            {teamAMembers.map((p) => (
              <div
                key={p.user_id}
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  p.user_id === currentUserId
                    ? "bg-cyan-500/10"
                    : "bg-zinc-800/30"
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-zinc-700 overflow-hidden">
                  {p.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt={p.pseudo}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-xs text-zinc-400">
                      {p.pseudo.charAt(0)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-white truncate flex-1">
                  {p.pseudo}
                </span>
                <span className="text-xs text-yellow-400">{p.score}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {teamBMembers.map((p) => (
              <div
                key={p.user_id}
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  p.user_id === currentUserId
                    ? "bg-purple-500/10"
                    : "bg-zinc-800/30"
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-zinc-700 overflow-hidden">
                  {p.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt={p.pseudo}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-xs text-zinc-400">
                      {p.pseudo.charAt(0)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-white truncate flex-1">
                  {p.pseudo}
                </span>
                <span className="text-xs text-yellow-400">{p.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   COMPLETED CHALLENGE RESULTS
   ========================================================================== */

function CompletedChallengeResults({
  challenge,
  currentUserId,
}: {
  challenge: FriendChallenge
  currentUserId: string
}) {
  const winner = challenge.participants.find((p) => p.is_winner)
  const isWinner =
    challenge.winner_id === currentUserId ||
    (challenge.mode === "team" &&
      challenge.participants.find((p) => p.user_id === currentUserId)?.team ===
        challenge.winning_team)

  return (
    <div
      className={`p-4 rounded-xl border ${
        challenge.is_draw
          ? "bg-zinc-800/50 border-zinc-700"
          : isWinner
          ? "bg-green-500/10 border-green-500/30"
          : "bg-red-500/10 border-red-500/30"
      }`}
    >
      {challenge.is_draw ? (
        <div className="text-center">
          <p className="text-2xl mb-2">🤝</p>
          <p className="font-bold text-white">Égalité !</p>
          <p className="text-sm text-zinc-400 mt-1">
            Tous les participants ont performé de manière égale
          </p>
        </div>
      ) : isWinner ? (
        <div className="text-center">
          <p className="text-4xl mb-2">🏆</p>
          <p className="font-bold text-green-400 text-lg">Victoire !</p>
          <p className="text-sm text-zinc-400 mt-1">
            Tu as remporté ce défi, félicitations !
          </p>
          {challenge.stake_xp > 0 && (
            <p className="text-yellow-400 font-bold mt-2 flex items-center justify-center gap-1">
              <Zap className="w-4 h-4" />
              +{challenge.stake_xp * challenge.participants.length} XP gagnés
            </p>
          )}
        </div>
      ) : (
        <div className="text-center">
          <p className="text-2xl mb-2">💪</p>
          <p className="font-bold text-red-400">Défaite</p>
          <p className="text-sm text-zinc-400 mt-1">
            Pas cette fois... Retente ta chance !
          </p>
          {challenge.stake_xp > 0 && (
            <p className="text-red-400 font-bold mt-2 flex items-center justify-center gap-1">
              <Zap className="w-4 h-4" />
              -{challenge.stake_xp} XP perdus
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   CHAT MESSAGE
   ========================================================================== */

function ChatMessage({
  message,
  isCurrentUser,
}: {
  message: ChallengeMessage
  isCurrentUser: boolean
}) {
  const bgColor =
    message.message_type === "taunt"
      ? "bg-red-500/10"
      : message.message_type === "cheer"
      ? "bg-green-500/10"
      : isCurrentUser
      ? "bg-cyan-500/10"
      : "bg-zinc-800/50"

  const textColor =
    message.message_type === "taunt"
      ? "text-red-400"
      : message.message_type === "cheer"
      ? "text-green-400"
      : "text-white"

  return (
    <div
      className={`flex gap-3 ${isCurrentUser ? "flex-row-reverse" : ""}`}
    >
      <div className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden flex-shrink-0">
        {message.avatar_url ? (
          <img
            src={message.avatar_url}
            alt={message.pseudo}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-400 text-sm font-bold">
            {message.pseudo.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div
        className={`max-w-[70%] ${isCurrentUser ? "text-right" : "text-left"}`}
      >
        <p className="text-xs text-zinc-400 mb-1">
          {message.pseudo}
          <span className="ml-2 text-zinc-500">
            {new Date(message.created_at).toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </p>
        <div className={`p-3 rounded-xl ${bgColor}`}>
          <p className={`text-sm ${textColor}`}>{message.message}</p>
        </div>
      </div>
    </div>
  )
}
