'use server'

/**
 * TEENS PARTY MOROCCO - Onboarding Gamification Actions
 * =====================================================
 *
 * Server Actions pour le système d'onboarding gamifié.
 * Gère le tracking de progression avant création de compte.
 */

import { createClient } from '@/lib/supabase/server'
import {
  initOnboardingSchema,
  recordStepSchema,
  syncToUserSchema,
  getProgressSchema,
  STEP_XP_REWARDS,
  type InitOnboardingInput,
  type RecordStepInput,
  type SyncToUserInput,
  type GetProgressInput,
  type ActionResult,
  type OnboardingProgressData,
  type StepCompletionResult,
  type SyncResult,
} from './schema'

/* ==========================================================================
   HELPER: Get Supabase client
   ========================================================================== */

async function getSupabaseClient() {
  return await createClient()
}

/* ==========================================================================
   INIT ONBOARDING PROGRESS
   ========================================================================== */

/**
 * Initialise ou reprend le tracking d'onboarding pour un utilisateur anonyme
 */
export async function initOnboardingProgress(
  input: InitOnboardingInput
): Promise<ActionResult<{ action: 'created' | 'resumed'; progress: OnboardingProgressData | null }>> {
  try {
    const validation = initOnboardingSchema.safeParse(input)
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { tempUserId } = validation.data
    const supabase = await getSupabaseClient()

    const { data, error } = await supabase.rpc('init_onboarding_progress', {
      p_temp_user_id: tempUserId,
    })

    if (error) throw error

    const result = data as {
      success: boolean
      action: 'created' | 'resumed'
      progress: any
    }

    if (!result.success) {
      return { success: false, error: 'Failed to initialize onboarding' }
    }

    return {
      success: true,
      data: {
        action: result.action,
        progress: result.progress ? mapProgressData(result.progress) : null,
      },
    }
  } catch (error: any) {
    console.error('[onboarding/initProgress] Error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   RECORD STEP COMPLETION
   ========================================================================== */

/**
 * Enregistre la completion d'une étape et attribue les XP
 */
export async function recordStepCompletion(
  input: RecordStepInput
): Promise<ActionResult<StepCompletionResult>> {
  try {
    const validation = recordStepSchema.safeParse(input)
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { tempUserId, step, userType } = validation.data
    const supabase = await getSupabaseClient()

    // Get XP for this step
    const xpReward = STEP_XP_REWARDS[step] || 0

    const { data, error } = await supabase.rpc('record_onboarding_step', {
      p_temp_user_id: tempUserId,
      p_step: step,
      p_xp: xpReward,
      p_user_type: userType || null,
    })

    if (error) throw error

    const result = data as {
      success: boolean
      error?: string
      step: string
      xp_gained: number
      total_xp: number
      earned_badges: string[]
      bonus_coins: number
    }

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to record step' }
    }

    // Check for speedrunner badge
    const isSpeedrunner = result.earned_badges?.includes('onboarding_speedrunner')

    return {
      success: true,
      data: {
        step: result.step,
        xpGained: result.xp_gained,
        totalXp: result.total_xp,
        earnedBadges: result.earned_badges || [],
        bonusCoins: result.bonus_coins || 0,
        isSpeedrunner,
      },
    }
  } catch (error: any) {
    console.error('[onboarding/recordStep] Error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   GET PROGRESS
   ========================================================================== */

/**
 * Récupère la progression d'onboarding d'un utilisateur temporaire
 */
export async function getOnboardingProgress(
  input: GetProgressInput
): Promise<ActionResult<OnboardingProgressData | null>> {
  try {
    const validation = getProgressSchema.safeParse(input)
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { tempUserId } = validation.data
    const supabase = await getSupabaseClient()

    const { data, error } = await supabase.rpc('get_onboarding_progress', {
      p_temp_user_id: tempUserId,
    })

    if (error) throw error

    const result = data as { found: boolean; progress?: any }

    if (!result.found) {
      return { success: true, data: null }
    }

    return {
      success: true,
      data: mapProgressData(result.progress),
    }
  } catch (error: any) {
    console.error('[onboarding/getProgress] Error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   SYNC TO USER
   ========================================================================== */

/**
 * Synchronise la progression onboarding vers un compte utilisateur créé
 */
export async function syncOnboardingToUser(
  input: SyncToUserInput
): Promise<ActionResult<SyncResult>> {
  try {
    const validation = syncToUserSchema.safeParse(input)
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { tempUserId, teenId } = validation.data
    const supabase = await getSupabaseClient()

    const { data, error } = await supabase.rpc('sync_onboarding_to_user', {
      p_temp_user_id: tempUserId,
      p_teen_id: teenId,
    })

    if (error) throw error

    const result = data as {
      success: boolean
      error?: string
      teen_id: string
      xp_synced: number
      coins_synced: number
      badges_synced: string[]
    }

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to sync' }
    }

    return {
      success: true,
      data: {
        teenId: result.teen_id,
        xpSynced: result.xp_synced,
        coinsSynced: result.coins_synced,
        badgesSynced: result.badges_synced || [],
      },
    }
  } catch (error: any) {
    console.error('[onboarding/syncToUser] Error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   HELPER: Map progress data
   ========================================================================== */

function mapProgressData(raw: any): OnboardingProgressData {
  return {
    tempUserId: raw.temp_user_id,
    steps: {
      welcome: raw.steps?.welcome ?? false,
      showcase: raw.steps?.showcase ?? false,
      profile_type: raw.steps?.profile_type ?? false,
      setup: raw.steps?.setup ?? false,
      features: raw.steps?.features ?? false,
      completion: raw.steps?.completion ?? false,
    },
    accumulatedXp: raw.accumulated_xp ?? 0,
    earnedBadges: raw.earned_badges ?? [],
    bonusCoins: raw.bonus_coins ?? 0,
    userType: raw.user_type ?? null,
    startedAt: raw.started_at ?? new Date().toISOString(),
    completedAt: raw.completed_at ?? null,
    isSynced: raw.is_synced ?? false,
  }
}
