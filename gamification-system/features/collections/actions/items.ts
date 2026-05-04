"use server"

import { createClient } from "@/lib/supabase/server"
import { type CollectibleItem, type Rarity } from "../schema"

/**
 * Récupérer tous les items d'un set
 */
export async function getCollectionItems(
  setId: string
): Promise<CollectibleItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("collectible_items")
    .select("*")
    .eq("set_id", setId)
    .eq("is_active", true)
    .order("item_number", { ascending: true })

  if (error) {
    console.error("Error fetching collection items:", error)
    return []
  }

  return data || []
}

/**
 * Récupérer un item par son ID
 */
export async function getCollectibleItem(
  itemId: string
): Promise<CollectibleItem | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("collectible_items")
    .select("*")
    .eq("id", itemId)
    .single()

  if (error) {
    console.error("Error fetching collectible item:", error)
    return null
  }

  return data
}

/**
 * Récupérer les items par rareté
 */
export async function getItemsByRarity(
  rarity: Rarity,
  setId?: string
): Promise<CollectibleItem[]> {
  const supabase = await createClient()

  let query = supabase
    .from("collectible_items")
    .select("*")
    .eq("rarity", rarity)
    .eq("is_active", true)

  if (setId) {
    query = query.eq("set_id", setId)
  }

  const { data, error } = await query.order("item_number", { ascending: true })

  if (error) {
    console.error("Error fetching items by rarity:", error)
    return []
  }

  return data || []
}
