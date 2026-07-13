"use server"

import { createClient } from "@/lib/supabase/server"
import { logDbError } from "@/lib/observability/log-db-error"
import {
  type CollectibleItem,
  type Rarity,
  type AnimationType,
  type ObtainableFrom,
} from "../schema"

/**
 * Normalise une ligne live `collectible_items` (nullables + colonnes texte)
 * vers le type domaine `CollectibleItem`.
 */
function mapCollectibleItem(row: {
  id: string
  set_id: string
  slug: string
  name: string
  description: string | null
  image_url: string
  thumbnail_url: string | null
  animation_type: string | null
  item_number: number
  rarity: string
  drop_rate: number | null
  obtainable_from: string[] | null
  event_exclusive: boolean | null
  event_id: string | null
  coin_price: number | null
  is_active: boolean | null
  created_at: string | null
}): CollectibleItem {
  return {
    id: row.id,
    set_id: row.set_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    image_url: row.image_url,
    thumbnail_url: row.thumbnail_url,
    // Colonnes texte/jsonb en base → enums domaine
    animation_type: row.animation_type as AnimationType | null,
    item_number: row.item_number,
    rarity: row.rarity as Rarity,
    drop_rate: row.drop_rate ?? 0.3,
    obtainable_from: (row.obtainable_from ?? []) as ObtainableFrom[],
    event_exclusive: row.event_exclusive ?? false,
    event_id: row.event_id,
    coin_price: row.coin_price,
    is_active: row.is_active ?? true,
    created_at: row.created_at ?? undefined,
  }
}

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
    logDbError("collections.getCollectionItems", error)
    return []
  }

  return (data ?? []).map(mapCollectibleItem)
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
    logDbError("collections.getCollectibleItem", error)
    return null
  }

  return mapCollectibleItem(data)
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
    logDbError("collections.getItemsByRarity", error)
    return []
  }

  return (data ?? []).map(mapCollectibleItem)
}
