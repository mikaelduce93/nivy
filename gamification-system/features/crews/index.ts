/**
 * TEENS PARTY MOROCCO - Crews Feature
 * ====================================
 *
 * Export principal du module crews.
 */

// Schema exports
export {
  // Enums
  CrewRoleEnum,
  CrewMemberStatusEnum,
  CrewInvitationStatusEnum,
  CrewJoinRequestStatusEnum,
  CrewAchievementRarityEnum,
  // Types
  type CrewRole,
  type CrewMemberStatus,
  type CrewInvitationStatus,
  type CrewJoinRequestStatus,
  type CrewAchievementRarity,
  type Crew,
  type CrewMember,
  type CrewAchievement,
  type CrewInvitation,
  type CrewJoinRequest,
  type CrewActivity,
  type CrewLeaderboardEntry,
  type UserCrewData,
  type CreateCrewInput,
  type UpdateCrewInput,
  type InviteToCrewInput,
  // Config
  CREW_ROLE_CONFIG,
  ACHIEVEMENT_RARITY_CONFIG,
  ACTIVITY_TYPE_CONFIG,
  // Schemas
  CrewSchema,
  CrewMemberSchema,
  CrewAchievementSchema,
  CrewInvitationSchema,
  CrewJoinRequestSchema,
  CrewActivitySchema,
  CrewLeaderboardEntrySchema,
  UserCrewDataSchema,
  CreateCrewInputSchema,
  UpdateCrewInputSchema,
  InviteToCrewInputSchema,
  // Helpers
  canPerformAction,
  formatMemberCount,
  getCrewTier,
  getTierProgress,
  formatCrewXp,
  sortMembersByContribution,
  isInvitationExpired,
  generateInvitationMessage,
  validateCrewName,
} from "./schema"

// Action exports
export {
  getUserCrew,
  getCrewBySlug,
  createCrew,
  updateCrew,
  inviteToCrew,
  respondToCrewInvitation,
  requestToJoinCrew,
  handleJoinRequest,
  leaveCrew,
  kickMember,
  promoteMember,
  demoteMember,
  getCrewLeaderboard,
  getCrewActivity,
  getPendingCrewInvitations,
  getPendingJoinRequests,
  searchCrews,
  getCrewMembers,
} from "./actions"
