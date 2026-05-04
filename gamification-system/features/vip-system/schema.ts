/**
 * TEENS PARTY MOROCCO - VIP System Schema
 * ========================================
 *
 * Types et configurations pour le système VIP gamifié.
 */

import { z } from "zod"

/* ==========================================================================
   ENUMS
   ========================================================================== */

export const VipTierSlugEnum = z.enum([
  "standard",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "legendary",
])
export type VipTierSlug = z.infer<typeof VipTierSlugEnum>

export const PerkCategoryEnum = z.enum([
  "rewards",
  "events",
  "social",
  "shop",
  "customization",
  "support",
])
export type PerkCategory = z.infer<typeof PerkCategoryEnum>

export const BenefitTypeEnum = z.enum([
  "xp_bonus",
  "coin_bonus",
  "free_pack",
  "discount",
  "monthly_coins",
  "wheel_spin",
  "early_access",
])
export type BenefitType = z.infer<typeof BenefitTypeEnum>

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

export const VIP_TIER_CONFIG: Record<
  VipTierSlug,
  {
    name: string
    level: number
    color: string
    bgColor: string
    borderColor: string
    gradient: string
    textGradient: string
    icon: string
    emoji: string
    glowColor: string
  }
> = {
  standard: {
    name: "Standard",
    level: 0,
    color: "text-zinc-400",
    bgColor: "bg-zinc-500/20",
    borderColor: "border-zinc-500/30",
    gradient: "from-zinc-500 to-zinc-600",
    textGradient: "from-zinc-400 to-zinc-500",
    icon: "User",
    emoji: "👤",
    glowColor: "#71717a",
  },
  bronze: {
    name: "Bronze",
    level: 1,
    color: "text-amber-600",
    bgColor: "bg-amber-600/20",
    borderColor: "border-amber-600/30",
    gradient: "from-amber-600 to-orange-700",
    textGradient: "from-amber-500 to-orange-600",
    icon: "Award",
    emoji: "🥉",
    glowColor: "#cd7f32",
  },
  silver: {
    name: "Argent",
    level: 2,
    color: "text-gray-300",
    bgColor: "bg-gray-300/20",
    borderColor: "border-gray-300/30",
    gradient: "from-gray-300 to-gray-500",
    textGradient: "from-gray-200 to-gray-400",
    icon: "Medal",
    emoji: "🥈",
    glowColor: "#c0c0c0",
  },
  gold: {
    name: "Or",
    level: 3,
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/20",
    borderColor: "border-yellow-400/30",
    gradient: "from-yellow-400 to-amber-500",
    textGradient: "from-yellow-300 to-amber-400",
    icon: "Trophy",
    emoji: "🥇",
    glowColor: "#ffd700",
  },
  platinum: {
    name: "Platine",
    level: 4,
    color: "text-gray-200",
    bgColor: "bg-gray-200/20",
    borderColor: "border-gray-200/30",
    gradient: "from-gray-200 to-gray-400",
    textGradient: "from-gray-100 to-gray-300",
    icon: "Crown",
    emoji: "👑",
    glowColor: "#e5e4e2",
  },
  diamond: {
    name: "Diamant",
    level: 5,
    color: "text-cyan-300",
    bgColor: "bg-cyan-300/20",
    borderColor: "border-cyan-300/30",
    gradient: "from-cyan-300 to-blue-400",
    textGradient: "from-cyan-200 to-blue-300",
    icon: "Gem",
    emoji: "💎",
    glowColor: "#b9f2ff",
  },
  legendary: {
    name: "Légendaire",
    level: 6,
    color: "text-orange-500",
    bgColor: "bg-orange-500/20",
    borderColor: "border-orange-500/30",
    gradient: "from-orange-500 to-red-600",
    textGradient: "from-orange-400 to-red-500",
    icon: "Flame",
    emoji: "🔥",
    glowColor: "#ff6b35",
  },
}

