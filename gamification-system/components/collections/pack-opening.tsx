/**
 * TEENS PARTY MOROCCO - Pack Opening Components
 * ==============================================
 *
 * Composants pour l'ouverture de packs de collectibles.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import { X, Gift, Sparkles, Star, ChevronRight, Package } from "lucide-react"
import {
  type CollectibleItem,
  type Rarity,
  RARITY_CONFIG,
} from "../../features/collections"
import { CardReveal, RarityBadge } from "./collection-card"

/* ==========================================================================
   PACK SELECTION
   ========================================================================== */

interface PackOption {
  id: string
  name: string
  type: "standard" | "premium" | "legendary"
  cardCount: number
  guaranteedRarity?: Rarity
  price: number
  priceType: "coins" | "gems" | "free"
  available: boolean
  cooldown?: number // en heures
}

const DEFAULT_PACKS: PackOption[] = [
  {
    id: "daily",
    name: "Pack Quotidien",
    type: "standard",
    cardCount: 3,
    price: 0,
    priceType: "free",
    available: true,
    cooldown: 24,
  },
  {
    id: "standard",
    name: "Pack Standard",
    type: "standard",
    cardCount: 3,
    price: 100,
    priceType: "coins",
    available: true,
  },
  {
    id: "premium",
    name: "Pack Premium",
    type: "premium",
    cardCount: 5,
    guaranteedRarity: "rare",
    price: 300,
    priceType: "coins",
    available: true,
  },
  {
    id: "legendary",
    name: "Pack Légendaire",
    type: "legendary",
    cardCount: 7,
    guaranteedRarity: "epic",
    price: 50,
    priceType: "gems",
    available: true,
  },
]

interface PackSelectionProps {
  packs?: PackOption[]
  userCoins?: number
  userGems?: number
  onSelectPack: (pack: PackOption) => void
}

export function PackSelection({
  packs = DEFAULT_PACKS,
  userCoins = 0,
  userGems = 0,
  onSelectPack,
}: PackSelectionProps) {
  const canAfford = (pack: PackOption): boolean => {
    if (pack.priceType === "free") return pack.available
    if (pack.priceType === "coins") return userCoins >= pack.price
    if (pack.priceType === "gems") return userGems >= pack.price
    return false
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {packs.map((pack) => (
        <PackCard
          key={pack.id}
          pack={pack}
          canAfford={canAfford(pack)}
          onSelect={() => onSelectPack(pack)}
        />
      ))}
    </div>
  )
}

/* ==========================================================================
   PACK CARD
   ========================================================================== */

interface PackCardProps {
  pack: PackOption
  canAfford: boolean
  onSelect: () => void
}

