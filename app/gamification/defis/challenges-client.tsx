"use client"

/**
 * TEENS PARTY MOROCCO - Challenges Client Component
 * ==================================================
 * Composant client pour les défis entre amis
 */

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Swords,
  Users,
  Trophy,
  Zap,
  Clock,
  Target,
  Flame,
  Calendar,
  Flag,
  ChevronRight,
  Plus,
  Check,
  X,
  MessageCircle,
  Send,
} from "lucide-react"
import {
  createChallenge,
  acceptChallenge,
  declineChallenge,
  sendChallengeMessage,
} from "@/gamification-system/features/challenges/actions"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface ChallengeType {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  color: string
  mode: string
  min_participants: number
  max_participants: number
  objective_type: string
  default_target: number | null
  default_duration_hours: number
  winner_xp: number
  participant_xp: number
}

interface Challenge {
  challenge_id: string
  name: string
  status: string
  mode: string
  target_value: number
  starts_at: string
  ends_at: string
  winner_id: string | null
  is_draw: boolean
  participants: Array<{
    user_id: string
    pseudo: string
    avatar_url: string
    status: string
    current_score: number
    is_winner: boolean
  }>
  challenge_type: {
    slug: string
    name: string
    icon: string
    color: string
    objective_type: string
    winner_xp: number
  }
}

interface Friend {
  id: string
  pseudo: string
  avatar_url: string
}

interface ChallengesClientProps {
  challengeTypes: ChallengeType[]
  challenges: Challenge[]
  friends: Friend[]
  userId: string
}

/* ==========================================================================
   ICON MAP
   ========================================================================== */

const ICON_MAP: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  swords: Swords,
  zap: Zap,
  target: Target,
  calendar: Calendar,
  flame: Flame,
  trophy: Trophy,
  flag: Flag,
  users: Users,
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export function ChallengesClient({
  challengeTypes,
  challenges: initialChallenges,
  friends,
  userId,
}: ChallengesClientProps) {
  const [challenges, setChallenges] = useState(initialChallenges)
  const [activeTab, setActiveTab] = useState<"active" | "pending" | "completed">("active")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)

  const filteredChallenges = challenges.filter((c) => {
    if (activeTab === "active") return c.status === "active"
    if (activeTab === "pending") return c.status === "pending"
    if (activeTab === "completed") return c.status === "completed"
    return true
  })

  const handleAccept = async (challengeId: string) => {
    const result = await acceptChallenge(challengeId)
    if (result.success) {
      setChallenges((prev) =>
        prev.map((c) =>
          c.challenge_id === challengeId ? { ...c, status: "active" } : c
        )
      )
    }
  }

  const handleDecline = async (challengeId: string) => {
    const result = await declineChallenge(challengeId)
    if (result.success) {
      setChallenges((prev) =>
        prev.filter((c) => c.challenge_id !== challengeId)
      )
    }
  }

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex gap-2 justify-center">
        {([
          { id: "active", label: "En cours", count: challenges.filter((c) => c.status === "active").length },
          { id: "pending", label: "Invitations", count: challenges.filter((c) => c.status === "pending").length },
          { id: "completed", label: "Terminés", count: challenges.filter((c) => c.status === "completed").length },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? "bg-white/20" : "bg-zinc-700"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Create Challenge Button */}
      <div className="flex justify-center">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl hover:from-cyan-400 hover:to-blue-400 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Créer un défi
        </button>
      </div>

      {/* Challenges List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredChallenges.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Swords className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500">
                {activeTab === "active"
                  ? "Aucun défi en cours"
                  : activeTab === "pending"
                  ? "Aucune invitation en attente"
                  : "Aucun défi terminé"}
              </p>
            </motion.div>
          ) : (
            filteredChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge.challenge_id}
                challenge={challenge}
                userId={userId}
                onAccept={() => handleAccept(challenge.challenge_id)}
                onDecline={() => handleDecline(challenge.challenge_id)}
                onClick={() => setSelectedChallenge(challenge)}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Create Challenge Modal */}
      <CreateChallengeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        challengeTypes={challengeTypes}
        friends={friends}
        onCreated={(newChallenge) => {
          setChallenges((prev) => [newChallenge, ...prev])
          setShowCreateModal(false)
        }}
      />

      {/* Challenge Details Modal */}
      <ChallengeDetailsModal
        challenge={selectedChallenge}
        userId={userId}
        onClose={() => setSelectedChallenge(null)}
      />
    </div>
  )
}

/* ==========================================================================
   CHALLENGE CARD
   ========================================================================== */

interface ChallengeCardProps {
  challenge: Challenge
  userId: string
  onAccept: () => void
  onDecline: () => void
  onClick: () => void
}

