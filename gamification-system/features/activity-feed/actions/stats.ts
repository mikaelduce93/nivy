"use server"

import { createClient } from "@/lib/supabase/server"
import { type ActivityCategory } from "../schema"

/**
 * Récupère les statistiques d'activité d'un utilisateur
 */
export async function getActivityStats(userId?: string): Promise<{
  success: boolean
  stats?: {
    totalActivities: number
    likesReceived: number
    commentsReceived: number
    activityByCategory: Record<ActivityCategory, number>
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

    const targetUserId = userId || user.id

    const { count: totalActivities } = await supabase
      .from("user_activities")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetUserId)
      .eq("is_hidden", false)

    const { data: likesData } = await supabase
      .from("user_activities")
      .select("likes_count")
      .eq("user_id", targetUserId)

    const likesReceived = likesData?.reduce((sum, a) => sum + a.likes_count, 0) || 0

    const { data: commentsData } = await supabase
      .from("user_activities")
      .select("comments_count")
      .eq("user_id", targetUserId)

    const commentsReceived = commentsData?.reduce((sum, a) => sum + a.comments_count, 0) || 0

    const { data: categoryData } = await supabase
      .from("user_activities")
      .select(
        `
        activity_types!inner(category)
      `
      )
      .eq("user_id", targetUserId)
      .eq("is_hidden", false)

    const activityByCategory: Record<ActivityCategory, number> = {
      achievement: 0,
      social: 0,
      event: 0,
      game: 0,
      collection: 0,
      milestone: 0,
    }

    categoryData?.forEach((a: any) => {
      const category = a.activity_types.category as ActivityCategory
      activityByCategory[category] = (activityByCategory[category] || 0) + 1
    })

    return {
      success: true,
      stats: {
        totalActivities: totalActivities || 0,
        likesReceived,
        commentsReceived,
        activityByCategory,
      },
    }
  } catch (error) {
    console.error("Erreur getActivityStats:", error)
    return { success: false, error: "Impossible de charger les statistiques" }
  }
}
