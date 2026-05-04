/**
 * TEENS PARTY MOROCCO - Missions Feature
 * =======================================
 *
 * Export principal du module de missions.
 */

// Schema exports
export {
  // Enums
  MissionTypeEnum,
  MissionCategoryEnum,
  MissionStatusEnum,
  // Types
  type MissionType,
  type MissionCategory,
  type MissionStatus,
  type MissionTemplate,
  type UserMission,
  type MissionWithProgress,
  type MissionStats,
  type GetMissionsInput,
  type UpdateMissionProgressInput,
  type ClaimMissionRewardInput,
  // Config
  MISSION_TYPE_CONFIG,
  MISSION_CATEGORY_CONFIG,
  // Schemas
  MissionTemplateSchema,
  UserMissionSchema,
  MissionWithProgressSchema,
  MissionStatsSchema,
  GetMissionsInputSchema,
  UpdateMissionProgressInputSchema,
  ClaimMissionRewardInputSchema,
  // Helpers
  getTimeRemaining,
  calculateProgressPercentage,
  isMissionNew,
  formatBonusReward,
  sortMissionsByPriority,
  groupMissionsByType,
  countMissionsByStatus,
} from "./schema"

// Action exports
export {
  getMissions,
  getDailyMissions,
  getWeeklyMissions,
  getClaimableMissions,
  getMissionStats,
  updateMissionProgress,
  claimMissionReward,
  claimAllMissionRewards,
  assignCurrentMissions,
  trackMissionEvent,
  getMissionSummary,
} from "./actions"
