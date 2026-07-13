/**
 * TEENS PARTY MOROCCO - Seasonal Challenges Actions
 * ==================================================
 *
 * Server actions pour les défis saisonniers et calendrier de l'Avent.
 */

"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { logDbError } from "@/lib/observability/log-db-error"
import type { Database } from "@/types/supabase"
import {
  type Season,
  type SeasonalChallenge,
  type SeasonalChallengeWithProgress,
  type SeasonWithChallenges,
  type AdventCalendar,
  type AdventCalendarWithProgress,
  type AdventDay,
  type UserAdventProgress,
  type AdventDayReward,
  type SeasonalReward,
  calculateProgress,
} from "./schema"

/* ==========================================================================
   MAPPERS DE FRONTIÈRE (colonnes live nullables -> types domaine non-null)
   ========================================================================== */

type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"]
type SeasonalRewardRow = Database["public"]["Tables"]["seasonal_rewards"]["Row"]

function toSeason(row: SeasonRow): Season {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    theme_color: row.theme_color ?? "",
    icon: row.icon,
    start_date: row.start_date,
    end_date: row.end_date,
    is_active: row.is_active ?? false,
    created_at: row.created_at ?? "",
  }
}

function toSeasonalReward(row: SeasonalRewardRow): SeasonalReward {
  return {
    id: row.id,
    season_id: row.season_id ?? "",
    title: row.title,
    description: row.description,
    reward_type: row.reward_type as SeasonalReward["reward_type"],
    reward_data: row.reward_data,
    required_challenges: row.required_challenges ?? 0,
    required_points: row.required_points ?? 0,
    icon: row.icon,
    rarity: (row.rarity ?? "common") as SeasonalReward["rarity"],
    is_limited: row.is_limited ?? false,
    max_claims: row.max_claims,
    current_claims: row.current_claims ?? 0,
    is_active: row.is_active ?? false,
    created_at: row.created_at ?? "",
  }
}

/* ==========================================================================
   SAISONS
   ========================================================================== */

/**
 * Récupère la saison active
 */
export async function getActiveSeason(): Promise<{
  success: boolean
  data?: Season
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("seasons")
      .select("*")
      .eq("is_active", true)
      .lte("start_date", new Date().toISOString().split("T")[0])
      .gte("end_date", new Date().toISOString().split("T")[0])
      .single()

    if (error && error.code !== "PGRST116") throw error

    return { success: true, data: data ? toSeason(data) : undefined }
  } catch (error) {
    logDbError("seasonal-challenges.getActiveSeason", error)
    return { success: false, error: "Impossible de charger la saison" }
  }
}

/**
 * Récupère toutes les saisons
 */
export async function getAllSeasons(): Promise<{
  success: boolean
  data?: Season[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("seasons")
      .select("*")
      .order("start_date", { ascending: false })

    if (error) throw error

    return { success: true, data: (data ?? []).map(toSeason) }
  } catch (error) {
    logDbError("seasonal-challenges.getAllSeasons", error)
    return { success: false, error: "Impossible de charger les saisons" }
  }
}

/* ==========================================================================
   DÉFIS SAISONNIERS
   ========================================================================== */

/**
 * Récupère les défis saisonniers avec progression
 */
export async function getSeasonalChallenges(
  seasonSlug?: string,
  challengeType?: string
): Promise<{
  success: boolean
  data?: SeasonWithChallenges
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("get_seasonal_challenges", {
      p_user_id: user.id,
      p_season_slug: seasonSlug || undefined,
      p_challenge_type: challengeType || undefined,
    })

    if (error) throw error

    // RPC renvoie Json : cast de frontière vers le type domaine
    const season = data as SeasonWithChallenges | null

    // Enrichir avec les pourcentages de progression
    if (season?.challenges) {
      season.challenges = season.challenges.map((challenge: any) => ({
        ...challenge,
        progress_percentage: calculateProgress(
          challenge.user_progress?.current_count || 0,
          challenge.target_count
        ),
        is_available:
          challenge.user_progress?.status !== "locked" &&
          challenge.user_progress?.status !== "completed" &&
          challenge.user_progress?.status !== "claimed",
      }))
    }

    return { success: true, data: season ?? undefined }
  } catch (error) {
    logDbError("seasonal-challenges.getSeasonalChallenges", error)
    return { success: false, error: "Impossible de charger les défis" }
  }
}

