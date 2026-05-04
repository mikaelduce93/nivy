'use server'

/**
 * TEENS PARTY MOROCCO - Leaderboard Domain Actions
 * ================================================
 *
 * Server Actions pour le système de leaderboard.
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  getLeaderboardSchema,
  getFriendsLeaderboardSchema,
  getUserRankSchema,
  sendFriendRequestSchema,
  respondFriendRequestSchema,
  getFriendsListSchema,
  searchUsersSchema,
  type GetLeaderboardInput,
  type GetFriendsLeaderboardInput,
  type GetUserRankInput,
  type SendFriendRequestInput,
  type RespondFriendRequestInput,
  type ActionResult,
  type LeaderboardEntry,
  type LeaderboardData,
  type UserRank,
  type Friend,
  type FriendRequest,
  type UserSearchResult,
  type LeaderboardType,
} from './schema'

/* ==========================================================================
   HELPER: Get Supabase client
   ========================================================================== */

async function getSupabaseClient() {
  return await createClient()
}

/* ==========================================================================
   LEADERBOARD
   ========================================================================== */

/**
 * Récupère le leaderboard global
 */
export async function getLeaderboard(
  input: GetLeaderboardInput
): Promise<ActionResult<LeaderboardData>> {
  try {
    const validation = getLeaderboardSchema.safeParse(input)
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { type, limit, offset, city } = validation.data
    const supabase = await getSupabaseClient()

    let entries: LeaderboardEntry[] = []
    let totalParticipants = 0

    if (type === 'city' && city) {
      // Leaderboard par ville
      const { data, error } = await supabase.rpc('get_city_leaderboard', {
        p_city: city,
        p_type: 'all_time',
        p_limit: limit,
      })

      if (error) throw error
      entries = (data || []).map((e: any) => ({
        ...e,
        current_streak: 0,
        percentile: 0,
      }))
    } else {
      // Leaderboard standard (all_time, weekly, monthly)
      const { data, error } = await supabase.rpc('get_leaderboard', {
        p_type: type,
        p_limit: limit,
        p_offset: offset,
      })

      if (error) throw error
      entries = data || []
    }

    // Calculer le nombre total de participants
    if (type === 'all_time') {
      const { count } = await supabase
        .from('user_xp')
        .select('*', { count: 'exact', head: true })
        .gt('total_xp', 0)

      totalParticipants = count || 0
    } else if (type === 'weekly') {
      const weekStart = getWeekStart()
      const { count } = await supabase
        .from('xp_weekly')
        .select('*', { count: 'exact', head: true })
        .eq('week_start', weekStart)
        .gt('xp_earned', 0)

      totalParticipants = count || 0
    } else if (type === 'monthly') {
      const now = new Date()
      const { count } = await supabase
        .from('xp_monthly')
        .select('*', { count: 'exact', head: true })
        .eq('month', now.getMonth() + 1)
        .eq('year', now.getFullYear())
        .gt('xp_earned', 0)

      totalParticipants = count || 0
    }

    return {
      success: true,
      data: {
        entries,
        total_participants: totalParticipants,
        period: getPeriodInfo(type),
      },
    }
  } catch (error: any) {
    console.error('[leaderboard/getLeaderboard] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Récupère le leaderboard entre amis
 */
export async function getFriendsLeaderboard(
  input: GetFriendsLeaderboardInput
): Promise<ActionResult<LeaderboardEntry[]>> {
  try {
    const validation = getFriendsLeaderboardSchema.safeParse(input)
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { teenId, type, limit } = validation.data
    const supabase = await getSupabaseClient()

    const { data, error } = await supabase.rpc('get_friends_leaderboard', {
      p_teen_id: teenId,
      p_type: type,
      p_limit: limit,
    })

    if (error) throw error

    const entries: LeaderboardEntry[] = (data || []).map((e: any) => ({
      teen_id: e.teen_id,
      pseudo: e.pseudo,
      avatar_url: e.avatar_url,
      city: null,
      xp: e.xp,
      level: e.level,
      current_streak: 0,
      rank: e.rank,
      percentile: 0,
      is_current_user: e.is_current_user,
    }))

    return { success: true, data: entries }
  } catch (error: any) {
    console.error('[leaderboard/getFriendsLeaderboard] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Récupère le rang d'un utilisateur
 */
export async function getUserRank(
  input: GetUserRankInput
): Promise<ActionResult<UserRank>> {
  try {
    const validation = getUserRankSchema.safeParse(input)
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { teenId, type } = validation.data
    const supabase = await getSupabaseClient()

    const { data, error } = await supabase.rpc('get_user_rank', {
      p_teen_id: teenId,
      p_type: type,
    })

    if (error) throw error

    return { success: true, data: data as UserRank }
  } catch (error: any) {
    console.error('[leaderboard/getUserRank] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Récupère tous les rangs d'un utilisateur (all types)
 */
export async function getAllUserRanks(
  teenId: string
): Promise<ActionResult<Record<LeaderboardType, UserRank>>> {
  try {
    const types: LeaderboardType[] = ['all_time', 'weekly', 'monthly']
    const ranks: Record<string, UserRank> = {}

    for (const type of types) {
      const result = await getUserRank({ teenId, type })
      if (result.success) {
        ranks[type] = result.data
      }
    }

    return { success: true, data: ranks as Record<LeaderboardType, UserRank> }
  } catch (error: any) {
    console.error('[leaderboard/getAllUserRanks] Error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   FRIENDS
   ========================================================================== */

/**
 * Envoie une demande d'ami
 */
export async function sendFriendRequest(
  input: SendFriendRequestInput
): Promise<ActionResult<{ message: string }>> {
  try {
    const validation = sendFriendRequestSchema.safeParse(input)
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { fromTeenId, toTeenId } = validation.data
    const supabase = await getSupabaseClient()

    const { data, error } = await supabase.rpc('send_friend_request', {
      p_from_teen_id: fromTeenId,
      p_to_teen_id: toTeenId,
    })

    if (error) throw error

    if (!data.success) {
      return { success: false, error: data.error }
    }

    revalidatePath('/friends')
    return { success: true, data: { message: data.message } }
  } catch (error: any) {
    console.error('[leaderboard/sendFriendRequest] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Accepte une demande d'ami
 */
export async function acceptFriendRequest(
  connectionId: string,
  teenId: string
): Promise<ActionResult<{ message: string }>> {
  try {
    const validation = respondFriendRequestSchema.safeParse({
      connectionId,
      teenId,
      accept: true,
    })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const supabase = await getSupabaseClient()

    const { data, error } = await supabase.rpc('accept_friend_request', {
      p_connection_id: connectionId,
      p_teen_id: teenId,
    })

    if (error) throw error

    if (!data.success) {
      return { success: false, error: data.error }
    }

    revalidatePath('/friends')
    revalidatePath('/leaderboard')
    return { success: true, data: { message: data.message } }
  } catch (error: any) {
    console.error('[leaderboard/acceptFriendRequest] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Refuse/bloque une demande d'ami
 */
export async function rejectFriendRequest(
  connectionId: string,
  teenId: string,
  block: boolean = false
): Promise<ActionResult<null>> {
  try {
    const supabase = await getSupabaseClient()

    const { error } = await supabase
      .from('friend_connections')
      .update({
        status: block ? 'blocked' : 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)
      .eq('friend_teen_id', teenId)

    if (error) throw error

    // Si on ne bloque pas, on supprime la demande
    if (!block) {
      await supabase
        .from('friend_connections')
        .delete()
        .eq('id', connectionId)
    }

    revalidatePath('/friends')
    return { success: true, data: null }
  } catch (error: any) {
    console.error('[leaderboard/rejectFriendRequest] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Récupère la liste d'amis
 */
export async function getFriendsList(
  teenId: string
): Promise<ActionResult<Friend[]>> {
  try {
    const validation = getFriendsListSchema.safeParse({ teenId })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const supabase = await getSupabaseClient()

    const { data, error } = await supabase.rpc('get_friends_list', {
      p_teen_id: teenId,
    })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('[leaderboard/getFriendsList] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Récupère les demandes d'amis en attente
 */
export async function getPendingFriendRequests(
  teenId: string
): Promise<ActionResult<FriendRequest[]>> {
  try {
    const supabase = await getSupabaseClient()

    const { data, error } = await supabase
      .from('friend_connections')
      .select(`
        *,
        requester:teen_id (
          pseudo,
          avatar_url
        )
      `)
      .eq('friend_teen_id', teenId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error

    const requests: FriendRequest[] = (data || []).map((item: any) => ({
      id: item.id,
      teen_id: item.teen_id,
      friend_teen_id: item.friend_teen_id,
      status: item.status,
      initiated_by: item.initiated_by,
      created_at: item.created_at,
      accepted_at: item.accepted_at,
      requester: item.requester ? {
        pseudo: item.requester.pseudo,
        avatar_url: item.requester.avatar_url,
        level: 1, // Need to join user_xp if needed
      } : undefined,
    }))

    return { success: true, data: requests }
  } catch (error: any) {
    console.error('[leaderboard/getPendingFriendRequests] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Supprime un ami
 */
export async function removeFriend(
  teenId: string,
  friendId: string
): Promise<ActionResult<null>> {
  try {
    const supabase = await getSupabaseClient()

    const { error } = await supabase
      .from('friend_connections')
      .delete()
      .or(`and(teen_id.eq.${teenId},friend_teen_id.eq.${friendId}),and(teen_id.eq.${friendId},friend_teen_id.eq.${teenId})`)
      .eq('status', 'accepted')

    if (error) throw error

    revalidatePath('/friends')
    revalidatePath('/leaderboard')
    return { success: true, data: null }
  } catch (error: any) {
    console.error('[leaderboard/removeFriend] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Recherche des utilisateurs
 */
export async function searchUsers(
  query: string,
  teenId: string,
  limit: number = 10
): Promise<ActionResult<UserSearchResult[]>> {
  try {
    const validation = searchUsersSchema.safeParse({ query, teenId, limit })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const supabase = await getSupabaseClient()

    // Rechercher les utilisateurs
    const { data: users, error: usersError } = await supabase
      .from('teens')
      .select(`
        id,
        pseudo,
        avatar_url
      `)
      .ilike('pseudo', `%${query}%`)
      .neq('id', teenId)
      .limit(limit)

    if (usersError) throw usersError

    if (!users || users.length === 0) {
      return { success: true, data: [] }
    }

    // Récupérer les XP
    const userIds = users.map((u) => u.id)
    const { data: xpData } = await supabase
      .from('user_xp')
      .select('teen_id, level, total_xp')
      .in('teen_id', userIds)

    const xpMap = new Map(xpData?.map((x) => [x.teen_id, x]) || [])

    // Récupérer les relations d'amitié
    const { data: friendships } = await supabase
      .from('friend_connections')
      .select('teen_id, friend_teen_id, status')
      .or(`teen_id.eq.${teenId},friend_teen_id.eq.${teenId}`)
      .in('status', ['accepted', 'pending'])

    const friendshipMap = new Map<string, { isFriend: boolean; isPending: boolean }>()
    for (const f of friendships || []) {
      const otherId = f.teen_id === teenId ? f.friend_teen_id : f.teen_id
      friendshipMap.set(otherId, {
        isFriend: f.status === 'accepted',
        isPending: f.status === 'pending',
      })
    }

    const results: UserSearchResult[] = users.map((user) => {
      const xp = xpMap.get(user.id)
      const friendship = friendshipMap.get(user.id)

      return {
        id: user.id,
        pseudo: user.pseudo,
        avatar_url: user.avatar_url,
        level: xp?.level || 1,
        total_xp: xp?.total_xp || 0,
        is_friend: friendship?.isFriend || false,
        has_pending_request: friendship?.isPending || false,
      }
    })

    return { success: true, data: results }
  } catch (error: any) {
    console.error('[leaderboard/searchUsers] Error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

function getWeekStart(): string {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  return monday.toISOString().split('T')[0]
}

function getPeriodInfo(type: LeaderboardType): { start: string; end: string; label: string } | undefined {
  const now = new Date()

  if (type === 'weekly') {
    const dayOfWeek = now.getDay()
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const monday = new Date(now)
    monday.setDate(diff)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const weekNumber = Math.ceil((((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7)

    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
      label: `Semaine ${weekNumber}`,
    }
  }

  if (type === 'monthly') {
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    ]
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0],
      label: `${monthNames[now.getMonth()]} ${now.getFullYear()}`,
    }
  }

  return undefined
}
