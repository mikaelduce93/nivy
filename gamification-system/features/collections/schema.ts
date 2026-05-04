/**
 * TEENS PARTY MOROCCO - Collections Schema
 * =========================================
 *
 * Types et configurations pour le système de collections.
 */

import { z } from "zod"

/* ==========================================================================
   ENUMS
   ========================================================================== */

export const SetTypeEnum = z.enum(["cards", "stickers", "photos", "moments"])
export type SetType = z.infer<typeof SetTypeEnum>

export const RarityEnum = z.enum([
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
])
export type Rarity = z.infer<typeof RarityEnum>

export const AnimationTypeEnum = z.enum([
  "none",
  "shimmer",
  "holographic",
  "animated",
])
export type AnimationType = z.infer<typeof AnimationTypeEnum>

export const ObtainableFromEnum = z.enum([
  "event",
  "game",
  "challenge",
  "shop",
  "gift",
  "trade",
])
export type ObtainableFrom = z.infer<typeof ObtainableFromEnum>

export const TradeStatusEnum = z.enum([
  "pending",
  "accepted",
  "rejected",
  "cancelled",
  "completed",
])
export type TradeStatus = z.infer<typeof TradeStatusEnum>

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

export const RARITY_CONFIG: Record<
  Rarity,
  {
    name: string
    color: string
    bgColor: string
    borderColor: string
    gradient: string
    dropRate: number
    shineEffect: string
  }
> = {
  common: {
    name: "Commun",
    color: "text-zinc-400",
    bgColor: "bg-zinc-500/20",
    borderColor: "border-zinc-500/30",
    gradient: "from-zinc-500 to-zinc-600",
    dropRate: 0.4,
    shineEffect: "none",
  },
  uncommon: {
    name: "Peu commun",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    borderColor: "border-green-500/30",
    gradient: "from-green-500 to-emerald-500",
    dropRate: 0.25,
    shineEffect: "subtle",
  },
  rare: {
    name: "Rare",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/30",
    gradient: "from-blue-500 to-cyan-500",
    dropRate: 0.1,
    shineEffect: "shimmer",
  },
  epic: {
    name: "Épique",
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    borderColor: "border-purple-500/30",
    gradient: "from-purple-500 to-violet-500",
    dropRate: 0.04,
    shineEffect: "glow",
  },
  legendary: {
    name: "Légendaire",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
    borderColor: "border-yellow-500/30",
    gradient: "from-yellow-500 to-orange-500",
    dropRate: 0.01,
    shineEffect: "holographic",
  },
}

export const SET_TYPE_CONFIG: Record<
  SetType,
  {
    name: string
    icon: string
    description: string
  }
> = {
  cards: {
    name: "Cartes",
    icon: "Layers",
    description: "Cartes à collectionner",
  },
  stickers: {
    name: "Stickers",
    icon: "Sticker",
    description: "Autocollants fun",
  },
  photos: {
    name: "Photos",
    icon: "Camera",
    description: "Moments capturés",
  },
  moments: {
    name: "Moments",
    icon: "Sparkles",
    description: "Souvenirs spéciaux",
  },
}

/* ==========================================================================
   SCHEMAS
   ========================================================================== */

// Collection Set
export const CollectionSetSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  cover_image_url: z.string().nullable(),
  theme_color: z.string().nullable(),
  theme_gradient: z.string().nullable(),
  total_items: z.number(),
  set_type: SetTypeEnum,
  completion_xp: z.number().default(500),
  completion_coins: z.number().default(200),
  completion_badge_id: z.string().uuid().nullable(),
  completion_title_id: z.string().uuid().nullable(),
  is_active: z.boolean().default(true),
  is_limited: z.boolean().default(false),
  available_from: z.string().nullable(),
  available_until: z.string().nullable(),
  season: z.string().nullable(),
  created_at: z.string().optional(),
})

export type CollectionSet = z.infer<typeof CollectionSetSchema>

// Collectible Item
export const CollectibleItemSchema = z.object({
  id: z.string().uuid(),
  set_id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  image_url: z.string(),
  thumbnail_url: z.string().nullable(),
  animation_type: AnimationTypeEnum.nullable(),
  item_number: z.number(),
  rarity: RarityEnum,
  drop_rate: z.number().default(0.3),
  obtainable_from: z.array(ObtainableFromEnum).default([]),
  event_exclusive: z.boolean().default(false),
  event_id: z.string().uuid().nullable(),
  coin_price: z.number().nullable(),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
})

export type CollectibleItem = z.infer<typeof CollectibleItemSchema>

// User Collectible
export const UserCollectibleSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  item_id: z.string().uuid(),
  obtained_at: z.string(),
  obtained_from: z.string().nullable(),
  quantity: z.number().default(1),
  is_new: z.boolean().default(true),
  is_favorite: z.boolean().default(false),
  source_event_id: z.string().uuid().nullable(),
  source_game_id: z.string().uuid().nullable(),
  gifted_by_user_id: z.string().uuid().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type UserCollectible = z.infer<typeof UserCollectibleSchema>

// User Collection Progress
export const UserCollectionProgressSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  set_id: z.string().uuid(),
  items_collected: z.number().default(0),
  total_items: z.number(),
  completion_percentage: z.number().default(0),
  is_completed: z.boolean().default(false),
  completed_at: z.string().nullable(),
  rewards_claimed: z.boolean().default(false),
  rewards_claimed_at: z.string().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type UserCollectionProgress = z.infer<typeof UserCollectionProgressSchema>

