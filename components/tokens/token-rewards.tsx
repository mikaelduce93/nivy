/**
 * TOKEN REWARDS COMPONENT
 * =======================
 * Interface pour visualiser et échanger les récompenses
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import {
  Gift,
  Star,
  Sparkles,
  Crown,
  ShoppingBag,
  Ticket,
  Gamepad2,
  Music,
  Coffee,
  Shirt,
  Smartphone,
  BookOpen,
  Trophy,
  Zap,
  Clock,
  Check,
  X,
  ChevronRight,
  Filter,
  Search,
  Package,
  MapPin,
  AlertCircle,
  Loader2,
  Heart,
  TrendingUp,
} from "lucide-react"

// ============================================================================
// TYPES
// ============================================================================

interface TokenReward {
  id: string
  name: string
  description: string
  icon: string
  category: string
  token_cost: number
  token_type: "regular" | "premium" | "seasonal"
  stock_type: "unlimited" | "limited" | "exclusive"
  stock_remaining?: number
  is_featured: boolean
  is_new: boolean
  requires_shipping: boolean
  min_level?: number
  image_url?: string
  expires_at?: string
}

interface Redemption {
  id: string
  reward_id: string
  tokens_spent: number
  token_type: string
  status: "pending" | "processing" | "completed" | "cancelled"
  redemption_code?: string
  created_at: string
  reward?: {
    id: string
    name: string
    description: string
    icon: string
    category: string
  }
}

interface UserBalances {
  regular: number
  premium: number
  seasonal: number
}

// ============================================================================
// HELPERS
// ============================================================================

const categoryIcons: Record<string, any> = {
  digital: Smartphone,
  physical: Package,
  experience: Star,
  gaming: Gamepad2,
  music: Music,
  food: Coffee,
  fashion: Shirt,
  education: BookOpen,
  tickets: Ticket,
  exclusive: Crown,
  default: Gift,
}

const tokenTypeColors: Record<string, string> = {
  regular: "from-cyan-500 to-blue-500",
  premium: "from-yellow-500 to-amber-500",
  seasonal: "from-pink-500 to-rose-500",
}

const tokenTypeLabels: Record<string, string> = {
  regular: "Tokens",
  premium: "Premium",
  seasonal: "Saisonnier",
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// ============================================================================
// REWARD CARD
// ============================================================================

interface RewardCardProps {
  reward: TokenReward
  balance: number
  onRedeem: (reward: TokenReward) => void
}

function RewardCard({ reward, balance, onRedeem }: RewardCardProps) {
  const canAfford = balance >= reward.token_cost
  const isOutOfStock = reward.stock_type !== "unlimited" && (reward.stock_remaining || 0) <= 0
  const CategoryIcon = categoryIcons[reward.category] || categoryIcons.default

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-zinc-800/50 rounded-2xl overflow-hidden border transition-all duration-300 ${
        reward.is_featured
          ? "border-yellow-500/50 shadow-lg shadow-yellow-500/10"
          : "border-zinc-700/50 hover:border-zinc-600"
      }`}
    >
      {/* Badges */}
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        {reward.is_featured && (
          <span className="px-2 py-1 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full text-xs font-bold text-black flex items-center gap-1">
            <Star className="w-3 h-3" />
            Vedette
          </span>
        )}
        {reward.is_new && (
          <span className="px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full text-xs font-bold text-white">
            Nouveau
          </span>
        )}
        {reward.stock_type === "exclusive" && (
          <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-xs font-bold text-white flex items-center gap-1">
            <Crown className="w-3 h-3" />
            Exclusif
          </span>
        )}
      </div>

      {/* Stock indicator */}
      {reward.stock_type === "limited" && reward.stock_remaining !== undefined && (
        <div className="absolute top-3 right-3 z-10">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            reward.stock_remaining <= 5
              ? "bg-red-500/20 text-red-400"
              : reward.stock_remaining <= 20
              ? "bg-yellow-500/20 text-yellow-400"
              : "bg-zinc-700/50 text-zinc-400"
          }`}>
            {reward.stock_remaining} restants
          </span>
        </div>
      )}

      {/* Image/Icon area */}
      <div className={`h-32 bg-gradient-to-br ${tokenTypeColors[reward.token_type]} p-6 flex items-center justify-center relative overflow-hidden`}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: "20px 20px",
          }} />
        </div>

        {reward.image_url ? (
          <Image
            src={reward.image_url}
            alt={reward.name}
            width={80}
            height={80}
            className="h-20 w-20 object-contain rounded-xl shadow-lg"
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <CategoryIcon className="w-10 h-10 text-white" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-white">{reward.name}</h3>
          <p className="text-sm text-zinc-400 line-clamp-2">{reward.description}</p>
        </div>

        {/* Requirements */}
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="px-2 py-1 bg-zinc-700/50 rounded-full capitalize">
            {reward.category}
          </span>
          {reward.requires_shipping && (
            <span className="px-2 py-1 bg-zinc-700/50 rounded-full flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Livraison
            </span>
          )}
          {reward.min_level && (
            <span className="px-2 py-1 bg-zinc-700/50 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Niv. {reward.min_level}
            </span>
          )}
        </div>

        {/* Expiration */}
        {reward.expires_at && (
          <div className="flex items-center gap-1 text-xs text-amber-400">
            <Clock className="w-3 h-3" />
            Expire le {formatDate(reward.expires_at)}
          </div>
        )}

        {/* Price and action */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-700/50">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${tokenTypeColors[reward.token_type]} flex items-center justify-center`}>
              {reward.token_type === "premium" ? (
                <Crown className="w-4 h-4 text-white" />
              ) : reward.token_type === "seasonal" ? (
                <Sparkles className="w-4 h-4 text-white" />
              ) : (
                <Zap className="w-4 h-4 text-white" />
              )}
            </div>
            <div>
              <p className="font-bold text-white">{reward.token_cost.toLocaleString()}</p>
              <p className="text-xs text-zinc-500">{tokenTypeLabels[reward.token_type]}</p>
            </div>
          </div>

          <button
            onClick={() => onRedeem(reward)}
            disabled={!canAfford || isOutOfStock}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
              isOutOfStock
                ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                : canAfford
                ? `bg-gradient-to-r ${tokenTypeColors[reward.token_type]} text-white hover:shadow-lg hover:scale-105`
                : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
            }`}
          >
            {isOutOfStock ? "Épuisé" : canAfford ? "Échanger" : "Insuffisant"}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// REDEEM MODAL
// ============================================================================

interface RedeemModalProps {
  reward: TokenReward
  balance: number
  onConfirm: (shippingAddress?: string) => void
  onClose: () => void
  loading: boolean
}

function RedeemModal({ reward, balance, onConfirm, onClose, loading }: RedeemModalProps) {
  const [shippingAddress, setShippingAddress] = useState("")
  const CategoryIcon = categoryIcons[reward.category] || categoryIcons.default

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 rounded-2xl max-w-md w-full overflow-hidden border border-zinc-700"
      >
        {/* Header */}
        <div className={`p-6 bg-gradient-to-br ${tokenTypeColors[reward.token_type]} relative overflow-hidden`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/30 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <CategoryIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{reward.name}</h2>
              <p className="text-white/80">{reward.description}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Cost summary */}
          <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Coût</span>
              <span className="font-bold text-white">
                {reward.token_cost.toLocaleString()} {tokenTypeLabels[reward.token_type]}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Ton solde</span>
              <span className="font-bold text-white">{balance.toLocaleString()}</span>
            </div>
            <div className="border-t border-zinc-700 pt-3 flex items-center justify-between">
              <span className="text-zinc-400">Après échange</span>
              <span className={`font-bold ${balance - reward.token_cost >= 0 ? "text-green-400" : "text-red-400"}`}>
                {(balance - reward.token_cost).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Shipping address if required */}
          {reward.requires_shipping && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Adresse de livraison
              </label>
              <textarea
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Ton adresse complète..."
                rows={3}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
              />
            </div>
          )}

          {/* Warning for limited stock */}
          {reward.stock_type === "limited" && reward.stock_remaining !== undefined && reward.stock_remaining <= 10 && (
            <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-400">
                Attention! Il ne reste que <strong>{reward.stock_remaining}</strong> exemplaires de cette récompense.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-zinc-800 text-white rounded-xl font-medium hover:bg-zinc-700 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => onConfirm(reward.requires_shipping ? shippingAddress : undefined)}
              disabled={loading || (reward.requires_shipping && !shippingAddress.trim())}
              className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                loading || (reward.requires_shipping && !shippingAddress.trim())
                  ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                  : `bg-gradient-to-r ${tokenTypeColors[reward.token_type]} text-white hover:shadow-lg`
              }`}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Gift className="w-5 h-5" />
                  Confirmer
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================================================
// SUCCESS MODAL
// ============================================================================