/**
 * Met à jour la progression d'un défi saisonnier
 */
export async function updateSeasonalProgress(
  challengeId: string,
  increment: number = 1
): Promise<{
  success: boolean
  data?: {
    current_count: number
    target_count: number
    completed: boolean
    percentage: number
  }
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("update_seasonal_progress", {
      p_user_id: user.id,
      p_challenge_id: challengeId,
      p_increment: increment,
    })

    if (error) throw error

    revalidatePath("/challenges")
    revalidatePath("/seasonal")

    // RPC renvoie Json : cast de frontière vers le type domaine
    return {
      success: true,
      data: data as {
        current_count: number
        target_count: number
        completed: boolean
        percentage: number
      },
    }
  } catch (error) {
    logDbError("seasonal-challenges.updateSeasonalProgress", error)
    return { success: false, error: "Erreur lors de la mise à jour" }
  }
}

/**
 * Complète un défi saisonnier
 */
export async function completeSeasonalChallenge(challengeId: string): Promise<{
  success: boolean
  data?: {
    xp_earned: number
    reward: any
  }
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("complete_seasonal_challenge", {
      p_user_id: user.id,
      p_challenge_id: challengeId,
    })

    if (error) throw error

    // RPC renvoie Json : cast de frontière vers le type domaine
    const result = data as {
      success: boolean
      error?: string
      xp_earned: number
      reward: any
    } | null

    if (!result?.success) {
      return { success: false, error: result?.error }
    }

    revalidatePath("/challenges")
    revalidatePath("/seasonal")
    revalidatePath("/profile")

    return {
      success: true,
      data: {
        xp_earned: result.xp_earned,
        reward: result.reward,
      },
    }
  } catch (error) {
    logDbError("seasonal-challenges.completeSeasonalChallenge", error)
    return { success: false, error: "Erreur lors de la complétion" }
  }
}

/**
 * Réclame la récompense d'un défi complété
 */
export async function claimSeasonalReward(challengeId: string): Promise<{
  success: boolean
  data?: {
    reward: any
    xp_earned: number
  }
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    // Vérifier que le défi est complété mais non réclamé
    const { data: progress, error: progressError } = await supabase
      .from("user_seasonal_progress")
      .select("*, seasonal_challenges(*)")
      .eq("user_id", user.id)
      .eq("seasonal_challenge_id", challengeId)
      .eq("status", "completed")
      .single()

    if (progressError || !progress) {
      return { success: false, error: "Défi non trouvé ou déjà réclamé" }
    }

    // Marquer comme réclamé
    const { error: updateError } = await supabase
      .from("user_seasonal_progress")
      .update({
        status: "claimed",
        claimed_at: new Date().toISOString(),
      })
      .eq("id", progress.id)

    if (updateError) throw updateError

    revalidatePath("/challenges")
    revalidatePath("/seasonal")

    return {
      success: true,
      data: {
        reward: progress.seasonal_challenges?.reward_data,
        xp_earned: progress.xp_earned ?? 0,
      },
    }
  } catch (error) {
    logDbError("seasonal-challenges.claimSeasonalReward", error)
    return { success: false, error: "Erreur lors de la réclamation" }
  }
}

/* ==========================================================================
   CALENDRIER DE L'AVENT
   ========================================================================== */

/**
 * Récupère le calendrier de l'Avent actif
 */
export async function getActiveAdventCalendar(): Promise<{
  success: boolean
  data?: AdventCalendarWithProgress
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("get_active_advent_calendar", {
      p_user_id: user.id,
    })

    if (error) throw error

    if (!data || !data[0]?.calendar) {
      return { success: true, data: undefined }
    }

    // RPC renvoie des colonnes Json : cast de frontière vers les types domaine
    const result: AdventCalendarWithProgress = {
      ...(data[0].calendar as AdventCalendar),
      days: (data[0].days as AdventDay[]) || [],
      user_progress: (data[0].user_progress as UserAdventProgress[]) || [],
      stats: (data[0].stats as AdventCalendarWithProgress["stats"]) || {
        days_opened: 0,
        total_xp_earned: 0,
        current_streak: 0,
        completion_percentage: 0,
      },
    }

    return { success: true, data: result }
  } catch (error) {
    logDbError("seasonal-challenges.getActiveAdventCalendar", error)
    return { success: false, error: "Impossible de charger le calendrier" }
  }
}

