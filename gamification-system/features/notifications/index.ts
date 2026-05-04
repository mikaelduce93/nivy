/**
 * TEENS PARTY MOROCCO - Gamified Notifications Feature
 * =====================================================
 *
 * Export centralisé du système de notifications gamifiées.
 */

// Schema & Types
export {
  // Enums
  NotificationCategoryEnum,
  NotificationPriorityEnum,
  NotificationAnimationEnum,
  NotificationSoundEnum,
  // Configs
  CATEGORY_CONFIG,
  PRIORITY_CONFIG,
  ANIMATION_EFFECTS,
  // Schemas
  NotificationTemplateSchema,
  UserNotificationSchema,
  NotificationPreferencesSchema,
  PushSubscriptionSchema,
  NotificationsResponseSchema,
  // Types
  type NotificationCategory,
  type NotificationPriority,
  type NotificationAnimation,
  type NotificationSound,
  type NotificationTemplate,
  type UserNotification,
  type NotificationPreferences,
  type PushSubscription,
  type NotificationsResponse,
  type NotificationWithTemplate,
  type NotificationGroup,
  type NotificationStats,
  type NotificationToast,
  // Helpers
  getCategoryConfig,
  getDisplayDuration,
  canDismiss,
  shouldShowInCenter,
  hasRewards,
  groupNotificationsByCategory,
  groupNotifications,
  calculateNotificationStats,
  formatNotificationTime,
  getDefaultIcon,
  getGroupMessage,
  isInQuietHours,
  sortNotifications,
  createLocalNotification,
} from "./schema"

// Actions
export {
  // Get Notifications
  getUserNotifications,
  getUnreadCount,
  getRecentNotifications,
  // Create Notifications
  createNotificationFromTemplate,
  createCustomNotification,
  sendBulkNotification,
  // Notification Actions
  markNotificationsAsRead,
  markNotificationClicked,
  dismissNotification,
  dismissReadNotifications,
  // Rewards
  claimNotificationRewards,
  claimAllPendingRewards,
  // Preferences
  getNotificationPreferences,
  updateNotificationPreferences,
  toggleNotificationCategory,
  // Push Notifications
  registerPushSubscription,
  unregisterPushSubscription,
  getPushSubscriptions,
  // Triggered Notifications
  triggerNotification,
  sendEventReminder,
  sendLevelUpNotification,
  sendBadgeEarnedNotification,
  // Analytics
  getNotificationStats,
} from "./actions"
