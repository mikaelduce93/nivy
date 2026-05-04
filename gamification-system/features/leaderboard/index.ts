/**
 * TEENS PARTY MOROCCO - Leaderboard Feature Module
 * ================================================
 *
 * Point d'entrée unique pour le système de leaderboard.
 */

// Schema exports
export {
  // Enums
  LeaderboardTypeEnum,
  FriendRequestStatusEnum,

  // Config
  RANK_TIERS,
  getRankTier,

  // Input schemas
  getLeaderboardSchema,
  getFriendsLeaderboardSchema,
  getUserRankSchema,
  sendFriendRequestSchema,
  respondFriendRequestSchema,
  getFriendsListSchema,
  searchUsersSchema,

  // Types
  type LeaderboardType,
  type FriendRequestStatus,
  type GetLeaderboardInput,
  type GetFriendsLeaderboardInput,
  type GetUserRankInput,
  type SendFriendRequestInput,
  type RespondFriendRequestInput,
  type GetFriendsListInput,
  type SearchUsersInput,
  type ActionResult,
  type LeaderboardEntry,
  type LeaderboardData,
  type UserRank,
  type Friend,
  type FriendRequest,
  type UserSearchResult,
} from './schema'

// Action exports
export {
  // Leaderboard
  getLeaderboard,
  getFriendsLeaderboard,
  getUserRank,
  getAllUserRanks,

  // Friends
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendsList,
  getPendingFriendRequests,
  removeFriend,
  searchUsers,
} from './actions'
