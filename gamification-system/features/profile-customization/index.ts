/**
 * TEENS PARTY MOROCCO - Profile Customization Feature
 * ====================================================
 *
 * Export centralisé de la feature Profile Customization.
 */

// Schema & Types
export {
  // Enums
  FrameTypeEnum,
  UnlockTypeEnum,
  RarityEnum,
  BackgroundTypeEnum,
  ItemTypeEnum,
  TitleCategoryEnum,
  // Config
  RARITY_CONFIG,
  UNLOCK_TYPE_CONFIG,
  FRAME_ANIMATIONS,
  BACKGROUND_PATTERNS,
  // Schemas
  ProfileFrameSchema,
  ProfileTitleSchema,
  ProfileColorSchema,
  ProfileBackgroundSchema,
  UserProfileCustomizationSchema,
  UnlockedItemSchema,
  UserCustomizationItemsSchema,
  // Types
  type FrameType,
  type UnlockType,
  type Rarity,
  type BackgroundType,
  type ItemType,
  type TitleCategory,
  type ProfileFrame,
  type ProfileTitle,
  type ProfileColor,
  type ProfileBackground,
  type UserProfileCustomization,
  type UnlockedItem,
  type UserCustomizationItems,
  type ProfileFrameWithUnlock,
  type ProfileTitleWithUnlock,
  type ProfileColorWithUnlock,
  type ProfileBackgroundWithUnlock,
  type ProfileDisplayData,
  // Helpers
  getFrameStyle,
  getTitleStyle,
  getColorThemeStyle,
  getBackgroundStyle,
  canUnlockItem,
  getUnlockRequirementText,
  formatRarity,
  getRarityColor,
  getRarityBg,
} from "./schema"

// Actions
export {
  // Get all items
  getAllFrames,
  getAllTitles,
  getAllColors,
  getAllBackgrounds,
  // User items
  getUserCustomizationItems,
  getPublicUserCustomization,
  // Equip items
  equipItem,
  unequipItem,
  // Unlock items
  unlockItem,
  purchaseItem,
  // Update profile
  updateProfileBio,
  updateProfileStatus,
  updateShowcaseBadges,
  updateProfilePreferences,
  // Check unlocks
  checkLevelUnlocks,
} from "./actions"
