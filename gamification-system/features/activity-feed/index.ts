/**
 * TEENS PARTY MOROCCO - Activity Feed Feature
 * ============================================
 *
 * Export centralisé du module Activity Feed.
 */

// Schema & Types
export {
  // Enums
  ActivityCategoryEnum,
  ActivityVisibilityEnum,
  ReactionTypeEnum,
  FeedOrderEnum,
  // Types
  type ActivityCategory,
  type ActivityVisibility,
  type ReactionType,
  type FeedOrder,
  type ActivityType,
  type UserActivity,
  type ActivityLike,
  type ActivityComment,
  type FeedPreferences,
  type VisibilitySettings,
  type FeedResponse,
  type ActivityWithUser,
  type CommentWithUser,
  type ActivityStats,
  // Configs
  CATEGORY_CONFIG,
  REACTION_CONFIG,
  ACTIVITY_TYPE_TEMPLATES,
  // Schemas
  ActivityTypeSchema,
  UserActivitySchema,
  ActivityLikeSchema,
  ActivityCommentSchema,
  FeedPreferencesSchema,
  VisibilitySettingsSchema,
  FeedResponseSchema,
  // Helpers
  getCategoryConfig,
  getReactionConfig,
  formatRelativeTime,
  generateActivityTitle,
  groupActivitiesByDay,
  formatDayLabel,
  countReactionsByType,
  getTopReactions,
  canViewActivity,
  createActivityPlaceholder,
} from "./schema"

// Actions
export {
  // Feed
  getActivityFeed,
  getUserActivities,
  // Activities
  createActivity,
  deleteActivity,
  hideActivity,
  updateActivityVisibility,
  toggleActivityPin,
  // Reactions
  toggleActivityReaction,
  getActivityReactions,
  // Comments
  addActivityComment,
  getActivityComments,
  editActivityComment,
  deleteActivityComment,
  // Preferences
  getFeedPreferences,
  updateFeedPreferences,
  getVisibilitySettings,
  updateVisibilitySettings,
  // Stats
  getActivityStats,
} from "./actions"
