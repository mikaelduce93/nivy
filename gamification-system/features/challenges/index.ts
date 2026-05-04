/**
 * TEENS PARTY MOROCCO - Challenges Feature
 * =========================================
 *
 * Export principal du module défis entre amis.
 */

// Schema exports
export {
  // Enums
  ChallengeModeEnum,
  ChallengeStatusEnum,
  ParticipantStatusEnum,
  ObjectiveTypeEnum,
  // Types
  type ChallengeMode,
  type ChallengeStatus,
  type ParticipantStatus,
  type ObjectiveType,
  type ChallengeType,
  type ChallengeParticipant,
  type FriendChallenge,
  type CreateChallengeInput,
  type RespondToChallengeInput,
  // Config
  CHALLENGE_MODE_CONFIG,
  CHALLENGE_STATUS_CONFIG,
  OBJECTIVE_TYPE_CONFIG,
  // Schemas
  ChallengeTypeSchema,
  ChallengeParticipantSchema,
  FriendChallengeSchema,
  CreateChallengeInputSchema,
  RespondToChallengeInputSchema,
  // Helpers
  getTimeRemaining,
  getRankedParticipants,
  getTeamScore,
  getCurrentLeader,
  calculateProgress,
  formatScore,
  generateChallengeName,
  canCreateChallenge,
} from "./schema"

// Action exports
export {
  getChallengeTypes,
  getUserChallenges,
  getActiveChallenges,
  getPendingChallenges,
  createChallenge,
  respondToChallenge,
  acceptChallenge,
  declineChallenge,
  updateChallengeProgress,
  sendChallengeMessage,
  getChallengeDetails,
  getChallengeMessages,
  getChallengeSummary,
} from "./actions"
