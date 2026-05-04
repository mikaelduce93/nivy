/**
 * TEENS PARTY MOROCCO - Create Challenge Modal
 * =============================================
 *
 * Modal pour créer un nouveau défi entre amis.
 */

"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Swords,
  Users,
  Trophy,
  Heart,
  Zap,
  Clock,
  Target,
  Search,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Loader2,
} from "lucide-react"
import {
  type ChallengeType,
  type CreateChallengeInput,
  CHALLENGE_MODE_CONFIG,
  OBJECTIVE_TYPE_CONFIG,
} from "../../features/challenges"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface Friend {
  id: string
  pseudo: string
  avatar_url: string | null
  level: number
}

interface CreateChallengeModalProps {
  isOpen: boolean
  onClose: () => void
  challengeTypes: ChallengeType[]
  friends: Friend[]
  userXp: number
  onCreateChallenge: (input: CreateChallengeInput) => Promise<{ success: boolean; error: string | null }>
}

type Step = "type" | "friends" | "settings" | "confirm"

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
   MAIN COMPONENT
   ========================================================================== */

export function CreateChallengeModal({
  isOpen,
  onClose,
  challengeTypes,
  friends,
  userXp,
  onCreateChallenge,
}: CreateChallengeModalProps) {
  const [step, setStep] = useState<Step>("type")
  const [selectedType, setSelectedType] = useState<ChallengeType | null>(null)
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [challengeName, setChallengeName] = useState("")
  const [targetValue, setTargetValue] = useState<number | undefined>()
  const [durationHours, setDurationHours] = useState<number | undefined>()
  const [stakeXp, setStakeXp] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("type")
      setSelectedType(null)
      setSelectedFriends([])
      setSearchQuery("")
      setChallengeName("")
      setTargetValue(undefined)
      setDurationHours(undefined)
      setStakeXp(0)
      setError(null)
    }
  }, [isOpen])

  // Set default values when type is selected
  useEffect(() => {
    if (selectedType) {
      setTargetValue(selectedType.default_target || undefined)
      setDurationHours(selectedType.default_duration_hours)
    }
  }, [selectedType])

  const filteredFriends = friends.filter((f) =>
    f.pseudo.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const canSelectFriend = (friendId: string) => {
    if (!selectedType) return false
    if (selectedFriends.includes(friendId)) return true
    return selectedFriends.length < selectedType.max_participants - 1
  }

  const toggleFriend = (friendId: string) => {
    if (selectedFriends.includes(friendId)) {
      setSelectedFriends(selectedFriends.filter((id) => id !== friendId))
    } else if (canSelectFriend(friendId)) {
      setSelectedFriends([...selectedFriends, friendId])
    }
  }

  const canProceed = () => {
    switch (step) {
      case "type":
        return selectedType !== null
      case "friends":
        return (
          selectedType &&
          selectedFriends.length >= selectedType.min_participants - 1
        )
      case "settings":
        return true
      case "confirm":
        return stakeXp <= userXp
      default:
        return false
    }
  }

  const goToNextStep = () => {
    if (!canProceed()) return
    const steps: Step[] = ["type", "friends", "settings", "confirm"]
    const currentIndex = steps.indexOf(step)
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1])
    }
  }

  const goToPreviousStep = () => {
    const steps: Step[] = ["type", "friends", "settings", "confirm"]
    const currentIndex = steps.indexOf(step)
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1])
    }
  }

  const handleSubmit = async () => {
    if (!selectedType) return

    setIsSubmitting(true)
    setError(null)

    const input: CreateChallengeInput = {
      challengeTypeSlug: selectedType.slug,
      invitedUserIds: selectedFriends,
      name: challengeName || undefined,
      targetValue,
      durationHours,
      stakeXp,
    }

    const result = await onCreateChallenge(input)

    setIsSubmitting(false)

    if (result.success) {
      onClose()
    } else {
      setError(result.error || "Erreur lors de la création du défi")
    }
  }

  if (!isOpen) return null

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
          className="relative w-full max-w-lg bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <div>
              <h2 className="text-lg font-bold text-white">Créer un Défi</h2>
              <p className="text-sm text-zinc-400">
                Étape {["type", "friends", "settings", "confirm"].indexOf(step) + 1} sur 4
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="h-1 bg-zinc-800">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
              initial={{ width: "0%" }}
              animate={{
                width: `${(["type", "friends", "settings", "confirm"].indexOf(step) + 1) * 25}%`,
              }}
            />
          </div>

          {/* Content */}
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            <AnimatePresence mode="wait">
              {/* Step 1: Select Challenge Type */}
              {step === "type" && (
                <motion.div
                  key="type"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-3"
                >
                  <p className="text-sm text-zinc-400 mb-4">
                    Choisis le type de défi que tu veux lancer
                  </p>

                  {/* Group by mode */}
                  {(["duel", "team", "race", "coop"] as const).map((mode) => {
                    const modeTypes = challengeTypes.filter((t) => t.mode === mode)
                    if (modeTypes.length === 0) return null

                    const config = CHALLENGE_MODE_CONFIG[mode]

                    return (
                      <div key={mode} className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className={config.color}>{modeIcons[mode]}</span>
                          <span className="text-zinc-300 font-medium">{config.label}</span>
                          <span className="text-zinc-500 text-xs">{config.description}</span>
                        </div>

                        <div className="space-y-2">
                          {modeTypes.map((type) => (
                            <button
                              key={type.id}
                              onClick={() => setSelectedType(type)}
                              className={`w-full p-3 rounded-xl border transition-all text-left ${
                                selectedType?.id === type.id
                                  ? "border-cyan-500 bg-cyan-500/10"
                                  : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-white">{type.name}</p>
                                  {type.description && (
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                      {type.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-yellow-400 flex items-center gap-1">
                                    <Zap className="w-3 h-3" />
                                    +{type.winner_xp}
                                  </span>
                                  {selectedType?.id === type.id && (
                                    <Check className="w-4 h-4 text-cyan-400" />
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </motion.div>
              )}

              {/* Step 2: Select Friends */}
              {step === "friends" && selectedType && (
                <motion.div
                  key="friends"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div>
                    <p className="text-sm text-zinc-400">
                      Sélectionne{" "}
                      {selectedType.min_participants === selectedType.max_participants
                        ? `${selectedType.min_participants - 1} ami${selectedType.min_participants > 2 ? "s" : ""}`
                        : `${selectedType.min_participants - 1} à ${selectedType.max_participants - 1} amis`}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {selectedFriends.length} / {selectedType.max_participants - 1} sélectionné(s)
                    </p>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Rechercher un ami..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Friends List */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredFriends.length === 0 ? (
                      <p className="text-center text-zinc-500 py-8">
                        Aucun ami trouvé
                      </p>
                    ) : (
                      filteredFriends.map((friend) => {
                        const isSelected = selectedFriends.includes(friend.id)
                        const canSelect = canSelectFriend(friend.id)

                        return (
                          <button
                            key={friend.id}
                            onClick={() => toggleFriend(friend.id)}
                            disabled={!canSelect && !isSelected}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                              isSelected
                                ? "border-cyan-500 bg-cyan-500/10"
                                : canSelect
                                ? "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                                : "border-zinc-800 bg-zinc-900 opacity-50 cursor-not-allowed"
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden">
                              {friend.avatar_url ? (
                                <img
                                  src={friend.avatar_url}
                                  alt={friend.pseudo}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold">
                                  {friend.pseudo.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium text-white">{friend.pseudo}</p>
                              <p className="text-xs text-zinc-400">Niveau {friend.level}</p>
                            </div>
                            {isSelected && <Check className="w-5 h-5 text-cyan-400" />}
                          </button>
                        )
                      })
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Settings */}
              {step === "settings" && selectedType && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <p className="text-sm text-zinc-400">
                    Personnalise les paramètres du défi (optionnel)
                  </p>

                  {/* Challenge Name */}
                  <div>
                    <label className="block text-sm text-zinc-300 mb-1">
                      Nom du défi
                    </label>
                    <input
                      type="text"
                      placeholder={selectedType.name}
                      value={challengeName}
                      onChange={(e) => setChallengeName(e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Target Value */}
                  {selectedType.default_target && (
                    <div>
                      <label className="block text-sm text-zinc-300 mb-1">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          <span>Objectif ({OBJECTIVE_TYPE_CONFIG[selectedType.objective_type].unit})</span>
                        </div>
                      </label>
                      <input
                        type="number"
                        value={targetValue || ""}
                        onChange={(e) => setTargetValue(parseInt(e.target.value) || undefined)}
                        min={1}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  )}

                  {/* Duration */}
                  <div>
                    <label className="block text-sm text-zinc-300 mb-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Durée</span>
                      </div>
                    </label>
                    <select
                      value={durationHours || selectedType.default_duration_hours}
                      onChange={(e) => setDurationHours(parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value={1}>1 heure</option>
                      <option value={3}>3 heures</option>
                      <option value={6}>6 heures</option>
                      <option value={12}>12 heures</option>
                      <option value={24}>1 jour</option>
                      <option value={48}>2 jours</option>
                      <option value={72}>3 jours</option>
                      <option value={168}>1 semaine</option>
                    </select>
                  </div>

                  {/* XP Stake */}
                  <div>
                    <label className="block text-sm text-zinc-300 mb-1">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span>Mise en XP (optionnel)</span>
                      </div>
                    </label>
                    <p className="text-xs text-zinc-500 mb-2">
                      Tu as {userXp.toLocaleString()} XP disponibles
                    </p>
                    <input
                      type="range"
                      value={stakeXp}
                      onChange={(e) => setStakeXp(parseInt(e.target.value))}
                      min={0}
                      max={Math.min(userXp, 1000)}
                      step={50}
                      className="w-full accent-yellow-400"
                    />
                    <div className="flex justify-between text-xs text-zinc-400 mt-1">
                      <span>0 XP</span>
                      <span className="text-yellow-400 font-bold">{stakeXp} XP</span>
                      <span>{Math.min(userXp, 1000)} XP</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Confirm */}
              {step === "confirm" && selectedType && (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <p className="text-sm text-zinc-400">
                    Vérifie les détails de ton défi
                  </p>

                  <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 space-y-3">
                    {/* Type */}
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Type</span>
                      <div className="flex items-center gap-2">
                        <span className={CHALLENGE_MODE_CONFIG[selectedType.mode].color}>
                          {modeIcons[selectedType.mode]}
                        </span>
                        <span className="text-white font-medium">
                          {challengeName || selectedType.name}
                        </span>
                      </div>
                    </div>

                    {/* Participants */}
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Adversaires</span>
                      <div className="flex items-center gap-1">
                        {selectedFriends.map((id) => {
                          const friend = friends.find((f) => f.id === id)
                          return (
                            <div
                              key={id}
                              className="w-6 h-6 rounded-full bg-zinc-700 overflow-hidden border-2 border-zinc-800 -ml-2 first:ml-0"
                            >
                              {friend?.avatar_url ? (
                                <img
                                  src={friend.avatar_url}
                                  alt={friend.pseudo}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs font-bold">
                                  {friend?.pseudo.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                          )
                        })}
                        <span className="text-white text-sm ml-2">
                          {selectedFriends.length} ami(s)
                        </span>
                      </div>
                    </div>

                    {/* Target */}
                    {targetValue && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Objectif</span>
                        <span className="text-white">
                          {targetValue} {OBJECTIVE_TYPE_CONFIG[selectedType.objective_type].unit}
                        </span>
                      </div>
                    )}

                    {/* Duration */}
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Durée</span>
                      <span className="text-white">
                        {(durationHours || selectedType.default_duration_hours) >= 24
                          ? `${Math.floor((durationHours || selectedType.default_duration_hours) / 24)} jour(s)`
                          : `${durationHours || selectedType.default_duration_hours} heure(s)`}
                      </span>
                    </div>

                    {/* Stake */}
                    {stakeXp > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Mise</span>
                        <span className="text-yellow-400 font-bold flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          {stakeXp} XP
                        </span>
                      </div>
                    )}

                    {/* Rewards */}
                    <div className="pt-2 border-t border-zinc-700">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Récompense gagnant</span>
                        <span className="text-green-400 font-bold flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          +{selectedType.winner_xp + stakeXp * selectedFriends.length} XP
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-zinc-400">Participation</span>
                        <span className="text-cyan-400 flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          +{selectedType.participant_xp} XP
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Warning if stake > 0 */}
                  {stakeXp > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="text-yellow-400 font-medium">Mise d'XP</p>
                        <p className="text-zinc-400">
                          Tu vas miser {stakeXp} XP. Si tu perds, tu perdras cette mise.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <p className="text-sm">{error}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-zinc-800 bg-zinc-900/50">
            <button
              onClick={step === "type" ? onClose : goToPreviousStep}
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              {step === "type" ? "Annuler" : "Retour"}
            </button>

            {step === "confirm" ? (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    Lancer le défi
                    <Swords className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={goToNextStep}
                disabled={!canProceed()}
                className="px-4 py-2 bg-zinc-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 hover:bg-zinc-700 transition-colors"
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ==========================================================================
   CHALLENGE TYPE SELECTOR (Standalone)
   ========================================================================== */

export function ChallengeTypeSelector({
  types,
  selectedSlug,
  onSelect,
}: {
  types: ChallengeType[]
  selectedSlug: string | null
  onSelect: (type: ChallengeType) => void
}) {
  const groupedByMode = types.reduce((acc, type) => {
    if (!acc[type.mode]) acc[type.mode] = []
    acc[type.mode].push(type)
    return acc
  }, {} as Record<string, ChallengeType[]>)

  return (
    <div className="space-y-4">
      {Object.entries(groupedByMode).map(([mode, modeTypes]) => {
        const config = CHALLENGE_MODE_CONFIG[mode as keyof typeof CHALLENGE_MODE_CONFIG]

        return (
          <div key={mode}>
            <div className="flex items-center gap-2 mb-2">
              <span className={config.color}>{modeIcons[mode]}</span>
              <span className="text-sm font-medium text-zinc-300">{config.label}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {modeTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => onSelect(type)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedSlug === type.slug
                      ? "border-cyan-500 bg-cyan-500/10"
                      : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                  }`}
                >
                  <p className="font-medium text-white text-sm">{type.name}</p>
                  <p className="text-xs text-yellow-400 mt-1">+{type.winner_xp} XP</p>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ==========================================================================
   FRIEND SELECTOR (Standalone)
   ========================================================================== */

export function FriendSelector({
  friends,
  selectedIds,
  maxSelectable,
  onToggle,
}: {
  friends: Friend[]
  selectedIds: string[]
  maxSelectable: number
  onToggle: (id: string) => void
}) {
  const [search, setSearch] = useState("")

  const filtered = friends.filter((f) =>
    f.pseudo.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      <p className="text-xs text-zinc-500">
        {selectedIds.length} / {maxSelectable} sélectionné(s)
      </p>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {filtered.map((friend) => {
          const isSelected = selectedIds.includes(friend.id)
          const canSelect = isSelected || selectedIds.length < maxSelectable

          return (
            <button
              key={friend.id}
              onClick={() => canSelect && onToggle(friend.id)}
              disabled={!canSelect}
              className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${
                isSelected
                  ? "bg-cyan-500/20 border border-cyan-500/50"
                  : canSelect
                  ? "bg-zinc-800/50 hover:bg-zinc-800"
                  : "bg-zinc-900 opacity-50"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden">
                {friend.avatar_url ? (
                  <img
                    src={friend.avatar_url}
                    alt={friend.pseudo}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400 text-sm font-bold">
                    {friend.pseudo.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-white text-sm flex-1 text-left">{friend.pseudo}</span>
              {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
