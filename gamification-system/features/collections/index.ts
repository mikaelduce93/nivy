/**
 * TEENS PARTY MOROCCO - Collections Feature
 * ==========================================
 *
 * Export centralisé du système de collections.
 */

// Schema & Types
export {
  // Enums
  SetTypeEnum,
  RarityEnum,
  AnimationTypeEnum,
  ObtainableFromEnum,
  TradeStatusEnum,
  // Configs
  RARITY_CONFIG,
  SET_TYPE_CONFIG,
  // Schemas
  CollectionSetSchema,
  CollectibleItemSchema,
  UserCollectibleSchema,
  UserCollectionProgressSchema,
  CollectionTradeSchema,
  UserCollectionsResponseSchema,
  // Types
  type SetType,
  type Rarity,
  type AnimationType,
  type ObtainableFrom,
  type TradeStatus,
  type CollectionSet,
  type CollectibleItem,
  type UserCollectible,
  type UserCollectionProgress,
  type CollectionTrade,
  type UserCollectionsResponse,
  type CollectibleItemWithOwnership,
  type CollectionSetWithProgress,
  type CollectionStats,
  // Helpers
  getRarityStyle,
  calculateTradeValue,
  isTradeBalanced,
  formatCompletionPercent,
  getCompletionMessage,
  getRarityAnimation,
  groupItemsByRarity,
  calculateCollectionStats,
} from "./schema"

// Actions
export {
  // Collection Sets
  getCollectionSets,
  getCollectionSetBySlug,
  getAvailableSets,
  // Collectible Items
  getCollectionItems,
  getCollectibleItem,
  getItemsByRarity,
  // User Collections
  getUserCollections,
  getUserCollectiblesForSet,
  getUserSetProgress,
  addCollectibleToUser,
  getRandomCollectible,
  openCollectiblePack,
  // User Interactions
  markCollectibleAsSeen,
  markAllCollectiblesAsSeen,
  toggleCollectibleFavorite,
  getFavoriteCollectibles,
  // Rewards
  claimSetRewards,
  checkSetCompletion,
  // Trades
  createTrade,
  getUserTrades,
  getTradeById,
  acceptTrade,
  rejectTrade,
  cancelTrade,
  getPendingTradesCount,
  // Statistics
  getCollectionStats,
  getCollectorsLeaderboard,
  getNewCollectiblesCount,
  getRecentCollectibles,
} from "./actions"
