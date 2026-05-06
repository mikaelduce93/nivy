'use server'

/**
 * TEENS PARTY MOROCCO - Gamification Domain Actions
 * =================================================
 *
 * Server Actions pour le système de gamification.
 * Toutes les entrées sont validées avec Zod.
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { selectChallengeTemplate } from './smart-challenge-assignment'
import { pickDifficulty } from './adaptive-difficulty'
import {
  getTeenXPSchema,
  getXPHistorySchema,
  addXPSchema,
  getStreakSchema,
  getChallengeTemplatesSchema,
  getDailyChallengesSchema,
  assignDailyChallengesSchema,
  completeChallengeSchema,
  skipChallengeSchema,
  getGamificationStatsSchema,
  getLeaderboardSchema,
  createChallengeTemplateSchema,
  updateChallengeTemplateSchema,
  type AddXPInput,
  type CompleteChallengeInput,
  type CreateChallengeTemplateInput,
  type UpdateChallengeTemplateInput,
  type ActionResult,
  type UserXP,
  type XPLedgerEntry,
  type UserStreak,
  type ChallengeTemplate,
  type UserChallenge,
  type GamificationStats,
  type LeaderboardEntry,
  type ChallengeCategory,
} from './schema'

/* ==========================================================================
   HELPER: Get Supabase client
   ========================================================================== */

async function getSupabaseClient() {
  return await createClient()
}

/* ==========================================================================
   XP & NIVEAU
   ========================================================================== */

/**
 * Récupère le profil XP d'un ado
 */
