/**
 * TEENS PARTY MOROCCO - Rewards Shop Schema
 * ==========================================
 *
 * Définitions Zod et types TypeScript pour la boutique de récompenses.
 */

import { z } from "zod"

/* ==========================================================================
   ENUMS
   ========================================================================== */

export const RewardTypeEnum = z.enum([
  "discount",
  "free_entry",
  "skip_queue",
  "exclusive_access",
  "physical_item",
  "digital_item",
  "experience",
  "lottery_ticket",
  "xp_multiplier",
  "profile_customization",
  "mystery_box",
])
export type RewardType = z.infer<typeof RewardTypeEnum>

export const StockTypeEnum = z.enum(["unlimited", "limited", "unique"])
export type StockType = z.infer<typeof StockTypeEnum>

export const PurchaseStatusEnum = z.enum([
  "pending",
  "completed",
  "used",
  "expired",
  "refunded",
])
export type PurchaseStatus = z.infer<typeof PurchaseStatusEnum>

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

export const REWARD_TYPE_CONFIG: Record<
  RewardType,
  {
    label: string
    icon: string
    color: string
    bgColor: string
  }
> = {
  discount: {
    label: "Réduction",
    icon: "percent",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
  },
  free_entry: {
    label: "Entrée gratuite",
    icon: "ticket",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
  },
  skip_queue: {
    label: "Coupe-file",
    icon: "zap",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
  },
  exclusive_access: {
    label: "Accès exclusif",
    icon: "crown",
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
  },
  physical_item: {
    label: "Article physique",
    icon: "package",
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
  },
  digital_item: {
    label: "Article digital",
    icon: "download",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  experience: {
    label: "Expérience",
    icon: "sparkles",
    color: "text-pink-400",
    bgColor: "bg-pink-500/20",
  },
  lottery_ticket: {
    label: "Ticket loterie",
    icon: "ticket",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
  },
  xp_multiplier: {
    label: "Multiplicateur XP",
    icon: "trending-up",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
  },
  profile_customization: {
    label: "Personnalisation",
    icon: "palette",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/20",
  },
  mystery_box: {
    label: "Mystery Box",
    icon: "box",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
  },
}

export const CATEGORY_ICONS: Record<string, string> = {
  entries: "ticket",
  "event-perks": "star",
  discounts: "percent",
  goodies: "gift",
  experiences: "sparkles",
  customization: "palette",
  mystery: "box",
}

/* ==========================================================================
   CATEGORY SCHEMA
   ========================================================================== */

export const RewardCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  icon: z.string(),
  color: z.string(),
  display_order: z.number(),
  is_active: z.boolean(),
})

export type RewardCategory = z.infer<typeof RewardCategorySchema>

/* ==========================================================================
   SHOP REWARD SCHEMA
   ========================================================================== */

export const ShopRewardSchema = z.object({
  reward_id: z.string().uuid(),
  category_id: z.string().uuid().nullable(),
  category_name: z.string().nullable(),
  category_slug: z.string().nullable(),
  name: z.string(),
  description: z.string(),
  short_description: z.string().nullable(),
  image_url: z.string().nullable(),
  icon: z.string(),
  xp_cost: z.number(),
  original_xp_cost: z.number().nullable(),
  stock_type: StockTypeEnum,
  stock_remaining: z.number().nullable(),
  min_level: z.number(),
  required_badge_id: z.string().uuid().nullable(),
  vip_only: z.boolean(),
  reward_type: RewardTypeEnum,
  reward_value: z.record(z.unknown()),
  is_featured: z.boolean(),
  is_new: z.boolean(),
  can_purchase: z.boolean(),
  user_purchase_count: z.number(),
  purchase_limit: z.number().nullable(),
  is_in_wishlist: z.boolean(),
})

export type ShopReward = z.infer<typeof ShopRewardSchema>

/* ==========================================================================
   USER PURCHASE SCHEMA
   ========================================================================== */

export const UserPurchaseSchema = z.object({
  purchase_id: z.string().uuid(),
  reward_id: z.string().uuid(),
  reward_name: z.string(),
  reward_description: z.string(),
  reward_icon: z.string(),
  reward_type: RewardTypeEnum,
  reward_value: z.record(z.unknown()),
  xp_spent: z.number(),
  status: PurchaseStatusEnum,
  purchased_at: z.string().datetime(),
  used_at: z.string().datetime().nullable(),
  expires_at: z.string().datetime().nullable(),
  is_expired: z.boolean(),
  is_usable: z.boolean(),
})

