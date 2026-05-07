import { createClient } from "@/lib/supabase/server"
import { APIResponse } from "../../lib/responses"
import { recordSignalAsync } from "@/lib/analytics/signals"

export const FriendHandlers = {
  // GET Handlers
  async list(teenId: string) {
    const supabase = await createClient()
    const { data: friendships, error } = await supabase.rpc("get_friends", { p_teen_id: teenId })
    
    if (error) return APIResponse.serverError("Failed to fetch friends", error)

    const friendIds = friendships?.map((f: any) => f.friend_id) || []
    let friends: any[] = []

    if (friendIds.length > 0) {
      const { data: friendDetails } = await supabase
        .from("teens")
        .select("id, first_name, last_name, avatar_url")
        .in("id", friendIds)
      friends = friendDetails || []
    }

    const enrichedFriends = friendships?.map((f: any) => ({
      ...friends.find((fd) => fd.id === f.friend_id),
      friendship: {
        id: f.friendship_id,
        level: f.friendship_level,
        is_best_friend: f.is_best_friend,
        is_favorite: f.is_favorite,
        nickname: f.nickname,
        accepted_at: f.accepted_at,
        last_interaction_at: f.last_interaction_at,
      },
    }))

    const { count: totalFriends } = await supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .or(`user1_id.eq.${teenId},user2_id.eq.${teenId}`)
      .eq("status", "accepted")

    const { count: pendingRequests } = await supabase
      .from("friend_requests")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", teenId)
      .eq("status", "pending")

    return APIResponse.success({
      friends: enrichedFriends || [],
      stats: {
        total_friends: totalFriends || 0,
        pending_requests: pendingRequests || 0,
        best_friends: enrichedFriends?.filter((f: any) => f.friendship.is_best_friend).length || 0,
      },
    })
  },

  async requests(teenId: string, limit: number) {
    const supabase = await createClient()
    const { data: requests, error } = await supabase
      .from("friend_requests")
      .select(`*, sender:sender_id (id, first_name, last_name, avatar_url)`)
      .eq("receiver_id", teenId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) return APIResponse.serverError("Failed to fetch requests", error)

    const enrichedRequests = await Promise.all(
      (requests || []).map(async (req) => {
        const { data: mutualCount } = await supabase.rpc("get_mutual_friends_count", {
          p_user1: teenId,
          p_user2: req.sender_id,
        })
        return { ...req, mutual_friends_count: mutualCount || 0 }
      })
    )

    return APIResponse.success({ requests: enrichedRequests })
  },

  async sent(teenId: string, limit: number) {
    const supabase = await createClient()
    const { data: requests, error } = await supabase
      .from("friend_requests")
      .select(`*, receiver:receiver_id (id, first_name, last_name, avatar_url)`)
      .eq("sender_id", teenId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) return APIResponse.serverError("Failed to fetch sent requests", error)
    return APIResponse.success({ requests })
  },

  async suggestions(teenId: string, limit: number) {
    const supabase = await createClient()
    await supabase.rpc("generate_friend_suggestions", { p_teen_id: teenId, p_limit: limit })

    const { data: suggestions, error } = await supabase
      .from("friend_suggestions")
      .select(`*, suggested_teen:suggested_teen_id (id, first_name, last_name, avatar_url)`)
      .eq("teen_id", teenId)
      .eq("dismissed", false)
      .order("score", { ascending: false })
      .limit(limit)

    if (error) return APIResponse.serverError("Failed to fetch suggestions", error)

    const enrichedSuggestions = await Promise.all(
      (suggestions || []).map(async (sug) => {
        const { data: mutualCount } = await supabase.rpc("get_mutual_friends_count", {
          p_user1: teenId,
          p_user2: sug.suggested_teen_id,
        })
        return { ...sug, mutual_friends_count: mutualCount || 0 }
      })
    )

    return APIResponse.success({ suggestions: enrichedSuggestions })
  },

  async search(teenId: string, query: string, limit: number) {
    if (!query || query.length < 2) return APIResponse.success({ results: [] })

    const supabase = await createClient()
    const { data: results, error } = await supabase
      .from("teens")
      .select("id, first_name, last_name, avatar_url")
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
      .neq("id", teenId)
      .limit(limit)

    if (error) return APIResponse.serverError("Search failed", error)

    const enrichedResults = await Promise.all(
      (results || []).map(async (result) => {
        const { data: areFriends } = await supabase.rpc("are_friends", { p_user1: teenId, p_user2: result.id })
        const { data: pendingRequest } = await supabase
          .from("friend_requests")
          .select("id, status")
          .or(`and(sender_id.eq.${teenId},receiver_id.eq.${result.id}),and(sender_id.eq.${result.id},receiver_id.eq.${teenId})`)
          .eq("status", "pending")
          .single()
        const { data: mutualCount } = await supabase.rpc("get_mutual_friends_count", { p_user1: teenId, p_user2: result.id })

        return {
          ...result,
          is_friend: areFriends || false,
          pending_request: pendingRequest ? { id: pendingRequest.id, is_sender: pendingRequest.status === "pending" } : null,
          mutual_friends_count: mutualCount || 0,
        }
      })
    )

    return APIResponse.success({ results: enrichedResults })
  },

  // POST Handlers
  async sendRequest(teenId: string, targetTeenId: string, message?: string) {
    if (!targetTeenId) return APIResponse.error("targetTeenId is required")
    const supabase = await createClient()
    const { data: requestId, error } = await supabase.rpc("send_friend_request", {
      p_sender_id: teenId,
      p_receiver_id: targetTeenId,
      p_message: message || null,
    })

    if (error) return APIResponse.error(error.message || "Failed to send request")
    return APIResponse.success({ message: "Friend request sent", requestId })
  },

  async accept(teenId: string, requestId: string) {
    if (!requestId) return APIResponse.error("requestId is required")
    const supabase = await createClient()

    // Resolve sender_id BEFORE accept so we can emit a personalization signal
    // even after the row's status flips to 'accepted'.
    const { data: req } = await supabase
      .from("friend_requests")
      .select("sender_id")
      .eq("id", requestId)
      .eq("receiver_id", teenId)
      .maybeSingle()

    const { data: friendshipId, error } = await supabase.rpc("accept_friend_request", {
      p_request_id: requestId,
      p_receiver_id: teenId,
    })

    if (error) return APIResponse.error(error.message || "Failed to accept request")

    // Wave 1.2 — capture friend favorite signal (best-effort).
    if (req?.sender_id) {
      recordSignalAsync({
        teenId,
        signalType: "favorite",
        targetType: "friend_profile",
        targetId: req.sender_id,
        metadata: { request_id: requestId, friendship_id: friendshipId ?? null },
      })
    }

    return APIResponse.success({ message: "Friend request accepted", friendshipId })
  },

  async decline(teenId: string, requestId: string) {
    if (!requestId) return APIResponse.error("requestId is required")
    const supabase = await createClient()
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", requestId)
      .eq("receiver_id", teenId)

    if (error) return APIResponse.serverError("Failed to decline request", error)
    return APIResponse.success({ message: "Friend request declined" })
  },

  async cancel(teenId: string, requestId: string) {
    if (!requestId) return APIResponse.error("requestId is required")
    const supabase = await createClient()
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "cancelled" })
      .eq("id", requestId)
      .eq("sender_id", teenId)

    if (error) return APIResponse.serverError("Failed to cancel request", error)
    return APIResponse.success({ message: "Friend request cancelled" })
  },

  async remove(teenId: string, targetTeenId: string) {
    if (!targetTeenId) return APIResponse.error("targetTeenId is required")
    const supabase = await createClient()
    const [user1, user2] = teenId < targetTeenId ? [teenId, targetTeenId] : [targetTeenId, teenId]
    const { error } = await supabase.from("friendships").delete().eq("user1_id", user1).eq("user2_id", user2)

    if (error) return APIResponse.serverError("Failed to remove friend", error)
    return APIResponse.success({ message: "Friend removed" })
  },

  async block(teenId: string, targetTeenId: string) {
    if (!targetTeenId) return APIResponse.error("targetTeenId is required")
    const supabase = await createClient()
    const [user1, user2] = teenId < targetTeenId ? [teenId, targetTeenId] : [targetTeenId, teenId]
    
    await supabase.from("friendships").delete().eq("user1_id", user1).eq("user2_id", user2)
    await supabase.from("friend_requests").update({ status: "cancelled" })
      .or(`and(sender_id.eq.${teenId},receiver_id.eq.${targetTeenId}),and(sender_id.eq.${targetTeenId},receiver_id.eq.${teenId})`)
      .eq("status", "pending")

    const { error } = await supabase.from("blocked_users").upsert({ blocker_id: teenId, blocked_id: targetTeenId }, { onConflict: "blocker_id,blocked_id" })

    if (error) return APIResponse.serverError("Failed to block user", error)
    return APIResponse.success({ message: "User blocked" })
  },

  async unblock(teenId: string, targetTeenId: string) {
    if (!targetTeenId) return APIResponse.error("targetTeenId is required")
    const supabase = await createClient()
    const { error } = await supabase.from("blocked_users").delete().eq("blocker_id", teenId).eq("blocked_id", targetTeenId)

    if (error) return APIResponse.serverError("Failed to unblock user", error)
    return APIResponse.success({ message: "User unblocked" })
  },

  async toggleFriendshipField(teenId: string, targetTeenId: string, field: "is_favorite" | "is_best_friend") {
    if (!targetTeenId) return APIResponse.error("targetTeenId is required")
    const supabase = await createClient()
    const [user1, user2] = teenId < targetTeenId ? [teenId, targetTeenId] : [targetTeenId, teenId]

    const { data: friendship } = await supabase.from("friendships").select("is_favorite, is_best_friend").eq("user1_id", user1).eq("user2_id", user2).single()
    if (!friendship) return APIResponse.error("Friendship not found", 404)

    const newValue = !friendship[field]
    const { error } = await supabase.from("friendships").update({ [field]: newValue, updated_at: new Date().toISOString() }).eq("user1_id", user1).eq("user2_id", user2)

    if (error) return APIResponse.serverError("Failed to update", error)
    return APIResponse.success({ [field]: newValue })
  },

  async setNickname(teenId: string, targetTeenId: string, nickname: string) {
    if (!targetTeenId) return APIResponse.error("targetTeenId is required")
    const supabase = await createClient()
    const [user1, user2] = teenId < targetTeenId ? [teenId, targetTeenId] : [targetTeenId, teenId]
    const { error } = await supabase.from("friendships").update({ nickname: nickname || null, updated_at: new Date().toISOString() }).eq("user1_id", user1).eq("user2_id", user2)

    if (error) return APIResponse.serverError("Failed to set nickname", error)
    return APIResponse.success({ message: "Nickname updated" })
  },

  async dismissSuggestion(teenId: string, targetTeenId: string) {
    if (!targetTeenId) return APIResponse.error("targetTeenId is required")
    const supabase = await createClient()
    const { error } = await supabase.from("friend_suggestions").update({ dismissed: true, dismissed_at: new Date().toISOString() }).eq("teen_id", teenId).eq("suggested_teen_id", targetTeenId)

    if (error) return APIResponse.serverError("Failed to dismiss", error)
    return APIResponse.success({ message: "Suggestion dismissed" })
  },
}
