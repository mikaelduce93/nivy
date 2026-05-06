/**
 * TEENS PARTY MOROCCO - Missions System Schema
 * =============================================
 *
 * Définitions Zod et types TypeScript pour le système de missions.
 */

import { z } from "zod"

/* ==========================================================================
   ENUMS
   ========================================================================== */

export const MissionTypeEnum = z.enum(["daily", "weekly", "monthly", "seasonal"])
export type MissionType = z.infer<typeof MissionTypeEnum>

export const MissionCategoryEnum = z.enum([
  "participation",
  "social",
  "challenge",
  "event",
  "streak",
  "special",
])
export type MissionCategory = z.infer<typeof MissionCategoryEnum>

export const MissionStatusEnum = z.enum([
  "active",
  "completed",
  "claimed",
  "expired",
])
export type MissionStatus = z.infer<typeof MissionStatusEnum>

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

export const MISSION_TYPE_CONFIG: Record<
  MissionType,
  {
    label: string
    shortLabel: string
    color: string
    bgColor: string
    gradient: string
    icon: string
    resetText: string
  }
> = {
  daily: {
    label: "Quotidienne",
    shortLabel: "Jour",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    gradient: "from-green-400 to-emerald-500",
    icon: "sun",
    resetText: "Se réinitialise chaque jour",
  },
  weekly: {
    label: "Hebdomadaire",
    shortLabel: "Semaine",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    gradient: "from-blue-400 to-cyan-500",
    icon: "calendar",
    resetText: "Se réinitialise chaque lundi",
  },
  monthly: {
    label: "Mensuelle",
    shortLabel: "Mois",
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    gradient: "from-purple-400 to-pink-500",
    icon: "calendar-days",
    resetText: "Se réinitialise chaque mois",
  },
  seasonal: {
    label: "Saisonnière",
    shortLabel: "Saison",
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    gradient: "from-orange-400 to-red-500",
    icon: "sparkles",
    resetText: "Disponible pendant un temps limité",
  },
}

export const MISSION_CATEGORY_CONFIG: Record<
  MissionCategory,
  {
    label: string
    icon: string
    color: string
  }
> = {
  participation: {
    label: "Participation",
    icon: "ticket",
    color: "text-cyan-400",
  },
  social: {
    label: "Social",
    icon: "users",
    color: "text-pink-400",
  },
  challenge: {
    label: "Défi",
    icon: "target",
    color: "text-yellow-400",
  },
  event: {
    label: "Événement",
    icon: "calendar-check",
    color: "text-green-400",
  },
  streak: {
    label: "Régularité",
    icon: "flame",
    color: "text-orange-400",
  },
  special: {
    label: "Spécial",
    icon: "star",
    color: "text-purple-400",
  },
}

/* ==========================================================================
   MISSION TEMPLATE SCHEMA
   ========================================================================== */

export const MissionTemplateSchema = z.object({
  id: z.string().uuid(),
  type: MissionTypeEnum,
  category: MissionCategoryEnum,
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  xp_reward: z.number().int().positive(),
  bonus_reward: z
    .object({
      type: z.enum(["badge", "ticket", "multiplier", "item"]),
      value: z.string(),
      quantity: z.number().optional(),
    })
    .nullable(),
  target_count: z.number().int().positive(),
  trigger_type: z.string(),
  trigger_conditions: z.record(z.unknown()).nullable(),
  is_active: z.boolean(),
  start_date: z.string().datetime().nullable(),
  end_date: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
})

export type MissionTemplate = z.infer<typeof MissionTemplateSchema>

/* ==========================================================================
   USER MISSION SCHEMA
   ========================================================================== */

export const UserMissionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  mission_id: z.string().uuid(),
  status: MissionStatusEnum,
  current_progress: z.number().int().min(0),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable(),
  claimed_at: z.string().datetime().nullable(),
  expires_at: z.string().datetime().nullable(),
  // Joined from mission template
  mission: MissionTemplateSchema.optional(),
})

export type UserMission = z.infer<typeof UserMissionSchema>

/* ==========================================================================
   MISSION WITH PROGRESS (pour l'affichage)
   ========================================================================== */

export const MissionWithProgressSchema = z.object({
  id: z.string().uuid(),
  user_mission_id: z.string().uuid().nullable(),
  type: MissionTypeEnum,
  category: MissionCategoryEnum,
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  xp_reward: z.number(),
  bonus_reward: z
    .object({
      type: z.enum(["badge", "ticket", "multiplier", "item"]),
      value: z.string(),
      quantity: z.number().optional(),
    })
    .nullable(),
  target_count: z.number(),
  current_progress: z.number(),
  status: MissionStatusEnum,
  progress_percentage: z.number(),
  time_remaining: z.string().nullable(),
  expires_at: z.string().datetime().nullable(),
  is_new: z.boolean(),
})

export type MissionWithProgress = z.infer<typeof MissionWithProgressSchema>

