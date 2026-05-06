/**
 * TEENS PARTY MOROCCO - Stats Dashboard Actions
 * ==============================================
 *
 * Server actions pour le dashboard de statistiques personnelles.
 */

"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  type ActivityType,
  type DashboardStats,
  type LifetimeStats,
  type MonthlyStats,
  type Milestone,
  type PersonalRecord,
  type PlatformAverages,
  type ActivityStats,
  type DailyActivity,
  type RecordType,
} from "./schema"

/* ==========================================================================
   DAILY ACTIVITY
   ========================================================================== */

/**
 * Met à jour l'activité quotidienne d'un utilisateur
 */
export async function updateDailyActivity(
  activityType: ActivityType,
  amount: number = 1
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { error } = await supabase.rpc("update_daily_activity", {
      p_user_id: user.id,
      p_activity_type: activityType,
      p_amount: amount,
    })

    if (error) throw error

    revalidatePath("/profile")
    revalidatePath("/stats")

    return { success: true }
  } catch (error) {
    console.error("Erreur updateDailyActivity:", error)
    return { success: false, error: "Erreur lors de la mise à jour" }
  }
}

/**
 * Récupère l'activité quotidienne de l'utilisateur
 */
export async function getDailyActivity(
  date?: string
): Promise<DailyActivity | null> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const targetDate = date || new Date().toISOString().split("T")[0]

    const { data, error } = await supabase
      .from("user_daily_activity")
      .select("*")
      .eq("user_id", user.id)
      .eq("activity_date", targetDate)
      .single()

    if (error && error.code !== "PGRST116") throw error

    return data
  } catch (error) {
    console.error("Erreur getDailyActivity:", error)
    return null
  }
}

/**
 * Récupère l'historique d'activité sur plusieurs jours
 */
export async function getActivityHistory(
  days: number = 30
): Promise<DailyActivity[]> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from("user_daily_activity")
      .select("*")
      .eq("user_id", user.id)
      .gte("activity_date", startDate.toISOString().split("T")[0])
      .order("activity_date", { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Erreur getActivityHistory:", error)
    return []
  }
}

/* ==========================================================================
   LIFETIME STATS
   ========================================================================== */

/**
 * Récupère les statistiques à vie de l'utilisateur
 */
export async function getLifetimeStats(): Promise<LifetimeStats | null> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from("user_lifetime_stats")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (error && error.code !== "PGRST116") throw error

    return data
  } catch (error) {
    console.error("Erreur getLifetimeStats:", error)
    return null
  }
}

/**
 * Met à jour les stats lifetime (appel manuel ou automatique)
 */
export async function refreshLifetimeStats(): Promise<{
  success: boolean
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

    const { error } = await supabase.rpc("update_lifetime_stats", {
      p_user_id: user.id,
    })

    if (error) throw error

    revalidatePath("/stats")

    return { success: true }
  } catch (error) {
    console.error("Erreur refreshLifetimeStats:", error)
    return { success: false, error: "Erreur lors de la mise à jour" }
  }
}

/* ==========================================================================
   MONTHLY STATS
   ========================================================================== */

/**
 * Récupère les statistiques mensuelles
 */
export async function getMonthlyStats(
  months: number = 6
): Promise<MonthlyStats[]> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from("user_monthly_stats")
      .select("*")
      .eq("user_id", user.id)
      .order("month_year", { ascending: false })
      .limit(months)

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Erreur getMonthlyStats:", error)
    return []
  }
}

/* ==========================================================================
   MILESTONES
   ========================================================================== */

/**
 * Récupère les jalons atteints par l'utilisateur
 */
export async function getUserMilestones(): Promise<Milestone[]> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from("user_milestones")
      .select("*")
      .eq("user_id", user.id)
      .order("achieved_at", { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Erreur getUserMilestones:", error)
    return []
  }
}

/**
 * Vérifie et attribue de nouveaux jalons
 */
export async function checkAndAwardMilestones(): Promise<{
  success: boolean
  newMilestones: Milestone[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, newMilestones: [], error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("check_user_milestones", {
      p_user_id: user.id,
    })

    if (error) throw error

    revalidatePath("/stats")
    revalidatePath("/profile")

    return { success: true, newMilestones: data || [] }
  } catch (error) {
    console.error("Erreur checkAndAwardMilestones:", error)
    return { success: false, newMilestones: [], error: "Erreur lors de la vérification" }
  }
}

/* ==========================================================================
   PERSONAL RECORDS
   ========================================================================== */

/**
 * Récupère les records personnels de l'utilisateur
 */