export async function getTeenXP(teenId: string): Promise<ActionResult<UserXP>> {
  try {
    // Validate input
    const validation = getTeenXPSchema.safeParse({ teenId })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const supabase = await getSupabaseClient()

    const { data, error } = await supabase
      .from('user_xp')
      .select('*')
      .eq('teen_id', teenId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error

    // Create default profile if none exists
    if (!data) {
      const { data: newProfile, error: createError } = await supabase
        .from('user_xp')
        .insert({
          teen_id: teenId,
          total_xp: 0,
          level: 1,
          xp_to_next_level: 100,
        })
        .select()
        .single()

      if (createError) throw createError
      return { success: true, data: newProfile }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('[gamification/getTeenXP] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Récupère l'historique XP d'un ado
 */
export async function getTeenXPHistory(
  teenId: string,
  limit: number = 20
): Promise<ActionResult<XPLedgerEntry[]>> {
  try {
    // Validate input
    const validation = getXPHistorySchema.safeParse({ teenId, limit })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const supabase = await getSupabaseClient()

    const { data, error } = await supabase
      .from('xp_ledger')
      .select('*')
      .eq('teen_id', teenId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return { success: true, data: data ?? [] }
  } catch (error: any) {
    console.error('[gamification/getTeenXPHistory] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Ajoute XP à un ado
 */
export async function addXP(input: AddXPInput): Promise<ActionResult<any>> {
  try {
    // Validate input
    const validation = addXPSchema.safeParse(input)
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { teenId, xpAmount, reason, data } = validation.data
    const supabase = await getSupabaseClient()

    // Call PostgreSQL function register_user_action
    const { data: result, error } = await supabase.rpc('register_user_action', {
      p_teen_id: teenId,
      p_action_type: reason,
      p_xp_amount: xpAmount,
      p_data: data || {},
    })

    if (error) throw error

    revalidatePath('/daily')
    revalidatePath('/gamification')
    return { success: true, data: result }
  } catch (error: any) {
    console.error('[gamification/addXP] Error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   STREAKS
   ========================================================================== */

/**
 * Récupère le streak d'un ado
 */
export async function getTeenStreak(
  teenId: string
): Promise<ActionResult<UserStreak>> {
  try {
    // Validate input
    const validation = getStreakSchema.safeParse({ teenId })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const supabase = await getSupabaseClient()

    const { data, error } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('teen_id', teenId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error

    // Create default streak if none exists
    if (!data) {
      const { data: newStreak, error: createError } = await supabase
        .from('user_streaks')
        .insert({
          teen_id: teenId,
          current_streak: 0,
          longest_streak: 0,
          last_activity_date: null,
        })
        .select()
        .single()

      if (createError) throw createError
      return { success: true, data: newStreak }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('[gamification/getTeenStreak] Error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   DAILY CHALLENGES
   ========================================================================== */

/**
 * Récupère tous les templates de défis actifs
 */
export async function getChallengeTemplates(
  category?: ChallengeCategory
): Promise<ActionResult<ChallengeTemplate[]>> {
  try {
    // Validate input if provided
    if (category) {
      const validation = getChallengeTemplatesSchema.safeParse({ category })
      if (!validation.success) {
        return { success: false, error: validation.error.errors[0].message }
      }
    }

    const supabase = await getSupabaseClient()

    let query = supabase
      .from('challenges_templates')
      .select('*')
      .eq('is_active', true)
      .order('category, title')

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data: data ?? [] }
  } catch (error: any) {
    console.error('[gamification/getChallengeTemplates] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Récupère les défis du jour pour un ado
 */
export async function getDailyChallenges(
  teenId: string,
  date?: string
): Promise<ActionResult<UserChallenge[]>> {
  try {
    // Validate input
    const validation = getDailyChallengesSchema.safeParse({ teenId, date })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const supabase = await getSupabaseClient()
    const targetDate = date || new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('user_challenges')
      .select(`
        *,
        challenge:challenge_id (*)
      `)
      .eq('teen_id', teenId)
      .eq('challenge_date', targetDate)

    if (error) throw error

    // Assign challenges if none exist for today
    if (!data || data.length === 0) {
      return await assignDailyChallenges(teenId, targetDate)
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('[gamification/getDailyChallenges] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Assigne 3 défis aléatoires du jour (1 par catégorie)
 */
export async function assignDailyChallenges(
  teenId: string,
  date?: string
): Promise<ActionResult<UserChallenge[]>> {
  try {
    // Validate input
    const validation = assignDailyChallengesSchema.safeParse({ teenId, date })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const supabase = await getSupabaseClient()
    const targetDate = date || new Date().toISOString().split('T')[0]

    // Use Quest Recommender for intelligent assignment
    const { QuestRecommender } = await import('@/lib/gamification/quest-recommender')
    const recommendedQuests = await QuestRecommender.getRecommendations({
      teenId,
      date: targetDate,
      limit: 3
    })

    const challenges: UserChallenge[] = []

    // If recommender returns quests, use them
    if (recommendedQuests.length > 0) {
      for (const rec of recommendedQuests) {
        const { data: challenge, error: challengeError } = await supabase
          .from('user_challenges')
          .insert({
            teen_id: teenId,
            challenge_id: rec.questId,
            challenge_date: targetDate,
            status: 'pending',
            metadata: {
              reasons: rec.reasons,
              score: rec.score
            }
          })
          .select(`
            *,
            challenge:challenge_id (*)
          `)
          .single()

        if (challengeError) {
          // Ignore unique constraint error
          if (challengeError.code !== '23505') throw challengeError
        } else {
          challenges.push(challenge)
        }
      }
      return { success: true, data: challenges }
    }

    // Fallback: smart selection (crypto RNG, anti-repetition, personalisation)
    // Recupere profils + interets de l'ado pour personnaliser
    const { data: teen } = await supabase
      .from('teens')
      .select('profiles, interests')
      .eq('id', teenId)
      .single()

    const teenProfiles: string[] = teen?.profiles || []
    const userInterests: string[] = Array.isArray(teen?.interests)
      ? (teen!.interests as string[])
      : []

    // Map profiles to categories
    const categoriesToAssign: ChallengeCategory[] = []
    if (teenProfiles.includes('School')) categoriesToAssign.push('school')
    if (teenProfiles.includes('Sport')) categoriesToAssign.push('sport')
    if (teenProfiles.includes('Créa')) categoriesToAssign.push('crea')

    // If no profiles, assign all 3
    if (categoriesToAssign.length === 0) {
      categoriesToAssign.push('school', 'sport', 'crea')
    }

    // Recupere les templates utilises sur les 7 derniers jours pour eviter
    // les repetitions (mode degrade si la requete echoue).
    let recentTemplateIds: string[] = []
    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

      const { data: recent } = await supabase
        .from('user_challenges')
        .select('challenge_id')
        .eq('teen_id', teenId)
        .gte('challenge_date', sevenDaysAgoStr)

      if (recent) {
        recentTemplateIds = recent
          .map((r: { challenge_id: string | null }) => r.challenge_id)
          .filter((id): id is string => Boolean(id))
      }
    } catch (recentErr) {
      console.warn(
        '[gamification/assignDailyChallenges] Unable to fetch recent challenges, repetition may occur:',
        recentErr,
      )
    }

    // Recupere les stats de completion 7j pour adapter la difficulte
    let targetDifficulty: 'easy' | 'medium' | 'hard' | undefined
    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

      const { data: statsData } = await supabase
        .from('user_challenges')
        .select('status')
        .eq('teen_id', teenId)
        .gte('challenge_date', sevenDaysAgoStr)

      if (statsData && statsData.length > 0) {
        const completed = statsData.filter(
          (c: { status: string }) => c.status === 'completed',
        ).length
        const decision = pickDifficulty({ total: statsData.length, completed })
        targetDifficulty = decision.difficulty
      }
    } catch (statsErr) {
      console.warn(
        '[gamification/assignDailyChallenges] Unable to compute adaptive difficulty:',
        statsErr,
      )
    }

    // For each category, get a smart-selected challenge
    for (const category of categoriesToAssign) {
      const { data: templates, error } = await supabase
        .from('challenges_templates')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)

      if (error) throw error

      if (templates && templates.length > 0) {
        const selection = selectChallengeTemplate(templates, {
          recentTemplateIds,
          userInterests,
          targetDifficulty,
        })

        const selectedTemplate = selection.template
        if (!selectedTemplate) continue

        const { data: challenge, error: challengeError } = await supabase
          .from('user_challenges')
          .insert({
            teen_id: teenId,
            challenge_id: selectedTemplate.id,
            challenge_date: targetDate,
            status: 'pending',
            metadata: {
              personalized: selection.personalized,
              fallback_repetition: selection.fallbackRepetition,
              fallback_difficulty: selection.fallbackDifficulty,
              target_difficulty: targetDifficulty || null,
            },
          })
          .select(`
            *,
            challenge:challenge_id (*)
          `)
          .single()

        if (challengeError) {
          // Ignore unique constraint error (already assigned today)
          if (challengeError.code !== '23505') throw challengeError
        } else {
          challenges.push(challenge)
        }
      }
    }

    return { success: true, data: challenges }
  } catch (error: any) {
    console.error('[gamification/assignDailyChallenges] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Valide un défi complété
 */
export async function completeChallenge(
  input: CompleteChallengeInput
): Promise<ActionResult<any>> {
  try {
    // Validate input
    const validation = completeChallengeSchema.safeParse(input)
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { challengeId, teenId, validationData } = validation.data
    const supabase = await getSupabaseClient()

    // Get challenge
    const { data: userChallenge, error: fetchError } = await supabase
      .from('user_challenges')
      .select(`
        *,
        challenge:challenge_id (*)
      `)
      .eq('id', challengeId)
      .eq('teen_id', teenId)
      .single()

    if (fetchError) throw fetchError

    if (!userChallenge || userChallenge.status === 'completed') {
      return { success: false, error: 'Défi déjà complété ou introuvable' }
    }

    const challenge = userChallenge.challenge

    // Mark as completed
    const { error: updateError } = await supabase
      .from('user_challenges')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        validation_data: validationData,
        xp_earned: challenge.xp_reward,
      })
      .eq('id', challengeId)

    if (updateError) throw updateError

    // Add XP via register_user_action
    const xpResult = await addXP({
      teenId,
      xpAmount: challenge.xp_reward,
      reason: `daily_challenge_${challenge.category}`,
      data: {
        reference_type: 'daily',
        reference_id: challengeId,
      },
    })

    revalidatePath('/daily')
    revalidatePath('/gamification')

    const xpData = xpResult.success ? xpResult.data : null
    return { success: true, data: { ...userChallenge, xpData } }
  } catch (error: any) {
    console.error('[gamification/completeChallenge] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Passer un défi (skip)
 */
export async function skipChallenge(
  challengeId: string,
  teenId: string
): Promise<ActionResult<null>> {
  try {
    // Validate input
    const validation = skipChallengeSchema.safeParse({ challengeId, teenId })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const supabase = await getSupabaseClient()

    const { error } = await supabase
      .from('user_challenges')
      .update({
        status: 'skipped',
      })
      .eq('id', challengeId)
      .eq('teen_id', teenId)

    if (error) throw error

    revalidatePath('/daily')
    return { success: true, data: null }
  } catch (error: any) {
    console.error('[gamification/skipChallenge] Error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   STATS & LEADERBOARD
   ========================================================================== */

/**
 * Récupère les stats gamification d'un ado
 */
export async function getTeenGamificationStats(
  teenId: string
): Promise<ActionResult<GamificationStats>> {
  try {
    // Validate input
    const validation = getGamificationStatsSchema.safeParse({ teenId })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const supabase = await getSupabaseClient()

    // XP & Level
    const xp = await getTeenXP(teenId)

    // Streak
    const streak = await getTeenStreak(teenId)

    // Total completed challenges
    const { count: completedChallenges, error: challengesError } = await supabase
      .from('user_challenges')
      .select('*', { count: 'exact', head: true })
      .eq('teen_id', teenId)
      .eq('status', 'completed')

    if (challengesError) throw challengesError

    // Today's challenges
    const today = new Date().toISOString().split('T')[0]
    const dailyChallenges = await getDailyChallenges(teenId, today)

    return {
      success: true,
      data: {
        xp: xp.success ? xp.data : null,
        streak: streak.success ? streak.data : null,
        total_challenges_completed: completedChallenges || 0,
        today_challenges: dailyChallenges.success ? dailyChallenges.data : [],
      },
    }
  } catch (error: any) {
    console.error('[gamification/getTeenGamificationStats] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Leaderboard XP (top teens)
 */
export async function getXPLeaderboard(
  limit: number = 10
): Promise<ActionResult<LeaderboardEntry[]>> {
  try {
    // Validate input
    const validation = getLeaderboardSchema.safeParse({ limit })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const supabase = await getSupabaseClient()

    const { data, error } = await supabase
      .from('user_xp')
      .select(`
        *,
        teen:teen_id (pseudo, avatar_url)
      `)
      .order('total_xp', { ascending: false })
      .limit(limit)

    if (error) throw error

    return { success: true, data: data ?? [] }
  } catch (error: any) {
    console.error('[gamification/getXPLeaderboard] Error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   ADMIN - GESTION CHALLENGES
   ========================================================================== */

/**
 * Crée un nouveau template de défi (admin)
 */
export async function createChallengeTemplate(
  input: CreateChallengeTemplateInput
): Promise<ActionResult<ChallengeTemplate>> {
  try {
    // Validate input
    const validation = createChallengeTemplateSchema.safeParse(input)
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(', ')
      return { success: false, error: errors }
    }

    const supabase = await getSupabaseClient()

    const { data, error } = await supabase
      .from('challenges_templates')
      .insert(validation.data)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/gamification')
    return { success: true, data }
  } catch (error: any) {
    console.error('[gamification/createChallengeTemplate] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Met à jour un template de défi (admin)
 */
export async function updateChallengeTemplate(
  input: UpdateChallengeTemplateInput
): Promise<ActionResult<ChallengeTemplate>> {
  try {
    // Validate input
    const validation = updateChallengeTemplateSchema.safeParse(input)
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(', ')
      return { success: false, error: errors }
    }

    const { id, ...updates } = validation.data
    const supabase = await getSupabaseClient()

    const { data, error } = await supabase
      .from('challenges_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/gamification')
    return { success: true, data }
  } catch (error: any) {
    console.error('[gamification/updateChallengeTemplate] Error:', error)
    return { success: false, error: error.message }
  }
}