function ChallengeCard({ challenge, userId, onAccept, onDecline, onClick }: ChallengeCardProps) {
  const Icon = ICON_MAP[challenge.challenge_type?.icon || "swords"] || Swords
  const isPending = challenge.status === "pending"
  const isActive = challenge.status === "active"
  const isCompleted = challenge.status === "completed"

  // Trouver mon score et celui de l'adversaire
  const myParticipant = challenge.participants?.find((p) => p.user_id === userId)
  const opponent = challenge.participants?.find((p) => p.user_id !== userId)

  // Calcul du temps restant
  const timeRemaining = isActive ? getTimeRemaining(challenge.ends_at) : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`p-4 rounded-2xl border cursor-pointer transition-colors ${
        isActive
          ? "bg-zinc-800/50 border-cyan-500/30 hover:border-cyan-500/50"
          : isPending
          ? "bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50"
          : "bg-zinc-800/30 border-zinc-700/50 hover:border-zinc-600/50"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${challenge.challenge_type?.color || "#06b6d4"}20` }}
        >
          <Icon
            className="w-7 h-7"
            style={{ color: challenge.challenge_type?.color || "#06b6d4" }}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white truncate">
            {challenge.name || challenge.challenge_type?.name}
          </h3>
          <p className="text-sm text-zinc-400">
            {challenge.mode === "duel" ? "Duel" : challenge.mode === "team" ? "Équipe" : "Course"}
            {" • "}
            {challenge.participants?.length || 0} participants
          </p>
          {timeRemaining && (
            <p className="text-xs text-cyan-400 flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" />
              {timeRemaining}
            </p>
          )}
        </div>

        {/* Score / Status */}
        {isActive && myParticipant && opponent && (
          <div className="text-center">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-green-400">{myParticipant.current_score}</span>
              <span className="text-zinc-500">vs</span>
              <span className="text-xl font-bold text-red-400">{opponent.current_score}</span>
            </div>
            <p className="text-xs text-zinc-500">Score</p>
          </div>
        )}

        {isCompleted && (
          <div className="text-center">
            {challenge.winner_id === userId ? (
              <Trophy className="w-8 h-8 text-yellow-400 mx-auto" />
            ) : challenge.is_draw ? (
              <span className="text-zinc-400 font-medium">Égalité</span>
            ) : (
              <span className="text-red-400 font-medium">Perdu</span>
            )}
          </div>
        )}

        {isPending && (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onAccept}
              className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-400 transition-colors"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={onDecline}
              className="p-2 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {!isPending && <ChevronRight className="w-5 h-5 text-zinc-500" />}
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   CREATE CHALLENGE MODAL
   ========================================================================== */

interface CreateChallengeModalProps {
  isOpen: boolean
  onClose: () => void
  challengeTypes: ChallengeType[]
  friends: Friend[]
  onCreated: (challenge: any) => void
}

function CreateChallengeModal({
  isOpen,
  onClose,
  challengeTypes,
  friends,
  onCreated,
}: CreateChallengeModalProps) {
  const [step, setStep] = useState(1)
  const [selectedType, setSelectedType] = useState<ChallengeType | null>(null)
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async () => {
    if (!selectedType || selectedFriends.length === 0) return

    setIsSubmitting(true)
    try {
      const result = await createChallenge({
        challengeTypeSlug: selectedType.slug,
        invitedUserIds: selectedFriends,
        stakeXp: 100, // Default stake XP
        name: name || undefined,
      })

      if (result.success) {
        onCreated({
          challenge_id: result.challengeId,
          name: name || selectedType.name,
          status: "pending",
          mode: selectedType.mode,
          challenge_type: selectedType,
          participants: [],
        })
        // Reset
        setStep(1)
        setSelectedType(null)
        setSelectedFriends([])
        setName("")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-lg bg-zinc-900 rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">Créer un défi</h2>
          <p className="text-sm text-zinc-400">Étape {step} sur 3</p>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Step 1: Choose Type */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-zinc-400 mb-4">Choisis un type de défi :</p>
              {challengeTypes.map((type) => {
                const Icon = ICON_MAP[type.icon] || Swords
                return (
                  <button
                    key={type.id}
                    onClick={() => {
                      setSelectedType(type)
                      setStep(2)
                    }}
                    className={`w-full p-4 rounded-xl border text-left transition-colors ${
                      selectedType?.id === type.id
                        ? "bg-cyan-500/20 border-cyan-500"
                        : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${type.color}20` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: type.color }} />
                      </div>
                      <div>
                        <p className="font-medium text-white">{type.name}</p>
                        <p className="text-xs text-zinc-500">{type.description}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Step 2: Choose Friends */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-zinc-400 mb-4">
                Invite {selectedType?.max_participants === 2 ? "un ami" : "des amis"} :
              </p>
              {friends.length === 0 ? (
                <p className="text-center text-zinc-500 py-8">
                  Aucun ami trouvé. Ajoute des amis pour créer des défis !
                </p>
              ) : (
                friends.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => {
                      if (selectedType?.max_participants === 2) {
                        setSelectedFriends([friend.id])
                      } else {
                        setSelectedFriends((prev) =>
                          prev.includes(friend.id)
                            ? prev.filter((id) => id !== friend.id)
                            : [...prev, friend.id]
                        )
                      }
                    }}
                    className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                      selectedFriends.includes(friend.id)
                        ? "bg-cyan-500/20 border-cyan-500"
                        : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    <img
                      src={friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.id}`}
                      alt={friend.pseudo}
                      className="w-10 h-10 rounded-full"
                    />
                    <span className="font-medium text-white">{friend.pseudo}</span>
                    {selectedFriends.includes(friend.id) && (
                      <Check className="w-5 h-5 text-cyan-400 ml-auto" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Step 3: Name & Confirm */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Nom du défi (optionnel)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={selectedType?.name}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
                <h4 className="font-medium text-white mb-2">Résumé</h4>
                <p className="text-sm text-zinc-400">
                  Type : {selectedType?.name}
                </p>
                <p className="text-sm text-zinc-400">
                  Participants : {selectedFriends.length + 1} joueurs
                </p>
                <p className="text-sm text-zinc-400">
                  Durée : {(selectedType?.default_duration_hours || 168) / 24} jours
                </p>
                <p className="text-sm text-yellow-400 mt-2">
                  Récompense : {selectedType?.winner_xp} XP pour le gagnant
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-xl bg-zinc-800 text-white font-medium"
            >
              Retour
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-400 font-medium"
          >
            Annuler
          </button>
          <button
            onClick={() => {
              if (step < 3) {
                if (step === 2 && selectedFriends.length === 0) return
                setStep(step + 1)
              } else {
                handleCreate()
              }
            }}
            disabled={
              (step === 2 && selectedFriends.length === 0) ||
              isSubmitting
            }
            className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium disabled:opacity-50"
          >
            {step === 3 ? (isSubmitting ? "Création..." : "Créer le défi") : "Suivant"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ==========================================================================
   CHALLENGE DETAILS MODAL
   ========================================================================== */

interface ChallengeDetailsModalProps {
  challenge: Challenge | null
  userId: string
  onClose: () => void
}

function ChallengeDetailsModal({ challenge, userId, onClose }: ChallengeDetailsModalProps) {
  const [message, setMessage] = useState("")

  if (!challenge) return null

  const Icon = ICON_MAP[challenge.challenge_type?.icon || "swords"] || Swords
  const myParticipant = challenge.participants?.find((p) => p.user_id === userId)
  const timeRemaining = challenge.status === "active" ? getTimeRemaining(challenge.ends_at) : null

  const handleSendMessage = async () => {
    if (!message.trim()) return
    await sendChallengeMessage(challenge.challenge_id, message)
    setMessage("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-lg bg-zinc-900 rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div
          className="p-6"
          style={{ backgroundColor: `${challenge.challenge_type?.color || "#06b6d4"}20` }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${challenge.challenge_type?.color || "#06b6d4"}30` }}
            >
              <Icon
                className="w-8 h-8"
                style={{ color: challenge.challenge_type?.color || "#06b6d4" }}
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {challenge.name || challenge.challenge_type?.name}
              </h2>
              <p className="text-sm text-zinc-400">
                {challenge.challenge_type?.objective_type === "xp_total"
                  ? "Plus d'XP gagne"
                  : challenge.challenge_type?.objective_type === "first_to_target"
                  ? `Premier à ${challenge.target_value}`
                  : challenge.challenge_type?.name}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Time Remaining */}
          {timeRemaining && (
            <div className="flex items-center justify-center gap-2 text-cyan-400">
              <Clock className="w-5 h-5" />
              <span className="font-medium">{timeRemaining}</span>
            </div>
          )}

          {/* Participants */}
          <div className="space-y-3">
            <h3 className="font-medium text-white">Participants</h3>
            {challenge.participants?.map((participant) => (
              <div
                key={participant.user_id}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  participant.user_id === userId
                    ? "bg-cyan-500/20 border border-cyan-500/30"
                    : "bg-zinc-800/50"
                }`}
              >
                <img
                  src={participant.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.user_id}`}
                  alt={participant.pseudo}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1">
                  <p className="font-medium text-white">
                    {participant.pseudo}
                    {participant.user_id === userId && " (Toi)"}
                  </p>
                  <p className="text-xs text-zinc-500 capitalize">{participant.status}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-white">{participant.current_score}</p>
                  <p className="text-xs text-zinc-500">points</p>
                </div>
                {participant.is_winner && (
                  <Trophy className="w-6 h-6 text-yellow-400" />
                )}
              </div>
            ))}
          </div>

          {/* Quick Message */}
          {challenge.status === "active" && (
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Envoyer un message..."
                className="flex-1 px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none"
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <button
                onClick={handleSendMessage}
                className="p-2 rounded-xl bg-cyan-500 text-white"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-zinc-800 text-white font-medium"
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

function getTimeRemaining(endDate: string): string {
  const now = new Date()
  const end = new Date(endDate)
  const diff = end.getTime() - now.getTime()

  if (diff <= 0) return "Terminé"

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return `${days}j ${hours}h restants`
  if (hours > 0) return `${hours}h ${minutes}m restants`
  return `${minutes}m restants`
}
