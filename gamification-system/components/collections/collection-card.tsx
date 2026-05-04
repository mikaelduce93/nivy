/**
 * TEENS PARTY MOROCCO - Collection Card Components
 * =================================================
 *
 * Composants pour les cartes de collectibles.
 */

"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Heart, Sparkles, Star, Lock, Eye, Gift } from "lucide-react"
import {
  type CollectibleItem,
  type CollectibleItemWithOwnership,
  type Rarity,
  RARITY_CONFIG,
  getRarityStyle,
  getRarityAnimation,
} from "../../features/collections"

/* ==========================================================================
   COLLECTIBLE CARD
   ========================================================================== */

interface CollectibleCardProps {
  item: CollectibleItemWithOwnership
  size?: "sm" | "md" | "lg"
  showDetails?: boolean
  onClick?: () => void
  onFavoriteToggle?: () => void
}

export function CollectibleCard({
  item,
  size = "md",
  showDetails = true,
  onClick,
  onFavoriteToggle,
}: CollectibleCardProps) {
  const rarityConfig = RARITY_CONFIG[item.rarity]
  const animationClass = getRarityAnimation(item.rarity)

  const sizeClasses = {
    sm: "w-24 h-32",
    md: "w-32 h-44",
    lg: "w-40 h-56",
  }

  const imageSizeClasses = {
    sm: "h-16",
    md: "h-24",
    lg: "h-32",
  }

  return (
    <motion.div
      whileHover={item.owned ? { scale: 1.05, y: -5 } : {}}
      whileTap={item.owned ? { scale: 0.98 } : {}}
      className={`relative ${sizeClasses[size]} rounded-xl overflow-hidden cursor-pointer group`}
      onClick={onClick}
    >
      {/* Background avec gradient de rareté */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${rarityConfig.gradient} opacity-20`}
      />

      {/* Border glow pour les raretés élevées */}
      {(item.rarity === "epic" || item.rarity === "legendary") && item.owned && (
        <div
          className={`absolute inset-0 rounded-xl ${animationClass}`}
          style={{
            boxShadow: `0 0 20px ${item.rarity === "legendary" ? "#f59e0b" : "#8b5cf6"}50`,
          }}
        />
      )}

      {/* Container principal */}
      <div
        className={`relative h-full flex flex-col border rounded-xl transition-all ${
          item.owned
            ? `${rarityConfig.borderColor} ${rarityConfig.bgColor}`
            : "border-zinc-800 bg-zinc-900/80"
        }`}
      >
        {/* Image */}
        <div className={`relative ${imageSizeClasses[size]} p-2`}>
          {item.owned ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800/50 rounded-lg">
              <Lock className="w-8 h-8 text-zinc-600" />
            </div>
          )}

          {/* Badge nouveau */}
          {item.is_new && item.owned && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-cyan-500 text-white text-xs font-bold"
            >
              NEW
            </motion.div>
          )}

          {/* Indicateur de rareté */}
          {item.owned && item.rarity === "legendary" && (
            <Sparkles className="absolute top-1 left-1 w-4 h-4 text-yellow-400" />
          )}
        </div>

        {/* Infos */}
        {showDetails && (
          <div className="flex-1 p-2 flex flex-col justify-between">
            <div>
              <p
                className={`text-xs font-medium truncate ${
                  item.owned ? "text-white" : "text-zinc-500"
                }`}
              >
                {item.owned ? item.name : "???"}
              </p>
              <p className={`text-xs ${rarityConfig.color}`}>
                {rarityConfig.name}
              </p>
            </div>

            {/* Quantité et favori */}
            {item.owned && (
              <div className="flex items-center justify-between">
                {item.quantity > 1 && (
                  <span className="text-xs text-zinc-400">x{item.quantity}</span>
                )}
                {onFavoriteToggle && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onFavoriteToggle()
                    }}
                    className="p-1 rounded-full hover:bg-zinc-700/50 transition-colors"
                  >
                    <Heart
                      className={`w-3 h-3 ${
                        item.is_favorite
                          ? "fill-red-500 text-red-500"
                          : "text-zinc-500"
                      }`}
                    />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Overlay non possédé */}
      {!item.owned && (
        <div className="absolute inset-0 bg-black/40 rounded-xl" />
      )}
    </motion.div>
  )
}

/* ==========================================================================
   COLLECTIBLE CARD PREVIEW (pour les modals)
   ========================================================================== */

interface CollectibleCardPreviewProps {
  item: CollectibleItem
  owned?: boolean
  quantity?: number
  showActions?: boolean
  onClose?: () => void
  onFavoriteToggle?: () => void
}

export function CollectibleCardPreview({
  item,
  owned = true,
  quantity = 1,
  showActions = true,
  onClose,
  onFavoriteToggle,
}: CollectibleCardPreviewProps) {
  const rarityConfig = RARITY_CONFIG[item.rarity]
  const animationClass = getRarityAnimation(item.rarity)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative w-64 rounded-2xl overflow-hidden"
    >
      {/* Glow effect */}
      {owned && (item.rarity === "epic" || item.rarity === "legendary") && (
        <div
          className={`absolute -inset-1 rounded-2xl ${animationClass} blur-md`}
          style={{
            background: `linear-gradient(135deg, ${
              item.rarity === "legendary" ? "#f59e0b" : "#8b5cf6"
            }40, transparent)`,
          }}
        />
      )}

      <div
        className={`relative border-2 rounded-2xl overflow-hidden ${
          owned ? rarityConfig.borderColor : "border-zinc-700"
        } ${rarityConfig.bgColor}`}
      >
        {/* Header avec numéro */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-700/50">
          <span className="text-xs text-zinc-400">#{item.item_number}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${rarityConfig.bgColor} ${rarityConfig.color}`}
          >
            {rarityConfig.name}
          </span>
        </div>

        {/* Image */}
        <div className="relative h-48 p-4">
          {owned ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Lock className="w-16 h-16 text-zinc-600" />
            </div>
          )}

          {/* Animation overlay pour legendary */}
          {owned && item.animation_type === "holographic" && (
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent animate-shimmer" />
          )}
        </div>

        {/* Infos */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-bold text-white text-lg">
              {owned ? item.name : "???"}
            </h3>
            <p className="text-sm text-zinc-400">
              {owned ? item.description : "Non découvert"}
            </p>
          </div>

          {/* Sources d'obtention */}
          {item.obtainable_from && item.obtainable_from.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.obtainable_from.map((source) => (
                <span
                  key={source}
                  className="text-xs px-2 py-0.5 rounded-full bg-zinc-700/50 text-zinc-400"
                >
                  {source}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          {showActions && owned && (
            <div className="flex items-center justify-between pt-2 border-t border-zinc-700/50">
              <div className="flex items-center gap-2">
                {quantity > 1 && (
                  <span className="text-sm text-zinc-400">
                    Quantité: <strong className="text-white">{quantity}</strong>
                  </span>
                )}
              </div>
              {onFavoriteToggle && (
                <button
                  onClick={onFavoriteToggle}
                  className="p-2 rounded-full hover:bg-zinc-700/50 transition-colors"
                >
                  <Heart className="w-5 h-5 text-zinc-400 hover:text-red-500" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   MINI COLLECTIBLE CARD (pour les listes)
   ========================================================================== */

interface MiniCollectibleCardProps {
  item: CollectibleItem
  owned?: boolean
  isNew?: boolean
  onClick?: () => void
}

export function MiniCollectibleCard({
  item,
  owned = false,
  isNew = false,
  onClick,
}: MiniCollectibleCardProps) {
  const rarityConfig = RARITY_CONFIG[item.rarity]

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative w-12 h-12 rounded-lg overflow-hidden border ${
        owned
          ? `${rarityConfig.borderColor} ${rarityConfig.bgColor}`
          : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      {owned ? (
        <img
          src={item.thumbnail_url || item.image_url}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Lock className="w-4 h-4 text-zinc-600" />
        </div>
      )}

      {isNew && (
        <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-cyan-500" />
      )}
    </motion.button>
  )
}

/* ==========================================================================
   CARD REVEAL ANIMATION (pour l'ouverture de packs)
   ========================================================================== */

interface CardRevealProps {
  item: CollectibleItem
  isNew: boolean
  onComplete?: () => void
}

export function CardReveal({ item, isNew, onComplete }: CardRevealProps) {
  const rarityConfig = RARITY_CONFIG[item.rarity]

  return (
    <motion.div
      initial={{ rotateY: 180, scale: 0.5 }}
      animate={{ rotateY: 0, scale: 1 }}
      transition={{ duration: 0.6, type: "spring" }}
      onAnimationComplete={onComplete}
      className="relative w-48 h-64 perspective-1000"
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Glow basé sur la rareté */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="absolute -inset-4 rounded-3xl blur-xl"
        style={{
          background: `radial-gradient(circle, ${
            item.rarity === "legendary"
              ? "#f59e0b"
              : item.rarity === "epic"
              ? "#8b5cf6"
              : item.rarity === "rare"
              ? "#3b82f6"
              : "#22c55e"
          }40, transparent)`,
        }}
      />

      <div
        className={`relative h-full border-2 rounded-2xl overflow-hidden ${rarityConfig.borderColor} ${rarityConfig.bgColor}`}
      >
        {/* Sparkles pour les raretés élevées */}
        {(item.rarity === "legendary" || item.rarity === "epic") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Sparkles className="w-8 h-8 text-yellow-400" />
          </motion.div>
        )}

        {/* Image */}
        <div className="h-40 p-4">
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Infos */}
        <div className="p-3 text-center">
          <h3 className="font-bold text-white">{item.name}</h3>
          <p className={`text-sm ${rarityConfig.color}`}>{rarityConfig.name}</p>

          {isNew && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs"
            >
              <Star className="w-3 h-3" />
              NOUVEAU !
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   RARITY BADGE
   ========================================================================== */

interface RarityBadgeProps {
  rarity: Rarity
  showName?: boolean
  size?: "sm" | "md" | "lg"
}

export function RarityBadge({
  rarity,
  showName = true,
  size = "md",
}: RarityBadgeProps) {
  const config = RARITY_CONFIG[rarity]

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5",
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${sizeClasses[size]} ${config.bgColor} ${config.color}`}
    >
      {rarity === "legendary" && <Sparkles className="w-3 h-3" />}
      {showName && config.name}
    </span>
  )
}

/* ==========================================================================
   DUPLICATE INDICATOR
   ========================================================================== */

interface DuplicateIndicatorProps {
  quantity: number
}

export function DuplicateIndicator({ quantity }: DuplicateIndicatorProps) {
  if (quantity <= 1) return null

  return (
    <div className="flex items-center gap-1 text-xs text-zinc-400">
      <Gift className="w-3 h-3" />
      <span>x{quantity}</span>
      {quantity >= 3 && (
        <span className="text-green-400">(Échangeable)</span>
      )}
    </div>
  )
}
