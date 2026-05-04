/**
 * TEENS PARTY MOROCCO - Annual Wrapped Feature
 * =============================================
 *
 * Export centralisé de la feature Annual Wrapped.
 */

// Schema & Types
export {
  // Enums
  WrappedStatusEnum,
  HighlightTypeEnum,
  WrappedAchievementEnum,
  RarityEnum,
  // Config
  WRAPPED_SLIDE_CONFIG,
  WRAPPED_ACHIEVEMENT_CONFIG,
  FUN_COMPARISONS,
  // Schemas
  WrappedSummarySchema,
  WrappedFavoritesSchema,
  WrappedPercentilesSchema,
  WrappedDataSchema,
  WrappedHighlightSchema,
  WrappedAchievementSchema,
  WrappedComparisonSchema,
  UserWrappedSchema,
  // Types
  type WrappedStatus,
  type HighlightType,
  type WrappedAchievement,
  type Rarity,
  type WrappedSummary,
  type WrappedFavorites,
  type WrappedPercentiles,
  type WrappedData,
  type WrappedHighlight,
  type WrappedAchievementData,
  type WrappedComparison,
  type UserWrapped,
  type WrappedSlide,
  type WrappedAchievementWithConfig,
  // Helpers
  generateWrappedSlides,
  getFunComparison,
  formatWrappedValue,
  getPercentileMessage,
  getRarityColor,
  getRarityBg,
} from "./schema"

// Actions
export {
  getUserWrapped,
  generateWrapped,
  checkWrappedAvailability,
  getPublicWrapped,
  toggleWrappedVisibility,
  getWrappedShareUrl,
  getAvailableWrappedYears,
  incrementShareCount,
  getWrappedGlobalStats,
} from "./actions"
