"use client"

/**
 * TEENS PARTY MOROCCO - Collections Client Component
 * ===================================================
 */

import { useState, useTransition } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import {
  Layers,
  Star,
  Sparkles,
  Lock,
  Check,
  Gift,
  ChevronRight,
  Eye,
  Heart,
  Clock,
  Trophy,
} from "lucide-react"
import {
  getCollectionItems,
  getUserCollectiblesForSet,
  claimSetRewards,
  toggleCollectibleFavorite,
  markCollectibleAsSeen,
} from "@/gamification-system/features/collections/actions"
import confetti from "canvas-confetti"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface CollectionSet {
  // TODO(ts): widen type — these came from an over-permissive zod inference.
  // The runtime payload always includes id/name; treat them as required here.
  id: string
  name: string
  slug?: string
  description?: string | null
  theme?: string | null
  theme_color?: string | null
  image_url?: string | null
  cover_image_url?: string | null
  total_items?: number
  completion_xp_reward?: number
  completion_coins_reward?: number
  completion_badge_id?: string | null
  is_limited?: boolean
  available_from?: string | null
  available_until?: string | null
  is_active?: boolean
}

interface CollectibleItem {
  id?: string
  set_id?: string
  name?: string
  description?: string | null
  image_url?: string | null
  rarity?: "common" | "uncommon" | "rare" | "epic" | "legendary"
  item_number?: number
  drop_rate?: number
  is_active?: boolean
}

interface UserCollectible {
  item_id: string
  quantity: number
  is_new: boolean
  is_favorite: boolean
  obtained_at: string
}

interface RecentItem {
  item: CollectibleItem | any
  obtained_at: string
  is_new: boolean
}

interface CollectionsClientProps {
  sets: CollectionSet[]
  userCollections: any
  stats: {
    totalItems: number
    uniqueItems: number
    duplicates: number
    setsCompleted: number
    totalSets: number
    rarityBreakdown: Record<string, number>
    completionPercentage: number
  }
  recentItems: RecentItem[]
  userId: string
}

/* ==========================================================================
   RARITY CONFIG
   ========================================================================== */

const rarityConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
  common: { color: "text-zinc-400", bg: "bg-zinc-500/20", border: "border-zinc-500/30", label: "Commun" },
  uncommon: { color: "text-green-400", bg: "bg-green-500/20", border: "border-green-500/30", label: "Peu commun" },
  rare: { color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/30", label: "Rare" },
  epic: { color: "text-purple-400", bg: "bg-purple-500/20", border: "border-purple-500/30", label: "Épique" },
  legendary: { color: "text-yellow-400", bg: "bg-yellow-500/20", border: "border-yellow-500/30", label: "Légendaire" },
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export function CollectionsClient({
  sets,
  userCollections,
  stats,
  recentItems,
  userId,
}: CollectionsClientProps) {
  const [selectedSet, setSelectedSet] = useState<CollectionSet | null>(null)
  const [setItems, setSetItems] = useState<CollectibleItem[]>([])
  const [userSetItems, setUserSetItems] = useState<Record<string, UserCollectible>>({})
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showItemModal, setShowItemModal] = useState<CollectibleItem | null>(null)

  // Calculer la progression pour chaque set
  const getSetProgress = (setId: string) => {
    if (!userCollections?.sets) return { collected: 0, total: 0, percentage: 0 }
    const setProgress = userCollections.sets.find((s: any) => s.set_id === setId)
    if (!setProgress) return { collected: 0, total: 0, percentage: 0 }
    return {
      collected: setProgress.items_collected || 0,
      total: setProgress.total_items || 0,
      percentage: setProgress.total_items
        ? Math.round((setProgress.items_collected / setProgress.total_items) * 100)
        : 0,
      is_completed: setProgress.is_completed,
      rewards_claimed: setProgress.rewards_claimed,
    }
  }

  // Charger les items d'un set
  const loadSetItems = async (set: CollectionSet) => {
    setLoading(true)
    setSelectedSet(set)

    try {
      const [items, userItems] = await Promise.all([
        getCollectionItems(set.id),
        getUserCollectiblesForSet(userId, set.id),
      ])

      setSetItems(items)

      // Convertir en map pour accès rapide
      const userItemsMap: Record<string, UserCollectible> = {}
      userItems.forEach((ui: any) => {
        userItemsMap[ui.item_id] = ui
      })
      setUserSetItems(userItemsMap)
    } catch (error) {
      console.error("Error loading set items:", error)
    } finally {
      setLoading(false)
    }
  }

  // Réclamer les récompenses
  const handleClaimRewards = async (setId: string) => {
    startTransition(async () => {
      const result = await claimSetRewards(userId, setId)
      if (result.success) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        })
      }
    })
  }

  // Toggle favori
  const handleToggleFavorite = async (itemId: string) => {
    startTransition(async () => {
      await toggleCollectibleFavorite(userId, itemId)
      // Mettre à jour l'état local
      setUserSetItems((prev) => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          is_favorite: !prev[itemId]?.is_favorite,
        },
      }))
    })
  }

  // Marquer comme vu
  const handleMarkAsSeen = async (itemId: string) => {
    if (userSetItems[itemId]?.is_new) {
      await markCollectibleAsSeen(userId, itemId)
      setUserSetItems((prev) => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          is_new: false,
        },
      }))
    }
  }

  return (
    <div className="space-y-8">
      {/* Rareté Breakdown */}
      <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-6">
        <h3 className="font-bold text-white mb-4">Ta collection par rareté</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(rarityConfig).map(([rarity, config]) => (
            <div
              key={rarity}
              className={`px-4 py-2 rounded-lg ${config.bg} border ${config.border}`}
            >
              <span className={`font-bold ${config.color}`}>
                {stats.rarityBreakdown[rarity] || 0}
              </span>
              <span className="text-zinc-500 ml-2 text-sm">{config.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Items récents */}
      {recentItems.length > 0 && (
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-6">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            Items récemment obtenus
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentItems.map((recent, index) => (
              <motion.div
                key={`${recent.item.id}-${index}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`relative flex-shrink-0 w-20 h-20 rounded-xl ${
                  rarityConfig[recent.item.rarity]?.bg
                } border ${rarityConfig[recent.item.rarity]?.border} flex items-center justify-center`}
              >
                {recent.item.image_url ? (
                  <Image
                    src={recent.item.image_url}
                    alt={recent.item.name || "Item"}
                    width={56}
                    height={56}
                    className="object-contain"
                  />
                ) : (
                  <Sparkles className={`w-8 h-8 ${rarityConfig[recent.item.rarity]?.color}`} />
                )}
                {recent.is_new && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Sets Grid */}
      <div>
        <h3 className="font-bold text-white mb-4 text-lg">Sets de collection</h3>
        {sets.length === 0 ? (
          <div className="text-center py-12">
            <Layers className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500">Aucun set de collection disponible</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sets.map((set) => {
              const progress = getSetProgress(set.id)
              return (
                <motion.button
                  key={set.id}
                  onClick={() => loadSetItems(set)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative p-6 rounded-xl border text-left transition-all ${
                    selectedSet?.id === set.id
                      ? "bg-amber-500/20 border-amber-500/50"
                      : "bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600"
                  }`}
                >
                  {/* Limited Badge */}
                  {set.is_limited && (
                    <span className="absolute top-3 right-3 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                      Limité
                    </span>
                  )}

                  {/* Set Icon */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center mb-4">
                    {set.image_url ? (
                      <Image src={set.image_url} alt={set.name || "Set"} width={40} height={40} className="object-contain" />
                    ) : (
                      <Layers className="w-7 h-7 text-amber-400" />
                    )}
                  </div>

                  {/* Set Info */}
                  <h4 className="font-bold text-white mb-1">{set.name}</h4>
                  <p className="text-sm text-zinc-500 mb-3 line-clamp-2">
                    {set.description || `Collection de ${set.total_items} items`}
                  </p>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">
                        {progress.collected}/{progress.total}
                      </span>
                      <span className={progress.is_completed ? "text-green-400" : "text-amber-400"}>
                        {progress.percentage}%
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress.percentage}%` }}
                        className={`h-full ${
                          progress.is_completed
                            ? "bg-gradient-to-r from-green-500 to-emerald-500"
                            : "bg-gradient-to-r from-amber-500 to-orange-500"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Rewards Preview */}
                  <div className="flex items-center gap-3 mt-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-400" />
                      {set.completion_xp_reward || 0} XP
                    </span>
                    {(set.completion_coins_reward || 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <Gift className="w-3 h-3 text-cyan-400" />
                        {set.completion_coins_reward} coins
                      </span>
                    )}
                  </div>

                  <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                </motion.button>
              )
            })}
          </div>
        )}
      </div>

      {/* Selected Set Items */}
      <AnimatePresence>
        {selectedSet && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-6"
          >
            {/* Set Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">{selectedSet.name}</h3>
                <p className="text-zinc-400">{selectedSet.description}</p>
              </div>
              {getSetProgress(selectedSet.id).is_completed && !getSetProgress(selectedSet.id).rewards_claimed && (
                <button
                  onClick={() => handleClaimRewards(selectedSet.id)}
                  disabled={isPending}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:from-green-400 hover:to-emerald-400 disabled:opacity-50 flex items-center gap-2"
                >
                  <Trophy className="w-4 h-4" />
                  Réclamer
                </button>
              )}
            </div>

            {/* Items Grid */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {setItems.map((item) => {
                  const itemId = item.id || ""
                  const userItem = userSetItems[itemId]
                  const owned = !!userItem
                  const config = rarityConfig[item.rarity || "common"]

                  return (
                    <motion.button
                      key={itemId}
                      onClick={() => {
                        if (owned && itemId) {
                          handleMarkAsSeen(itemId)
                          setShowItemModal(item)
                        }
                      }}
                      whileHover={{ scale: owned ? 1.05 : 1 }}
                      whileTap={{ scale: owned ? 0.95 : 1 }}
                      className={`relative aspect-square rounded-xl border ${
                        owned
                          ? `${config.bg} ${config.border}`
                          : "bg-zinc-900/50 border-zinc-800"
                      } flex items-center justify-center transition-all ${
                        owned ? "cursor-pointer" : "cursor-default"
                      }`}
                    >
                      {owned ? (
                        <>
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name || "Item"}
                              className="w-3/4 h-3/4 object-contain"
                            />
                          ) : (
                            <Sparkles className={`w-1/2 h-1/2 ${config.color}`} />
                          )}
                          {userItem.is_new && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                          )}
                          {userItem.quantity > 1 && (
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 text-white text-xs font-bold rounded">
                              x{userItem.quantity}
                            </span>
                          )}
                          {userItem.is_favorite && (
                            <Heart className="absolute top-1 left-1 w-3 h-3 text-red-400 fill-red-400" />
                          )}
                        </>
                      ) : (
                        <Lock className="w-1/3 h-1/3 text-zinc-700" />
                      )}
                      {/* Item Number */}
                      <span className="absolute bottom-1 left-1 text-[10px] text-zinc-600">
                        #{item.item_number || 0}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item Modal */}
      <AnimatePresence>
        {showItemModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowItemModal(null)}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`max-w-sm w-full rounded-2xl border ${
                rarityConfig[showItemModal.rarity || "common"].border
              } ${rarityConfig[showItemModal.rarity || "common"].bg} p-6`}
            >
              {/* Item Image */}
              <div className="w-32 h-32 mx-auto mb-4 rounded-xl bg-black/30 flex items-center justify-center">
                {showItemModal.image_url ? (
                  <img
                    src={showItemModal.image_url}
                    alt={showItemModal.name || "Item"}
                    className="w-24 h-24 object-contain"
                  />
                ) : (
                  <Sparkles className={`w-16 h-16 ${rarityConfig[showItemModal.rarity || "common"].color}`} />
                )}
              </div>

              {/* Item Info */}
              <div className="text-center mb-4">
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-bold mb-2 ${
                    rarityConfig[showItemModal.rarity || "common"].bg
                  } ${rarityConfig[showItemModal.rarity || "common"].color}`}
                >
                  {rarityConfig[showItemModal.rarity || "common"].label}
                </span>
                <h3 className="text-xl font-bold text-white">{showItemModal.name || "Item"}</h3>
                <p className="text-zinc-400 text-sm mt-1">
                  {showItemModal.description || `Item #${showItemModal.item_number || 0}`}
                </p>
                {showItemModal.id && userSetItems[showItemModal.id] && (
                  <p className="text-zinc-500 text-xs mt-2">
                    Possédé x{userSetItems[showItemModal.id].quantity}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => showItemModal.id && handleToggleFavorite(showItemModal.id)}
                  className={`flex-1 py-2 rounded-xl font-medium flex items-center justify-center gap-2 ${
                    showItemModal.id && userSetItems[showItemModal.id]?.is_favorite
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-zinc-700/50 text-zinc-400 border border-zinc-600"
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      showItemModal.id && userSetItems[showItemModal.id]?.is_favorite ? "fill-red-400" : ""
                    }`}
                  />
                  Favori
                </button>
                <button
                  onClick={() => setShowItemModal(null)}
                  className="flex-1 py-2 bg-zinc-700 text-white font-medium rounded-xl"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