export async function getPersonalRecords(): Promise<PersonalRecord[]> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from("user_personal_records")
      .select("*")
      .eq("user_id", user.id)
      .order("achieved_at", { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Erreur getPersonalRecords:", error)
    return []
  }
}

/**
 * Met à jour un record personnel
 */
export async function updatePersonalRecord(
  recordType: RecordType,
  newValue: number,
  context?: Record<string, unknown>
): Promise<{ success: boolean; isNewRecord: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, isNewRecord: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("update_personal_record", {
      p_user_id: user.id,
      p_record_type: recordType,
      p_new_value: newValue,
      p_context: context || null,
    })

    if (error) throw error

    if (data) {
      revalidatePath("/stats")
    }

    return { success: true, isNewRecord: data === true }
  } catch (error) {
    console.error("Erreur updatePersonalRecord:", error)
    return { success: false, isNewRecord: false, error: "Erreur lors de la mise à jour" }
  }
}

/* ==========================================================================
   DASHBOARD STATS
   ========================================================================== */

/**
 * Récupère toutes les stats du dashboard en une seule requête
 */
export async function getDashboardStats(): Promise<DashboardStats | null> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase.rpc("get_user_dashboard_stats", {
      p_user_id: user.id,
    })

    if (error) throw error

    return data
  } catch (error) {
    console.error("Erreur getDashboardStats:", error)
    return null
  }
}

/**
 * Récupère les stats d'activité pour une période donnée
 */
export async function getActivityStats(
  days: number = 30
): Promise<ActivityStats | null> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase.rpc("get_activity_stats", {
      p_user_id: user.id,
      p_days: days,
    })

    if (error) throw error

    return data
  } catch (error) {
    console.error("Erreur getActivityStats:", error)
    return null
  }
}

/* ==========================================================================
   PLATFORM AVERAGES & COMPARISONS
   ========================================================================== */

/**
 * Récupère les moyennes de la plateforme
 */
export async function getPlatformAverages(
  period: string = "all_time"
): Promise<PlatformAverages | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("platform_averages")
      .select("*")
      .eq("period", period)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") throw error

    return data
  } catch (error) {
    console.error("Erreur getPlatformAverages:", error)
    return null
  }
}

/**
 * Compare les stats de l'utilisateur avec les moyennes
 */
export async function getStatsComparison(): Promise<{
  xp: { value: number; average: number; percentAbove: number }
  events: { value: number; average: number; percentAbove: number }
  challenges: { value: number; average: number; percentAbove: number }
  games: { value: number; average: number; percentAbove: number }
  badges: { value: number; average: number; percentAbove: number }
  friends: { value: number; average: number; percentAbove: number }
} | null> {
  try {
    const [stats, averages] = await Promise.all([
      getLifetimeStats(),
      getPlatformAverages(),
    ])

    if (!stats || !averages) return null

    const calcPercent = (val: number, avg: number) =>
      avg === 0 ? (val > 0 ? 100 : 0) : Math.round(((val - avg) / avg) * 100)

    return {
      xp: {
        value: stats.total_xp,
        average: averages.avg_xp_per_user,
        percentAbove: calcPercent(stats.total_xp, averages.avg_xp_per_user),
      },
      events: {
        value: stats.total_events_attended,
        average: averages.avg_events_per_user,
        percentAbove: calcPercent(
          stats.total_events_attended,
          averages.avg_events_per_user
        ),
      },
      challenges: {
        value: stats.total_challenges_completed,
        average: averages.avg_challenges_per_user,
        percentAbove: calcPercent(
          stats.total_challenges_completed,
          averages.avg_challenges_per_user
        ),
      },
      games: {
        value: stats.total_games_played,
        average: averages.avg_games_per_user,
        percentAbove: calcPercent(
          stats.total_games_played,
          averages.avg_games_per_user
        ),
      },
      badges: {
        value: stats.total_badges_earned,
        average: averages.avg_badges_per_user,
        percentAbove: calcPercent(
          stats.total_badges_earned,
          averages.avg_badges_per_user
        ),
      },
      friends: {
        value: stats.total_friends,
        average: averages.avg_friends_per_user,
        percentAbove: calcPercent(
          stats.total_friends,
          averages.avg_friends_per_user
        ),
      },
    }
  } catch (error) {
    console.error("Erreur getStatsComparison:", error)
    return null
  }
}

/* ==========================================================================
   RANKING
   ========================================================================== */

/**
 * Récupère le classement global de l'utilisateur
 */
