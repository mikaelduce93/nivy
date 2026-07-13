"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { logDbError } from "@/lib/observability/log-db-error"
import {
  type FeedPreferences,
  type VisibilitySettings,
  type FeedOrder,
  type ActivityVisibility,
} from "../schema"

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

    // Colonnes live nullables → on rétablit les valeurs par défaut du domaine
    const preferences: FeedPreferences = data
      ? {
          id: data.id,
          user_id: data.user_id,
          show_friends_activities: data.show_friends_activities ?? true,
          show_crew_activities: data.show_crew_activities ?? true,
          show_following_activities: data.show_following_activities ?? true,
          show_achievements: data.show_achievements ?? true,
          show_level_ups: data.show_level_ups ?? true,
          show_events: data.show_events ?? true,
          show_games: data.show_games ?? true,
          show_collections: data.show_collections ?? true,
          show_social: data.show_social ?? true,
          notify_likes: data.notify_likes ?? true,
          notify_comments: data.notify_comments ?? true,
          notify_mentions: data.notify_mentions ?? true,
          feed_order: (data.feed_order ?? "recent") as FeedOrder,
          created_at: data.created_at ?? undefined,
          updated_at: data.updated_at ?? undefined,
        }
      : {
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
    logDbError("activity-feed.getFeedPreferences", error)
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
    logDbError("activity-feed.updateFeedPreferences", error)
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

    // Colonnes live nullables → on rétablit les valeurs par défaut du domaine
    const settings: VisibilitySettings = data
      ? {
          id: data.id,
          user_id: data.user_id,
          auto_publish_badges: data.auto_publish_badges ?? true,
          auto_publish_level_ups: data.auto_publish_level_ups ?? true,
          auto_publish_event_attendance: data.auto_publish_event_attendance ?? true,
          auto_publish_challenges: data.auto_publish_challenges ?? true,
          auto_publish_collections: data.auto_publish_collections ?? true,
          auto_publish_crew_joins: data.auto_publish_crew_joins ?? false,
          default_visibility: (data.default_visibility ??
            "friends") as ActivityVisibility,
          allow_comments: data.allow_comments ?? true,
          allow_likes: data.allow_likes ?? true,
          allow_shares: data.allow_shares ?? true,
          created_at: data.created_at ?? undefined,
          updated_at: data.updated_at ?? undefined,
        }
      : {
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
    logDbError("activity-feed.getVisibilitySettings", error)
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
    logDbError("activity-feed.updateVisibilitySettings", error)
    return { success: false, error: "Impossible de sauvegarder les paramètres" }
  }
}
