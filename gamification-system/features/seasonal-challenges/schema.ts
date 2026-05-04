/**
 * TEENS PARTY MOROCCO - Seasonal Challenges Schema
 * =================================================
 *
 * Types et schémas Zod pour les défis saisonniers et calendrier de l'Avent.
 */

import { z } from "zod"

/* ==========================================================================
   ENUMS
   ========================================================================== */

export const SeasonSlugEnum = z.enum([
  "winter_2024",
  "spring_2025",
  "summer_2025",
  "fall_2025",
])

export const ChallengeTypeEnum = z.enum([
  "daily",
  "weekly",
  "seasonal",
  "special",
])

export const ChallengeCategoryEnum = z.enum([
  "social",
  "event",
  "engagement",
  "creative",
  "collection",
])

export const SeasonalProgressStatusEnum = z.enum([
  "locked",
  "available",
  "in_progress",
  "completed",
  "claimed",
])

export const RewardTypeEnum = z.enum([
  "xp",
  "coins",
  "badge",
  "item",
  "mystery_box",
  "special",
])

export const AdventThemeEnum = z.enum([
  "christmas",
  "new_year",
  "winter",
])

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

export const SEASON_CONFIG: Record<
  string,
  {
    name: string
    icon: string
    color: string
    gradient: string
    emoji: string
  }
> = {
  winter: {
    name: "Hiver",
    icon: "Snowflake",
    color: "#60A5FA",
    gradient: "from-blue-500/20 to-cyan-500/20",
    emoji: "❄️",
  },
  spring: {
    name: "Printemps",
    icon: "Flower",
    color: "#34D399",
    gradient: "from-green-500/20 to-emerald-500/20",
    emoji: "🌸",
  },
  summer: {
    name: "Été",
    icon: "Sun",
    color: "#FBBF24",
    gradient: "from-yellow-500/20 to-orange-500/20",
    emoji: "☀️",
  },
  fall: {
    name: "Automne",
    icon: "Leaf",
    color: "#F97316",
    gradient: "from-orange-500/20 to-red-500/20",
    emoji: "🍂",
  },
}

export const CHALLENGE_TYPE_CONFIG: Record<
  string,
  {
    label: string
    description: string
    icon: string
    color: string
  }
> = {
  daily: {
    label: "Quotidien",
    description: "Se réinitialise chaque jour",
    icon: "Calendar",
    color: "text-cyan-400",
  },
  weekly: {
    label: "Hebdomadaire",
    description: "Se réinitialise chaque semaine",
    icon: "CalendarDays",
    color: "text-purple-400",
  },
  seasonal: {
    label: "Saisonnier",
    description: "Disponible toute la saison",
    icon: "Trophy",
    color: "text-yellow-400",
  },
  special: {
    label: "Spécial",
    description: "Événement limité",
    icon: "Star",
    color: "text-pink-400",
  },
}

export const CHALLENGE_CATEGORY_CONFIG: Record<
  string,
  {
    label: string
    icon: string
    color: string
  }
> = {
  social: {
    label: "Social",
    icon: "Users",
    color: "text-cyan-400",
  },
  event: {
    label: "Événement",
    icon: "Calendar",
    color: "text-purple-400",
  },
  engagement: {
    label: "Engagement",
    icon: "Heart",
    color: "text-pink-400",
  },
  creative: {
    label: "Créatif",
    icon: "Sparkles",
    color: "text-yellow-400",
  },
  collection: {
    label: "Collection",
    icon: "Layers",
    color: "text-green-400",
  },
}

export const REWARD_TYPE_CONFIG: Record<
  string,
  {
    label: string
    icon: string
    color: string
  }
> = {
  xp: {
    label: "XP",
    icon: "Zap",
    color: "text-yellow-400",
  },
  coins: {
    label: "Pièces",
    icon: "Coins",
    color: "text-amber-400",
  },
  badge: {
    label: "Badge",
    icon: "Award",
    color: "text-purple-400",
  },
  item: {
    label: "Objet",
    icon: "Gift",
    color: "text-pink-400",
  },
  mystery_box: {
    label: "Boîte Mystère",
    icon: "Package",
    color: "text-cyan-400",
  },
  special: {
    label: "Spécial",
    icon: "Crown",
    color: "text-amber-400",
  },
}

/* ==========================================================================
   SCHEMAS
   ========================================================================== */

// Saison
export const SeasonSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  theme_color: z.string(),
  icon: z.string().nullable(),
  start_date: z.string(),
  end_date: z.string(),
  is_active: z.boolean(),
  days_remaining: z.number().optional(),
  created_at: z.string(),
})

