"use client"

/**
 * TEENS PARTY MOROCCO - Shop Client Component
 * ============================================
 * Composant client pour la boutique de récompenses
 */

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ShoppingBag,
  Zap,
  Star,
  Heart,
  Check,
  Tag,
  Gift,
  Ticket,
  Percent,
  Crown,
  Package,
} from "lucide-react"
import confetti from "canvas-confetti"
import { purchaseReward, toggleWishlist } from "@/gamification-system/features/shop/actions"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface Category {
  id: string
  slug: string
  name: string
  icon: string
  color: string
  description: string
}

interface Reward {
  reward_id: string
  name: string
  description: string
  xp_cost: number
  icon: string
  color: string
  image_url: string | null
  category_slug: string
  category_name: string
  rarity: string
  is_featured: boolean
  is_new: boolean
  is_limited: boolean
  stock_remaining: number | null
  min_level: number
  reward_type: string
  reward_value: Record<string, unknown>
  is_in_wishlist: boolean
  already_owned: boolean
}

interface Purchase {
  purchase_id: string
  reward_id: string
  reward_name: string
  reward_icon: string
  reward_type: string
  status: string
  purchased_at: string
  used_at: string | null
}

interface ShopClientProps {
  categories: Category[]
  rewards: Reward[]
  purchases: Purchase[]
  userXP: number
}

/* ==========================================================================
   ICON MAP
   ========================================================================== */

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  tag: Tag,
  gift: Gift,
  ticket: Ticket,
  percent: Percent,
  crown: Crown,
  package: Package,
  star: Star,
  zap: Zap,
}

const RARITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  common: { bg: "bg-zinc-500/10", border: "border-zinc-500/30", text: "text-zinc-400" },
  rare: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400" },
  epic: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400" },
  legendary: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400" },
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export function ShopClient({ categories, rewards: initialRewards, purchases, userXP: initialXP }: ShopClientProps) {
  const [rewards, setRewards] = useState(initialRewards)
  const [userXP, setUserXP] = useState(initialXP)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false)

  const filteredRewards = activeCategory
    ? rewards.filter((r) => r.category_slug === activeCategory)
    : rewards

  const handleToggleWishlist = async (rewardId: string) => {
    const result = await toggleWishlist(rewardId)
    if (result.success) {
      setRewards((prev) =>
        prev.map((r) =>
          r.reward_id === rewardId
            ? { ...r, is_in_wishlist: result.action === "added" }
            : r
        )
      )
    }
  }

  const handlePurchase = async () => {
    if (!selectedReward || isPurchasing) return

    setIsPurchasing(true)
    try {
      const result = await purchaseReward({ rewardId: selectedReward.reward_id })
      if (result.success) {
        // Update local state
        setUserXP((prev) => prev - (result.xpSpent || selectedReward.xp_cost))
        setRewards((prev) =>
          prev.map((r) =>
            r.reward_id === selectedReward.reward_id
              ? { ...r, already_owned: true }
              : r
          )
        )

        // Show success and confetti
        setShowPurchaseSuccess(true)
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#ec4899", "#a855f7", "#06b6d4"],
        })

        setTimeout(() => {
          setShowPurchaseSuccess(false)
          setSelectedReward(null)
        }, 2000)
      }
    } finally {
      setIsPurchasing(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            !activeCategory
              ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
              : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          Tous
        </button>
        {categories.map((cat) => {
          const count = rewards.filter((r) => r.category_slug === cat.slug).length
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.slug)}
              className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
                activeCategory === cat.slug
                  ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {cat.name}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeCategory === cat.slug ? "bg-white/20" : "bg-zinc-700"
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredRewards.map((reward) => (
            <RewardCard
              key={reward.reward_id}
              reward={reward}
              userXP={userXP}
              onSelect={() => setSelectedReward(reward)}
              onToggleWishlist={() => handleToggleWishlist(reward.reward_id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {filteredRewards.length === 0 && (
        <div className="text-center py-12">
          <ShoppingBag className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500">Aucune récompense dans cette catégorie</p>
        </div>
      )}

      {/* Purchase Modal */}
      <PurchaseModal
        reward={selectedReward}
        userXP={userXP}
        isPurchasing={isPurchasing}
        showSuccess={showPurchaseSuccess}
        onPurchase={handlePurchase}
        onClose={() => setSelectedReward(null)}
      />
    </div>
  )
}

/* ==========================================================================
   REWARD CARD
   ========================================================================== */

interface RewardCardProps {
  reward: Reward
  userXP: number
  onSelect: () => void
  onToggleWishlist: () => void
}

function RewardCard({ reward, userXP, onSelect, onToggleWishlist }: RewardCardProps) {
  const Icon = ICON_MAP[reward.icon] || Gift
  const canAfford = userXP >= reward.xp_cost
  const rarity = RARITY_COLORS[reward.rarity] || RARITY_COLORS.common

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`relative p-4 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] ${
        reward.already_owned
          ? "bg-zinc-800/30 border-zinc-700/30 opacity-60"
          : canAfford
          ? "bg-zinc-800/50 border-zinc-700/50 hover:border-pink-500/50"
          : "bg-zinc-800/30 border-zinc-700/30"
      }`}
      onClick={reward.already_owned ? undefined : onSelect}
    >
      {/* Badges */}
      <div className="absolute top-3 right-3 flex gap-2">
        {reward.is_new && (
          <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
            NEW
          </span>
        )}
        {reward.is_featured && (
          <span className="px-2 py-0.5 bg-yellow-500 text-black text-xs font-bold rounded-full">
            <Star className="w-3 h-3 inline" />
          </span>
        )}
        {reward.is_limited && (
          <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
            {reward.stock_remaining} left
          </span>
        )}
      </div>

      {/* Wishlist Button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleWishlist()
        }}
        className="absolute top-3 left-3 p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 transition-colors"
      >
        <Heart
          className={`w-4 h-4 ${
            reward.is_in_wishlist ? "fill-red-500 text-red-500" : "text-zinc-400"
          }`}
        />
      </button>

      {/* Content */}
      <div className="pt-8">
        {/* Icon */}
        <div
          className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${rarity.bg} ${rarity.border} border`}
        >
          <Icon className={`w-8 h-8 ${rarity.text}`} />
        </div>

        {/* Info */}
        <div className="mt-4 text-center">
          <h3 className="font-bold text-white">{reward.name}</h3>
          <p className="text-xs text-zinc-500 capitalize">{reward.rarity}</p>
          <p className="text-sm text-zinc-400 mt-2 line-clamp-2">{reward.description}</p>
        </div>

        {/* Price */}
        <div className="mt-4 flex items-center justify-center gap-2">
          {reward.already_owned ? (
            <span className="flex items-center gap-1 text-green-400">
              <Check className="w-4 h-4" />
              Possédé
            </span>
          ) : (
            <span className={`flex items-center gap-1 font-bold ${canAfford ? "text-yellow-400" : "text-zinc-500"}`}>
              <Zap className="w-4 h-4" />
              {reward.xp_cost.toLocaleString()} XP
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   PURCHASE MODAL
   ========================================================================== */

interface PurchaseModalProps {
  reward: Reward | null
  userXP: number
  isPurchasing: boolean
  showSuccess: boolean
  onPurchase: () => void
  onClose: () => void
}

function PurchaseModal({ reward, userXP, isPurchasing, showSuccess, onPurchase, onClose }: PurchaseModalProps) {
  if (!reward) return null

  const Icon = ICON_MAP[reward.icon] || Gift
  const canAfford = userXP >= reward.xp_cost
  const rarity = RARITY_COLORS[reward.rarity] || RARITY_COLORS.common

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-md bg-zinc-900 rounded-2xl overflow-hidden"
      >
        {showSuccess ? (
          <div className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center"
            >
              <Check className="w-10 h-10 text-green-400" />
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">Achat réussi !</h2>
            <p className="text-zinc-400">{reward.name} a été ajouté à ton inventaire</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className={`p-6 ${rarity.bg}`}>
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${rarity.border} border bg-zinc-900/50`}>
                  <Icon className={`w-8 h-8 ${rarity.text}`} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{reward.name}</h2>
                  <p className="text-sm text-zinc-400 capitalize">{reward.rarity} • {reward.category_name}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-zinc-300">{reward.description}</p>

              {/* Price Summary */}
              <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Prix</span>
                  <span className="flex items-center gap-1 font-bold text-yellow-400">
                    <Zap className="w-4 h-4" />
                    {reward.xp_cost.toLocaleString()} XP
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-zinc-400">Ton solde</span>
                  <span className={`font-bold ${canAfford ? "text-green-400" : "text-red-400"}`}>
                    {userXP.toLocaleString()} XP
                  </span>
                </div>
                {canAfford && (
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-700">
                    <span className="text-zinc-400">Après achat</span>
                    <span className="font-bold text-white">
                      {(userXP - reward.xp_cost).toLocaleString()} XP
                    </span>
                  </div>
                )}
              </div>

              {!canAfford && (
                <p className="text-center text-red-400 text-sm">
                  Il te manque {(reward.xp_cost - userXP).toLocaleString()} XP
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-zinc-800 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-medium"
              >
                Annuler
              </button>
              <button
                onClick={onPurchase}
                disabled={!canAfford || isPurchasing}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold disabled:opacity-50"
              >
                {isPurchasing ? "Achat..." : "Acheter"}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
