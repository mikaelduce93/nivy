/**
 * TEENS PARTY MOROCCO - Missions Server Actions
 * =============================================
 *
 * Server actions pour le système de missions.
 */

"use server"

import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/supabase"
import { revalidatePath } from "next/cache"
import { logDbError } from "@/lib/observability/log-db-error"
import {
  type MissionWithProgress,
  type MissionStats,
  type GetMissionsInput,
  type MissionType,
  type MissionCategory,
  type MissionStatus,
  calculateProgressPercentage,
  getTimeRemaining,
  isMissionNew,
} from "./schema"

/* ==========================================================================
   GET MISSIONS
   ========================================================================== */

/**
 * Récupère les missions de l'utilisateur avec leur progression
 */
export async function getMissions(
  input?: GetMissionsInput
): Promise<{ data: MissionWithProgress[]; error: string | null }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: [], error: "Non authentifié" }
    }

    // Appeler la fonction PostgreSQL
    const { data, error } = await supabase.rpc("get_user_missions", {
      p_mission_type: input?.type || undefined,
      p_status: input?.status || undefined,
      p_teen_id: user.id,
    })

    if (error) {
      logDbError("missions.getMissions", error)
      return { data: [], error: error.message }
    }

    // Transformer les données
    const missions: MissionWithProgress[] = (data || []).map((m: any) => ({
      id: m.mission_id,
      user_mission_id: m.user_mission_id,
      type: m.type as MissionType,
      category: m.category as MissionCategory,
      name: m.name,
      description: m.description,
      icon: m.icon,
      xp_reward: m.xp_reward,
      bonus_reward: m.bonus_reward,
      target_count: m.target_count,
      current_progress: m.current_progress || 0,
      status: m.status as MissionStatus,
      progress_percentage: calculateProgressPercentage(
        m.current_progress || 0,
        m.target_count
      ),
      time_remaining: getTimeRemaining(m.expires_at),
      expires_at: m.expires_at,
      is_new: m.started_at ? isMissionNew(m.started_at) : false,
    }))

    // Filtrer par catégorie si spécifié
    const filtered = input?.category
      ? missions.filter((m) => m.category === input.category)
      : missions

    return { data: filtered, error: null }
  } catch (error) {
    logDbError("missions.getMissions", error)
    return { data: [], error: "Erreur serveur" }
  }
}

/**
 * Récupère les missions quotidiennes actives
 */
export async function getDailyMissions(): Promise<{
  data: MissionWithProgress[]
  error: string | null
}> {
  return getMissions({ type: "daily", status: "active" })
}

/**
 * Récupère les missions hebdomadaires actives
 */
export async function getWeeklyMissions(): Promise<{
  data: MissionWithProgress[]
  error: string | null
}> {
  return getMissions({ type: "weekly", status: "active" })
}

/**
 * Récupère les missions à réclamer
 */
export async function getClaimableMissions(): Promise<{
  data: MissionWithProgress[]
  error: string | null
}> {
  return getMissions({ status: "completed" })
}

/* ==========================================================================
   MISSION STATS
   ========================================================================== */

/**
 * Récupère les statistiques de missions de l'utilisateur
 */
export async function getMissionStats(): Promise<{
  data: MissionStats | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("get_mission_stats", {
      p_teen_id: user.id,
    })

    if (error) {
      logDbError("missions.getMissionStats", error)
      return { data: null, error: error.message }
    }

    // get_mission_stats renvoie un objet jsonb unique (pas un tableau de lignes).
    if (!data) {
      // Retourner des stats par défaut
      return {
        data: {
          total_completed: 0,
          total_xp_earned: 0,
          daily_completed: 0,
          weekly_completed: 0,
          monthly_completed: 0,
          seasonal_completed: 0,
          current_daily_streak: 0,
          best_daily_streak: 0,
          completion_rate: 0,
          missions_by_category: {},
        },
        error: null,
      }
    }

    // Cast de frontière : l'objet jsonb renvoyé par la fonction correspond à MissionStats.
    return { data: data as unknown as MissionStats, error: null }
  } catch (error) {
    logDbError("missions.getMissionStats", error)
    return { data: null, error: "Erreur serveur" }
  }
}

/* ==========================================================================
   UPDATE PROGRESS
   ========================================================================== */

/**
 * Met à jour la progression d'une mission
 */
