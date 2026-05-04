/**
 * TEENS PARTY MOROCCO - VIP System Feature
 * =========================================
 *
 * Export centralisé du système VIP gamifié.
 */

// Schema & Types
export {
  // Enums
  VipTierSlugEnum,
  PerkCategoryEnum,
  BenefitTypeEnum,
  // Configs
  VIP_TIER_CONFIG,
  PERK_CATEGORY_CONFIG,
  TIER_XP_REQUIREMENTS,
  // Schemas
  VipTierSchema,
  VipPerkSchema,
  UserVipStatusSchema,
  VipBenefitLogSchema,
  VipStatusResponseSchema,
  // Types
  type VipTierSlug,
  type PerkCategory,
  type BenefitType,
  type VipTier,
  type VipPerk,
  type UserVipStatus,
  type VipBenefitLog,
  type VipStatusResponse,
  type VipTierWithPerks,
  type VipProgress,
  type VipBenefitSummary,
  // Helpers
  getTierConfig,
  getNextTier,
  getPreviousTier,
  calculateTierFromXp,
  calculateProgress,
  formatXp,
  getProgressMessage,
  calculateSavings,
  hasEarlyAccess,
  getBenefitSummary,
  compareTiers,
  isTierAtLeast,
  getCumulativePerks,
  getTierWelcomeMessage,
  getTierGlowStyle,
} from "./schema"

// Actions
export {
  // Get VIP Data
  getAllVipTiers,
  getVipTierBySlug,
  getTierPerks,
  getUserVipStatus,
  getUserVipTier,
  // VIP Progression
  addVipXp,
  recalculateVipTier,
  incrementEventsAttended,
  // VIP Benefits
  claimMonthlyCoins,
  canClaimMonthlyCoins,
  getXpMultiplier,
  getCoinMultiplier,
  getDailyWheelSpins,
  getDailyFreePacks,
  getShopDiscount,
  getEarlyAccessHours,
  // Benefits Log
  logBenefitUsed,
  getBenefitsHistory,
  getBenefitsStats,
  // Comparisons & Leaderboard
  getVipLeaderboard,
  getUserVipRank,
  compareVipUsers,
} from "./actions"
