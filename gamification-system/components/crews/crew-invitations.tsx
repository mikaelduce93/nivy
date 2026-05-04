/**
 * TEENS PARTY MOROCCO - Crew Invitations Components
 * ==================================================
 *
 * Composants pour gérer les invitations et demandes d'adhésion.
 */

"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Users,
  Mail,
  UserPlus,
  Check,
  X,
  Clock,
  Loader2,
  Bell,
  ChevronRight,
  MessageCircle,
} from "lucide-react"
import {
  type CrewInvitation,
  type CrewJoinRequest,
  isInvitationExpired,
} from "../../features/crews"

/* ==========================================================================
   PENDING INVITATIONS
   ========================================================================== */

interface PendingInvitationsProps {
  invitations: CrewInvitation[]
  onAccept: (invitationId: string) => Promise<void>
  onDecline: (invitationId: string) => Promise<void>
}

export function PendingInvitations({
  invitations,
  onAccept,
  onDecline,
}: PendingInvitationsProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<"accept" | "decline" | null>(null)

  const validInvitations = invitations.filter(
    (i) => i.status === "pending" && !isInvitationExpired(i.expires_at)
  )

  if (validInvitations.length === 0) {
    return null
  }

  const handleAction = async (
    id: string,
    action: "accept" | "decline",
    handler: (id: string) => Promise<void>
  ) => {
    setLoadingId(id)
    setLoadingAction(action)
    try {
      await handler(id)
    } finally {
      setLoadingId(null)
      setLoadingAction(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-yellow-400" />
        <h3 className="font-bold text-white">
          Invitations ({validInvitations.length})
        </h3>
      </div>

      <div className="space-y-3">
        {validInvitations.map((invitation) => {
          const isLoading = loadingId === invitation.id

          return (
            <motion.div
              key={invitation.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30"
            >
              <div className="flex items-start gap-3">
                {/* Crew Avatar */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${invitation.crew_color}30` }}
                >
                  {invitation.crew_avatar_url ? (
                    <img
                      src={invitation.crew_avatar_url}
                      alt={invitation.crew_name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <Users
                      className="w-6 h-6"
                      style={{ color: invitation.crew_color }}
                    />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white">
                    {invitation.crew_name}
                  </p>
                  <p className="text-sm text-zinc-400">
                    Invité par{" "}
                    <span className="text-white">{invitation.inviter_pseudo}</span>
                  </p>

                  {invitation.message && (
                    <div className="mt-2 p-2 rounded-lg bg-zinc-800/50 text-sm text-zinc-300">
                      "{invitation.message}"
                    </div>
                  )}

                  {/* Expiration */}
                  <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Expire le{" "}
                    {new Date(invitation.expires_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleAction(invitation.id, "decline", onDecline)}
                  disabled={isLoading}
                  className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-400 font-semibold hover:bg-zinc-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading && loadingAction === "decline" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <X className="w-4 h-4" />
                      Refuser
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleAction(invitation.id, "accept", onAccept)}
                  disabled={isLoading}
                  className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading && loadingAction === "accept" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Accepter
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* ==========================================================================
   JOIN REQUESTS (FOR ADMINS)
   ========================================================================== */

interface JoinRequestsListProps {
  requests: CrewJoinRequest[]
  onApprove: (requestId: string) => Promise<void>
  onReject: (requestId: string, reason?: string) => Promise<void>
}

export function JoinRequestsList({
  requests,
  onApprove,
  onReject,
}: JoinRequestsListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<"approve" | "reject" | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const pendingRequests = requests.filter((r) => r.status === "pending")

  if (pendingRequests.length === 0) {
    return (
      <div className="text-center py-8">
        <UserPlus className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
        <p className="text-zinc-400">Aucune demande en attente</p>
      </div>
    )
  }

  const handleApprove = async (requestId: string) => {
    setLoadingId(requestId)
    setLoadingAction("approve")
    try {
      await onApprove(requestId)
    } finally {
      setLoadingId(null)
      setLoadingAction(null)
    }
  }

  const handleReject = async (requestId: string) => {
    setLoadingId(requestId)
    setLoadingAction("reject")
    try {
      await onReject(requestId, rejectReason || undefined)
      setRejectReason("")
      setExpandedId(null)
    } finally {
      setLoadingId(null)
      setLoadingAction(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-cyan-400" />
        <h3 className="font-bold text-white">
          Demandes d'adhésion ({pendingRequests.length})
        </h3>
      </div>

      <div className="space-y-3">
        {pendingRequests.map((request) => {
          const isLoading = loadingId === request.id
          const isExpanded = expandedId === request.id

          return (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-zinc-800/50 overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-zinc-700 overflow-hidden">
                    {request.avatar_url ? (
                      <img
                        src={request.avatar_url}
                        alt={request.pseudo}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold text-lg">
                        {request.pseudo.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white">{request.pseudo}</p>
                    <p className="text-sm text-zinc-400">Niveau {request.level}</p>

                    {request.message && (
                      <div className="mt-2 p-2 rounded-lg bg-zinc-900/50 text-sm text-zinc-300">
                        <MessageCircle className="w-3 h-3 inline mr-1 text-zinc-500" />
                        {request.message}
                      </div>
                    )}

                    <p className="text-xs text-zinc-500 mt-2">
                      Demande envoyée le{" "}
                      {new Date(request.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : request.id)
                    }
                    disabled={isLoading}
                    className="flex-1 py-2 rounded-lg bg-zinc-700 text-zinc-400 font-semibold hover:bg-zinc-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Refuser
                  </button>
                  <button
                    onClick={() => handleApprove(request.id)}
                    disabled={isLoading}
                    className="flex-1 py-2 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading && loadingAction === "approve" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Accepter
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Rejection Form */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0 border-t border-zinc-700/50">
                      <label className="block text-sm text-zinc-400 mb-2">
                        Raison du refus (optionnel)
                      </label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Ex: Le crew est actuellement complet..."
                        rows={2}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500 resize-none"
                      />
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={isLoading}
                        className="w-full mt-2 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isLoading && loadingAction === "reject" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Confirmer le refus"
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* ==========================================================================
   INVITE FRIENDS MODAL
   ========================================================================== */

interface Friend {
  id: string
  pseudo: string
  avatar_url: string | null
  level: number
}

interface InviteFriendsModalProps {
  isOpen: boolean
  onClose: () => void
  friends: Friend[]
  excludeIds?: string[]
  onInvite: (friendId: string, message?: string) => Promise<{ success: boolean; error: string | null }>
}

export function InviteFriendsModal({
  isOpen,
  onClose,
  friends,
  excludeIds = [],
  onInvite,
}: InviteFriendsModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null)
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const availableFriends = friends.filter(
    (f) =>
      !excludeIds.includes(f.id) &&
      f.pseudo.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleInvite = async () => {
    if (!selectedFriend) return

    setIsSubmitting(true)
    setError(null)

    const result = await onInvite(selectedFriend.id, message || undefined)

    setIsSubmitting(false)

    if (result.success) {
      setSuccessMessage(`Invitation envoyée à ${selectedFriend.pseudo}`)
      setSelectedFriend(null)
      setMessage("")
      setTimeout(() => setSuccessMessage(null), 3000)
    } else {
      setError(result.error || "Erreur lors de l'envoi")
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
          className="relative w-full max-w-md bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-zinc-800">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-cyan-400" />
              Inviter des amis
            </h2>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Success Message */}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                {successMessage}
              </motion.div>
            )}

            {/* Search */}
            <input
              type="text"
              placeholder="Rechercher un ami..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
            />

            {/* Friends List */}
            {selectedFriend ? (
              <div className="space-y-4">
                {/* Selected Friend */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                  <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden">
                    {selectedFriend.avatar_url ? (
                      <img
                        src={selectedFriend.avatar_url}
                        alt={selectedFriend.pseudo}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold">
                        {selectedFriend.pseudo.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-cyan-400">
                      {selectedFriend.pseudo}
                    </p>
                    <p className="text-xs text-zinc-400">
                      Niveau {selectedFriend.level}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedFriend(null)}
                    className="p-1 text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm text-zinc-300 mb-1">
                    Message (optionnel)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Rejoins notre crew !"
                    maxLength={200}
                    rows={3}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>

                {/* Error */}
                {error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}

                {/* Send Button */}
                <button
                  onClick={handleInvite}
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      Envoyer l'invitation
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {availableFriends.length === 0 ? (
                  <p className="text-center text-zinc-400 py-8">
                    {searchQuery
                      ? "Aucun ami trouvé"
                      : "Tous tes amis font déjà partie du crew"}
                  </p>
                ) : (
                  availableFriends.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => setSelectedFriend(friend)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
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
                        <p className="text-xs text-zinc-400">
                          Niveau {friend.level}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-500" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
