'use server'

/**
 * TEENS PARTY MOROCCO - Achievements Domain Actions
 * =================================================
 *
 * Server Actions pour le système d'achievements.
 * Toutes les entrées sont validées avec Zod.
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  getAchievementsSchema,
  getAchievementStatsSchema,
  updateProgressSchema,
  unlockAchievementSchema,
  checkAchievementsSchema,
  getRecentUnlocksSchema,
  getNextAchievementsSchema,
  type GetAchievementsInput,
  type UpdateProgressInput,
  type UnlockAchievementInput,
  type ActionResult,
  type UserAchievement,
  type AchievementStats,
  type AchievementUnlockResult,
  type CheckAchievementsResult,
  type AchievementCategory,
} from './schema'

/* ==========================================================================
   HELPER: Get Supabase client
   ========================================================================== */

async function getSupabaseClient() {
  return await createClient()
}

/* ==========================================================================
   GET ACHIEVEMENTS
   ========================================================================== */

/**
 * Récupère tous les achievements d'un teen avec leur progression
 */
export async function getAchievements(
  input: GetAchievementsInput
): Promise<ActionResult<UserAchievement[]>> {
  try {
    const validation = getAchievementsSchema.safeParse(input)
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { teenId, category } = validation.data
    const supabase = await getSupabaseClient()

    const { data, error } = await supabase.rpc('get_user_achievements', {
      p_teen_id: teenId,
    })

    if (error) throw error

    let achievements = data as UserAchievement[]

    // Filtrer par catégorie si spécifié
    if (category) {
      achievements = achievements.filter((a) => a.category === category)
    }

    return { success: true, data: achievements }
  } catch (error: any) {
    console.error('[achievements/getAchievements] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Récupère les achievements par catégorie
 */
export async function getAchievementsByCategory(
  teenId: string
): Promise<ActionResult<Record<AchievementCategory, UserAchievement[]>>> {
  try {
    const result = await getAchievements({ teenId })
    if (result.success === false) return { success: false, error: result.error }

    const byCategory: Record<string, UserAchievement[]> = {}
    for (const achievement of result.data) {
      if (!byCategory[achievement.category]) {
        byCategory[achievement.category] = []
      }
      byCategory[achievement.category].push(achievement)
    }

    return { success: true, data: byCategory as Record<AchievementCategory, UserAchievement[]> }
  } catch (error: any) {
    console.error('[achievements/getAchievementsByCategory] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Récupère uniquement les achievements débloqués
 */
export async function getUnlockedAchievements(
  teenId: string
): Promise<ActionResult<UserAchievement[]>> {
  try {
    const result = await getAchievements({ teenId })
    if (!result.success) return result

    const unlocked = result.data.filter((a) => a.is_unlocked)
    return { success: true, data: unlocked }
  } catch (error: any) {
    console.error('[achievements/getUnlockedAchievements] Error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   STATS
   ========================================================================== */

/**
 * Récupère les stats d'achievements d'un teen
 */
export async function getAchievementStats(
  teenId: string
): Promise<ActionResult<AchievementStats>> {
  try {
    const validation = getAchievementStatsSchema.safeParse({ teenId })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const supabase = await getSupabaseClient()

    const { data, error } = await supabase.rpc('get_achievement_stats', {
      p_teen_id: teenId,
    })

    if (error) throw error

    return { success: true, data: data as AchievementStats }
  } catch (error: any) {
    console.error('[achievements/getAchievementStats] Error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   PROGRESSION & UNLOCK
   ========================================================================== */

/**
 * Met à jour la progression d'un achievement
 */
export async function updateAchievementProgress(
  input: UpdateProgressInput
): Promise<ActionResult<AchievementUnlockResult>> {
  try {
    const validation = updateProgressSchema.safeParse(input)
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { teenId, achievementCode, progress, increment } = validation.data
    const supabase = await getSupabaseClient()

    const { data, error } = await supabase.rpc('update_achievement_progress', {
      p_teen_id: teenId,
      p_achievement_code: achievementCode,
      p_progress: progress,
      p_increment: increment,
    })

    if (error) throw error

    const result = data as AchievementUnlockResult

    if (result.unlocked) {
      revalidatePath('/gamification')
      revalidatePath('/achievements')
    }

    return { success: true, data: result }
  } catch (error: any) {
    console.error('[achievements/updateAchievementProgress] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Débloque directement un achievement
 */
export async function unlockAchievement(
  input: UnlockAchievementInput
): Promise<ActionResult<AchievementUnlockResult>> {
  try {
    const validation = unlockAchievementSchema.safeParse(input)
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { teenId, achievementCode } = validation.data
    const supabase = await getSupabaseClient()

    const { data, error } = await supabase.rpc('unlock_achievement', {
      p_teen_id: teenId,
      p_achievement_code: achievementCode,
    })

    if (error) throw error

    const result = data as AchievementUnlockResult

    if (result.unlocked) {
      revalidatePath('/gamification')
      revalidatePath('/achievements')
    }

    return { success: true, data: result }
  } catch (error: any) {
    console.error('[achievements/unlockAchievement] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Vérifie et débloque tous les achievements éligibles
 */
export async function checkAndUnlockAchievements(
  teenId: string
): Promise<ActionResult<CheckAchievementsResult>> {
  try {
    const validation = checkAchievementsSchema.safeParse({ teenId })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const supabase = await getSupabaseClient()

    const { data, error } = await supabase.rpc('check_achievements_for_user', {
      p_teen_id: teenId,
    })

    if (error) throw error

    const result = data as CheckAchievementsResult

    if (result.unlocked_count > 0) {
      revalidatePath('/gamification')
      revalidatePath('/achievements')
    }

    return { success: true, data: result }
  } catch (error: any) {
    console.error('[achievements/checkAndUnlockAchievements] Error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   RECENT & NEXT ACHIEVEMENTS
   ========================================================================== */

/**
 * Récupère les achievements récemment débloqués
 */
export async function getRecentlyUnlocked(
  teenId: string,
  limit: number = 10,
  since?: string
): Promise<ActionResult<UserAchievement[]>> {
  try {
    const validation = getRecentUnlocksSchema.safeParse({ teenId, limit, since })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const supabase = await getSupabaseClient()

    let query = supabase
      .from('user_achievements')
      .select(`
        *,
        achievement:achievement_id (
          id, code, name, description, category, rarity,
          points, xp_reward, icon, color_gradient, requirement_value
        )
      `)
      .eq('teen_id', teenId)
      .eq('is_unlocked', true)
      .order('unlocked_at', { ascending: false })
      .limit(limit)

    if (since) {
      query = query.gte('unlocked_at', since)
    }

    const { data, error } = await query

    if (error) throw error

    const achievements: UserAchievement[] = (data || []).map((item: any) => ({
      id: item.achievement.id,
      code: item.achievement.code,
      name: item.achievement.name,
      description: item.achievement.description,
      category: item.achievement.category,
      rarity: item.achievement.rarity,
      points: item.achievement.points,
      xp_reward: item.achievement.xp_reward,
      icon: item.achievement.icon,
      color_gradient: item.achievement.color_gradient,
      requirement_value: item.achievement.requirement_value,
      progress: item.progress,
      is_unlocked: item.is_unlocked,
      unlocked_at: item.unlocked_at,
      is_secret: false,
      percentage_complete: 100,
    }))

    return { success: true, data: achievements }
  } catch (error: any) {
    console.error('[achievements/getRecentlyUnlocked] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Récupère les prochains achievements les plus proches à débloquer
 */
export async function getNextAchievements(
  teenId: string,
  limit: number = 5
): Promise<ActionResult<UserAchievement[]>> {
  try {
    const validation = getNextAchievementsSchema.safeParse({ teenId, limit })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const result = await getAchievements({ teenId })
    if (!result.success) return result

    // Filtrer les non-débloqués et trier par pourcentage de progression
    const nextAchievements = result.data
      .filter((a) => !a.is_unlocked && a.percentage_complete > 0)
      .sort((a, b) => b.percentage_complete - a.percentage_complete)
      .slice(0, limit)

    return { success: true, data: nextAchievements }
  } catch (error: any) {
    console.error('[achievements/getNextAchievements] Error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   SPECIFIC ACHIEVEMENT ACTIONS
   ========================================================================== */

/**
 * Track un événement qui peut déclencher des achievements
 * Appelé automatiquement par d'autres parties du système
 */
export async function trackAchievementEvent(
  teenId: string,
  eventType: string,
  eventData: Record<string, unknown> = {}
): Promise<ActionResult<AchievementUnlockResult[]>> {
  try {
    const unlockedAchievements: AchievementUnlockResult[] = []

    // Mapper les événements aux achievements
    switch (eventType) {
      case 'booking_created': {
        // Première réservation
        const firstBooking = await updateAchievementProgress({
          teenId,
          achievementCode: 'first_booking',
          progress: 1,
          increment: false,
        })
        if (firstBooking.success && firstBooking.data.unlocked) {
          unlockedAchievements.push(firstBooking.data)
        }

        // Compteur de réservations
        const bookingCount = (eventData.total_bookings as number) || 1
        for (const code of ['events_5', 'events_10', 'events_25', 'events_50', 'events_100']) {
          const result = await updateAchievementProgress({
            teenId,
            achievementCode: code,
            progress: bookingCount,
            increment: false,
          })
          if (result.success && result.data.unlocked) {
            unlockedAchievements.push(result.data)
          }
        }
        break
      }

      case 'event_attended': {
        const firstEvent = await updateAchievementProgress({
          teenId,
          achievementCode: 'first_event',
          progress: 1,
          increment: false,
        })
        if (firstEvent.success && firstEvent.data.unlocked) {
          unlockedAchievements.push(firstEvent.data)
        }
        break
      }

      case 'friend_invited': {
        const inviteCount = (eventData.total_invites as number) || 1
        for (const code of ['invite_1', 'invite_5', 'invite_10', 'invite_25']) {
          const result = await updateAchievementProgress({
            teenId,
            achievementCode: code,
            progress: inviteCount,
            increment: false,
          })
          if (result.success && result.data.unlocked) {
            unlockedAchievements.push(result.data)
          }
        }
        break
      }

      case 'challenge_completed': {
        const challengeCount = (eventData.total_challenges as number) || 1
        const challengeResult = await updateAchievementProgress({
          teenId,
          achievementCode: 'challenge_first',
          progress: 1,
          increment: false,
        })
        if (challengeResult.success && challengeResult.data.unlocked) {
          unlockedAchievements.push(challengeResult.data)
        }

        for (const code of ['challenges_10', 'challenges_50', 'challenges_100', 'challenges_500']) {
          const result = await updateAchievementProgress({
            teenId,
            achievementCode: code,
            progress: challengeCount,
            increment: false,
          })
          if (result.success && result.data.unlocked) {
            unlockedAchievements.push(result.data)
          }
        }
        break
      }

      case 'streak_updated': {
        const streakDays = (eventData.current_streak as number) || 0
        const streakAchievements = [
          { code: 'streak_3', threshold: 3 },
          { code: 'streak_7', threshold: 7 },
          { code: 'streak_14', threshold: 14 },
          { code: 'streak_30', threshold: 30 },
          { code: 'streak_60', threshold: 60 },
          { code: 'streak_90', threshold: 90 },
          { code: 'streak_180', threshold: 180 },
          { code: 'streak_365', threshold: 365 },
        ]

        for (const { code, threshold } of streakAchievements) {
          if (streakDays >= threshold) {
            const result = await updateAchievementProgress({
              teenId,
              achievementCode: code,
              progress: streakDays,
              increment: false,
            })
            if (result.success && result.data.unlocked) {
              unlockedAchievements.push(result.data)
            }
          }
        }
        break
      }

      case 'level_up': {
        const newLevel = (eventData.new_level as number) || 1
        const levelAchievements = [
          { code: 'level_5', threshold: 5 },
          { code: 'level_10', threshold: 10 },
          { code: 'level_25', threshold: 25 },
          { code: 'level_50', threshold: 50 },
          { code: 'level_100', threshold: 100 },
        ]

        for (const { code, threshold } of levelAchievements) {
          if (newLevel >= threshold) {
            const result = await updateAchievementProgress({
              teenId,
              achievementCode: code,
              progress: newLevel,
              increment: false,
            })
            if (result.success && result.data.unlocked) {
              unlockedAchievements.push(result.data)
            }
          }
        }
        break
      }

      case 'xp_milestone': {
        const totalXP = (eventData.total_xp as number) || 0
        const xpAchievements = [
          { code: 'xp_1000', threshold: 1000 },
          { code: 'xp_5000', threshold: 5000 },
          { code: 'xp_10000', threshold: 10000 },
          { code: 'xp_50000', threshold: 50000 },
          { code: 'xp_100000', threshold: 100000 },
        ]

        for (const { code, threshold } of xpAchievements) {
          if (totalXP >= threshold) {
            const result = await updateAchievementProgress({
              teenId,
              achievementCode: code,
              progress: totalXP,
              increment: false,
            })
            if (result.success && result.data.unlocked) {
              unlockedAchievements.push(result.data)
            }
          }
        }
        break
      }

      case 'profile_completed': {
        const profileResult = await unlockAchievement({
          teenId,
          achievementCode: 'profile_complete',
        })
        if (profileResult.success && profileResult.data.unlocked) {
          unlockedAchievements.push(profileResult.data)
        }
        break
      }

      case 'crew_joined': {
        const crewJoinResult = await unlockAchievement({
          teenId,
          achievementCode: 'crew_join',
        })
        if (crewJoinResult.success && crewJoinResult.data.unlocked) {
          unlockedAchievements.push(crewJoinResult.data)
        }
        break
      }

      case 'crew_created': {
        const crewCreateResult = await unlockAchievement({
          teenId,
          achievementCode: 'crew_create',
        })
        if (crewCreateResult.success && crewCreateResult.data.unlocked) {
          unlockedAchievements.push(crewCreateResult.data)
        }
        break
      }

      case 'achievement_shared': {
        const shareResult = await unlockAchievement({
          teenId,
          achievementCode: 'share_achievement',
        })
        if (shareResult.success && shareResult.data.unlocked) {
          unlockedAchievements.push(shareResult.data)
        }
        break
      }

      case 'check_in_first': {
        const checkInFirstResult = await unlockAchievement({
          teenId,
          achievementCode: 'check_in_first',
        })
        if (checkInFirstResult.success && checkInFirstResult.data.unlocked) {
          unlockedAchievements.push(checkInFirstResult.data)
        }
        break
      }
    }

    return { success: true, data: unlockedAchievements }
  } catch (error: any) {
    console.error('[achievements/trackAchievementEvent] Error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */

/**
 * Initialise les achievements pour un nouveau teen
 */
export async function initializeAchievements(
  teenId: string
): Promise<ActionResult<null>> {
  try {
    const supabase = await getSupabaseClient()

    const { error } = await supabase.rpc('init_user_achievements', {
      p_teen_id: teenId,
    })

    if (error) throw error

    return { success: true, data: null }
  } catch (error: any) {
    console.error('[achievements/initializeAchievements] Error:', error)
    return { success: false, error: error.message }
  }
}