function PackCard({ pack, canAfford, onSelect }: PackCardProps) {
  const gradients = {
    standard: "from-zinc-600 to-zinc-800",
    premium: "from-purple-600 to-violet-800",
    legendary: "from-yellow-500 to-orange-600",
  }

  const glowColors = {
    standard: "shadow-zinc-500/20",
    premium: "shadow-purple-500/30",
    legendary: "shadow-yellow-500/40",
  }

  return (
    <motion.button
      whileHover={canAfford ? { scale: 1.03, y: -4 } : {}}
      whileTap={canAfford ? { scale: 0.98 } : {}}
      onClick={canAfford ? onSelect : undefined}
      disabled={!canAfford}
      className={`relative rounded-2xl overflow-hidden ${
        !canAfford ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      {/* Background */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradients[pack.type]}`}
      />

      {/* Glow effect */}
      {pack.type !== "standard" && (
        <div
          className={`absolute inset-0 ${glowColors[pack.type]} shadow-[0_0_30px_10px]`}
        />
      )}

      {/* Content */}
      <div className="relative p-6 min-h-[250px] flex flex-col items-center justify-between">
        {/* Pack visual */}
        <div className="relative">
          <motion.div
            animate={
              pack.type === "legendary"
                ? { rotate: [0, 5, -5, 0] }
                : pack.type === "premium"
                ? { scale: [1, 1.05, 1] }
                : {}
            }
            transition={{ duration: 2, repeat: Infinity }}
            className="w-24 h-32 rounded-xl bg-gradient-to-br from-white/20 to-white/5 border border-white/20 flex items-center justify-center"
          >
            <Package className="w-12 h-12 text-white/80" />
          </motion.div>

          {/* Sparkles for special packs */}
          {pack.type === "legendary" && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-4"
            >
              <Sparkles className="absolute top-0 left-1/2 w-4 h-4 text-yellow-300" />
              <Sparkles className="absolute bottom-0 right-0 w-3 h-3 text-yellow-300" />
              <Star className="absolute top-1/2 left-0 w-3 h-3 text-yellow-300" />
            </motion.div>
          )}
        </div>

        {/* Info */}
        <div className="text-center space-y-2">
          <h3 className="font-bold text-white text-lg">{pack.name}</h3>
          <p className="text-white/70 text-sm">{pack.cardCount} cartes</p>
          {pack.guaranteedRarity && (
            <div className="flex justify-center">
              <RarityBadge rarity={pack.guaranteedRarity} size="sm" />
              <span className="text-xs text-white/60 ml-1">garanti</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="flex items-center justify-center gap-2">
          {pack.priceType === "free" ? (
            <span className="px-4 py-2 rounded-full bg-green-500 text-white font-bold">
              GRATUIT
            </span>
          ) : (
            <span className="px-4 py-2 rounded-full bg-black/30 text-white font-bold flex items-center gap-1">
              {pack.priceType === "coins" ? "🪙" : "💎"}
              {pack.price}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  )
}

/* ==========================================================================
   PACK OPENING ANIMATION
   ========================================================================== */

interface PackOpeningProps {
  packType: "standard" | "premium" | "legendary"
  items: Array<{
    item: CollectibleItem
    isNew: boolean
    quantity: number
  }>
  onComplete: () => void
  onClose: () => void
}

export function PackOpening({
  packType,
  items,
  onComplete,
  onClose,
}: PackOpeningProps) {
  const [phase, setPhase] = useState<"intro" | "opening" | "reveal" | "summary">(
    "intro"
  )
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [revealedCards, setRevealedCards] = useState<boolean[]>(
    new Array(items.length).fill(false)
  )

  // Confetti pour les raretés élevées
  const triggerConfetti = useCallback((rarity: Rarity) => {
    if (rarity === "legendary") {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ["#f59e0b", "#fbbf24", "#fcd34d"],
      })
    } else if (rarity === "epic") {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#8b5cf6", "#a78bfa", "#c4b5fd"],
      })
    } else if (rarity === "rare") {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 },
        colors: ["#3b82f6", "#60a5fa", "#93c5fd"],
      })
    }
  }, [])

  // Auto-progression de l'intro à l'opening
  useEffect(() => {
    if (phase === "intro") {
      const timer = setTimeout(() => setPhase("opening"), 1500)
      return () => clearTimeout(timer)
    }
  }, [phase])

  // Révéler la carte suivante
  const revealNextCard = () => {
    if (currentCardIndex < items.length) {
      const newRevealed = [...revealedCards]
      newRevealed[currentCardIndex] = true
      setRevealedCards(newRevealed)

      // Trigger confetti
      triggerConfetti(items[currentCardIndex].item.rarity)

      if (currentCardIndex === items.length - 1) {
        setTimeout(() => setPhase("summary"), 500)
      }
      setCurrentCardIndex((prev) => prev + 1)
    }
  }

  // Révéler toutes les cartes
  const revealAll = () => {
    const allRevealed = new Array(items.length).fill(true)
    setRevealedCards(allRevealed)
    setCurrentCardIndex(items.length)

    // Confetti pour la meilleure carte
    const bestRarity = items.reduce((best, item) => {
      const order = ["legendary", "epic", "rare", "uncommon", "common"]
      return order.indexOf(item.item.rarity) < order.indexOf(best)
        ? item.item.rarity
        : best
    }, "common" as Rarity)
    triggerConfetti(bestRarity)

    setTimeout(() => setPhase("summary"), 500)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors z-10"
      >
        <X className="w-6 h-6" />
      </button>

      <AnimatePresence mode="wait">
        {/* Intro Phase */}
        {phase === "intro" && (
          <motion.div
            key="intro"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5, repeat: 2 }}
              className="w-32 h-40 mx-auto mb-6 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center"
            >
              <Gift className="w-16 h-16 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-white">Ouverture du pack...</h2>
          </motion.div>
        )}

        {/* Opening Phase */}
        {phase === "opening" && (
          <motion.div
            key="opening"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-8"
          >
            {/* Cards row */}
            <div className="flex gap-4 flex-wrap justify-center max-w-4xl">
              {items.map((item, index) => (
                <motion.div
                  key={item.item.id}
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {revealedCards[index] ? (
                    <CardReveal item={item.item} isNew={item.isNew} />
                  ) : (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      onClick={revealNextCard}
                      className="w-48 h-64 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-600 border-2 border-white/20 flex items-center justify-center cursor-pointer"
                    >
                      <div className="text-center">
                        <Sparkles className="w-12 h-12 text-white/80 mx-auto mb-2" />
                        <p className="text-white/80 text-sm">Cliquer pour révéler</p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              {currentCardIndex < items.length && (
                <>
                  <button
                    onClick={revealNextCard}
                    className="px-6 py-3 rounded-xl bg-cyan-500 text-white font-bold hover:bg-cyan-600 transition-colors flex items-center gap-2"
                  >
                    Révéler la suivante
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={revealAll}
                    className="px-6 py-3 rounded-xl bg-zinc-700 text-white font-medium hover:bg-zinc-600 transition-colors"
                  >
                    Tout révéler
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Summary Phase */}
        {phase === "summary" && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto"
          >
            <h2 className="text-3xl font-bold text-white mb-6">
              {items.some((i) => i.item.rarity === "legendary")
                ? "LÉGENDAIRE ! 🎉"
                : items.some((i) => i.item.rarity === "epic")
                ? "ÉPIQUE ! ✨"
                : items.some((i) => i.item.rarity === "rare")
                ? "Super drop !"
                : "Beau pack !"}
            </h2>

            {/* Summary cards */}
            <div className="flex gap-3 flex-wrap justify-center mb-8">
              {items.map((item) => (
                <div
                  key={item.item.id}
                  className={`relative p-3 rounded-xl border ${
                    RARITY_CONFIG[item.item.rarity].borderColor
                  } ${RARITY_CONFIG[item.item.rarity].bgColor}`}
                >
                  <img
                    src={item.item.thumbnail_url || item.item.image_url}
                    alt={item.item.name}
                    className="w-16 h-16 object-contain mx-auto"
                  />
                  <p className="text-xs text-white mt-1 truncate max-w-[80px]">
                    {item.item.name}
                  </p>
                  <RarityBadge rarity={item.item.rarity} size="sm" showName={false} />

                  {item.isNew && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center">
                      <Star className="w-2 h-2 text-white" />
                    </div>
                  )}

                  {!item.isNew && (
                    <div className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-zinc-600 text-xs text-zinc-300">
                      +1
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="flex justify-center gap-6 mb-8 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-400">
                  {items.filter((i) => i.isNew).length}
                </p>
                <p className="text-zinc-400">Nouveaux</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-400">
                  {items.filter((i) => !i.isNew).length}
                </p>
                <p className="text-zinc-400">Doublons</p>
              </div>
            </div>

            {/* Action */}
            <button
              onClick={() => {
                onComplete()
                onClose()
              }}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold hover:opacity-90 transition-opacity"
            >
              Continuer
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ==========================================================================
   PACK OPENING BUTTON
   ========================================================================== */

interface OpenPackButtonProps {
  label?: string
  packType?: "standard" | "premium" | "legendary"
  disabled?: boolean
  onClick: () => void
}

export function OpenPackButton({
  label = "Ouvrir un pack",
  packType = "standard",
  disabled = false,
  onClick,
}: OpenPackButtonProps) {
  const colors = {
    standard: "from-zinc-500 to-zinc-700",
    premium: "from-purple-500 to-violet-700",
    legendary: "from-yellow-500 to-orange-600",
  }

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={`relative px-6 py-3 rounded-xl font-bold text-white overflow-hidden ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <div className={`absolute inset-0 bg-gradient-to-r ${colors[packType]}`} />

      {packType !== "standard" && (
        <motion.div
          className="absolute inset-0 bg-white/20"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      <span className="relative flex items-center gap-2">
        <Gift className="w-5 h-5" />
        {label}
      </span>
    </motion.button>
  )
}

/* ==========================================================================
   DAILY PACK WIDGET
   ========================================================================== */

interface DailyPackWidgetProps {
  available: boolean
  nextAvailableIn?: number // en minutes
  onClaim: () => void
}

export function DailyPackWidget({
  available,
  nextAvailableIn = 0,
  onClaim,
}: DailyPackWidgetProps) {
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}min`
    }
    return `${mins}min`
  }

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-white">Pack Quotidien</h4>
            <p className="text-sm text-zinc-400">
              {available
                ? "Disponible maintenant !"
                : `Prochain dans ${formatTime(nextAvailableIn)}`}
            </p>
          </div>
        </div>

        <button
          onClick={onClaim}
          disabled={!available}
          className={`px-4 py-2 rounded-xl font-medium transition-all ${
            available
              ? "bg-cyan-500 text-white hover:bg-cyan-600"
              : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
          }`}
        >
          {available ? "Réclamer" : "Attendre"}
        </button>
      </div>
    </div>
  )
}
