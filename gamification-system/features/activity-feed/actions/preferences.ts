"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { type FeedPreferences, type VisibilitySettings } from "../schema"

/**
 * Récupère les préférences du fil
 */
export async function getFeedPreferences(): Promise<{
  success: boolean
  preferences?: FeedPreferences
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

    const { data, error } = await supabase
      .from("activity_feed_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (error && error.code !== "PGRST116") throw error

    const preferences: FeedPreferences = data || {
      id: "",
      user_id: user.id,
      show_friends_activities: true,
      show_crew_activities: true,
      show_following_activities: true,
      show_achievements: true,
      show_level_ups: true,
      show_events: true,
      show_games: true,
      show_collections: true,
      show_social: true,
      notify_likes: true,
      notify_comments: true,
      notify_mentions: true,
      feed_order: "recent",
    }

    return { success: true, preferences }
  } catch (error) {
    console.error("Erreur getFeedPreferences:", error)
    return { success: false, error: "Impossible de charger les préférences" }
  }
}

/**
 * Met à jour les préférences du fil
 */
export async function updateFeedPreferences(
  updates: Partial<Omit<FeedPreferences, "id" | "user_id">>
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
      .from("activity_feed_preferences")
      .upsert({
        user_id: user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      })

    if (error) throw error

    revalidatePath("/feed")
    revalidatePath("/settings")

    return { success: true }
  } catch (error) {
    console.error("Erreur updateFeedPreferences:", error)
    return { success: false, error: "Impossible de sauvegarder les préférences" }
  }
}

/**
 * Récupère les paramètres de visibilité
 */
export async function getVisibilitySettings(): Promise<{
  success: boolean
  settings?: VisibilitySettings
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

    const { data, error } = await supabase
      .from("activity_visibility_settings")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (error && error.code !== "PGRST116") throw error

    const settings: VisibilitySettings = data || {
      id: "",
      user_id: user.id,
      auto_publish_badges: true,
      auto_publish_level_ups: true,
      auto_publish_event_attendance: true,
      auto_publish_challenges: true,
      auto_publish_collections: true,
      auto_publish_crew_joins: false,
      default_visibility: "friends",
      allow_comments: true,
      allow_likes: true,
      allow_shares: true,
    }

    return { success: true, settings }
  } catch (error) {
    console.error("Erreur getVisibilitySettings:", error)
    return { success: false, error: "Impossible de charger les paramètres" }
  }
}

/**
 * Met à jour les paramètres de visibilité
 */
export async function updateVisibilitySettings(
  updates: Partial<Omit<VisibilitySettings, "id" | "user_id">>
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
      .from("activity_visibility_settings")
      .upsert({
        user_id: user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      })

    if (error) throw error

    revalidatePath("/settings")

    return { success: true }
  } catch (error) {
    console.error("Erreur updateVisibilitySettings:", error)
    return { success: false, error: "Impossible de sauvegarder les paramètres" }
  }
}