export const PERK_CATEGORY_CONFIG: Record<
  PerkCategory,
  {
    name: string
    icon: string
    color: string
  }
> = {
  rewards: { name: "Récompenses", icon: "Gift", color: "text-yellow-400" },
  events: { name: "Événements", icon: "Calendar", color: "text-purple-400" },
  social: { name: "Social", icon: "Users", color: "text-blue-400" },
  shop: { name: "Boutique", icon: "ShoppingBag", color: "text-green-400" },
  customization: { name: "Personnalisation", icon: "Palette", color: "text-pink-400" },
  support: { name: "Support", icon: "Headphones", color: "text-cyan-400" },
}

// XP requis pour chaque tier
export const TIER_XP_REQUIREMENTS: Record<VipTierSlug, number> = {
  standard: 0,
  bronze: 1000,
  silver: 5000,
  gold: 15000,
  platinum: 35000,
  diamond: 75000,
  legendary: 150000,
}

/* ==========================================================================
   SCHEMAS
   ========================================================================== */

// VIP Tier
export const VipTierSchema = z.object({
  id: z.string().uuid(),
  slug: VipTierSlugEnum,
  name: z.string(),
  description: z.string().nullable(),
  tier_level: z.number(),
  min_lifetime_xp: z.number(),
  min_events_attended: z.number().default(0),
  min_months_active: z.number().default(0),
  color: z.string(),
  gradient: z.string().nullable(),
  badge_url: z.string().nullable(),
  frame_url: z.string().nullable(),
  icon: z.string().nullable(),
  emoji: z.string().nullable(),
  xp_multiplier: z.number().default(1),
  coin_multiplier: z.number().default(1),
  drop_rate_bonus: z.number().default(0),
  max_daily_wheel_spins: z.number().default(1),
  max_daily_packs: z.number().default(0),
  priority_queue: z.boolean().default(false),
  early_access_hours: z.number().default(0),
  exclusive_events: z.boolean().default(false),
  custom_frame: z.boolean().default(false),
  custom_title: z.boolean().default(false),
  discount_percentage: z.number().default(0),
  free_monthly_coins: z.number().default(0),
  dedicated_support: z.boolean().default(false),
  can_create_crew: z.boolean().default(false),
  max_crew_size: z.number().default(0),
  can_host_private_events: z.boolean().default(false),
  profile_highlight: z.boolean().default(false),
  leaderboard_highlight: z.boolean().default(false),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
})

export type VipTier = z.infer<typeof VipTierSchema>

// VIP Perk
export const VipPerkSchema = z.object({
  id: z.string().uuid(),
  tier_id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  category: PerkCategoryEnum.nullable(),
  is_highlighted: z.boolean().default(false),
  sort_order: z.number().default(0),
  created_at: z.string().optional(),
})

export type VipPerk = z.infer<typeof VipPerkSchema>

// User VIP Status
export const UserVipStatusSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  current_tier_id: z.string().uuid(),
  lifetime_xp: z.number().default(0),
  current_period_xp: z.number().default(0),
  events_attended: z.number().default(0),
  months_active: z.number().default(0),
  first_event_date: z.string().nullable(),
  next_tier_id: z.string().uuid().nullable(),
  xp_to_next_tier: z.number().default(0),
  progress_percentage: z.number().default(0),
  tier_achieved_at: z.string().optional(),
  highest_tier_achieved_id: z.string().uuid().nullable(),
  tier_history: z.array(z.any()).default([]),
  monthly_coins_claimed: z.boolean().default(false),
  monthly_coins_claimed_at: z.string().nullable(),
  last_month_processed: z.string().nullable(),
  benefits_used_count: z.number().default(0),
  total_savings: z.number().default(0),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type UserVipStatus = z.infer<typeof UserVipStatusSchema>

