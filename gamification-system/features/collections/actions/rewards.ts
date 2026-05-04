"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getUserSetProgress } from "./user-collections"

/**
 * Réclamer les récompenses d'un set complété
 */
export async function claimSetRewards(
  userId: string,
  setId: string
): Promise<{
  success: boolean
  rewards?: {
    xp: number
    coins: number
    badge_id?: string
    title_id?: string
  }
  error?: string
}> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("claim_set_completion_rewards", {
    p_user_id: userId,
    p_set_id: setId,
  })

  if (error) {
    console.error("Error claiming rewards:", error)
    return { success: false, error: error.message }
  }

  if (!data.success) {
    return { success: false, error: data.error }
  }

  revalidatePath("/collections")
  revalidatePath("/profile")

  return {
    success: true,
    rewards: data.rewards,
  }
}

/**
 * Vérifier si un set est complété
 */
export async function checkSetCompletion(
  userId: string,
  setId: string
): Promise<{
  isCompleted: boolean
  rewardsClaimed: boolean
  itemsCollected: number
  totalItems: number
}> {
  const progress = await getUserSetProgress(userId, setId)

  if (!progress) {
    return {
      isCompleted: false,
      rewardsClaimed: false,
      itemsCollected: 0,
      totalItems: 0,
    }
  }

  return {
    isCompleted: progress.is_completed,
    rewardsClaimed: progress.rewards_claimed,
    itemsCollected: progress.items_collected,
    totalItems: progress.total_items,
  }
}