// Collection Trade
export const CollectionTradeSchema = z.object({
  id: z.string().uuid(),
  sender_id: z.string().uuid(),
  sender_item_ids: z.array(z.string().uuid()),
  receiver_id: z.string().uuid(),
  receiver_item_ids: z.array(z.string().uuid()),
  status: TradeStatusEnum,
  sender_message: z.string().nullable(),
  created_at: z.string(),
  responded_at: z.string().nullable(),
  completed_at: z.string().nullable(),
})

export type CollectionTrade = z.infer<typeof CollectionTradeSchema>

// Réponse de get_user_collections
export const UserCollectionsResponseSchema = z.object({
  sets: z.array(
    z.object({
      set: CollectionSetSchema,
      progress: UserCollectionProgressSchema.nullable(),
      collected_items: z.array(z.string().uuid()).nullable(),
    })
  ),
  recent: z.array(
    z.object({
      item: CollectibleItemSchema,
      obtained_at: z.string(),
      is_new: z.boolean(),
    })
  ),
  stats: z.object({
    total_items: z.number(),
    total_duplicates: z.number(),
    sets_completed: z.number(),
    rarity_breakdown: z.record(z.number()).nullable(),
  }),
})

export type UserCollectionsResponse = z.infer<typeof UserCollectionsResponseSchema>

/* ==========================================================================
   TYPES COMPOSÉS
   ========================================================================== */

export interface CollectibleItemWithOwnership extends CollectibleItem {
  owned: boolean
  quantity: number
  is_new: boolean
  is_favorite: boolean
  obtained_at?: string
}

export interface CollectionSetWithProgress extends CollectionSet {
  progress?: UserCollectionProgress
  items: CollectibleItemWithOwnership[]
  owned_count: number
}

export interface CollectionStats {
  totalItems: number
  totalDuplicates: number
  setsCompleted: number
  rarityBreakdown: Record<Rarity, number>
  mostRareItem?: CollectibleItem
  newestItem?: CollectibleItem
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

// Obtenir le style de rareté
export function getRarityStyle(rarity: Rarity): {
  color: string
  bg: string
  border: string
  gradient: string
} {
  const config = RARITY_CONFIG[rarity]
  return {
    color: config.color,
    bg: config.bgColor,
    border: config.borderColor,
    gradient: config.gradient,
  }
}

// Calculer la valeur d'échange d'un item
export function calculateTradeValue(item: CollectibleItem): number {
  const baseValues: Record<Rarity, number> = {
    common: 1,
    uncommon: 3,
    rare: 10,
    epic: 30,
    legendary: 100,
  }
  return baseValues[item.rarity]
}

// Vérifier si un échange est équitable
export function isTradeBalanced(
  senderItems: CollectibleItem[],
  receiverItems: CollectibleItem[],
  tolerance: number = 0.2 // 20% de tolérance
): boolean {
  const senderValue = senderItems.reduce(
    (sum, item) => sum + calculateTradeValue(item),
    0
  )
  const receiverValue = receiverItems.reduce(
    (sum, item) => sum + calculateTradeValue(item),
    0
  )

  const diff = Math.abs(senderValue - receiverValue)
  const avg = (senderValue + receiverValue) / 2

  return diff / avg <= tolerance
}

// Formater le pourcentage de complétion
export function formatCompletionPercent(progress: UserCollectionProgress): string {
  return `${Math.round(progress.completion_percentage)}%`
}

// Obtenir le message de complétion
export function getCompletionMessage(
  collected: number,
  total: number
): string {
  const percent = (collected / total) * 100

  if (percent === 100) return "Collection complète ! 🎉"
  if (percent >= 75) return "Presque terminé !"
  if (percent >= 50) return "À mi-chemin !"
  if (percent >= 25) return "Bon début !"
  return "Commence ta collection !"
}

// Obtenir l'effet d'animation CSS pour la rareté
export function getRarityAnimation(rarity: Rarity): string {
  switch (rarity) {
    case "legendary":
      return "animate-holographic"
    case "epic":
      return "animate-glow"
    case "rare":
      return "animate-shimmer"
    default:
      return ""
  }
}

// Grouper les items par rareté
export function groupItemsByRarity(
  items: CollectibleItem[]
): Record<Rarity, CollectibleItem[]> {
  return items.reduce(
    (acc, item) => {
      if (!acc[item.rarity]) {
        acc[item.rarity] = []
      }
      acc[item.rarity].push(item)
      return acc
    },
    {} as Record<Rarity, CollectibleItem[]>
  )
}

// Calculer les stats de collection
export function calculateCollectionStats(
  items: CollectibleItemWithOwnership[]
): CollectionStats {
  const ownedItems = items.filter((i) => i.owned)
  const totalDuplicates = ownedItems.reduce((sum, i) => sum + (i.quantity - 1), 0)

  const rarityBreakdown = ownedItems.reduce(
    (acc, item) => {
      acc[item.rarity] = (acc[item.rarity] || 0) + 1
      return acc
    },
    {} as Record<Rarity, number>
  )

  const sortedByRarity = [...ownedItems].sort((a, b) => {
    const order = ["legendary", "epic", "rare", "uncommon", "common"]
    return order.indexOf(a.rarity) - order.indexOf(b.rarity)
  })

  const sortedByDate = [...ownedItems].sort((a, b) => {
    if (!a.obtained_at || !b.obtained_at) return 0
    return new Date(b.obtained_at).getTime() - new Date(a.obtained_at).getTime()
  })

  return {
    totalItems: ownedItems.length,
    totalDuplicates,
    setsCompleted: 0, // À calculer séparément
    rarityBreakdown,
    mostRareItem: sortedByRarity[0],
    newestItem: sortedByDate[0],
  }
}