export async function updateMissionProgress(
  triggerType: string,
  metadata?: Record<string, unknown>
): Promise<{
  updated: number
  completed: string[]
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { updated: 0, completed: [], error: "Non authentifié" }
    }

    // Signature live : (p_teen_id, p_mission_code, p_action_type?, p_action_data?, p_increment?).
    // La fonction met à jour UNE mission identifiée par son code ; le `triggerType`
    // du client sert de code de mission et `metadata` de charge utile jsonb.
    const { data, error } = await supabase.rpc("update_mission_progress", {
      p_teen_id: user.id,
      p_mission_code: triggerType,
      p_action_data: (metadata || {}) as Json,
    })

    if (error) {
      logDbError("missions.updateMissionProgress", error)
      return { updated: 0, completed: [], error: error.message }
    }

    // Revalider les pages
    revalidatePath("/missions")
    revalidatePath("/dashboard")

    // Cast de frontière : la fonction renvoie { success, completed, mission_code, ... }.
    const result = data as {
      success?: boolean
      completed?: boolean
      mission_code?: string
    } | null

    return {
      updated: result?.success ? 1 : 0,
      completed:
        result?.completed && result.mission_code ? [result.mission_code] : [],
      error: null,
    }
  } catch (error) {
    logDbError("missions.updateMissionProgress", error)
    return { updated: 0, completed: [], error: "Erreur serveur" }
  }
}

/* ==========================================================================
   CLAIM REWARDS
   ========================================================================== */

/**
 * Réclame la récompense d'une mission complétée
 */
export async function claimMissionReward(userMissionId: string): Promise<{
  success: boolean
  xp_earned: number
  bonus_reward: { type: string; value: string; quantity?: number } | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return {
        success: false,
        xp_earned: 0,
        bonus_reward: null,
        error: "Non authentifié",
      }
    }

    const { data, error } = await supabase.rpc("claim_mission_rewards", {
      p_teen_id: user.id,
      p_user_mission_id: userMissionId,
    })

    if (error) {
      logDbError("missions.claimMissionReward", error)
      return {
        success: false,
        xp_earned: 0,
        bonus_reward: null,
        error: error.message,
      }
    }

    // Revalider les pages
    revalidatePath("/missions")
    revalidatePath("/dashboard")
    revalidatePath("/profile")

    // Cast de frontière : la fonction renvoie { success, xp_earned, bonus_rewards, ... }.
    const result = data as {
      success?: boolean
      xp_earned?: number
      bonus_rewards?: { type: string; value: string; quantity?: number } | null
    } | null

    return {
      success: result?.success || false,
      xp_earned: result?.xp_earned || 0,
      bonus_reward: result?.bonus_rewards || null,
      error: result?.success ? null : "Impossible de réclamer la récompense",
    }
  } catch (error) {
    logDbError("missions.claimMissionReward", error)
    return {
      success: false,
      xp_earned: 0,
      bonus_reward: null,
      error: "Erreur serveur",
    }
  }
}

/**
 * Réclame toutes les récompenses en attente
 */
export async function claimAllMissionRewards(): Promise<{
  claimed: number
  total_xp: number
  bonuses: Array<{ type: string; value: string; quantity?: number }>
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { claimed: 0, total_xp: 0, bonuses: [], error: "Non authentifié" }
    }

    // Récupérer toutes les missions complétées. La colonne d'appartenance de
    // user_missions est `teen_id` (= auth.uid()), pas `user_id` — l'ancien
    // filtre `.eq("user_id", …)` levait « column does not exist » → requête morte.
    const { data: completedMissions, error: fetchError } = await supabase
      .from("user_missions")
      .select("id")
      .eq("teen_id", user.id)
      .eq("status", "completed")

    if (fetchError) {
      return { claimed: 0, total_xp: 0, bonuses: [], error: fetchError.message }
    }

    if (!completedMissions || completedMissions.length === 0) {
      return { claimed: 0, total_xp: 0, bonuses: [], error: null }
    }

    let totalXp = 0
    const allBonuses: Array<{ type: string; value: string; quantity?: number }> =
      []
    let claimedCount = 0

    // Réclamer chaque mission
    for (const mission of completedMissions) {
      const result = await claimMissionReward(mission.id)
      if (result.success) {
        claimedCount++
        totalXp += result.xp_earned
        if (result.bonus_reward) {
          allBonuses.push(result.bonus_reward)
        }
      }
    }

    return {
      claimed: claimedCount,
      total_xp: totalXp,
      bonuses: allBonuses,
      error: null,
    }
  } catch (error) {
    logDbError("missions.claimAllMissionRewards", error)
    return { claimed: 0, total_xp: 0, bonuses: [], error: "Erreur serveur" }
  }
}