export async function getUserGlobalRank(): Promise<{
  rank: number
  totalUsers: number
  percentile: number
} | null> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    // Récupérer l'XP de l'utilisateur
    const { data: userStats, error: userError } = await supabase
      .from("user_lifetime_stats")
      .select("total_xp")
      .eq("user_id", user.id)
      .single()

    if (userError && userError.code !== "PGRST116") throw userError
    if (!userStats) return { rank: 0, totalUsers: 0, percentile: 0 }

    // Compter les utilisateurs avec plus d'XP
    const { count: higherCount, error: rankError } = await supabase
      .from("user_lifetime_stats")
      .select("*", { count: "exact", head: true })
      .gt("total_xp", userStats.total_xp)

    if (rankError) throw rankError

    // Compter le total d'utilisateurs
    const { count: totalCount, error: totalError } = await supabase
      .from("user_lifetime_stats")
      .select("*", { count: "exact", head: true })

    if (totalError) throw totalError

    const rank = (higherCount || 0) + 1
    const total = totalCount || 1
    const percentile = Math.round((1 - (higherCount || 0) / total) * 100)

    return { rank, totalUsers: total, percentile }
  } catch (error) {
    console.error("Erreur getUserGlobalRank:", error)
    return null
  }
}

/* ==========================================================================
   STREAKS
   ========================================================================== */

/**
 * Met à jour le streak de connexion
 */
export async function updateLoginStreak(): Promise<{
  success: boolean
  currentStreak: number
  error?: string
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, currentStreak: 0, error: "Non authentifié" }
    }

    // Vérifier la dernière connexion
    const { data: stats, error: statsError } = await supabase
      .from("user_lifetime_stats")
      .select("last_login_date, current_login_streak, longest_login_streak")
      .eq("user_id", user.id)
      .single()

    if (statsError && statsError.code !== "PGRST116") throw statsError

    const today = new Date().toISOString().split("T")[0]
    let newStreak = 1

    if (stats) {
      const lastLogin = stats.last_login_date
      if (lastLogin) {
        const lastDate = new Date(lastLogin)
        const todayDate = new Date(today)
        const diffDays = Math.floor(
          (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (diffDays === 0) {
          // Déjà connecté aujourd'hui
          return { success: true, currentStreak: stats.current_login_streak }
        } else if (diffDays === 1) {
          // Connexion consécutive
          newStreak = stats.current_login_streak + 1
        }
        // Si diffDays > 1, streak reset à 1
      }

      // Mettre à jour
      const { error: updateError } = await supabase
        .from("user_lifetime_stats")
        .update({
          last_login_date: today,
          current_login_streak: newStreak,
          longest_login_streak: Math.max(
            newStreak,
            stats.longest_login_streak || 0
          ),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)

      if (updateError) throw updateError
    } else {
      // Premier enregistrement
      const { error: insertError } = await supabase
        .from("user_lifetime_stats")
        .insert({
          user_id: user.id,
          last_login_date: today,
          current_login_streak: 1,
          longest_login_streak: 1,
        })

      if (insertError) throw insertError
    }

    // Mettre à jour aussi l'activité quotidienne
    await updateDailyActivity("time", 1)

    return { success: true, currentStreak: newStreak }
  } catch (error) {
    console.error("Erreur updateLoginStreak:", error)
    return { success: false, currentStreak: 0, error: "Erreur lors de la mise à jour" }
  }
}

/* ==========================================================================
   EXPORT STATS (pour partage)
   ========================================================================== */

/**
 * Génère un résumé des stats pour le partage
 */
export async function generateStatsShareData(): Promise<{
  success: boolean
  data?: {
    level: number
    totalXp: number
    eventsAttended: number
    challengesCompleted: number
    gamesPlayed: number
    badges: number
    rank: number
    percentile: number
    favoriteGame: string | null
    longestStreak: number
  }
  error?: string
}> {
  try {
    const [stats, rank] = await Promise.all([
      getLifetimeStats(),
      getUserGlobalRank(),
    ])

    if (!stats) {
      return { success: false, error: "Stats non disponibles" }
    }

    // Calculer le niveau
    let level = 1
    let xpRequired = 0
    while (xpRequired < stats.total_xp) {
      xpRequired += Math.floor(100 * level * 1.5)
      if (xpRequired <= stats.total_xp) level++
    }

    return {
      success: true,
      data: {
        level,
        totalXp: stats.total_xp,
        eventsAttended: stats.total_events_attended,
        challengesCompleted: stats.total_challenges_completed,
        gamesPlayed: stats.total_games_played,
        badges: stats.total_badges_earned,
        rank: rank?.rank || 0,
        percentile: rank?.percentile || 0,
        favoriteGame: stats.favorite_game ?? null,
        longestStreak: stats.longest_login_streak,
      },
    }
  } catch (error) {
    console.error("Erreur generateStatsShareData:", error)
    return { success: false, error: "Erreur lors de la génération" }
  }
}