// VIP Benefit Log
export const VipBenefitLogSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  tier_id: z.string().uuid(),
  benefit_type: BenefitTypeEnum,
  benefit_value: z.number().nullable(),
  context: z.string().nullable(),
  created_at: z.string().optional(),
})

export type VipBenefitLog = z.infer<typeof VipBenefitLogSchema>

// Full VIP Status Response
export const VipStatusResponseSchema = z.object({
  status: UserVipStatusSchema,
  current_tier: VipTierSchema,
  next_tier: VipTierSchema.nullable(),
  perks: z.array(VipPerkSchema),
  progress: z.object({
    current_xp: z.number(),
    xp_to_next: z.number(),
    percentage: z.number(),
    events_attended: z.number(),
    months_active: z.number(),
  }),
})

export type VipStatusResponse = z.infer<typeof VipStatusResponseSchema>

/* ==========================================================================
   TYPES COMPOSÉS
   ========================================================================== */

export interface VipTierWithPerks extends VipTier {
  perks: VipPerk[]
}

export interface VipProgress {
  currentTier: VipTierSlug
  nextTier: VipTierSlug | null
  currentXp: number
  xpToNext: number
  percentage: number
  isMaxTier: boolean
}

export interface VipBenefitSummary {
  xpMultiplier: number
  coinMultiplier: number
  wheelSpins: number
  freePacks: number
  discount: number
  monthlyCoins: number
  earlyAccessHours: number
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

// Obtenir la config d'un tier
export function getTierConfig(tier: VipTierSlug) {
  return VIP_TIER_CONFIG[tier]
}

// Obtenir le tier suivant
export function getNextTier(currentTier: VipTierSlug): VipTierSlug | null {
  const tiers: VipTierSlug[] = [
    "standard",
    "bronze",
    "silver",
    "gold",
    "platinum",
    "diamond",
    "legendary",
  ]
  const currentIndex = tiers.indexOf(currentTier)
  if (currentIndex === -1 || currentIndex === tiers.length - 1) return null
  return tiers[currentIndex + 1]
}

// Obtenir le tier précédent
export function getPreviousTier(currentTier: VipTierSlug): VipTierSlug | null {
  const tiers: VipTierSlug[] = [
    "standard",
    "bronze",
    "silver",
    "gold",
    "platinum",
    "diamond",
    "legendary",
  ]
  const currentIndex = tiers.indexOf(currentTier)
  if (currentIndex <= 0) return null
  return tiers[currentIndex - 1]
}

// Calculer le tier basé sur l'XP
export function calculateTierFromXp(xp: number): VipTierSlug {
  const tiers: VipTierSlug[] = [
    "legendary",
    "diamond",
    "platinum",
    "gold",
    "silver",
    "bronze",
    "standard",
  ]

  for (const tier of tiers) {
    if (xp >= TIER_XP_REQUIREMENTS[tier]) {
      return tier
    }
  }

  return "standard"
}

// Calculer la progression vers le prochain tier
export function calculateProgress(
  currentXp: number,
  currentTier: VipTierSlug
): VipProgress {
  const nextTier = getNextTier(currentTier)

  if (!nextTier) {
    return {
      currentTier,
      nextTier: null,
      currentXp,
      xpToNext: 0,
      percentage: 100,
      isMaxTier: true,
    }
  }

  const currentTierXp = TIER_XP_REQUIREMENTS[currentTier]
  const nextTierXp = TIER_XP_REQUIREMENTS[nextTier]
  const xpInTier = currentXp - currentTierXp
  const xpNeeded = nextTierXp - currentTierXp
  const percentage = Math.min(100, (xpInTier / xpNeeded) * 100)

  return {
    currentTier,
    nextTier,
    currentXp,
    xpToNext: nextTierXp - currentXp,
    percentage,
    isMaxTier: false,
  }
}

// Formater l'XP pour affichage
export function formatXp(xp: number): string {
  if (xp >= 1000000) {
    return `${(xp / 1000000).toFixed(1)}M`
  }
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K`
  }
  return xp.toString()
}

// Obtenir le message de progression
export function getProgressMessage(progress: VipProgress): string {
  if (progress.isMaxTier) {
    return "Tu as atteint le sommet ! 🔥"
  }

  if (progress.percentage >= 90) {
    return `Presque ${VIP_TIER_CONFIG[progress.nextTier!].name} !`
  }
  if (progress.percentage >= 50) {
    return `À mi-chemin vers ${VIP_TIER_CONFIG[progress.nextTier!].name}`
  }
  if (progress.percentage >= 25) {
    return "Continue comme ça !"
  }

  return `${formatXp(progress.xpToNext)} XP avant ${VIP_TIER_CONFIG[progress.nextTier!].name}`
}

// Calculer les économies avec la réduction
export function calculateSavings(
  originalPrice: number,
  discountPercentage: number
): number {
  return Math.round(originalPrice * (discountPercentage / 100))
}

// Vérifier si un utilisateur a accès anticipé à un événement
export function hasEarlyAccess(
  eventStartDate: Date,
  earlyAccessHours: number
): boolean {
  const now = new Date()
  const earlyAccessStart = new Date(
    eventStartDate.getTime() - earlyAccessHours * 60 * 60 * 1000
  )
  return now >= earlyAccessStart
}

// Obtenir le résumé des avantages
export function getBenefitSummary(tier: VipTier): VipBenefitSummary {
  return {
    xpMultiplier: tier.xp_multiplier,
    coinMultiplier: tier.coin_multiplier,
    wheelSpins: tier.max_daily_wheel_spins,
    freePacks: tier.max_daily_packs,
    discount: tier.discount_percentage,
    monthlyCoins: tier.free_monthly_coins,
    earlyAccessHours: tier.early_access_hours,
  }
}

// Comparer deux tiers
export function compareTiers(tier1: VipTierSlug, tier2: VipTierSlug): number {
  return VIP_TIER_CONFIG[tier1].level - VIP_TIER_CONFIG[tier2].level
}

// Vérifier si un tier est supérieur ou égal à un autre
export function isTierAtLeast(
  userTier: VipTierSlug,
  requiredTier: VipTierSlug
): boolean {
  return compareTiers(userTier, requiredTier) >= 0
}

// Obtenir tous les perks jusqu'à un certain tier (cumulatifs)
export function getCumulativePerks(
  allPerks: VipPerk[],
  tierLevel: number
): VipPerk[] {
  // Cette fonction suppose que les perks sont liés à des tiers spécifiques
  // et qu'on veut tous les perks des tiers précédents aussi
  return allPerks.filter((perk) => {
    // On aurait besoin de la tier_level associée au perk
    // Simplifié ici
    return true
  })
}

// Générer un message de bienvenue pour un nouveau tier
export function getTierWelcomeMessage(tier: VipTierSlug): string {
  const messages: Record<VipTierSlug, string> = {
    standard: "Bienvenue dans la communauté !",
    bronze: "Félicitations ! Tu fais maintenant partie des Bronze ! 🥉",
    silver: "Bravo ! Tu brilles comme l'Argent ! 🥈",
    gold: "Incroyable ! Tu as atteint l'Or ! 🥇",
    platinum: "Exceptionnel ! Bienvenue au niveau Platine ! 👑",
    diamond: "Extraordinaire ! Tu es maintenant Diamant ! 💎",
    legendary: "LÉGENDAIRE ! Tu as atteint le sommet ! 🔥",
  }
  return messages[tier]
}

// Obtenir la couleur de glow pour les effets visuels
export function getTierGlowStyle(tier: VipTierSlug): React.CSSProperties {
  const config = VIP_TIER_CONFIG[tier]
  return {
    boxShadow: `0 0 30px ${config.glowColor}40, 0 0 60px ${config.glowColor}20`,
  }
}