/**
 * Ouvre une case du calendrier de l'Avent
 */
export async function openAdventDay(dayNumber: number): Promise<{
  success: boolean
  data?: {
    day_number: number
    reward: AdventDayReward
    xp_earned: number
  }
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("open_advent_day", {
      p_user_id: user.id,
      p_day_number: dayNumber,
    })

    if (error) throw error

    // RPC renvoie Json : cast de frontière vers le type domaine
    const result = data as {
      success: boolean
      error?: string
      day_number: number
      reward: AdventDayReward
      xp_earned: number
    } | null

    if (!result?.success) {
      return { success: false, error: result?.error }
    }

    revalidatePath("/advent")
    revalidatePath("/seasonal")
    revalidatePath("/profile")

    return {
      success: true,
      data: {
        day_number: result.day_number,
        reward: result.reward,
        xp_earned: result.xp_earned,
      },
    }
  } catch (error) {
    logDbError("seasonal-challenges.openAdventDay", error)
    return { success: false, error: "Erreur lors de l'ouverture" }
  }
}

/**
 * Vérifie si l'utilisateur peut ouvrir une case aujourd'hui
 */
export async function canOpenTodayAdvent(): Promise<{
  success: boolean
  canOpen: boolean
  todayDay?: number
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, canOpen: false, error: "Non authentifié" }
    }

    // Récupérer le calendrier actif
    const { data: calendar, error: calendarError } = await supabase
      .from("advent_calendars")
      .select("*")
      .eq("is_active", true)
      .lte("start_date", new Date().toISOString().split("T")[0])
      .gte("end_date", new Date().toISOString().split("T")[0])
      .single()

    if (calendarError || !calendar) {
      return { success: true, canOpen: false }
    }

    // Calculer le jour actuel
    const startDate = new Date(calendar.start_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    startDate.setHours(0, 0, 0, 0)

    // total_days est nullable en live : sans plafond connu, pas de cap
    const todayDay = Math.min(
      Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      calendar.total_days ?? Infinity
    )

    // Vérifier si déjà ouvert
    const { data: progress, error: progressError } = await supabase
      .from("user_advent_progress")
      .select("day_number")
      .eq("user_id", user.id)
      .eq("advent_calendar_id", calendar.id)
      .eq("day_number", todayDay)
      .single()

    const canOpen = !progress && todayDay >= 1

    return { success: true, canOpen, todayDay }
  } catch (error) {
    logDbError("seasonal-challenges.canOpenTodayAdvent", error)
    return { success: false, canOpen: false, error: "Erreur" }
  }
}

/* ==========================================================================
   RÉCOMPENSES SAISONNIÈRES
   ========================================================================== */

/**
 * Récupère les récompenses saisonnières disponibles
 */
export async function getSeasonalRewards(seasonId?: string): Promise<{
  success: boolean
  data?: SeasonalReward[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from("seasonal_rewards")
      .select("*")
      .eq("is_active", true)
      .order("required_challenges")

    if (seasonId) {
      query = query.eq("season_id", seasonId)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data: (data ?? []).map(toSeasonalReward) }
  } catch (error) {
    logDbError("seasonal-challenges.getSeasonalRewards", error)
    return { success: false, error: "Impossible de charger les récompenses" }
  }
}

/**
 * Réclame une récompense saisonnière
 */
