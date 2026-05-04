/**
 * TEENS PARTY MOROCCO - Onboarding Gamification Schema
 * ====================================================
 *
 * Types et schémas Zod pour le système d'onboarding gamifié.
 */

import { z } from 'zod'

/* ==========================================================================
   ENUMS & CONSTANTS
   ========================================================================== */

export const ONBOARDING_STEPS = [
  'welcome',
  'showcase',
  'profile-type',
  'parent-setup',
  'teen-setup',
  'features',
  'completion',
] as const

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

export const USER_TYPES = ['parent', 'teen'] as const
export type UserType = (typeof USER_TYPES)[number]

// XP rewards per step
export const STEP_XP_REWARDS: Record<string, number> = {
  welcome: 10,
  showcase: 15,
  'profile-type': 20,
  'parent-setup': 30,
  'teen-setup': 30,
  features: 25,
  completion: 50,
}

// Total possible XP
export const TOTAL_ONBOARDING_XP = Object.values(STEP_XP_REWARDS).reduce(
  (a, b) => a + b,
  0
)

// Badges
export const ONBOARDING_BADGES = {
  starter: 'onboarding_starter',
  curious: 'onboarding_curious',
  speedrunner: 'onboarding_speedrunner',
} as const

/* ==========================================================================
   INPUT SCHEMAS
   ========================================================================== */

export const initOnboardingSchema = z.object({
  tempUserId: z.string().uuid('ID temporaire invalide'),
})

export const recordStepSchema = z.object({
  tempUserId: z.string().uuid('ID temporaire invalide'),
  step: z.enum([
    'welcome',
    'showcase',
    'profile-type',
    'parent-setup',
    'teen-setup',
    'features',
    'completion',
  ]),
  userType: z.enum(['parent', 'teen']).optional(),
})

export const syncToUserSchema = z.object({
  tempUserId: z.string().uuid('ID temporaire invalide'),
  teenId: z.string().uuid('ID teen invalide'),
})

export const getProgressSchema = z.object({
  tempUserId: z.string().uuid('ID temporaire invalide'),
})

/* ==========================================================================
   OUTPUT TYPES
   ========================================================================== */

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface OnboardingProgressData {
  tempUserId: string
  steps: {
    welcome: boolean
    showcase: boolean
    profile_type: boolean
    setup: boolean
    features: boolean
    completion: boolean
  }
  accumulatedXp: number
  earnedBadges: string[]
  bonusCoins: number
  userType: UserType | null
  startedAt: string
  completedAt: string | null
  isSynced: boolean
}

export interface StepCompletionResult {
  step: string
  xpGained: number
  totalXp: number
  earnedBadges: string[]
  bonusCoins: number
  isSpeedrunner?: boolean
}

export interface SyncResult {
  teenId: string
  xpSynced: number
  coinsSynced: number
  badgesSynced: string[]
}

/* ==========================================================================
   INPUT TYPES (inferred)
   ========================================================================== */

export type InitOnboardingInput = z.infer<typeof initOnboardingSchema>
export type RecordStepInput = z.infer<typeof recordStepSchema>
export type SyncToUserInput = z.infer<typeof syncToUserSchema>
export type GetProgressInput = z.infer<typeof getProgressSchema>

/* ==========================================================================
   DISPLAY HELPERS
   ========================================================================== */

export const STEP_DISPLAY_INFO: Record<
  string,
  { name: string; description: string; icon: string }
> = {
  welcome: {
    name: 'Premier Contact',
    description: 'Commence ton aventure',
    icon: 'hand-wave',
  },
  showcase: {
    name: 'Explorateur',
    description: 'Découvre les activités',
    icon: 'compass',
  },
  'profile-type': {
    name: 'Choix du Destin',
    description: 'Choisis ton profil',
    icon: 'git-branch',
  },
  'parent-setup': {
    name: 'Profil Parent',
    description: 'Configure ton compte',
    icon: 'user-check',
  },
  'teen-setup': {
    name: 'Profil Teen',
    description: 'Configure ton compte',
    icon: 'user-check',
  },
  features: {
    name: 'Maître des Features',
    description: 'Explore les fonctionnalités',
    icon: 'sparkles',
  },
  completion: {
    name: 'Bienvenue!',
    description: 'Tu fais partie de la famille',
    icon: 'party-popper',
  },
}

export const BADGE_DISPLAY_INFO: Record<
  string,
  { name: string; description: string; icon: string; rarity: string }
> = {
  onboarding_starter: {
    name: 'Nouveau Membre',
    description: 'Bienvenue dans la famille Teen Club!',
    icon: 'baby',
    rarity: 'common',
  },
  onboarding_curious: {
    name: 'Curieux',
    description: 'Tu as exploré toutes les fonctionnalités',
    icon: 'search',
    rarity: 'common',
  },
  onboarding_speedrunner: {
    name: 'Speed Runner',
    description: 'Onboarding complété en moins de 3 minutes!',
    icon: 'timer',
    rarity: 'rare',
  },
}
