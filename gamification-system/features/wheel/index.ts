/**
 * TEENS PARTY MOROCCO - Wheel Feature
 * =====================================
 *
 * Export principal du module Roue de la Fortune.
 */

// Schema exports
export {
  // Enums
  WheelRewardTypeEnum,
  SpinTypeEnum,
  // Types
  type WheelRewardType,
  type SpinType,
  type WheelSegment,
  type SpinResult,
  type CanSpin,
  type WheelStats,
  type SpinHistoryEntry,
  // Config
  WHEEL_REWARD_CONFIG,
  // Schemas
  WheelSegmentSchema,
  SpinResultSchema,
  CanSpinSchema,
  WheelStatsSchema,
  SpinHistoryEntrySchema,
  // Helpers
  getTimeUntilNextSpin,
  formatWheelReward,
  generateSegmentAngles,
  calculateSpinAngle,
  getStreakBonus,
  getCelebrationLevel,
} from "./schema"

// Action exports
export {
  getWheelSegments,
  canSpinWheel,
  spinWheel,
  spinWheelBonus,
  getWheelStats,
  getSpinHistory,
  getCurrentJackpot,
  getWheelSummary,
} from "./actions"
