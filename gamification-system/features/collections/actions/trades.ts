"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { type CollectionTrade } from "../schema"

/**
 * Créer une proposition d'échange
 */
export async function createTrade(
  senderId: string,
  receiverId: string,
  senderItemIds: string[],
  receiverItemIds: string[],
  message?: string
): Promise<{ success: boolean; tradeId?: string; error?: string }> {
  const supabase = await createClient()

  const { data: senderItems, error: senderError } = await supabase
    .from("user_collectibles")
    .select("item_id, quantity")
    .eq("user_id", senderId)
    .in("item_id", senderItemIds)

  if (senderError || !senderItems || senderItems.length !== senderItemIds.length) {
    return { success: false, error: "You don't own all the items you're offering" }
  }

  const { data: receiverItems, error: receiverError } = await supabase
    .from("user_collectibles")
    .select("item_id, quantity")
    .eq("user_id", receiverId)
    .in("item_id", receiverItemIds)

  if (receiverError || !receiverItems || receiverItems.length !== receiverItemIds.length) {
    return { success: false, error: "The other user doesn't own all the requested items" }
  }

  const { data, error } = await supabase
    .from("collection_trades")
    .insert({
      sender_id: senderId,
      sender_item_ids: senderItemIds,
      receiver_id: receiverId,
      receiver_item_ids: receiverItemIds,
      sender_message: message,
      status: "pending",
    })
    .select("id")
    .single()

  if (error) {
    console.error("Error creating trade:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/collections/trades")

  return { success: true, tradeId: data.id }
}

/**
 * Récupérer les échanges d'un utilisateur
 */
export async function getUserTrades(
  userId: string,
  status?: string
): Promise<CollectionTrade[]> {
  const supabase = await createClient()

  let query = supabase
    .from("collection_trades")
    .select("*")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false })

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching trades:", error)
    return []
  }

  return data || []
}

/**
 * Récupérer un échange par son ID
 */
export async function getTradeById(
  tradeId: string
): Promise<CollectionTrade | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("collection_trades")
    .select("*")
    .eq("id", tradeId)
    .single()

  if (error) {
    console.error("Error fetching trade:", error)
    return null
  }

  return data
}

/**
 * Accepter un échange
 */
export async function acceptTrade(
  tradeId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const trade = await getTradeById(tradeId)
  if (!trade) {
    return { success: false, error: "Trade not found" }
  }

  if (trade.receiver_id !== userId) {
    return { success: false, error: "You are not the receiver of this trade" }
  }

  if (trade.status !== "pending") {
    return { success: false, error: "Trade is no longer pending" }
  }

  for (const itemId of trade.sender_item_ids) {
    await supabase.rpc("transfer_collectible", {
      p_from_user: trade.sender_id,
      p_to_user: trade.receiver_id,
      p_item_id: itemId,
    })
  }

  for (const itemId of trade.receiver_item_ids) {
    await supabase.rpc("transfer_collectible", {
      p_from_user: trade.receiver_id,
      p_to_user: trade.sender_id,
      p_item_id: itemId,
    })
  }

  const { error } = await supabase
    .from("collection_trades")
    .update({
      status: "completed",
      responded_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .eq("id", tradeId)

  if (error) {
    console.error("Error completing trade:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/collections")
  revalidatePath("/collections/trades")

  return { success: true }
}

/**
 * Rejeter un échange
 */
export async function rejectTrade(
  tradeId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const trade = await getTradeById(tradeId)
  if (!trade) {
    return { success: false, error: "Trade not found" }
  }

  if (trade.receiver_id !== userId) {
    return { success: false, error: "You are not the receiver of this trade" }
  }

  const { error } = await supabase
    .from("collection_trades")
    .update({
      status: "rejected",
      responded_at: new Date().toISOString(),
    })
    .eq("id", tradeId)

  if (error) {
    console.error("Error rejecting trade:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/collections/trades")

  return { success: true }
}

/**
 * Annuler un échange (par le sender)
 */
export async function cancelTrade(
  tradeId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const trade = await getTradeById(tradeId)
  if (!trade) {
    return { success: false, error: "Trade not found" }
  }

  if (trade.sender_id !== userId) {
    return { success: false, error: "You are not the sender of this trade" }
  }

  if (trade.status !== "pending") {
    return { success: false, error: "Trade is no longer pending" }
  }

  const { error } = await supabase
    .from("collection_trades")
    .update({ status: "cancelled" })
    .eq("id", tradeId)

  if (error) {
    console.error("Error cancelling trade:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/collections/trades")

  return { success: true }
}

/**
 * Compter les échanges en attente
 */
export async function getPendingTradesCount(userId: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from("collection_trades")
    .select("*", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .eq("status", "pending")

  if (error) {
    console.error("Error counting pending trades:", error)
    return 0
  }

  return count || 0
}