/* ==========================================================================
   ASSIGN MISSIONS
   ========================================================================== */

/**
 * Assigne les missions de la période actuelle à l'utilisateur
 */
export async function assignCurrentMissions(): Promise<{
  assigned: number
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { assigned: 0, error: "Non authentifié" }
    }

    // Assigner les missions quotidiennes
    const { data: dailyData } = await supabase.rpc("assign_missions_for_period", {
      p_teen_id: user.id,
      p_mission_type: "daily",
    })

    // Assigner les missions hebdomadaires
    const { data: weeklyData } = await supabase.rpc(
      "assign_missions_for_period",
      {
        p_teen_id: user.id,
        p_mission_type: "weekly",
      }
    )

    // Assigner les missions mensuelles
    const { data: monthlyData } = await supabase.rpc(
      "assign_missions_for_period",
      {
        p_teen_id: user.id,
        p_mission_type: "monthly",
      }
    )

    // Assigner les missions saisonnières actives
    const { data: seasonalData } = await supabase.rpc(
      "assign_missions_for_period",
      {
        p_teen_id: user.id,
        p_mission_type: "seasonal",
      }
    )

    // Cast de frontière : chaque appel renvoie un objet jsonb { assigned_count, ... }.
    const assignedCount = (d: unknown): number =>
      (d as { assigned_count?: number } | null)?.assigned_count || 0

    const totalAssigned =
      assignedCount(dailyData) +
      assignedCount(weeklyData) +
      assignedCount(monthlyData) +
      assignedCount(seasonalData)

    revalidatePath("/missions")

    return { assigned: totalAssigned, error: null }
  } catch (error) {
    logDbError("missions.assignCurrentMissions", error)
    return { assigned: 0, error: "Erreur serveur" }
  }
}

/* ==========================================================================
   TRACKING HELPERS
   ========================================================================== */

/**
 * Track un événement qui peut débloquer des missions
 * À appeler depuis d'autres parties de l'application
 */
export async function trackMissionEvent(
  eventType:
    | "challenge_completed"
    | "event_attended"
    | "friend_added"
    | "friend_invited"
    | "badge_earned"
    | "xp_earned"
    | "photo_shared"
    | "review_posted"
    | "daily_login"
    | "ticket_purchased"
    | "leaderboard_top",
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const triggerMap: Record<string, string> = {
      challenge_completed: "challenge_complete",
      event_attended: "event_attend",
      friend_added: "friend_add",
      friend_invited: "friend_invite",
      badge_earned: "badge_earn",
      xp_earned: "xp_earn",
      photo_shared: "photo_share",
      review_posted: "review_post",
      daily_login: "daily_login",
      ticket_purchased: "ticket_purchase",
      leaderboard_top: "leaderboard_top",
    }

    const triggerType = triggerMap[eventType]
    if (triggerType) {
      await updateMissionProgress(triggerType, metadata)
    }
  } catch (error) {
    logDbError("missions.trackMissionEvent", error)
  }
}

/* ==========================================================================
   MISSION SUMMARY
   ========================================================================== */

/**
 * Récupère un résumé des missions (pour dashboard)
 */
export async function getMissionSummary(): Promise<{
  data: {
    active_count: number
    claimable_count: number
    total_xp_available: number
    next_expiring: MissionWithProgress | null
  } | null
  error: string | null
}> {
  try {
    const { data: missions, error } = await getMissions()

    if (error) {
      return { data: null, error }
    }

    const active = missions.filter((m) => m.status === "active")
    const claimable = missions.filter((m) => m.status === "completed")

    // Trouver la mission qui expire le plus tôt
    const withExpiry = active.filter((m) => m.expires_at)
    const nextExpiring =
      withExpiry.length > 0
        ? withExpiry.reduce((prev, curr) =>
            new Date(prev.expires_at!) < new Date(curr.expires_at!)
              ? prev
              : curr
          )
        : null

    return {
      data: {
        active_count: active.length,
        claimable_count: claimable.length,
        total_xp_available:
          claimable.reduce((sum, m) => sum + m.xp_reward, 0) +
          active.reduce((sum, m) => sum + m.xp_reward, 0),
        next_expiring: nextExpiring,
      },
      error: null,
    }
  } catch (error) {
    logDbError("missions.getMissionSummary", error)
    return { data: null, error: "Erreur serveur" }
  }
}
