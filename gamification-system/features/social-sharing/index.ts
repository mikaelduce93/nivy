/**
 * TEENS PARTY MOROCCO - Social Sharing Feature
 * =============================================
 *
 * Export centralisé du module Social Sharing.
 */

// Schema & Types
export {
  // Enums
  PlatformSlugEnum,
  ContentTypeEnum,
  AchievementConditionEnum,
  // Types
  type PlatformSlug,
  type ContentType,
  type AchievementCondition,
  type SharingPlatform,
  type ShareTemplate,
  type UserShare,
  type SharingAchievement,
  type UserSharingStats,
  type ReferralCode,
  type ReferralUse,
  type ShareContent,
  type ShareResult,
  type ShareOptions,
  type ReferralInfo,
  // Configs
  PLATFORM_CONFIG,
  SHARE_MESSAGES,
  HASHTAGS,
  // Schemas
  SharingPlatformSchema,
  ShareTemplateSchema,
  UserShareSchema,
  SharingAchievementSchema,
  UserSharingStatsSchema,
  ReferralCodeSchema,
  ReferralUseSchema,
  // Helpers
  getPlatformConfig,
  generateShareText,
  generateHashtags,
  buildShareUrl,
  isNativeShareSupported,
  nativeShare,
  copyToClipboard,
  formatReferralCode,
  generateReferralUrl,
  calculateConversionRate,
  getPopularPlatforms,
  getDefaultShareMessage,
  supportsStories,
  getPlatformIcon,
} from "./schema"

// Actions
export {
  // Platforms
  getSharingPlatforms,
  getShareTemplates,
  // Shares
  createShare,
  getUserShares,
  trackShareClick,
  // Stats
  getSharingStats,
  // Achievements
  getSharingAchievements,
  // Referrals
  getReferralCode,
  useReferralCode,
  getReferredUsers,
  // Content generators
  generateBadgeShareContent,
  generateEventShareContent,
  generateLevelUpShareContent,
  generateWrappedShareContent,
} from "./actions"