// Défi saisonnier
export const SeasonalChallengeSchema = z.object({
  id: z.string().uuid(),
  season_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  challenge_type: ChallengeTypeEnum,
  category: ChallengeCategoryEnum,
  icon: z.string().nullable(),
  color: z.string(),
  xp_reward: z.number(),
  bonus_xp: z.number().nullable(),
  target_count: z.number(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  day_number: z.number().nullable(),
  reward_type: RewardTypeEnum.nullable(),
  reward_data: z.any().nullable(),
  is_premium: z.boolean(),
  sort_order: z.number(),
  is_active: z.boolean(),
  created_at: z.string(),
})

// Progression utilisateur
export const SeasonalProgressSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  seasonal_challenge_id: z.string().uuid(),
  current_count: z.number(),
  status: SeasonalProgressStatusEnum,
  unlocked_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  claimed_at: z.string().nullable(),
  xp_earned: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
})

// Calendrier de l'Avent
export const AdventCalendarSchema = z.object({
  id: z.string().uuid(),
  year: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  theme: AdventThemeEnum,
  start_date: z.string(),
  end_date: z.string(),
  total_days: z.number(),
  bonus_reward_day: z.number(),
  bonus_reward: z.any().nullable(),
  is_active: z.boolean(),
  current_day: z.number().optional(),
  created_at: z.string(),
})

