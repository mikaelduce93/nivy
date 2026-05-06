/**
 * TEENS PARTY MOROCCO - Achievements Domain Schemas
 * =================================================
 *
 * Schémas Zod pour la validation du système d'achievements.
 */

import { z } from 'zod'

/* ==========================================================================
   ENUMS & CONSTANTS
   ========================================================================== */

export const AchievementCategoryEnum = z.enum([
  'participation',
  'social',
  'streak',
  'challenge',
  'event',
  'loyalty',
  'special',
  'seasonal',
])
export type AchievementCategory = z.infer<typeof AchievementCategoryEnum>

export const AchievementRarityEnum = z.enum([
  'common',
  'rare',
  'epic',
  'legendary',
  'mythic',
])
export type AchievementRarity = z.infer<typeof AchievementRarityEnum>

export const RequirementTypeEnum = z.enum([
  'count',
  'streak',
  'milestone',
  'first_action',
  'combo',
  'time_based',
  'special',
])
export type RequirementType = z.infer<typeof RequirementTypeEnum>

/* ==========================================================================
   RARITY CONFIGURATIONS
   ========================================================================== */

export const RARITY_CONFIG = {
  common: {
    gradient: 'from-zinc-400 to-zinc-500',
    glow: 'shadow-zinc-500/30',
    label: 'Commun',
    labelColor: 'text-zinc-400',
    border: 'border-zinc-500/30',
    bgGradient: 'from-zinc-500/10 to-zinc-600/10',
    points: 10,
  },
  rare: {
    gradient: 'from-blue-400 to-cyan-500',
    glow: 'shadow-blue-500/30',
    label: 'Rare',
    labelColor: 'text-blue-400',
    border: 'border-blue-500/30',
    bgGradient: 'from-blue-500/10 to-cyan-500/10',
    points: 25,
  },
  epic: {
    gradient: 'from-purple-400 to-pink-500',
    glow: 'shadow-purple-500/30',
    label: 'Épique',
    labelColor: 'text-purple-400',
    border: 'border-purple-500/30',
    bgGradient: 'from-purple-500/10 to-pink-500/10',
    points: 50,
  },
  legendary: {
    gradient: 'from-yellow-400 via-orange-500 to-red-500',
    glow: 'shadow-yellow-500/30',
    label: 'Légendaire',
    labelColor: 'text-yellow-400',
    border: 'border-yellow-500/30',
    bgGradient: 'from-yellow-500/10 to-orange-500/10',
    points: 100,
  },
  mythic: {
    gradient: 'from-emerald-400 via-cyan-400 to-blue-500',
    glow: 'shadow-emerald-500/30',
    label: 'Mythique',
    labelColor: 'text-emerald-400',
    border: 'border-emerald-500/30',
    bgGradient: 'from-emerald-500/10 to-cyan-500/10',
    points: 250,
  },
} as const

