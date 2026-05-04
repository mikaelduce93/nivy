/**
 * TEENS PARTY MOROCCO - Referral Section Components
 * ==================================================
 *
 * Composants pour le système de parrainage.
 */

"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Users,
  Copy,
  Check,
  Gift,
  Sparkles,
  ChevronRight,
  Trophy,
  Coins,
  TrendingUp,
  QrCode,
  Share2,
  X,
  UserPlus,
} from "lucide-react"
import {
  type ReferralInfo,
  copyToClipboard,
  formatReferralCode,
  generateReferralUrl,
} from "../../features/social-sharing"

/* ==========================================================================
   REFERRAL CARD
   ========================================================================== */

interface ReferralCardProps {
  referral: ReferralInfo
  onShare?: () => void
  onShowQR?: () => void
}

export function ReferralCard({ referral, onShare, onShowQR }: ReferralCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const success = await copyToClipboard(referral.code)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
          <Gift className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Parraine tes amis</h3>
          <p className="text-sm text-zinc-400">
            Gagne des récompenses pour chaque ami inscrit
          </p>
        </div>
      </div>

      {/* Code */}
      <div className="p-4 rounded-xl bg-zinc-900/50 mb-6">
        <p className="text-xs text-zinc-500 mb-2">Ton code de parrainage</p>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-white tracking-wider">
            {formatReferralCode(referral.code)}
          </span>
          <button
            onClick={handleCopy}
            className={`p-2 rounded-lg transition-colors ${
              copied
                ? "bg-green-500/20 text-green-400"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 rounded-xl bg-zinc-800/50">
          <p className="text-xs text-zinc-500">Invitations utilisées</p>
          <p className="text-xl font-bold text-white">{referral.totalUses}</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-800/50">
          <p className="text-xs text-zinc-500">Inscriptions réussies</p>
          <p className="text-xl font-bold text-cyan-400">
            {referral.successfulConversions}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onShare}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500 text-white font-medium hover:bg-cyan-600 transition-colors"
        >
          <Share2 className="w-5 h-5" />
          Partager
        </button>
        <button
          onClick={onShowQR}
          className="p-3 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <QrCode className="w-5 h-5" />
        </button>
      </div>

      {/* Rewards info */}
      <div className="mt-6 pt-6 border-t border-zinc-700/50">
        <p className="text-sm text-zinc-400 mb-3">Récompenses par parrainage</p>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">+100 XP</p>
              <p className="text-xs text-zinc-500">Pour toi</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Coins className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">+50 Coins</p>
              <p className="text-xs text-zinc-500">Pour toi</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   REFERRAL INPUT
   ========================================================================== */

interface ReferralInputProps {
  onSubmit: (code: string) => Promise<{ success: boolean; error?: string }>
}

export function ReferralInput({ onSubmit }: ReferralInputProps) {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (!code.trim()) return

    setLoading(true)
    setError(null)

    try {
      const result = await onSubmit(code.replace(/-/g, "").toUpperCase())
      if (result.success) {
        setSuccess(true)
        setCode("")
      } else {
        setError(result.error || "Code invalide")
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-4 rounded-xl bg-green-500/20 border border-green-500/30 text-center"
      >
        <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
        <p className="font-medium text-white">Code appliqué !</p>
        <p className="text-sm text-zinc-400">
          Tu recevras tes récompenses après avoir complété ton inscription
        </p>
      </motion.div>
    )
  }

  return (
    <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
      <p className="text-sm text-zinc-400 mb-3">Tu as un code de parrainage ?</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Entrer le code"
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !code.trim()}
          className="px-4 py-2 rounded-xl bg-cyan-500 text-white font-medium disabled:opacity-50 hover:bg-cyan-600 transition-colors"
        >
          {loading ? "..." : "Appliquer"}
        </button>
      </div>
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
    </div>
  )
}

/* ==========================================================================
   REFERRED USERS LIST
   ========================================================================== */

interface ReferredUser {
  id: string
  username: string
  avatar_url?: string
  status: string
  created_at: string
}

interface ReferredUsersListProps {
  users: ReferredUser[]
  onViewAll?: () => void
}

export function ReferredUsersList({ users, onViewAll }: ReferredUsersListProps) {
  if (users.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-400">Pas encore de filleuls</p>
        <p className="text-sm text-zinc-500">
          Partage ton code pour commencer à parrainer
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-white">Tes filleuls ({users.length})</h4>
        {users.length > 5 && onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-cyan-400 hover:underline flex items-center gap-1"
          >
            Voir tout
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        {users.slice(0, 5).map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50"
          >
            {/* Avatar */}
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                <span className="text-sm font-bold text-zinc-400">
                  {user.username[0].toUpperCase()}
                </span>
              </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <p className="font-medium text-white">{user.username}</p>
              <p className="text-xs text-zinc-500">
                {new Date(user.created_at).toLocaleDateString("fr-FR")}
              </p>
            </div>

            {/* Status */}
            <StatusBadge status={user.status} />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ==========================================================================
   REFERRAL LEADERBOARD
   ========================================================================== */

interface ReferralLeader {
  rank: number
  username: string
  avatar_url?: string
  conversions: number
}

interface ReferralLeaderboardProps {
  leaders: ReferralLeader[]
  currentUserRank?: number
}

export function ReferralLeaderboard({
  leaders,
  currentUserRank,
}: ReferralLeaderboardProps) {
  return (
    <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <h4 className="font-medium text-white">Top Parrains</h4>
      </div>

      <div className="space-y-2">
        {leaders.map((leader, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 p-3 rounded-xl ${
              index === 0
                ? "bg-yellow-500/10 border border-yellow-500/30"
                : index === 1
                ? "bg-zinc-400/10 border border-zinc-400/30"
                : index === 2
                ? "bg-orange-500/10 border border-orange-500/30"
                : "bg-zinc-900/50"
            }`}
          >
            {/* Rank */}
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                index === 0
                  ? "bg-yellow-500 text-black"
                  : index === 1
                  ? "bg-zinc-400 text-black"
                  : index === 2
                  ? "bg-orange-500 text-white"
                  : "bg-zinc-700 text-zinc-400"
              }`}
            >
              {leader.rank}
            </div>

            {/* User */}
            <div className="flex-1 flex items-center gap-2">
              {leader.avatar_url ? (
                <img
                  src={leader.avatar_url}
                  alt={leader.username}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                  <span className="text-xs font-bold text-zinc-400">
                    {leader.username[0].toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-sm font-medium text-white">
                {leader.username}
              </span>
            </div>

            {/* Conversions */}
            <div className="flex items-center gap-1 text-sm">
              <UserPlus className="w-4 h-4 text-cyan-400" />
              <span className="text-white font-medium">{leader.conversions}</span>
            </div>
          </div>
        ))}
      </div>

      {currentUserRank && currentUserRank > 10 && (
        <div className="mt-4 pt-4 border-t border-zinc-700/50 text-center">
          <p className="text-sm text-zinc-400">
            Tu es classé <span className="text-white font-medium">#{currentUserRank}</span>
          </p>
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   QR CODE MODAL
   ========================================================================== */

interface QRCodeModalProps {
  isOpen: boolean
  onClose: () => void
  referralUrl: string
  code: string
}

export function QRCodeModal({ isOpen, onClose, referralUrl, code }: QRCodeModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const success = await copyToClipboard(referralUrl)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">QR Code</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* QR Code placeholder - In real app, use a QR library */}
          <div className="w-48 h-48 mx-auto bg-white rounded-xl flex items-center justify-center mb-6">
            <QrCode className="w-32 h-32 text-zinc-900" />
          </div>

          <div className="text-center mb-6">
            <p className="text-sm text-zinc-400 mb-1">Code de parrainage</p>
            <p className="text-xl font-bold text-white">{formatReferralCode(code)}</p>
          </div>

          <button
            onClick={handleCopy}
            className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
              copied
                ? "bg-green-500 text-white"
                : "bg-cyan-500 hover:bg-cyan-600 text-white"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" />
                Copié !
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copier le lien
              </>
            )}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

interface StatusBadgeProps {
  status: string
}

function StatusBadge({ status }: StatusBadgeProps) {
  const configs: Record<string, { color: string; bgColor: string; label: string }> = {
    pending: {
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20",
      label: "En attente",
    },
    completed: {
      color: "text-green-400",
      bgColor: "bg-green-500/20",
      label: "Complété",
    },
    rewarded: {
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/20",
      label: "Récompensé",
    },
  }

  const config = configs[status] || configs.pending

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}
    >
      {config.label}
    </span>
  )
}
