"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
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

    const { data: activity, error } = await supabase.rpc("create_activity", {
      p_user_id: user.id,
      p_activity_type_slug: activityTypeSlug,
      p_data: data,
      p_title: options?.title || null,
      p_description: options?.description || null,
      p_image_url: options?.imageUrl || null,
      p_target_id: options?.targetId || null,
      p_target_type: options?.targetType || null,
      p_visibility: options?.visibility || null,
    })

    if (error) throw error

    revalidatePath("/feed")
    revalidatePath("/profile")

    return { success: true, activity }
  } catch (error) {
    console.error("Erreur createActivity:", error)
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
    console.error("Erreur deleteActivity:", error)
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
    console.error("Erreur hideActivity:", error)
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
    console.error("Erreur updateActivityVisibility:", error)
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
    console.error("Erreur toggleActivityPin:", error)
    return { success: false, error: "Impossible de modifier l'épingle" }
  }
}