/* ==========================================================================
   MISSION STATS SCHEMA
   ========================================================================== */

export const MissionStatsSchema = z.object({
  total_completed: z.number(),
  total_xp_earned: z.number(),
  daily_completed: z.number(),
  weekly_completed: z.number(),
  monthly_completed: z.number(),
  seasonal_completed: z.number(),
  current_daily_streak: z.number(),
  best_daily_streak: z.number(),
  completion_rate: z.number(),
  missions_by_category: z.record(z.number()),
})

export type MissionStats = z.infer<typeof MissionStatsSchema>

/* ==========================================================================
   INPUT SCHEMAS
   ========================================================================== */

export const GetMissionsInputSchema = z.object({
  type: MissionTypeEnum.optional(),
  category: MissionCategoryEnum.optional(),
  status: MissionStatusEnum.optional(),
  includeExpired: z.boolean().optional().default(false),
})

// Use z.input so optional defaults stay optional for callers; the parsed
// (output) type with required defaults is z.infer<>.
export type GetMissionsInput = z.input<typeof GetMissionsInputSchema>

export const UpdateMissionProgressInputSchema = z.object({
  missionId: z.string().uuid(),
  progress: z.number().int().min(0),
  incrementBy: z.number().int().optional(),
})

export type UpdateMissionProgressInput = z.infer<
  typeof UpdateMissionProgressInputSchema
>

export const ClaimMissionRewardInputSchema = z.object({
  userMissionId: z.string().uuid(),
})

export type ClaimMissionRewardInput = z.infer<
  typeof ClaimMissionRewardInputSchema
>

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/**
 * Calcule le temps restant avant expiration
 */
export function getTimeRemaining(expiresAt: string | null): string | null {
  if (!expiresAt) return null

  const now = new Date()
  const expiry = new Date(expiresAt)
  const diff = expiry.getTime() - now.getTime()

  if (diff <= 0) return "Expiré"

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return `${days}j ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

/**
 * Calcule le pourcentage de progression
 */
export function calculateProgressPercentage(
  current: number,
  target: number
): number {
  if (target <= 0) return 0
  return Math.min(100, Math.round((current / target) * 100))
}

/**
 * Détermine si une mission est nouvelle (assignée dans les dernières 24h)
 */
export function isMissionNew(startedAt: string): boolean {
  const started = new Date(startedAt)
  const now = new Date()
  const diff = now.getTime() - started.getTime()
  return diff < 24 * 60 * 60 * 1000
}

/**
 * Formate la récompense bonus pour l'affichage
 */
export function formatBonusReward(
  bonus: MissionWithProgress["bonus_reward"]
): string | null {
  if (!bonus) return null

  switch (bonus.type) {
    case "badge":
      return `Badge: ${bonus.value}`
    case "ticket":
      return `${bonus.quantity || 1} Ticket${(bonus.quantity || 1) > 1 ? "s" : ""}`
    case "multiplier":
      return `×${bonus.value} XP pendant 1h`
    case "item":
      return bonus.value
    default:
      return null
  }
}

/**
 * Trie les missions par priorité
 */
export function sortMissionsByPriority(
  missions: MissionWithProgress[]
): MissionWithProgress[] {
  const statusPriority: Record<MissionStatus, number> = {
    completed: 0, // À réclamer en premier
    active: 1,
    claimed: 2,
    expired: 3,
  }

  const typePriority: Record<MissionType, number> = {
    daily: 0,
    weekly: 1,
    monthly: 2,
    seasonal: 3,
  }

  return [...missions].sort((a, b) => {
    // D'abord par statut
    const statusDiff = statusPriority[a.status] - statusPriority[b.status]
    if (statusDiff !== 0) return statusDiff

    // Ensuite par progression (les plus proches de complétion d'abord)
    if (a.status === "active" && b.status === "active") {
      const progressDiff = b.progress_percentage - a.progress_percentage
      if (Math.abs(progressDiff) > 10) return progressDiff
    }

    // Ensuite par type
    return typePriority[a.type] - typePriority[b.type]
  })
}

/**
 * Groupe les missions par type
 */
export function groupMissionsByType(
  missions: MissionWithProgress[]
): Record<MissionType, MissionWithProgress[]> {
  const grouped: Record<MissionType, MissionWithProgress[]> = {
    daily: [],
    weekly: [],
    monthly: [],
    seasonal: [],
  }

  for (const mission of missions) {
    grouped[mission.type].push(mission)
  }

  return grouped
}

/**
 * Compte les missions par statut
 */
export function countMissionsByStatus(
  missions: MissionWithProgress[]
): Record<MissionStatus, number> {
  const counts: Record<MissionStatus, number> = {
    active: 0,
    completed: 0,
    claimed: 0,
    expired: 0,
  }

  for (const mission of missions) {
    counts[mission.status]++
  }

  return counts
}
