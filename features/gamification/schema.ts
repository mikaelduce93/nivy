/**
 * TEENS PARTY MOROCCO - Gamification Domain Schemas
 * =================================================
 *
 * Schémas Zod pour la validation du système de gamification.
 */

import { z } from 'zod'

/* ==========================================================================
   ENUMS & CONSTANTS
   ========================================================================== */

export const ChallengeCategoryEnum = z.enum(['school', 'sport', 'crea'])
export type ChallengeCategory = z.infer<typeof ChallengeCategoryEnum>

export const ChallengeStatusEnum = z.enum(['pending', 'completed', 'skipped'])
export type ChallengeStatus = z.infer<typeof ChallengeStatusEnum>

export const ValidationTypeEnum = z.enum([
  'timer',
  'self_report',
  'upload_photo',
  'checklist',
])
export type ValidationType = z.infer<typeof ValidationTypeEnum>

/* ==========================================================================
   INPUT SCHEMAS
   ========================================================================== */

/**
 * Schéma pour récupérer les XP d'un teen
 */
export const getTeenXPSchema = z.object({
  teenId: z.string().uuid('ID adolescent invalide'),
})

export type GetTeenXPInput = z.infer<typeof getTeenXPSchema>

/**
 * Schéma pour récupérer l'historique XP
 */
export const getXPHistorySchema = z.object({
  teenId: z.string().uuid('ID adolescent invalide'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20),
})

export type GetXPHistoryInput = z.infer<typeof getXPHistorySchema>

/**
 * Schéma pour ajouter des XP
 */
export const addXPSchema = z.object({
  teenId: z.string().uuid('ID adolescent invalide'),
  xpAmount: z
    .number()
    .int('XP doit être un entier')
    .min(1, 'XP minimum: 1')
    .max(1000, 'XP maximum: 1000'),
  reason: z
    .string()
    .min(3, 'Raison trop courte')
    .max(100, 'Raison trop longue'),
  data: z
    .object({
      reference_type: z.string().optional(),
      reference_id: z.string().uuid().optional(),
    })
    .optional(),
})

export type AddXPInput = z.infer<typeof addXPSchema>

/**
 * Schéma pour récupérer le streak
 */
export const getStreakSchema = z.object({
  teenId: z.string().uuid('ID adolescent invalide'),
})

export type GetStreakInput = z.infer<typeof getStreakSchema>

/**
 * Schéma pour récupérer les templates de défis
 */
export const getChallengeTemplatesSchema = z.object({
  category: ChallengeCategoryEnum.optional(),
})

export type GetChallengeTemplatesInput = z.infer<typeof getChallengeTemplatesSchema>

/**
 * Schéma pour récupérer les défis du jour
 */
export const getDailyChallengesSchema = z.object({
  teenId: z.string().uuid('ID adolescent invalide'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)')
    .optional(),
})

export type GetDailyChallengesInput = z.infer<typeof getDailyChallengesSchema>

/**
 * Schéma pour assigner les défis du jour
 */
export const assignDailyChallengesSchema = z.object({
  teenId: z.string().uuid('ID adolescent invalide'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)')
    .optional(),
})

export type AssignDailyChallengesInput = z.infer<typeof assignDailyChallengesSchema>

/**
 * Schéma pour compléter un défi
 */
export const completeChallengeSchema = z.object({
  challengeId: z.string().uuid('ID défi invalide'),
  teenId: z.string().uuid('ID adolescent invalide'),
  validationData: z.any().optional(),
})

export type CompleteChallengeInput = z.infer<typeof completeChallengeSchema>

/**
 * Schéma pour passer un défi
 */
export const skipChallengeSchema = z.object({
  challengeId: z.string().uuid('ID défi invalide'),
  teenId: z.string().uuid('ID adolescent invalide'),
})

export type SkipChallengeInput = z.infer<typeof skipChallengeSchema>

/**
 * Schéma pour récupérer les stats gamification
 */
export const getGamificationStatsSchema = z.object({
  teenId: z.string().uuid('ID adolescent invalide'),
})

export type GetGamificationStatsInput = z.infer<typeof getGamificationStatsSchema>

/**
 * Schéma pour le leaderboard
 */
export const getLeaderboardSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(10),
})

export type GetLeaderboardInput = z.infer<typeof getLeaderboardSchema>

/**
 * Schéma pour créer un template de défi (admin)
 */
export const createChallengeTemplateSchema = z.object({
  category: ChallengeCategoryEnum,
  title: z
    .string()
    .min(5, 'Titre trop court')
    .max(100, 'Titre trop long'),
  description: z
    .string()
    .max(500, 'Description trop longue')
    .optional(),
  xp_reward: z
    .number()
    .int('XP doit être un entier')
    .min(1, 'XP minimum: 1')
    .max(500, 'XP maximum: 500'),
  validation_type: ValidationTypeEnum,
  validation_data: z.any().optional(),
})

export type CreateChallengeTemplateInput = z.infer<typeof createChallengeTemplateSchema>

/**
 * Schéma pour mettre à jour un template de défi (admin)
 */
export const updateChallengeTemplateSchema = z.object({
  id: z.string().uuid('ID invalide'),
  title: z.string().min(5).max(100).optional(),
  description: z.string().max(500).optional(),
  xp_reward: z.number().int().min(1).max(500).optional(),
  validation_type: ValidationTypeEnum.optional(),
  validation_data: z.any().optional(),
  is_active: z.boolean().optional(),
})

export type UpdateChallengeTemplateInput = z.infer<typeof updateChallengeTemplateSchema>

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
 * Type XP Profile
 */
export type UserXP = {
  id: string
  teen_id: string
  total_xp: number
  level: number
  xp_to_next_level: number
  created_at: string
  updated_at: string
}

/**
 * Type XP Ledger Entry
 */
export type XPLedgerEntry = {
  id: string
  teen_id: string
  xp_amount: number
  action_type: string
  reference_type: string | null
  reference_id: string | null
  created_at: string
}

/**
 * Type Streak
 */
export type UserStreak = {
  id: string
  teen_id: string
  current_streak: number
  longest_streak: number
  last_activity_date: string | null
  created_at: string
  updated_at: string
}

/**
 * Type Challenge Template
 */
export type ChallengeTemplate = {
  id: string
  category: ChallengeCategory
  title: string
  description: string | null
  xp_reward: number
  validation_type: ValidationType
  validation_data: any | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Type User Challenge
 */
export type UserChallenge = {
  id: string
  teen_id: string
  challenge_id: string
  challenge_date: string
  status: ChallengeStatus
  completed_at: string | null
  xp_earned: number | null
  validation_data: any | null
  created_at: string
  challenge?: ChallengeTemplate
}

/**
 * Type Gamification Stats
 */
export type GamificationStats = {
  xp: UserXP | null
  streak: UserStreak | null
  total_challenges_completed: number
  today_challenges: UserChallenge[]
}

/**
 * Type Leaderboard Entry
 */
export type LeaderboardEntry = {
  id: string
  teen_id: string
  total_xp: number
  level: number
  teen: {
    pseudo: string
    avatar_url: string | null
  }
}
