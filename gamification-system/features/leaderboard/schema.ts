/**
 * TEENS PARTY MOROCCO - Leaderboard Domain Schemas
 * ================================================
 *
 * Schémas Zod pour la validation du système de leaderboard.
 */

import { z } from 'zod'

/* ==========================================================================
   ENUMS & CONSTANTS
   ========================================================================== */

export const LeaderboardTypeEnum = z.enum([
  'all_time',
  'weekly',
  'monthly',
  'friends',
  'city',
])
export type LeaderboardType = z.infer<typeof LeaderboardTypeEnum>

export const FriendRequestStatusEnum = z.enum([
  'pending',
  'accepted',
  'blocked',
])
export type FriendRequestStatus = z.infer<typeof FriendRequestStatusEnum>

/* ==========================================================================
   RANK TIERS CONFIG
   ========================================================================== */

export const RANK_TIERS = {
  top1: {
    label: '1er',
    icon: 'crown',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    gradient: 'from-yellow-400 to-amber-500',
    borderColor: 'border-yellow-500/50',
  },
  top2: {
    label: '2ème',
    icon: 'medal',
    color: 'text-zinc-300',
    bgColor: 'bg-zinc-400/20',
    gradient: 'from-zinc-300 to-zinc-400',
    borderColor: 'border-zinc-400/50',
  },
  top3: {
    label: '3ème',
    icon: 'medal',
    color: 'text-amber-600',
    bgColor: 'bg-amber-600/20',
    gradient: 'from-amber-500 to-amber-700',
    borderColor: 'border-amber-600/50',
  },
  top10: {
    label: 'Top 10',
    icon: 'star',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    gradient: 'from-cyan-400 to-blue-500',
    borderColor: 'border-cyan-500/50',
  },
  top50: {
    label: 'Top 50',
    icon: 'trending-up',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    gradient: 'from-purple-400 to-pink-500',
    borderColor: 'border-purple-500/50',
  },
  default: {
    label: '',
    icon: 'user',
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-800',
    gradient: 'from-zinc-600 to-zinc-700',
    borderColor: 'border-zinc-700',
  },
} as const

export function getRankTier(rank: number) {
  if (rank === 1) return RANK_TIERS.top1
  if (rank === 2) return RANK_TIERS.top2
  if (rank === 3) return RANK_TIERS.top3
  if (rank <= 10) return RANK_TIERS.top10
  if (rank <= 50) return RANK_TIERS.top50
  return RANK_TIERS.default
}

/* ==========================================================================
   INPUT SCHEMAS
   ========================================================================== */

/**
 * Schéma pour récupérer le leaderboard
 */
export const getLeaderboardSchema = z.object({
  type: LeaderboardTypeEnum.optional().default('all_time'),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
  city: z.string().optional(),
})

export type GetLeaderboardInput = z.infer<typeof getLeaderboardSchema>

/**
 * Schéma pour récupérer le leaderboard entre amis
 */
export const getFriendsLeaderboardSchema = z.object({
  teenId: z.string().uuid('ID adolescent invalide'),
  type: LeaderboardTypeEnum.optional().default('all_time'),
  limit: z.number().int().min(1).max(50).optional().default(20),
})

export type GetFriendsLeaderboardInput = z.infer<typeof getFriendsLeaderboardSchema>

/**
 * Schéma pour récupérer le rang d'un user
 */
export const getUserRankSchema = z.object({
  teenId: z.string().uuid('ID adolescent invalide'),
  type: LeaderboardTypeEnum.optional().default('all_time'),
})

export type GetUserRankInput = z.infer<typeof getUserRankSchema>

/**
 * Schéma pour les demandes d'amis
 */
export const sendFriendRequestSchema = z.object({
  fromTeenId: z.string().uuid('ID adolescent invalide'),
  toTeenId: z.string().uuid('ID ami invalide'),
})

export type SendFriendRequestInput = z.infer<typeof sendFriendRequestSchema>

export const respondFriendRequestSchema = z.object({
  connectionId: z.string().uuid('ID connexion invalide'),
  teenId: z.string().uuid('ID adolescent invalide'),
  accept: z.boolean(),
})

export type RespondFriendRequestInput = z.infer<typeof respondFriendRequestSchema>

/**
 * Schéma pour récupérer la liste d'amis
 */
export const getFriendsListSchema = z.object({
  teenId: z.string().uuid('ID adolescent invalide'),
})

export type GetFriendsListInput = z.infer<typeof getFriendsListSchema>

/**
 * Schéma pour rechercher des utilisateurs
 */
export const searchUsersSchema = z.object({
  query: z.string().min(2, 'Recherche trop courte').max(50),
  teenId: z.string().uuid('ID adolescent invalide'),
  limit: z.number().int().min(1).max(20).optional().default(10),
})

export type SearchUsersInput = z.infer<typeof searchUsersSchema>

/* ==========================================================================
   OUTPUT TYPES
   ========================================================================== */

/**
 * Type de retour standard pour les actions
 */
export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Type Leaderboard Entry
 */
export type LeaderboardEntry = {
  teen_id: string
  pseudo: string
  avatar_url: string | null
  city: string | null
  xp: number
  level: number
  current_streak: number
  rank: number
  percentile: number
  is_current_user?: boolean
}

/**
 * Type User Rank
 */
export type UserRank = {
  rank: number
  total_participants: number
  xp: number
  percentile: number
  type: LeaderboardType
}

/**
 * Type Friend
 */
export type Friend = {
  friend_id: string
  pseudo: string
  avatar_url: string | null
  level: number
  total_xp: number
  friendship_since: string
}

/**
 * Type Friend Request
 */
export type FriendRequest = {
  id: string
  teen_id: string
  friend_teen_id: string
  status: FriendRequestStatus
  initiated_by: string
  created_at: string
  accepted_at: string | null
  requester?: {
    pseudo: string
    avatar_url: string | null
    level: number
  }
}

/**
 * Type Search Result
 */
export type UserSearchResult = {
  id: string
  pseudo: string
  avatar_url: string | null
  level: number
  total_xp: number
  is_friend: boolean
  has_pending_request: boolean
}

/**
 * Type Leaderboard avec métadonnées
 */
export type LeaderboardData = {
  entries: LeaderboardEntry[]
  total_participants: number
  user_rank?: UserRank
  period?: {
    start: string
    end: string
    label: string
  }
}
