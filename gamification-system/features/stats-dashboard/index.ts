/**
 * TEENS PARTY MOROCCO - Stats Dashboard Feature
 * ==============================================
 *
 * Export centralisé de la feature Stats Dashboard.
 */

// Schema & Types
export {
  // Enums
  ActivityTypeEnum,
  MilestoneTypeEnum,
  RecordTypeEnum,
  StatPeriodEnum,
  // Config
  MILESTONE_CONFIG,
  RECORD_CONFIG,
  STAT_CATEGORY_CONFIG,
  // Schemas
  DailyActivitySchema,
  LifetimeStatsSchema,
  MonthlyStatsSchema,
  MilestoneSchema,
  PersonalRecordSchema,
  PlatformAveragesSchema,
  DashboardStatsSchema,
  ActivityStatsSchema,
  // Types
  type ActivityType,
  type MilestoneType,
  type RecordType,
  type StatPeriod,
  type DailyActivity,
  type LifetimeStats,
  type MonthlyStats,
  type Milestone,
  type PersonalRecord,
  type PlatformAverages,
  type DashboardStats,
  type ActivityStats,
  type MilestoneWithConfig,
  type RecordWithConfig,
  type StatComparison,
  type ActivityTrend,
  // Helpers
  calculatePercentVsAverage,
  determineTrend,
  formatTimeSpent,
  formatLargeNumber,
  getTrendColor,
  getTrendIcon,
  calculateLevelFromXp,
  getRankText,
  getDayOfWeekName,
  formatRelativeDate,
  getEncouragementMessage,
} from "./schema"

// Actions
export {
  // Daily Activity
  updateDailyActivity,
  getDailyActivity,
  getActivityHistory,
  // Lifetime Stats
  getLifetimeStats,
  refreshLifetimeStats,
  // Monthly Stats
  getMonthlyStats,
  // Milestones
  getUserMilestones,
  checkAndAwardMilestones,
  // Personal Records
  getPersonalRecords,
  updatePersonalRecord,
  // Dashboard Stats
  getDashboardStats,
  getActivityStats,
  // Platform Averages
  getPlatformAverages,
  getStatsComparison,
  // Ranking
  getUserGlobalRank,
  // Streaks
  updateLoginStreak,
  // Share
  generateStatsShareData,
} from "./actions"
