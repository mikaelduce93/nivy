"use server"

import { createClient } from "@/lib/supabase/server"
import { logDbError } from "@/lib/observability/log-db-error"
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
    logDbError("collections.getUserCollections", error)
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
    logDbError("collections.getUserCollectiblesForSet", error)
    return []
  }

  // Colonnes nullables en base → coalesce vers les défauts du type domaine
  return (data || []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    item_id: row.item_id,
    obtained_at: row.obtained_at ?? "",
    obtained_from: row.obtained_from,
    quantity: row.quantity ?? 1,
    is_new: row.is_new ?? true,
    is_favorite: row.is_favorite ?? false,
    source_event_id: row.source_event_id,
    source_game_id: row.source_game_id,
    gifted_by_user_id: row.gifted_by_user_id,
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
  }))
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
    logDbError("collections.getUserSetProgress", error)
    return null
  }

  if (!data) return null

  // Colonnes nullables en base → coalesce vers les défauts du type domaine
  return {
    id: data.id,
    user_id: data.user_id,
    set_id: data.set_id,
    items_collected: data.items_collected ?? 0,
    total_items: data.total_items ?? 0,
    completion_percentage: data.completion_percentage ?? 0,
    is_completed: data.is_completed ?? false,
    completed_at: data.completed_at,
    rewards_claimed: data.rewards_claimed ?? false,
    rewards_claimed_at: data.rewards_claimed_at,
    created_at: data.created_at ?? undefined,
    updated_at: data.updated_at ?? undefined,
  }
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
    p_source_event_id: sourceEventId ?? undefined,
    p_gifted_by: giftedBy ?? undefined,
  })

  if (error) {
    logDbError("collections.addCollectibleToUser", error)
    return { success: false, error: error.message }
  }

  if (!data) {
    return { success: false, error: "Réponse vide du serveur" }
  }

  revalidatePath("/collections")
  revalidatePath("/profile")

  // La RPC renvoie du Json → cast de frontière vers la forme applicative
  const result = data as unknown as {
    success: boolean
    is_new_item?: boolean
    quantity?: number
    item?: CollectibleItem
    progress?: {
      items_collected: number
      total_items: number
      percentage: number
      is_completed: boolean
    }
    error?: string
  }

  return {
    success: result.success,
    isNewItem: result.is_new_item,
    quantity: result.quantity,
    item: result.item,
    progress: result.progress,
    error: result.error,
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
    p_set_id: setId ?? undefined,
    p_rarity: rarity ?? undefined,
  })

  if (error) {
    logDbError("collections.getRandomCollectible", error)
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
