"use server"

import { createClient } from "@/lib/supabase/server"
import { type Rarity, type CollectibleItem } from "../schema"

/**
 * Récupérer les statistiques globales de collection
 */
export async function getCollectionStats(userId: string): Promise<{
  totalItems: number
  uniqueItems: number
  duplicates: number
  setsCompleted: number
  totalSets: number
  rarityBreakdown: Record<Rarity, number>
  completionPercentage: number
}> {
  const supabase = await createClient()

  const { data: userItems, error: itemsError } = await supabase
    .from("user_collectibles")
    .select("item_id, quantity")
    .eq("user_id", userId)

  const { count: totalSets } = await supabase
    .from("collection_sets")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)

  const { count: setsCompleted } = await supabase
    .from("user_collection_progress")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_completed", true)

  const { data: rarityData } = await supabase
    .from("user_collectibles")
    .select(
      `
      collectible_items!inner(rarity)
    `
    )
    .eq("user_id", userId)

  const rarityBreakdown: Record<Rarity, number> = {
    common: 0,
    uncommon: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
  }

  rarityData?.forEach((item: any) => {
    const rarity = item.collectible_items.rarity as Rarity
    rarityBreakdown[rarity] = (rarityBreakdown[rarity] || 0) + 1
  })

  const uniqueItems = userItems?.length || 0
  const totalItems = userItems?.reduce((sum, i) => sum + i.quantity, 0) || 0
  const duplicates = totalItems - uniqueItems

  const { count: totalAvailable } = await supabase
    .from("collectible_items")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)

  const completionPercentage = totalAvailable
    ? Math.round((uniqueItems / totalAvailable) * 100)
    : 0

  return {
    totalItems,
    uniqueItems,
    duplicates,
    setsCompleted: setsCompleted || 0,
    totalSets: totalSets || 0,
    rarityBreakdown,
    completionPercentage,
  }
}

/**
 * Récupérer le leaderboard des collectionneurs
 */
export async function getCollectorsLeaderboard(
  limit: number = 10
): Promise<
  Array<{
    user_id: string
    unique_items: number
    total_items: number
    sets_completed: number
  }>
> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_collectibles")
    .select("user_id")
    .order("user_id")

  if (error || !data) {
    return []
  }

  const userCounts: Record<
    string,
    { unique: number; total: number; completed: number }
  > = {}

  const uniqueUsers = [...new Set(data.map((d) => d.user_id))]

  for (const userId of uniqueUsers.slice(0, limit * 2)) {
    const stats = await getCollectionStats(userId)
    userCounts[userId] = {
      unique: stats.uniqueItems,
      total: stats.totalItems,
      completed: stats.setsCompleted,
    }
  }

  return Object.entries(userCounts)
    .map(([userId, counts]) => ({
      user_id: userId,
      unique_items: counts.unique,
      total_items: counts.total,
      sets_completed: counts.completed,
    }))
    .sort((a, b) => b.unique_items - a.unique_items)
    .slice(0, limit)
}

/**
 * Récupérer les nouveaux collectibles (non vus)
 */
export async function getNewCollectiblesCount(userId: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from("user_collectibles")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_new", true)

  if (error) {
    return 0
  }

  return count || 0
}

/**
 * Récupérer les items récemment obtenus
 */
export async function getRecentCollectibles(
  userId: string,
  limit: number = 10
): Promise<
  Array<{
    item: CollectibleItem
    obtained_at: string
    is_new: boolean
  }>
> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_collectibles")
    .select(
      `
      obtained_at,
      is_new,
      collectible_items(*)
    `
    )
    .eq("user_id", userId)
    .order("obtained_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching recent collectibles:", error)
    return []
  }

  return (
    data?.map((d: any) => ({
      item: d.collectible_items,
      obtained_at: d.obtained_at,
      is_new: d.is_new,
    })) || []
  )
}