interface SuccessModalProps {
  reward: TokenReward
  redemptionCode?: string
  onClose: () => void
}

function SuccessModal({ reward, redemptionCode, onClose }: SuccessModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 rounded-2xl max-w-sm w-full overflow-hidden border border-zinc-700 text-center"
      >
        {/* Success animation */}
        <div className="p-8 space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center"
          >
            <Check className="w-12 h-12 text-white" />
          </motion.div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Félicitations!</h2>
            <p className="text-zinc-400">
              Tu as échangé tes tokens contre <strong className="text-white">{reward.name}</strong>
            </p>
          </div>

          {/* Redemption code if digital */}
          {redemptionCode && (
            <div className="bg-zinc-800/50 rounded-xl p-4 space-y-2">
              <p className="text-sm text-zinc-400">Ton code de rédemption:</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-lg font-mono font-bold text-cyan-400 bg-zinc-800 px-4 py-2 rounded-lg">
                  {redemptionCode}
                </code>
              </div>
              <p className="text-xs text-zinc-500">Garde ce code précieusement!</p>
            </div>
          )}

          {/* Shipping notice */}
          {reward.requires_shipping && (
            <div className="flex items-start gap-3 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-left">
              <Package className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-cyan-400">
                Ta récompense sera expédiée à l'adresse indiquée. Tu recevras une notification quand elle sera en route!
              </p>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            Super!
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================================================
// MY REDEMPTIONS
// ============================================================================

interface MyRedemptionsProps {
  redemptions: Redemption[]
  loading: boolean
}

function MyRedemptions({ redemptions, loading }: MyRedemptionsProps) {
  const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    pending: { color: "text-yellow-400 bg-yellow-500/20", icon: Clock, label: "En attente" },
    processing: { color: "text-blue-400 bg-blue-500/20", icon: Package, label: "En cours" },
    completed: { color: "text-green-400 bg-green-500/20", icon: Check, label: "Complété" },
    cancelled: { color: "text-red-400 bg-red-500/20", icon: X, label: "Annulé" },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    )
  }

  if (redemptions.length === 0) {
    return (
      <div className="text-center py-12">
        <Gift className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
        <p className="text-zinc-400">Tu n'as pas encore échangé de récompenses</p>
        <p className="text-sm text-zinc-500">Explore le catalogue et échange tes tokens!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {redemptions.map((redemption) => {
        const status = statusConfig[redemption.status] || statusConfig.pending
        const StatusIcon = status.icon
        const CategoryIcon = categoryIcons[redemption.reward?.category || "default"] || categoryIcons.default

        return (
          <motion.div
            key={redemption.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-800/50 rounded-xl p-4 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
              <CategoryIcon className="w-6 h-6 text-cyan-400" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">
                {redemption.reward?.name || "Récompense"}
              </p>
              <p className="text-sm text-zinc-400">
                {redemption.tokens_spent.toLocaleString()} {tokenTypeLabels[redemption.token_type]}
              </p>
            </div>

            <div className="text-right">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </span>
              <p className="text-xs text-zinc-500 mt-1">
                {formatDate(redemption.created_at)}
              </p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ============================================================================
// TOKEN REWARDS SHOP (MAIN)
// ============================================================================

const categories = [
  { id: "all", label: "Tout", icon: Gift },
  { id: "digital", label: "Digital", icon: Smartphone },
  { id: "gaming", label: "Gaming", icon: Gamepad2 },
  { id: "music", label: "Musique", icon: Music },
  { id: "fashion", label: "Mode", icon: Shirt },
  { id: "experience", label: "Expériences", icon: Star },
  { id: "exclusive", label: "Exclusifs", icon: Crown },
]

export function TokenRewardsShop() {
  const [rewards, setRewards] = useState<TokenReward[]>([])
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [balances, setBalances] = useState<UserBalances>({ regular: 0, premium: 0, seasonal: 0 })
  const [loading, setLoading] = useState(true)
  const [redemptionsLoading, setRedemptionsLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showAffordable, setShowAffordable] = useState(false)
  const [activeTab, setActiveTab] = useState<"shop" | "redemptions">("shop")
  const [selectedReward, setSelectedReward] = useState<TokenReward | null>(null)
  const [redeeming, setRedeeming] = useState(false)
  const [successReward, setSuccessReward] = useState<{ reward: TokenReward; code?: string } | null>(null)

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      const [rewardsRes, balancesRes] = await Promise.all([
        fetch("/api/teen/tokens?type=rewards"),
        fetch("/api/teen/tokens?type=balances"),
      ])

      if (rewardsRes.ok) {
        const data = await rewardsRes.json()
        setRewards(data.rewards || [])
      }

      if (balancesRes.ok) {
        const data = await balancesRes.json()
        setBalances(data.balances || { regular: 0, premium: 0, seasonal: 0 })
      }
    } catch (error) {
      console.error("Error fetching rewards:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchRedemptions = useCallback(async () => {
    try {
      setRedemptionsLoading(true)
      const response = await fetch("/api/teen/tokens?type=redemptions")
      if (response.ok) {
        const data = await response.json()
        setRedemptions(data.redemptions || [])
      }
    } catch (error) {
      console.error("Error fetching redemptions:", error)
    } finally {
      setRedemptionsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (activeTab === "redemptions") {
      fetchRedemptions()
    }
  }, [activeTab, fetchRedemptions])

  // Filter rewards
  const filteredRewards = rewards.filter((reward) => {
    if (selectedCategory !== "all" && reward.category !== selectedCategory) return false
    if (searchQuery && !reward.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (showAffordable) {
      const balance = reward.token_type === "premium"
        ? balances.premium
        : reward.token_type === "seasonal"
        ? balances.seasonal
        : balances.regular
      if (balance < reward.token_cost) return false
    }
    return true
  })

  // Get balance for reward type
  const getBalanceForType = (type: string) => {
    switch (type) {
      case "premium": return balances.premium
      case "seasonal": return balances.seasonal
      default: return balances.regular
    }
  }

  // Handle redeem
  const handleRedeem = async (shippingAddress?: string) => {
    if (!selectedReward) return

    try {
      setRedeeming(true)
      const response = await fetch("/api/teen/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "redeem",
          reward_id: selectedReward.id,
          shipping_address: shippingAddress,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccessReward({
          reward: selectedReward,
          code: data.redemption?.redemption_code,
        })
        setSelectedReward(null)

        // Update balances
        if (data.new_balance !== undefined) {
          setBalances((prev) => ({
            ...prev,
            [selectedReward.token_type]: data.new_balance,
          }))
        }

        // Refresh rewards for stock updates
        fetchData()
      } else {
        alert(data.error || "Erreur lors de l'échange")
      }
    } catch (error) {
      console.error("Redeem error:", error)
      alert("Erreur lors de l'échange")
    } finally {
      setRedeeming(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Balance cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { type: "regular", balance: balances.regular, label: "Tokens", icon: Zap },
          { type: "premium", balance: balances.premium, label: "Premium", icon: Crown },
          { type: "seasonal", balance: balances.seasonal, label: "Saisonnier", icon: Sparkles },
        ].map(({ type, balance, label, icon: Icon }) => (
          <div
            key={type}
            className={`p-4 rounded-xl bg-gradient-to-br ${tokenTypeColors[type]} relative overflow-hidden`}
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: "10px 10px",
              }} />
            </div>
            <Icon className="w-5 h-5 text-white/80 mb-2" />
            <p className="text-2xl font-bold text-white">{balance.toLocaleString()}</p>
            <p className="text-sm text-white/80">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-zinc-800/50 rounded-xl">
        {[
          { id: "shop", label: "Boutique", icon: ShoppingBag },
          { id: "redemptions", label: "Mes échanges", icon: Package },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as "shop" | "redemptions")}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === id
                ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "shop" ? (
        <>
          {/* Search and filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une récompense..."
                className="w-full pl-12 pr-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
              {categories.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setSelectedCategory(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === id
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                      : "bg-zinc-800/50 text-zinc-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAffordable(!showAffordable)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                showAffordable
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-zinc-800/50 text-zinc-400 hover:text-white border border-transparent"
              }`}
            >
              <Filter className="w-4 h-4" />
              Afficher uniquement les accessibles
            </button>
          </div>

          {/* Rewards grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
          ) : filteredRewards.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-400">Aucune récompense trouvée</p>
              <p className="text-sm text-zinc-500">Essaie de modifier tes filtres</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredRewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  balance={getBalanceForType(reward.token_type)}
                  onRedeem={setSelectedReward}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <MyRedemptions redemptions={redemptions} loading={redemptionsLoading} />
      )}

      {/* Modals */}
      <AnimatePresence>
        {selectedReward && (
          <RedeemModal
            reward={selectedReward}
            balance={getBalanceForType(selectedReward.token_type)}
            onConfirm={handleRedeem}
            onClose={() => setSelectedReward(null)}
            loading={redeeming}
          />
        )}

        {successReward && (
          <SuccessModal
            reward={successReward.reward}
            redemptionCode={successReward.code}
            onClose={() => setSuccessReward(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// FEATURED REWARDS WIDGET
// ============================================================================

export function FeaturedRewardsWidget() {
  const [rewards, setRewards] = useState<TokenReward[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFeatured() {
      try {
        const response = await fetch("/api/teen/tokens?type=rewards")
        if (response.ok) {
          const data = await response.json()
          // Get featured rewards only
          setRewards((data.rewards || []).filter((r: TokenReward) => r.is_featured).slice(0, 3))
        }
      } catch (error) {
        console.error("Error fetching featured rewards:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchFeatured()
  }, [])

  if (loading) {
    return (
      <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 bg-zinc-700 rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-zinc-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (rewards.length === 0) return null

  return (
    <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          Récompenses vedettes
        </h3>
        <a href="/rewards" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
          Voir tout
          <ChevronRight className="w-4 h-4" />
        </a>
      </div>

      <div className="space-y-3">
        {rewards.map((reward) => {
          const CategoryIcon = categoryIcons[reward.category] || categoryIcons.default

          return (
            <div
              key={reward.id}
              className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl hover:bg-zinc-900 transition-colors"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tokenTypeColors[reward.token_type]} flex items-center justify-center`}>
                <CategoryIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{reward.name}</p>
                <p className="text-sm text-zinc-400 truncate">{reward.description}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-white">{reward.token_cost.toLocaleString()}</p>
                <p className="text-xs text-zinc-500">{tokenTypeLabels[reward.token_type]}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
