/**
 * TEENS PARTY MOROCCO - Seasonal Challenges Feature
 * ==================================================
 *
 * Export centralisé de la feature Seasonal Challenges.
 */

// Schema & Types
export {
  // Enums
  SeasonSlugEnum,
  ChallengeTypeEnum,
  ChallengeCategoryEnum,
  SeasonalProgressStatusEnum,
  RewardTypeEnum,
  AdventThemeEnum,
  // Config
  SEASON_CONFIG,
  CHALLENGE_TYPE_CONFIG,
  CHALLENGE_CATEGORY_CONFIG,
  REWARD_TYPE_CONFIG,
  // Schemas
  SeasonSchema,
  SeasonalChallengeSchema,
  SeasonalProgressSchema,
  AdventCalendarSchema,
  AdventDaySchema,
  UserAdventProgressSchema,
  SeasonalRewardSchema,
  // Types
  type Season,
  type SeasonalChallenge,
  type SeasonalProgress,
  type AdventCalendar,
  type AdventDay,
  type UserAdventProgress,
  type SeasonalReward,
  type SeasonalChallengeWithProgress,
  type SeasonWithChallenges,
  type AdventCalendarWithProgress,
  type AdventDayReward,
  // Helpers
  getCurrentSeason,
  getCurrentSeasonConfig,
  calculateProgress,
  isDayUnlocked,
  getDaysRemaining,
  formatTimeRemaining,
  groupChallengesByType,
  groupChallengesByCategory,
  sortChallengesByPriority,
  calculateAdventStreak,
  getRewardMessage,
  getAdventDayEmoji,
} from "./schema"

// Actions
export {
  // Saisons
  getActiveSeason,
  getAllSeasons,
  // Défis saisonniers
  getSeasonalChallenges,
  updateSeasonalProgress,
  completeSeasonalChallenge,
  claimSeasonalReward,
  // Calendrier de l'Avent
  getActiveAdventCalendar,
  openAdventDay,
  canOpenTodayAdvent,
  // Récompenses saisonnières
  getSeasonalRewards,
  claimSeasonalTierReward,
  // Stats
  getUserSeasonalStats,
} from "./actions"