export async function claimSeasonalTierReward(rewardId: string): Promise<{
  success: boolean
  data?: {
    reward: SeasonalReward
    xp_bonus: number
  }
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    // Récupérer la récompense
    const { data: reward, error: rewardError } = await supabase
      .from("seasonal_rewards")
      .select("*")
      .eq("id", rewardId)
      .eq("is_active", true)
      .single()

    if (rewardError || !reward) {
      return { success: false, error: "Récompense non trouvée" }
    }

    const rewardTyped = toSeasonalReward(reward)

    // Vérifier si déjà réclamée
    const { data: claimed } = await supabase
      .from("user_seasonal_rewards")
      .select("id")
      .eq("user_id", user.id)
      .eq("seasonal_reward_id", rewardId)
      .single()

    if (claimed) {
      return { success: false, error: "Récompense déjà réclamée" }
    }

    // Vérifier les conditions
    const { data: completedCount } = await supabase
      .from("user_seasonal_progress")
      .select("id", { count: "exact" })
      .eq("user_id", user.id)
      .in("status", ["completed", "claimed"])

    if ((completedCount?.length || 0) < rewardTyped.required_challenges) {
      return {
        success: false,
        error: `Tu dois compléter ${rewardTyped.required_challenges} défis pour débloquer cette récompense`,
      }
    }

    // Vérifier limite
    if (rewardTyped.is_limited && rewardTyped.max_claims) {
      if (rewardTyped.current_claims >= rewardTyped.max_claims) {
        return { success: false, error: "Cette récompense n'est plus disponible" }
      }
    }

    // Réclamer
    const { error: claimError } = await supabase
      .from("user_seasonal_rewards")
      .insert({
        user_id: user.id,
        seasonal_reward_id: rewardId,
      })

    if (claimError) throw claimError

    // Incrémenter le compteur
    await supabase
      .from("seasonal_rewards")
      .update({ current_claims: rewardTyped.current_claims + 1 })
      .eq("id", rewardId)

    revalidatePath("/seasonal")
    revalidatePath("/rewards")

    return {
      success: true,
      data: {
        reward: rewardTyped,
        xp_bonus: 100, // Bonus XP pour avoir réclamé
      },
    }
  } catch (error) {
    logDbError("seasonal-challenges.claimSeasonalTierReward", error)
    return { success: false, error: "Erreur lors de la réclamation" }
  }
}

/* ==========================================================================
   STATS
   ========================================================================== */

/**
 * Récupère les stats saisonnières de l'utilisateur
 */
export async function getUserSeasonalStats(seasonId?: string): Promise<{
  success: boolean
  data?: {
    total_challenges: number
    completed: number
    claimed: number
    in_progress: number
    total_xp_earned: number
    daily_completed: number
    weekly_completed: number
    seasonal_completed: number
    special_completed: number
  }
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    // Récupérer la saison
    let targetSeasonId = seasonId
    if (!targetSeasonId) {
      const { data: activeSeason } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_active", true)
        .lte("start_date", new Date().toISOString().split("T")[0])
        .gte("end_date", new Date().toISOString().split("T")[0])
        .single()

      targetSeasonId = activeSeason?.id
    }

    if (!targetSeasonId) {
      return {
        success: true,
        data: {
          total_challenges: 0,
          completed: 0,
          claimed: 0,
          in_progress: 0,
          total_xp_earned: 0,
          daily_completed: 0,
          weekly_completed: 0,
          seasonal_completed: 0,
          special_completed: 0,
        },
      }
    }

    // Récupérer les stats
    const { data: challenges } = await supabase
      .from("seasonal_challenges")
      .select("id, challenge_type")
      .eq("season_id", targetSeasonId)
      .eq("is_active", true)

    const { data: progress } = await supabase
      .from("user_seasonal_progress")
      .select("*, seasonal_challenges!inner(challenge_type)")
      .eq("user_id", user.id)
      .in(
        "seasonal_challenge_id",
        challenges?.map((c) => c.id) || []
      )

    const stats = {
      total_challenges: challenges?.length || 0,
      completed: progress?.filter((p) => p.status === "completed").length || 0,
      claimed: progress?.filter((p) => p.status === "claimed").length || 0,
      in_progress: progress?.filter((p) => p.status === "in_progress").length || 0,
      total_xp_earned: progress?.reduce((sum, p) => sum + (p.xp_earned || 0), 0) || 0,
      daily_completed:
        progress?.filter(
          (p) =>
            p.seasonal_challenges?.challenge_type === "daily" &&
            ["completed", "claimed"].includes(p.status ?? "")
        ).length || 0,
      weekly_completed:
        progress?.filter(
          (p) =>
            p.seasonal_challenges?.challenge_type === "weekly" &&
            ["completed", "claimed"].includes(p.status ?? "")
        ).length || 0,
      seasonal_completed:
        progress?.filter(
          (p) =>
            p.seasonal_challenges?.challenge_type === "seasonal" &&
            ["completed", "claimed"].includes(p.status ?? "")
        ).length || 0,
      special_completed:
        progress?.filter(
          (p) =>
            p.seasonal_challenges?.challenge_type === "special" &&
            ["completed", "claimed"].includes(p.status ?? "")
        ).length || 0,
    }

    return { success: true, data: stats }
  } catch (error) {
    logDbError("seasonal-challenges.getUserSeasonalStats", error)
    return { success: false, error: "Erreur lors de la récupération des stats" }
  }
}
