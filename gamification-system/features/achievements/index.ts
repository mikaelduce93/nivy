/**
 * TEENS PARTY MOROCCO - Achievements Feature Module
 * ==================================================
 *
 * Point d'entrée unique pour le système d'achievements.
 */

// Schema exports
export {
  // Enums
  AchievementCategoryEnum,
  AchievementRarityEnum,
  RequirementTypeEnum,

  // Configs
  RARITY_CONFIG,
  CATEGORY_CONFIG,
  ACHIEVEMENT_ICONS,

  // Input schemas
  getAchievementsSchema,
  getAchievementStatsSchema,
  updateProgressSchema,
  unlockAchievementSchema,
  checkAchievementsSchema,
  getRecentUnlocksSchema,
  getNextAchievementsSchema,

  // Types
  type AchievementCategory,
  type AchievementRarity,
  type RequirementType,
  type GetAchievementsInput,
  type GetAchievementStatsInput,
  type UpdateProgressInput,
  type UnlockAchievementInput,
  type CheckAchievementsInput,
  type GetRecentUnlocksInput,
  type GetNextAchievementsInput,
  type ActionResult,
  type Achievement,
  type UserAchievement,
  type AchievementStats,
  type AchievementUnlockResult,
  type CheckAchievementsResult,
  type AchievementIconKey,
} from './schema'

// Action exports
export {
  // Get achievements
  getAchievements,
  getAchievementsByCategory,
  getUnlockedAchievements,

  // Stats
  getAchievementStats,

  // Progression & Unlock
  updateAchievementProgress,
  unlockAchievement,
  checkAndUnlockAchievements,

  // Recent & Next
  getRecentlyUnlocked,
  getNextAchievements,

  // Event tracking
  trackAchievementEvent,

  // Initialization
  initializeAchievements,
} from './actions'