export type UserPurchase = z.infer<typeof UserPurchaseSchema>

/* ==========================================================================
   PROMO CODE SCHEMA
   ========================================================================== */

export const PromoCodeSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  description: z.string().nullable(),
  discount_type: z.enum(["percentage", "fixed_xp"]),
  discount_value: z.number(),
  is_valid: z.boolean(),
})

export type PromoCode = z.infer<typeof PromoCodeSchema>

/* ==========================================================================
   INPUT SCHEMAS
   ========================================================================== */

export const GetRewardsInputSchema = z.object({
  categorySlug: z.string().optional(),
  onlyAffordable: z.boolean().optional().default(false),
  onlyAvailable: z.boolean().optional().default(true),
})

export type GetRewardsInput = z.infer<typeof GetRewardsInputSchema>

export const PurchaseRewardInputSchema = z.object({
  rewardId: z.string().uuid(),
  promoCode: z.string().optional(),
})

export type PurchaseRewardInput = z.infer<typeof PurchaseRewardInputSchema>

export const UseRewardInputSchema = z.object({
  purchaseId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
})

export type UseRewardInput = z.infer<typeof UseRewardInputSchema>

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/**
 * Formate le prix en XP
 */
export function formatXPPrice(xp: number): string {
  if (xp >= 1000000) {
    return (xp / 1000000).toFixed(1) + "M"
  }
  if (xp >= 1000) {
    return (xp / 1000).toFixed(1) + "K"
  }
  return xp.toLocaleString()
}

/**
 * Calcule le pourcentage de réduction
 */
export function calculateDiscountPercentage(
  originalPrice: number,
  currentPrice: number
): number {
  if (originalPrice <= 0 || currentPrice >= originalPrice) return 0
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
}

/**
 * Formate le temps restant avant expiration
 */
export function formatTimeRemaining(expiresAt: string | null): string | null {
  if (!expiresAt) return null

  const now = new Date()
  const expiry = new Date(expiresAt)
  const diff = expiry.getTime() - now.getTime()

  if (diff <= 0) return "Expiré"

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 30) return `${Math.floor(days / 30)} mois`
  if (days > 0) return `${days}j ${hours}h`
  if (hours > 0) return `${hours}h`
  return "< 1h"
}

/**
 * Détermine si un reward est en promo
 */
export function isOnSale(reward: ShopReward): boolean {
  return (
    reward.original_xp_cost !== null &&
    reward.original_xp_cost > reward.xp_cost
  )
}

/**
 * Groupe les rewards par catégorie
 */
export function groupRewardsByCategory(
  rewards: ShopReward[]
): Record<string, ShopReward[]> {
  const grouped: Record<string, ShopReward[]> = {}

  for (const reward of rewards) {
    const key = reward.category_slug || "other"
    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key].push(reward)
  }

  return grouped
}

/**
 * Filtre les rewards abordables
 */
export function getAffordableRewards(
  rewards: ShopReward[],
  userXP: number
): ShopReward[] {
  return rewards.filter((r) => r.xp_cost <= userXP)
}

/**
 * Trie les rewards par pertinence
 */
export function sortRewardsByRelevance(rewards: ShopReward[]): ShopReward[] {
  return [...rewards].sort((a, b) => {
    // Featured first
    if (a.is_featured && !b.is_featured) return -1
    if (!a.is_featured && b.is_featured) return 1

    // New items
    if (a.is_new && !b.is_new) return -1
    if (!a.is_new && b.is_new) return 1

    // On sale
    if (isOnSale(a) && !isOnSale(b)) return -1
    if (!isOnSale(a) && isOnSale(b)) return 1

    // By price (lowest first for same category)
    return a.xp_cost - b.xp_cost
  })
}

/**
 * Formate la valeur de la récompense pour l'affichage
 */
export function formatRewardValue(
  type: RewardType,
  value: Record<string, unknown>
): string {
  switch (type) {
    case "discount":
      return `${value.discount_percent}% de réduction`
    case "free_entry": {
      const qty = (value.quantity as number) || 1
      return qty > 1 ? `${qty} entrées gratuites` : "Entrée gratuite"
    }
    case "skip_queue":
      return "Coupe-file"
    case "exclusive_access":
      return value.access_type === "vip" ? "Accès VIP" : "Accès exclusif"
    case "xp_multiplier":
      return `×${value.multiplier} XP`
    case "mystery_box":
      return `Mystery Box ${value.tier}`
    default:
      return ""
  }
}
