"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { type CollectibleItem } from "../schema"

/**
 * Marquer un collectible comme vu (enlever le badge "nouveau")
 */
export async function markCollectibleAsSeen(
  userId: string,
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("user_collectibles")
    .update({ is_new: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("item_id", itemId)

  if (error) {
    console.error("Error marking collectible as seen:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Marquer tous les collectibles comme vus
 */
export async function markAllCollectiblesAsSeen(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("user_collectibles")
    .update({ is_new: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_new", true)

  if (error) {
    console.error("Error marking all collectibles as seen:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/collections")

  return { success: true }
}

/**
 * Toggle favori sur un collectible
 */
export async function toggleCollectibleFavorite(
  userId: string,
  itemId: string
): Promise<{ success: boolean; isFavorite?: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: current, error: fetchError } = await supabase
    .from("user_collectibles")
    .select("is_favorite")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .single()

  if (fetchError) {
    console.error("Error fetching collectible:", fetchError)
    return { success: false, error: fetchError.message }
  }

  const newFavorite = !current.is_favorite

  const { error } = await supabase
    .from("user_collectibles")
    .update({ is_favorite: newFavorite, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("item_id", itemId)

  if (error) {
    console.error("Error toggling favorite:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/collections")

  return { success: true, isFavorite: newFavorite }
}

/**
 * Récupérer les collectibles favoris
 */
export async function getFavoriteCollectibles(
  userId: string
): Promise<CollectibleItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_collectibles")
    .select(
      `
      item_id,
      collectible_items(*)
    `
    )
    .eq("user_id", userId)
    .eq("is_favorite", true)

  if (error) {
    console.error("Error fetching favorite collectibles:", error)
    return []
  }

  return data?.map((d: any) => d.collectible_items) || []
}
