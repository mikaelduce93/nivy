"use server"

import { createClient } from "@/lib/supabase/server"
import {
  type ActivityCategory,
  type FeedOrder,
  type ActivityWithUser,
} from "../schema"

/**
 * Récupère le fil d'activité
 */
export async function getActivityFeed(options: {
  feedType: "friends" | "public" | "personal"
  category?: ActivityCategory
  order?: FeedOrder
  limit?: number
  offset?: number
}): Promise<{
  success: boolean
  activities?: ActivityWithUser[]
  hasMore?: boolean
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

    const { data, error } = await supabase.rpc("get_activity_feed", {
      p_feed_type: options.feedType,
      p_limit: options.limit || 20,
      p_offset: options.offset || 0,
      p_user_id: user.id,
    })

    if (error) throw error

    if (!data || !Array.isArray(data)) {
      return {
        success: true,
        activities: [],
        hasMore: false,
      }
    }

    // Enrichir avec les infos utilisateur
    const userIds = [...new Set(data.map((a: any) => a.user_id))]
    const { data: users } = await supabase
      .from("users")
      .select("id, username, avatar_url")
      .in("id", userIds)

    const usersMap = new Map(users?.map((u) => [u.id, u]) || [])

    // Vérifier les likes de l'utilisateur
    const activityIds = data.map((a: any) => a.id)
    const { data: myLikes } = await supabase
      .from("activity_likes")
      .select("activity_id, reaction_type")
      .eq("user_id", user.id)
      .in("activity_id", activityIds)

    const likesMap = new Map(myLikes?.map((l) => [l.activity_id, l.reaction_type]) || [])

    const activities: ActivityWithUser[] = data.map((activity: any) => ({
      ...activity,
      user: usersMap.get(activity.user_id) || {
        id: activity.user_id,
        username: "Utilisateur",
      },
      activity_type: {
        id: activity.activity_type_id,
        slug: activity.activity_type,
        name: activity.activity_type,
        description: null,
        icon: activity.icon,
        emoji: activity.emoji,
        color: activity.color,
        category: activity.category,
        is_public_by_default: true,
        points: 0,
        is_active: true,
      },
      liked_by_me: likesMap.has(activity.id),
      my_reaction: likesMap.get(activity.id),
    }))

    return {
      success: true,
      activities,
      hasMore: data.length === (options.limit || 20),
    }
  } catch (error) {
    console.error("Erreur getActivityFeed:", error)
    return { success: false, error: "Impossible de charger le fil d'activité" }
  }
}

/**
 * Récupère les activités d'un utilisateur spécifique
 */
export async function getUserActivities(
  targetUserId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{
  success: boolean
  activities?: ActivityWithUser[]
  hasMore?: boolean
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

    // Vérifier si amis
    const { data: friendship } = await supabase
      .from("friendships")
      .select("id")
      .or(
        `and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`
      )
      .eq("status", "accepted")
      .single()

    const areFriends = !!friendship || user.id === targetUserId

    // Récupérer les activités visibles
    let query = supabase
      .from("user_activities")
      .select(
        `
        *,
        activity_types!inner(slug, name, icon, emoji, color, category)
      `
      )
      .eq("user_id", targetUserId)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    // Filtrer par visibilité
    if (user.id !== targetUserId) {
      if (areFriends) {
        query = query.in("visibility", ["public", "friends"])
      } else {
        query = query.eq("visibility", "public")
      }
    }

    const { data, error } = await query

    if (error) throw error

    // Récupérer info utilisateur cible
    const { data: targetUser } = await supabase
      .from("users")
      .select("id, username, avatar_url")
      .eq("id", targetUserId)
      .single()

    // Vérifier mes likes
    const activityIds = data.map((a) => a.id)
    const { data: myLikes } = await supabase
      .from("activity_likes")
      .select("activity_id, reaction_type")
      .eq("user_id", user.id)
      .in("activity_id", activityIds)

    const likesMap = new Map(myLikes?.map((l) => [l.activity_id, l.reaction_type]) || [])

    const activities: ActivityWithUser[] = data.map((activity: any) => ({
      ...activity,
      user: targetUser || { id: targetUserId, username: "Utilisateur" },
      activity_type: activity.activity_types,
      liked_by_me: likesMap.has(activity.id),
      my_reaction: likesMap.get(activity.id),
    }))

    return {
      success: true,
      activities,
      hasMore: data.length === limit,
    }
  } catch (error) {
    console.error("Erreur getUserActivities:", error)
    return { success: false, error: "Impossible de charger les activités" }
  }
}
