"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  type UserCollectible,
  type UserCollectionProgress,
  type UserCollectionsResponse,
  type CollectibleItem,
  type Rarity,
} from "../schema"

/**
 * Récupérer les collections complètes d'un utilisateur
 */
export async function getUserCollections(
  userId: string
): Promise<UserCollectionsResponse | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("get_user_collections", {
    p_user_id: userId,
  })

  if (error) {
    console.error("Error fetching user collections:", error)
    return null
  }

  return data as UserCollectionsResponse
}

/**
 * Récupérer les collectibles d'un utilisateur pour un set
 */
export async function getUserCollectiblesForSet(
  userId: string,
  setId: string
): Promise<UserCollectible[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_collectibles")
    .select(
      `
      *,
      collectible_items!inner(set_id)
    `
    )
    .eq("user_id", userId)
    .eq("collectible_items.set_id", setId)

  if (error) {
    console.error("Error fetching user collectibles:", error)
    return []
  }

  return data || []
}

/**
 * Récupérer la progression d'un utilisateur pour un set
 */
export async function getUserSetProgress(
  userId: string,
  setId: string
): Promise<UserCollectionProgress | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_collection_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("set_id", setId)
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching user set progress:", error)
    return null
  }

  return data
}

/**
 * Ajouter un collectible à un utilisateur
 */
export async function addCollectibleToUser(
  userId: string,
  itemId: string,
  source: string = "system",
  sourceEventId?: string,
  giftedBy?: string
): Promise<{
  success: boolean
  isNewItem?: boolean
  quantity?: number
  item?: CollectibleItem
  progress?: {
    items_collected: number
    total_items: number
    percentage: number
    is_completed: boolean
  }
  error?: string
}> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("add_collectible_to_user", {
    p_user_id: userId,
    p_item_id: itemId,
    p_source: source,
    p_source_event_id: sourceEventId || null,
    p_gifted_by: giftedBy || null,
  })

  if (error) {
    console.error("Error adding collectible:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/collections")
  revalidatePath("/profile")

  return {
    success: data.success,
    isNewItem: data.is_new_item,
    quantity: data.quantity,
    item: data.item,
    progress: data.progress,
    error: data.error,
  }
}

/**
 * Obtenir un item aléatoire (pour les drops)
 */
export async function getRandomCollectible(
  setId?: string,
  rarity?: Rarity
): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("get_random_collectible", {
    p_set_id: setId || null,
    p_rarity: rarity || null,
  })

  if (error) {
    console.error("Error getting random collectible:", error)
    return null
  }

  return data
}

/**
 * Ouvrir un pack de collectibles
 */
export async function openCollectiblePack(
  userId: string,
  packType: "standard" | "premium" | "legendary",
  setId?: string
): Promise<{
  success: boolean
  items?: CollectibleItem[]
  results?: Array<{
    item: CollectibleItem
    isNew: boolean
    quantity: number
  }>
  error?: string
}> {
  const supabase = await createClient()

  const packConfig = {
    standard: { count: 3, guaranteedRarity: null },
    premium: { count: 5, guaranteedRarity: "rare" as Rarity },
    legendary: { count: 7, guaranteedRarity: "epic" as Rarity },
  }

  const config = packConfig[packType]
  const results: Array<{
    item: CollectibleItem
    isNew: boolean
    quantity: number
  }> = []

  for (let i = 0; i < config.count; i++) {
    const guaranteeRarity =
      i === config.count - 1 && config.guaranteedRarity
        ? config.guaranteedRarity
        : undefined

    const itemId = await getRandomCollectible(setId, guaranteeRarity)
    if (!itemId) continue

    const result = await addCollectibleToUser(userId, itemId, "pack")
    if (result.success && result.item) {
      results.push({
        item: result.item,
        isNew: result.isNewItem || false,
        quantity: result.quantity || 1,
      })
    }
  }

  revalidatePath("/collections")

  return {
    success: results.length > 0,
    items: results.map((r) => r.item),
    results,
  }
}
