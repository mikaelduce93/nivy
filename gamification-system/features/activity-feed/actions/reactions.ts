"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { type ReactionType, type ActivityLike } from "../schema"

/**
 * Toggle une réaction sur une activité
 */
export async function toggleActivityReaction(
  activityId: string,
  reactionType: ReactionType = "like"
): Promise<{
  success: boolean
  liked?: boolean
  likesCount?: number
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

    const { data, error } = await supabase.rpc("toggle_activity_like", {
      p_activity_id: activityId,
      p_user_id: user.id,
      p_reaction_type: reactionType,
    })

    if (error) throw error

    revalidatePath("/feed")

    return {
      success: true,
      liked: data.liked,
      likesCount: data.likes_count,
    }
  } catch (error) {
    console.error("Erreur toggleActivityReaction:", error)
    return { success: false, error: "Impossible de réagir" }
  }
}

/**
 * Récupère les réactions d'une activité
 */
export async function getActivityReactions(activityId: string): Promise<{
  success: boolean
  reactions?: (ActivityLike & { user: { id: string; username: string; avatar_url?: string } })[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("activity_likes")
      .select(
        `
        *,
        users!inner(id, username, avatar_url)
      `
      )
      .eq("activity_id", activityId)
      .order("created_at", { ascending: false })

    if (error) throw error

    const reactions = data.map((r: any) => ({
      ...r,
      user: r.users,
    }))

    return { success: true, reactions }
  } catch (error) {
    console.error("Erreur getActivityReactions:", error)
    return { success: false, error: "Impossible de charger les réactions" }
  }
}
