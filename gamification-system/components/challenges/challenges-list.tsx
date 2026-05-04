/**
 * TEENS PARTY MOROCCO - Challenges List Component
 * ================================================
 *
 * Liste des défis avec filtres et actions.
 */

"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Filter,
  Plus,
  Swords,
  Users,
  Trophy,
  Heart,
  Clock,
  TrendingUp,
  AlertCircle,
  Bell,
  ChevronRight,
  Zap,
} from "lucide-react"
import {
  type FriendChallenge,
  type ChallengeStatus,
  type ChallengeMode,
  CHALLENGE_MODE_CONFIG,
  CHALLENGE_STATUS_CONFIG,
} from "../../features/challenges"
import { ChallengeCard, CompactChallengeCard } from "./challenge-card"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface ChallengesListProps {
  challenges: FriendChallenge[]
  onAccept: (challengeId: string) => Promise<void>
  onDecline: (challengeId: string) => Promise<void>
  onViewDetails: (challenge: FriendChallenge) => void
  onCreateNew: () => void
  isLoading?: boolean
}

type FilterTab = "all" | "active" | "pending" | "completed"

/* ==========================================================================
   ICONS
   ========================================================================== */

const modeIcons: Record<ChallengeMode, React.ReactNode> = {
  duel: <Swords className="w-4 h-4" />,
  team: <Users className="w-4 h-4" />,
  race: <Trophy className="w-4 h-4" />,
  coop: <Heart className="w-4 h-4" />,
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export function ChallengesList({
  challenges,
  onAccept,
  onDecline,
  onViewDetails,
  onCreateNew,
  isLoading = false,
}: ChallengesListProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMode, setSelectedMode] = useState<ChallengeMode | "all">("all")
  const [showFilters, setShowFilters] = useState(false)

  // Filter and count challenges
  const { filteredChallenges, counts } = useMemo(() => {
    const counts = {
      all: challenges.length,
      active: challenges.filter((c) => c.status === "active").length,
      pending: challenges.filter((c) => c.status === "pending").length,
      completed: challenges.filter(
        (c) => c.status === "completed" || c.status === "cancelled" || c.status === "expired"
      ).length,
    }

    let filtered = challenges

    // Filter by tab
    if (activeTab !== "all") {
      if (activeTab === "completed") {
        filtered = filtered.filter(
          (c) => c.status === "completed" || c.status === "cancelled" || c.status === "expired"
        )
      } else {
        filtered = filtered.filter((c) => c.status === activeTab)
      }
    }

    // Filter by mode
    if (selectedMode !== "all") {
      filtered = filtered.filter((c) => c.mode === selectedMode)
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.challenge_name.toLowerCase().includes(query) ||
          c.participants.some((p) => p.pseudo.toLowerCase().includes(query))
      )
    }

    // Sort: pending first, then active, then by end date
    filtered.sort((a, b) => {
      const statusOrder: Record<ChallengeStatus, number> = {
        pending: 0,
        active: 1,
        completed: 2,
        expired: 3,
        cancelled: 4,
      }
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status]
      }
      return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime()
    })

    return { filteredChallenges: filtered, counts }
  }, [challenges, activeTab, selectedMode, searchQuery])

  const tabs: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "Tous", icon: <Swords className="w-4 h-4" /> },
    { key: "active", label: "En cours", icon: <TrendingUp className="w-4 h-4" /> },
    { key: "pending", label: "Invitations", icon: <Bell className="w-4 h-4" /> },
    { key: "completed", label: "Terminés", icon: <Clock className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Mes Défis</h2>
          <p className="text-sm text-zinc-400">
            {challenges.length} défi{challenges.length !== 1 ? "s" : ""} au total
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Nouveau défi
        </button>
      </div>

      {/* Pending Invitations Alert */}
      {counts.pending > 0 && activeTab !== "pending" && (
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setActiveTab("pending")}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-left">
              <p className="font-medium text-yellow-400">
                {counts.pending} invitation{counts.pending > 1 ? "s" : ""} en attente
              </p>
              <p className="text-xs text-zinc-400">
                Clique pour voir les défis qui t'attendent
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-yellow-400" />
        </motion.button>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            {tab.icon}
            {tab.label}
            {counts[tab.key] > 0 && (
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.key
                    ? "bg-zinc-700 text-white"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Rechercher un défi ou un ami..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            showFilters || selectedMode !== "all"
              ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
              : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filtres
        </button>
      </div>

      {/* Expanded Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 space-y-3">
              <p className="text-sm text-zinc-400">Mode de jeu</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedMode("all")}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    selectedMode === "all"
                      ? "bg-zinc-700 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  Tous
                </button>
                {(Object.keys(CHALLENGE_MODE_CONFIG) as ChallengeMode[]).map((mode) => {
                  const config = CHALLENGE_MODE_CONFIG[mode]
                  return (
                    <button
                      key={mode}
                      onClick={() => setSelectedMode(mode)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        selectedMode === mode
                          ? `bg-zinc-700 ${config.color}`
                          : "bg-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {modeIcons[mode]}
                      {config.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Challenges List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-zinc-800/50 animate-pulse"
            />
          ))}
        </div>
      ) : filteredChallenges.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
            <Swords className="w-8 h-8 text-zinc-600" />
          </div>
          <p className="text-zinc-400 mb-2">
            {searchQuery
              ? "Aucun défi trouvé"
              : activeTab === "pending"
              ? "Aucune invitation en attente"
              : activeTab === "active"
              ? "Aucun défi en cours"
              : "Aucun défi pour le moment"}
          </p>
          <button
            onClick={onCreateNew}
            className="text-cyan-400 hover:text-cyan-300 font-medium"
          >
            Créer ton premier défi
          </button>
        </div>
      ) : (
        <motion.div
          className="space-y-3"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.05 },
            },
          }}
        >
          {filteredChallenges.map((challenge) => (
            <motion.div
              key={challenge.challenge_id}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <ChallengeCard
                challenge={challenge}
                onAccept={onAccept}
                onDecline={onDecline}
                onClick={() => onViewDetails(challenge)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}

/* ==========================================================================
   CHALLENGES SUMMARY WIDGET
   ========================================================================== */

interface ChallengeSummaryWidgetProps {
  activeCount: number
  pendingCount: number
  wonCount: number
  totalParticipated: number
  onViewAll: () => void
  onViewPending: () => void
}

export function ChallengeSummaryWidget({
  activeCount,
  pendingCount,
  wonCount,
  totalParticipated,
  onViewAll,
  onViewPending,
}: ChallengeSummaryWidgetProps) {
  const winRate =
    totalParticipated > 0 ? Math.round((wonCount / totalParticipated) * 100) : 0

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Swords className="w-5 h-5 text-cyan-400" />
          Défis entre amis
        </h3>
        <button
          onClick={onViewAll}
          className="text-sm text-cyan-400 hover:text-cyan-300"
        >
          Voir tout
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Active */}
        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
          <p className="text-2xl font-bold text-green-400">{activeCount}</p>
          <p className="text-xs text-zinc-400">En cours</p>
        </div>

        {/* Pending */}
        <button
          onClick={onViewPending}
          className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-left hover:bg-yellow-500/20 transition-colors"
        >
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
            {pendingCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            )}
          </div>
          <p className="text-xs text-zinc-400">Invitations</p>
        </button>

        {/* Win Rate */}
        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <p className="text-2xl font-bold text-purple-400">{winRate}%</p>
          <p className="text-xs text-zinc-400">Taux de victoire</p>
        </div>

        {/* Total Won */}
        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <div className="flex items-center gap-1">
            <Trophy className="w-4 h-4 text-cyan-400" />
            <p className="text-2xl font-bold text-cyan-400">{wonCount}</p>
          </div>
          <p className="text-xs text-zinc-400">Victoires</p>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   ACTIVE CHALLENGES PREVIEW
   ========================================================================== */

interface ActiveChallengesPreviewProps {
  challenges: FriendChallenge[]
  maxVisible?: number
  onViewDetails: (challenge: FriendChallenge) => void
  onViewAll: () => void
}

export function ActiveChallengesPreview({
  challenges,
  maxVisible = 3,
  onViewDetails,
  onViewAll,
}: ActiveChallengesPreviewProps) {
  const activeChallenges = challenges
    .filter((c) => c.status === "active")
    .slice(0, maxVisible)

  if (activeChallenges.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 text-center">
        <p className="text-zinc-400 text-sm">Aucun défi en cours</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {activeChallenges.map((challenge) => (
        <CompactChallengeCard
          key={challenge.challenge_id}
          challenge={challenge}
          onClick={() => onViewDetails(challenge)}
        />
      ))}

      {challenges.filter((c) => c.status === "active").length > maxVisible && (
        <button
          onClick={onViewAll}
          className="w-full py-2 text-sm text-cyan-400 hover:text-cyan-300 text-center"
        >
          Voir les {challenges.filter((c) => c.status === "active").length - maxVisible} autres défis
        </button>
      )}
    </div>
  )
}

/* ==========================================================================
   PENDING INVITATIONS LIST
   ========================================================================== */

interface PendingInvitationsProps {
  challenges: FriendChallenge[]
  onAccept: (challengeId: string) => Promise<void>
  onDecline: (challengeId: string) => Promise<void>
}

export function PendingInvitations({
  challenges,
  onAccept,
  onDecline,
}: PendingInvitationsProps) {
  const pendingChallenges = challenges.filter((c) => c.status === "pending")

  if (pendingChallenges.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-yellow-400" />
        <h3 className="font-bold text-white">
          Invitations ({pendingChallenges.length})
        </h3>
      </div>

      {pendingChallenges.map((challenge) => (
        <ChallengeCard
          key={challenge.challenge_id}
          challenge={challenge}
          onAccept={onAccept}
          onDecline={onDecline}
        />
      ))}
    </div>
  )
}

/* ==========================================================================
   LEADERBOARD MINI
   ========================================================================== */

interface ChallengeLeaderboardMiniProps {
  participants: Array<{
    user_id: string
    pseudo: string
    avatar_url: string | null
    score: number
  }>
  currentUserId: string
}

export function ChallengeLeaderboardMini({
  participants,
  currentUserId,
}: ChallengeLeaderboardMiniProps) {
  const sorted = [...participants].sort((a, b) => b.score - a.score)

  return (
    <div className="space-y-2">
      {sorted.slice(0, 5).map((p, index) => {
        const isCurrentUser = p.user_id === currentUserId

        return (
          <div
            key={p.user_id}
            className={`flex items-center gap-3 p-2 rounded-lg ${
              isCurrentUser ? "bg-cyan-500/10" : ""
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                index === 0
                  ? "bg-yellow-500 text-black"
                  : index === 1
                  ? "bg-zinc-400 text-black"
                  : index === 2
                  ? "bg-amber-700 text-white"
                  : "bg-zinc-700 text-zinc-400"
              }`}
            >
              {index + 1}
            </span>

            <div className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden">
              {p.avatar_url ? (
                <img
                  src={p.avatar_url}
                  alt={p.pseudo}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs font-bold">
                  {p.pseudo.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <span
              className={`flex-1 text-sm ${
                isCurrentUser ? "text-cyan-400 font-medium" : "text-white"
              }`}
            >
              {p.pseudo}
              {isCurrentUser && " (toi)"}
            </span>

            <span className="text-sm text-yellow-400 font-medium flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {p.score}
            </span>
          </div>
        )
      })}
    </div>
  )
}