// Case du calendrier
export const AdventDaySchema = z.object({
  id: z.string().uuid(),
  advent_calendar_id: z.string().uuid(),
  day_number: z.number(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  reward_type: RewardTypeEnum,
  reward_amount: z.number(),
  reward_data: z.any().nullable(),
  icon: z.string().nullable(),
  is_premium: z.boolean(),
  is_bonus: z.boolean(),
  is_unlocked: z.boolean().optional(),
  created_at: z.string(),
})

// Progression Avent utilisateur
export const UserAdventProgressSchema = z.object({
  day_number: z.number(),
  opened_at: z.string(),
  reward_claimed: z.boolean(),
  challenge_completed: z.boolean(),
  xp_earned: z.number(),
})

// Récompense saisonnière
export const SeasonalRewardSchema = z.object({
  id: z.string().uuid(),
  season_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  reward_type: RewardTypeEnum,
  reward_data: z.any().nullable(),
  required_challenges: z.number(),
  required_points: z.number(),
  icon: z.string().nullable(),
  rarity: z.enum(["common", "rare", "epic", "legendary"]),
  is_limited: z.boolean(),
  max_claims: z.number().nullable(),
  current_claims: z.number(),
  is_active: z.boolean(),
  created_at: z.string(),
})

/* ==========================================================================
   TYPES
   ========================================================================== */

export type Season = z.infer<typeof SeasonSchema>
export type SeasonalChallenge = z.infer<typeof SeasonalChallengeSchema>
export type SeasonalProgress = z.infer<typeof SeasonalProgressSchema>
export type AdventCalendar = z.infer<typeof AdventCalendarSchema>
export type AdventDay = z.infer<typeof AdventDaySchema>
export type UserAdventProgress = z.infer<typeof UserAdventProgressSchema>
export type SeasonalReward = z.infer<typeof SeasonalRewardSchema>

/* ==========================================================================
   TYPES ENRICHIS
   ========================================================================== */

export interface SeasonalChallengeWithProgress extends SeasonalChallenge {
  user_progress?: {
    status: string
    current_count: number
    completed_at: string | null
    claimed_at: string | null
    xp_earned: number
  }
  progress_percentage: number
  is_available: boolean
}

export interface SeasonWithChallenges extends Season {
  challenges: SeasonalChallengeWithProgress[]
  stats: {
    total_challenges: number
    completed: number
    total_xp_earned: number
  }
}

export interface AdventCalendarWithProgress extends AdventCalendar {
  days: AdventDay[]
  user_progress: UserAdventProgress[]
  stats: {
    days_opened: number
    total_xp_earned: number
    current_streak: number
    completion_percentage: number
  }
}

export interface AdventDayReward {
  type: string
  amount: number
  title: string
  description: string
  icon: string
  data?: any
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

/**
 * Détermine la saison actuelle basée sur la date
 */
export function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1 // 1-12

  if (month >= 3 && month <= 5) return "spring"
  if (month >= 6 && month <= 8) return "summer"
  if (month >= 9 && month <= 11) return "fall"
  return "winter"
}

/**
 * Obtient la configuration de la saison actuelle
 */
export function getCurrentSeasonConfig() {
  return SEASON_CONFIG[getCurrentSeason()]
}

/**
 * Calcule le pourcentage de progression
 */
export function calculateProgress(current: number, target: number): number {
  if (target <= 0) return 100
  return Math.min(100, Math.round((current / target) * 100))
}

/**
 * Vérifie si un jour du calendrier est débloqué
 */
export function isDayUnlocked(
  dayNumber: number,
  calendarStartDate: string
): boolean {
  const start = new Date(calendarStartDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  start.setHours(0, 0, 0, 0)

  const daysSinceStart = Math.floor(
    (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  )

  return dayNumber <= daysSinceStart + 1
}

/**
 * Calcule les jours restants dans la saison
 */
export function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate)
  const today = new Date()
  const diff = end.getTime() - today.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

/**
 * Formate le temps restant
 */
export function formatTimeRemaining(endDate: string): string {
  const days = getDaysRemaining(endDate)

  if (days === 0) return "Dernier jour !"
  if (days === 1) return "1 jour restant"
  if (days < 7) return `${days} jours restants`
  if (days < 30) return `${Math.ceil(days / 7)} semaines restantes`
  return `${Math.ceil(days / 30)} mois restants`
}

/**
 * Groupe les défis par type
 */
export function groupChallengesByType(
  challenges: SeasonalChallengeWithProgress[]
): Record<string, SeasonalChallengeWithProgress[]> {
  return challenges.reduce(
    (acc, challenge) => {
      const type = challenge.challenge_type
      if (!acc[type]) acc[type] = []
      acc[type].push(challenge)
      return acc
    },
    {} as Record<string, SeasonalChallengeWithProgress[]>
  )
}

/**
 * Groupe les défis par catégorie
 */
export function groupChallengesByCategory(
  challenges: SeasonalChallengeWithProgress[]
): Record<string, SeasonalChallengeWithProgress[]> {
  return challenges.reduce(
    (acc, challenge) => {
      const category = challenge.category
      if (!acc[category]) acc[category] = []
      acc[category].push(challenge)
      return acc
    },
    {} as Record<string, SeasonalChallengeWithProgress[]>
  )
}

/**
 * Trie les défis par priorité (disponibles et presque complétés d'abord)
 */
export function sortChallengesByPriority(
  challenges: SeasonalChallengeWithProgress[]
): SeasonalChallengeWithProgress[] {
  return [...challenges].sort((a, b) => {
    // Complétés non réclamés d'abord
    const aClaimable =
      a.user_progress?.status === "completed" && !a.user_progress?.claimed_at
    const bClaimable =
      b.user_progress?.status === "completed" && !b.user_progress?.claimed_at
    if (aClaimable && !bClaimable) return -1
    if (bClaimable && !aClaimable) return 1

    // En cours avec haute progression
    const aProgress = a.progress_percentage
    const bProgress = b.progress_percentage
    if (aProgress >= 80 && bProgress < 80) return -1
    if (bProgress >= 80 && aProgress < 80) return 1

    // Disponibles avant verrouillés
    if (a.is_available && !b.is_available) return -1
    if (b.is_available && !a.is_available) return 1

    // Par XP décroissant
    return b.xp_reward - a.xp_reward
  })
}

/**
 * Calcule la série de jours consécutifs ouverts
 */
export function calculateAdventStreak(
  progress: UserAdventProgress[],
  currentDay: number
): number {
  if (!progress.length) return 0

  const openedDays = new Set(progress.map((p) => p.day_number))
  let streak = 0

  for (let day = currentDay; day >= 1; day--) {
    if (openedDays.has(day)) {
      streak++
    } else {
      break
    }
  }

  return streak
}

/**
 * Obtient le message de récompense basé sur le type
 */
export function getRewardMessage(
  type: string,
  amount: number
): { title: string; subtitle: string; emoji: string } {
  switch (type) {
    case "xp":
      return {
        title: `+${amount} XP`,
        subtitle: "Points d'expérience bonus !",
        emoji: "⚡",
      }
    case "coins":
      return {
        title: `+${amount} Pièces`,
        subtitle: "À dépenser dans la boutique !",
        emoji: "🪙",
      }
    case "badge":
      return {
        title: "Nouveau Badge !",
        subtitle: "Un badge exclusif pour toi",
        emoji: "🏆",
      }
    case "item":
      return {
        title: "Nouvel Objet !",
        subtitle: "Un objet rare à collectionner",
        emoji: "🎁",
      }
    case "mystery_box":
      return {
        title: "Boîte Mystère !",
        subtitle: "Qu'y a-t-il dedans ?",
        emoji: "📦",
      }
    case "special":
      return {
        title: "Récompense Spéciale !",
        subtitle: "Quelque chose d'unique",
        emoji: "👑",
      }
    default:
      return {
        title: "Récompense !",
        subtitle: "Tu as gagné quelque chose",
        emoji: "🎉",
      }
  }
}

/**
 * Génère les emojis pour chaque jour du calendrier de l'Avent
 */
export function getAdventDayEmoji(dayNumber: number): string {
  const emojis = [
    "🎄", "⭐", "🎁", "🔔", "❄️", "🦌", "🎅", "🤶",
    "⛄", "🕯️", "🎶", "🍪", "🥛", "🧦", "🛷", "🎿",
    "🌟", "🎉", "🎊", "✨", "💫", "🌙", "🎭", "👑",
  ]
  return emojis[(dayNumber - 1) % emojis.length]
}
