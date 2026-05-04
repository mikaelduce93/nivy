/**
 * TEENS PARTY MOROCCO - Shop Feature
 * ====================================
 *
 * Export principal du module boutique.
 */

// Schema exports
export {
  // Enums
  RewardTypeEnum,
  StockTypeEnum,
  PurchaseStatusEnum,
  // Types
  type RewardType,
  type StockType,
  type PurchaseStatus,
  type RewardCategory,
  type ShopReward,
  type UserPurchase,
  type PromoCode,
  type GetRewardsInput,
  type PurchaseRewardInput,
  type UseRewardInput,
  // Config
  REWARD_TYPE_CONFIG,
  CATEGORY_ICONS,
  // Schemas
  RewardCategorySchema,
  ShopRewardSchema,
  UserPurchaseSchema,
  PromoCodeSchema,
  GetRewardsInputSchema,
  PurchaseRewardInputSchema,
  UseRewardInputSchema,
  // Helpers
  formatXPPrice,
  calculateDiscountPercentage,
  formatTimeRemaining,
  isOnSale,
  groupRewardsByCategory,
  getAffordableRewards,
  sortRewardsByRelevance,
  formatRewardValue,
} from "./schema"

// Action exports
export {
  getCategories,
  getRewards,
  getFeaturedRewards,
  getRewardById,
  purchaseReward,
  getUserPurchases,
  getUsablePurchases,
  useReward,
  toggleWishlist,
  getWishlist,
  validatePromoCode,
  getShopSummary,
} from "./actions"
