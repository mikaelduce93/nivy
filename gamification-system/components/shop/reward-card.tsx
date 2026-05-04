"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Zap,
  Heart,
  ShoppingCart,
  Crown,
  Ticket,
  Percent,
  Gift,
  Sparkles,
  Package,
  Box,
  Palette,
  TrendingUp,
  Lock,
  AlertCircle,
  Check,
  Star,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type ShopReward,
  type RewardType,
  REWARD_TYPE_CONFIG,
  formatXPPrice,
  calculateDiscountPercentage,
  isOnSale,
} from "../../features/shop/schema"

/* ==========================================================================
   ICON MAP
   ========================================================================== */

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ticket: Ticket,
  crown: Crown,
  percent: Percent,
  gift: Gift,
  sparkles: Sparkles,
  package: Package,
  box: Box,
  palette: Palette,
  "trending-up": TrendingUp,
  zap: Zap,
  star: Star,
}

function getRewardIcon(iconName: string): React.ComponentType<{ className?: string }> {
  return ICON_MAP[iconName] || Gift
}

/* ==========================================================================
   TYPES
   ========================================================================== */

interface RewardCardProps {
  reward: ShopReward
  userXP?: number
  onPurchase?: (rewardId: string) => void
  onToggleWishlist?: (rewardId: string) => void
  onClick?: () => void
  compact?: boolean
  className?: string
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export function RewardCard({
  reward,
  userXP = 0,
  onPurchase,
  onToggleWishlist,
  onClick,
  compact = false,
  className,
}: RewardCardProps) {
  const [isWishlistLoading, setIsWishlistLoading] = useState(false)

  const Icon = getRewardIcon(reward.icon)
  const typeConfig = REWARD_TYPE_CONFIG[reward.reward_type]
  const canAfford = userXP >= reward.xp_cost
  const onSale = isOnSale(reward)
  const discountPercent = onSale
    ? calculateDiscountPercentage(reward.original_xp_cost!, reward.xp_cost)
    : 0

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onToggleWishlist || isWishlistLoading) return

    setIsWishlistLoading(true)
    try {
      await onToggleWishlist(reward.reward_id)
    } finally {
      setIsWishlistLoading(false)
    }
  }

  const handlePurchaseClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onPurchase && reward.can_purchase) {
      onPurchase(reward.reward_id)
    }
  }

  if (compact) {
    return (
      <CompactRewardCard
        reward={reward}
        userXP={userXP}
        onClick={onClick}
      />
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative group overflow-hidden rounded-2xl transition-all",
        "bg-zinc-900 border border-zinc-800",
        "hover:border-zinc-700 hover:shadow-xl hover:shadow-black/20",
        onClick && "cursor-pointer",
        !reward.can_purchase && "opacity-75",
        className
      )}
      onClick={onClick}
      whileHover={{ y: -4 }}
    >
      {/* Badges */}
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        {reward.is_featured && (
          <span className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full flex items-center gap-1">
            <Star className="w-3 h-3" />
            Featured
          </span>
        )}
        {reward.is_new && (
          <span className="px-2 py-1 text-xs font-bold bg-cyan-500 text-white rounded-full">
            NEW
          </span>
        )}
        {onSale && (
          <span className="px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-full">
            -{discountPercent}%
          </span>
        )}
      </div>

      {/* Wishlist Button */}
      {onToggleWishlist && (
        <button
          onClick={handleWishlistClick}
          disabled={isWishlistLoading}
          className={cn(
            "absolute top-3 right-3 z-10 p-2 rounded-full transition-all",
            reward.is_in_wishlist
              ? "bg-red-500 text-white"
              : "bg-zinc-800/80 text-zinc-400 hover:text-red-400 hover:bg-zinc-700"
          )}
        >
          <Heart
            className={cn("w-4 h-4", reward.is_in_wishlist && "fill-current")}
          />
        </button>
      )}

      {/* Image/Icon Area */}
      <div
        className={cn(
          "relative h-40 flex items-center justify-center overflow-hidden",
          `bg-gradient-to-br ${typeConfig.bgColor.replace("/20", "/10")}`
        )}
      >
        {reward.image_url ? (
          <img
            src={reward.image_url}
            alt={reward.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <motion.div
            className={cn(
              "w-20 h-20 rounded-2xl flex items-center justify-center",
              typeConfig.bgColor
            )}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <Icon className={cn("w-10 h-10", typeConfig.color)} />
          </motion.div>
        )}

        {/* Stock indicator */}
        {reward.stock_type === "limited" && reward.stock_remaining !== null && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded-lg text-xs text-white">
            {reward.stock_remaining} restants
          </div>
        )}
        {reward.stock_type === "unique" && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-purple-500/80 rounded-lg text-xs text-white flex items-center gap-1">
            <Crown className="w-3 h-3" />
            Unique
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category & Type */}
        <div className="flex items-center gap-2 mb-2">
          {reward.category_name && (
            <span className="text-xs text-zinc-500">{reward.category_name}</span>
          )}
          <span className={cn("text-xs font-medium", typeConfig.color)}>
            {typeConfig.label}
          </span>
        </div>

        {/* Name */}
        <h3 className="font-bold text-white mb-1 line-clamp-1">{reward.name}</h3>

        {/* Description */}
        <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
          {reward.short_description || reward.description}
        </p>

        {/* Price & Action */}
        <div className="flex items-center justify-between">
          {/* Price */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-xl font-black text-yellow-400">
                {formatXPPrice(reward.xp_cost)}
              </span>
            </div>
            {onSale && (
              <span className="text-sm text-zinc-500 line-through">
                {formatXPPrice(reward.original_xp_cost!)}
              </span>
            )}
          </div>

          {/* Action Button */}
          {reward.can_purchase ? (
            <motion.button
              onClick={handlePurchaseClick}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all",
                canAfford
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/25"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              )}
              whileHover={canAfford ? { scale: 1.05 } : {}}
              whileTap={canAfford ? { scale: 0.95 } : {}}
              disabled={!canAfford}
            >
              <ShoppingCart className="w-4 h-4" />
              Acheter
            </motion.button>
          ) : (
            <RewardLockReason reward={reward} userXP={userXP} />
          )}
        </div>

        {/* Level requirement */}
        {reward.min_level > 1 && (
          <div className="mt-3 pt-3 border-t border-zinc-800">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Niveau {reward.min_level} requis</span>
            </div>
          </div>
        )}
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.div>
  )
}

