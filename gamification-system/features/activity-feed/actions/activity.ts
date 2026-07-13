"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { logDbError } from "@/lib/observability/log-db-error"
import { type ActivityVisibility, type UserActivity } from "../schema"

/**
 * Crée une nouvelle activité
 */
export async function createActivity(
  activityTypeSlug: string,
  data: Record<string, any>,
  options?: {
    title?: string
    description?: string
    imageUrl?: string
    targetId?: string
    targetType?: string
    visibility?: ActivityVisibility
  }
): Promise<{
  success: boolean
  activity?: UserActivity
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

    const { data: activityId, error } = await supabase.rpc("create_activity", {
      p_user_id: user.id,
      p_activity_type: activityTypeSlug,
      p_data: data,
      p_title: options?.title ?? "",
      p_description: options?.description,
      p_image_url: options?.imageUrl,
      p_target_id: options?.targetId,
      p_target_type: options?.targetType,
      p_visibility: options?.visibility,
    })

    if (error) throw error

    revalidatePath("/feed")
    revalidatePath("/profile")

    // create_activity ne renvoie que l'id (live) : on relit la ligne pour renvoyer l'activité complète
    let activity: UserActivity | undefined
    if (activityId) {
      const { data: row } = await supabase
        .from("user_activities")
        .select("*")
        .eq("id", activityId)
        .single()
      if (row) {
        activity = {
          id: row.id,
          user_id: row.user_id,
          activity_type_id: row.activity_type_id,
          title: row.title,
          description: row.description,
          image_url: row.image_url,
          data: (row.data as Record<string, any>) ?? {},
          target_id: row.target_id,
          target_type: row.target_type,
          likes_count: row.likes_count ?? 0,
          comments_count: row.comments_count ?? 0,
          shares_count: row.shares_count ?? 0,
          visibility: (row.visibility as ActivityVisibility) ?? "friends",
          is_pinned: row.is_pinned ?? false,
          is_highlighted: row.is_highlighted ?? false,
          is_hidden: row.is_hidden ?? false,
          hidden_reason: row.hidden_reason,
          created_at: row.created_at ?? undefined,
          updated_at: row.updated_at ?? undefined,
        }
      }
    }

    return { success: true, activity }
  } catch (error) {
    logDbError("activity-feed.createActivity", error)
    return { success: false, error: "Impossible de créer l'activité" }
  }
}

/**
 * Supprime une activité
 */
export async function deleteActivity(activityId: string): Promise<{
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

    const { error } = await supabase
      .from("user_activities")
      .delete()
      .eq("id", activityId)
      .eq("user_id", user.id)

    if (error) throw error

    revalidatePath("/feed")
    revalidatePath("/profile")

    return { success: true }
  } catch (error) {
    logDbError("activity-feed.deleteActivity", error)
    return { success: false, error: "Impossible de supprimer l'activité" }
  }
}

/**
 * Cache une activité
 */
export async function hideActivity(
  activityId: string,
  reason?: string
): Promise<{
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

    const { error } = await supabase
      .from("user_activities")
      .update({
        is_hidden: true,
        hidden_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activityId)
      .eq("user_id", user.id)

    if (error) throw error

    revalidatePath("/feed")
    revalidatePath("/profile")

    return { success: true }
  } catch (error) {
    logDbError("activity-feed.hideActivity", error)
    return { success: false, error: "Impossible de cacher l'activité" }
  }
}

/**
 * Met à jour la visibilité d'une activité
 */
export async function updateActivityVisibility(
  activityId: string,
  visibility: ActivityVisibility
): Promise<{
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

    const { error } = await supabase
      .from("user_activities")
      .update({
        visibility,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activityId)
      .eq("user_id", user.id)

    if (error) throw error

    revalidatePath("/feed")
    revalidatePath("/profile")

    return { success: true }
  } catch (error) {
    logDbError("activity-feed.updateActivityVisibility", error)
    return { success: false, error: "Impossible de modifier la visibilité" }
  }
}

/**
 * Épingle/Désépingle une activité
 */
export async function toggleActivityPin(activityId: string): Promise<{
  success: boolean
  isPinned?: boolean
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

    const { data: activity } = await supabase
      .from("user_activities")
      .select("is_pinned")
      .eq("id", activityId)
      .eq("user_id", user.id)
      .single()

    if (!activity) {
      return { success: false, error: "Activité non trouvée" }
    }

    const newPinned = !activity.is_pinned

    const { error } = await supabase
      .from("user_activities")
      .update({
        is_pinned: newPinned,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activityId)
      .eq("user_id", user.id)

    if (error) throw error

    revalidatePath("/profile")

    return { success: true, isPinned: newPinned }
  } catch (error) {
    logDbError("activity-feed.toggleActivityPin", error)
    return { success: false, error: "Impossible de modifier l'épingle" }
  }
}
