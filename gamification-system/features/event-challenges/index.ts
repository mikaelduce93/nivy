/**
 * TEENS PARTY MOROCCO - Event Challenges Feature
 * ===============================================
 *
 * Export centralisé de la feature Event Challenges.
 */

// Schema & Types
export {
  // Enums
  EventChallengeTypeEnum,
  EventChallengeStatusEnum,
  CheckInStatusEnum,
  // Config
  EVENT_CHALLENGE_TYPE_CONFIG,
  CHALLENGE_STATUS_CONFIG,
  // Schemas
  EventChallengeTypeSchema,
  EventChallengeSchema,
  UserEventProgressSchema,
  EventCheckInSchema,
  EventReviewSchema,
  UserEventStatsSchema,
  // Types
  type EventChallengeType,
  type EventChallenge,
  type UserEventProgress,
  type EventCheckIn,
  type EventReview,
  type UserEventStats,
  type EventChallengeWithProgress,
  type EventWithChallenges,
  type EventChallengeCompletion,
  // Helpers
  isChallengeAvailable,
  calculateProgressPercentage,
  formatDuration,
  getTimeRemaining,
  isInTargetZone,
  groupChallengesByType,
  sortChallengesByPriority,
  calculateSpeedBonus,
  getChallengeCompletionMessage,
  generateEventSummary,
} from "./schema"

// Actions
export {
  // Types de défis
  getEventChallengeTypes,
  // Défis événement
  getEventChallenges,
  // Check-in / Check-out
  checkInToEvent,
  checkOutFromEvent,
  getActiveCheckIn,
  // Complétion
  completeEventChallenge,
  updateChallengeProgress,
  // Reviews
  submitEventReview,
  getUserEventReview,
  // Stats
  getUserEventStats,
  // Historique
  getUserCheckInHistory,
  getCompletedEventChallenges,
  // Leaderboard
  getEventLeaderboard,
  // Géolocalisation
  verifyLocationForChallenge,
  // Upload
  uploadChallengeProof,
} from "./actions"