/* ==========================================================================
   LOCK REASON
   ========================================================================== */

function RewardLockReason({
  reward,
  userXP,
}: {
  reward: ShopReward
  userXP: number
}) {
  let reason = ""
  let icon = <Lock className="w-4 h-4" />

  if (reward.stock_type !== "unlimited" && reward.stock_remaining === 0) {
    reason = "Épuisé"
    icon = <AlertCircle className="w-4 h-4" />
  } else if (reward.purchase_limit && reward.user_purchase_count >= reward.purchase_limit) {
    reason = "Déjà acheté"
    icon = <Check className="w-4 h-4" />
  } else if (reward.vip_only) {
    reason = "VIP only"
    icon = <Crown className="w-4 h-4" />
  } else if (userXP < reward.xp_cost) {
    reason = `${formatXPPrice(reward.xp_cost - userXP)} XP manquants`
  } else {
    reason = "Non disponible"
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg text-sm">
      {icon}
      <span>{reason}</span>
    </div>
  )
}

/* ==========================================================================
   COMPACT REWARD CARD
   ========================================================================== */

function CompactRewardCard({
  reward,
  userXP = 0,
  onClick,
}: {
  reward: ShopReward
  userXP?: number
  onClick?: () => void
}) {
  const Icon = getRewardIcon(reward.icon)
  const typeConfig = REWARD_TYPE_CONFIG[reward.reward_type]
  const canAfford = userXP >= reward.xp_cost

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
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
          typeConfig.bgColor
        )}
      >
        <Icon className={cn("w-6 h-6", typeConfig.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-white truncate">{reward.name}</h4>
        <p className="text-xs text-zinc-500 truncate">
          {reward.short_description || typeConfig.label}
        </p>
      </div>

      {/* Price */}
      <div className="flex items-center gap-1">
        <Zap className={cn("w-4 h-4", canAfford ? "text-yellow-400" : "text-zinc-500")} />
        <span
          className={cn(
            "font-bold",
            canAfford ? "text-yellow-400" : "text-zinc-500"
          )}
        >
          {formatXPPrice(reward.xp_cost)}
        </span>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   REWARD TYPE BADGE
   ========================================================================== */

interface RewardTypeBadgeProps {
  type: RewardType
  className?: string
}

export function RewardTypeBadge({ type, className }: RewardTypeBadgeProps) {
  const config = REWARD_TYPE_CONFIG[type]
  const Icon = getRewardIcon(config.icon)

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        config.bgColor,
        config.color,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  )
}