export const CATEGORY_CONFIG = {
  participation: {
    label: 'Participation',
    icon: 'ticket',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
  social: {
    label: 'Social',
    icon: 'users',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
  },
  streak: {
    label: 'Streaks',
    icon: 'flame',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
  },
  challenge: {
    label: 'Défis',
    icon: 'target',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
  },
  event: {
    label: 'Événements',
    icon: 'calendar',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  loyalty: {
    label: 'Fidélité',
    icon: 'heart',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
  },
  special: {
    label: 'Spécial',
    icon: 'star',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
  },
  seasonal: {
    label: 'Saisonnier',
    icon: 'sparkles',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
} as const

/* ==========================================================================
   INPUT SCHEMAS
   ========================================================================== */

/**
 * Schéma pour récupérer les achievements d'un teen
 */
export const getAchievementsSchema = z.object({
  teenId: z.string().uuid('ID adolescent invalide'),
  category: AchievementCategoryEnum.optional(),
  includeSecret: z.boolean().optional().default(false),
})

// Use z.input so optional defaults stay optional for callers; the parsed
// (output) type with required defaults is z.infer<>.
export type GetAchievementsInput = z.input<typeof getAchievementsSchema>

/**
 * Schéma pour récupérer les stats d'achievements
 */
export const getAchievementStatsSchema = z.object({
  teenId: z.string().uuid('ID adolescent invalide'),
})

export type GetAchievementStatsInput = z.infer<typeof getAchievementStatsSchema>

/**
 * Schéma pour mettre à jour la progression d'un achievement
 */
export const updateProgressSchema = z.object({
  teenId: z.string().uuid('ID adolescent invalide'),
  achievementCode: z.string().min(1, 'Code achievement requis'),
  progress: z.number().int().min(1).optional().default(1),
  increment: z.boolean().optional().default(true),
})

export type UpdateProgressInput = z.infer<typeof updateProgressSchema>

/**
 * Schéma pour débloquer un achievement
 */
export const unlockAchievementSchema = z.object({
  teenId: z.string().uuid('ID adolescent invalide'),
  achievementCode: z.string().min(1, 'Code achievement requis'),
})

export type UnlockAchievementInput = z.infer<typeof unlockAchievementSchema>

/**
 * Schéma pour vérifier tous les achievements d'un user
 */
export const checkAchievementsSchema = z.object({
  teenId: z.string().uuid('ID adolescent invalide'),
})

export type CheckAchievementsInput = z.infer<typeof checkAchievementsSchema>

/**
 * Schéma pour récupérer les achievements récemment débloqués
 */
export const getRecentUnlocksSchema = z.object({
  teenId: z.string().uuid('ID adolescent invalide'),
  limit: z.number().int().min(1).max(50).optional().default(10),
  since: z.string().datetime().optional(),
})

export type GetRecentUnlocksInput = z.infer<typeof getRecentUnlocksSchema>

/**
 * Schéma pour récupérer le prochain achievement à débloquer
 */
export const getNextAchievementsSchema = z.object({
  teenId: z.string().uuid('ID adolescent invalide'),
  limit: z.number().int().min(1).max(10).optional().default(5),
})

export type GetNextAchievementsInput = z.infer<typeof getNextAchievementsSchema>

/* ==========================================================================
   OUTPUT TYPES
   ========================================================================== */

/**
 * Type de retour standard pour les actions
 */
export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Type Achievement
 */
export type Achievement = {
  id: string
  code: string
  name: string
  description: string
  category: AchievementCategory
  rarity: AchievementRarity
  points: number
  xp_reward: number
  icon: string
  color_gradient: string | null
  requirement_type: RequirementType
  requirement_value: number
  requirement_data: Record<string, unknown>
  is_active: boolean
  is_secret: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

/**
 * Type User Achievement (avec progression)
 */
export type UserAchievement = {
  id: string
  code: string
  name: string
  description: string
  category: AchievementCategory
  rarity: AchievementRarity
  points: number
  xp_reward: number
  icon: string
  color_gradient: string | null
  requirement_value: number
  progress: number
  is_unlocked: boolean
  unlocked_at: string | null
  is_secret: boolean
  percentage_complete: number
}

/**
 * Type Achievement Stats
 */
export type AchievementStats = {
  total: number
  unlocked: number
  percentage: number
  points_total: number
  points_earned: number
  by_category: Record<
    AchievementCategory,
    { total: number; unlocked: number }
  >
  by_rarity: Record<
    AchievementRarity,
    { total: number; unlocked: number }
  >
}

/**
 * Type Achievement Unlock Result
 */
export type AchievementUnlockResult = {
  success: boolean
  achievement_id: string
  achievement_code: string
  achievement_name: string
  achievement_description?: string
  progress: number
  requirement: number
  unlocked: boolean
  already_unlocked?: boolean
  xp_gained: number
  rarity: AchievementRarity
  icon: string
  points?: number
}

/**
 * Type Check Achievements Result
 */
export type CheckAchievementsResult = {
  success: boolean
  unlocked_count: number
  unlocked_achievements: AchievementUnlockResult[]
}

/* ==========================================================================
   ICON MAPPING
   ========================================================================== */

export const ACHIEVEMENT_ICONS = {
  // Participation
  'ticket': 'Ticket',
  'party-popper': 'PartyPopper',
  'calendar': 'Calendar',
  'star': 'Star',
  'crown': 'Crown',
  'trophy': 'Trophy',
  'medal': 'Medal',
  'compass': 'Compass',
  'globe': 'Globe',
  'sunrise': 'Sunrise',
  'clock': 'Clock',
  'flag': 'Flag',
  'moon': 'Moon',

  // Social
  'user-plus': 'UserPlus',
  'users': 'Users',
  'megaphone': 'Megaphone',
  'share-2': 'Share2',
  'share': 'Share',
  'user-check': 'UserCheck',

  // Challenges
  'target': 'Target',
  'award': 'Award',
  'book': 'Book',
  'dumbbell': 'Dumbbell',
  'palette': 'Palette',
  'layers': 'Layers',
  'check-circle': 'CheckCircle',
  'calendar-check': 'CalendarCheck',

  // Streaks
  'flame': 'Flame',
  'refresh-cw': 'RefreshCw',

  // Loyalty
  'zap': 'Zap',
  'trending-up': 'TrendingUp',
  'heart': 'Heart',

  // Special
  'shield': 'Shield',
  'bug': 'Bug',
  'milestone': 'Milestone',
  'ghost': 'Ghost',
  'sparkles': 'Sparkles',
  'sun': 'Sun',
} as const

export type AchievementIconKey = keyof typeof ACHIEVEMENT_ICONS
