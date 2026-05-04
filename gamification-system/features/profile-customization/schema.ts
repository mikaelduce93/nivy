/**
 * TEENS PARTY MOROCCO - Profile Customization Schema
 * ===================================================
 *
 * Types et configurations pour la personnalisation de profil.
 */

import { z } from "zod"

/* ==========================================================================
   ENUMS
   ========================================================================== */

export const FrameTypeEnum = z.enum([
  "circle",
  "square",
  "hexagon",
  "animated",
])
export type FrameType = z.infer<typeof FrameTypeEnum>

export const UnlockTypeEnum = z.enum([
  "free",
  "level",
  "achievement",
  "purchase",
  "event",
  "vip",
])
export type UnlockType = z.infer<typeof UnlockTypeEnum>

export const RarityEnum = z.enum([
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
])
export type Rarity = z.infer<typeof RarityEnum>

export const BackgroundTypeEnum = z.enum([
  "gradient",
  "image",
  "pattern",
  "animated",
])
export type BackgroundType = z.infer<typeof BackgroundTypeEnum>

export const ItemTypeEnum = z.enum([
  "frame",
  "title",
  "color",
  "background",
])
export type ItemType = z.infer<typeof ItemTypeEnum>

export const TitleCategoryEnum = z.enum([
  "achievement",
  "event",
  "social",
  "game",
  "special",
])
export type TitleCategory = z.infer<typeof TitleCategoryEnum>

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

export const RARITY_CONFIG: Record<
  Rarity,
  {
    name: string
    color: string
    bgColor: string
    borderColor: string
    gradient: string
  }
> = {
  common: {
    name: "Commun",
    color: "text-zinc-400",
    bgColor: "bg-zinc-500/20",
    borderColor: "border-zinc-500/30",
    gradient: "from-zinc-500 to-zinc-600",
  },
  uncommon: {
    name: "Peu commun",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    borderColor: "border-green-500/30",
    gradient: "from-green-500 to-emerald-500",
  },
  rare: {
    name: "Rare",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/30",
    gradient: "from-blue-500 to-cyan-500",
  },
  epic: {
    name: "Épique",
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    borderColor: "border-purple-500/30",
    gradient: "from-purple-500 to-violet-500",
  },
  legendary: {
    name: "Légendaire",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
    borderColor: "border-yellow-500/30",
    gradient: "from-yellow-500 to-orange-500",
  },
}

export const UNLOCK_TYPE_CONFIG: Record<
  UnlockType,
  {
    name: string
    description: string
    icon: string
  }
> = {
  free: {
    name: "Gratuit",
    description: "Disponible pour tous",
    icon: "Gift",
  },
  level: {
    name: "Niveau",
    description: "Débloquer en montant de niveau",
    icon: "TrendingUp",
  },
  achievement: {
    name: "Succès",
    description: "Débloquer via un succès",
    icon: "Trophy",
  },
  purchase: {
    name: "Boutique",
    description: "Acheter avec des coins",
    icon: "ShoppingBag",
  },
  event: {
    name: "Événement",
    description: "Récompense d'événement",
    icon: "Calendar",
  },
  vip: {
    name: "VIP",
    description: "Réservé aux VIP",
    icon: "Crown",
  },
}

export const FRAME_ANIMATIONS: Record<string, string> = {
  glow: "animate-glow",
  pulse: "animate-pulse",
  spin: "animate-spin-slow",
  rainbow: "animate-rainbow",
  fire: "animate-fire",
  sparkle: "animate-sparkle",
}

export const BACKGROUND_PATTERNS: Record<string, string> = {
  stars: "bg-stars",
  geometric: "bg-geometric",
  dots: "bg-dots",
  grid: "bg-grid",
  waves: "bg-waves",
}

/* ==========================================================================
   SCHEMAS
   ========================================================================== */

// Profile Frame
export const ProfileFrameSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  frame_type: FrameTypeEnum,
  border_style: z.string().nullable(),
  gradient_colors: z.array(z.string()).nullable(),
  animation_class: z.string().nullable(),
  image_url: z.string().nullable(),
  unlock_type: UnlockTypeEnum,
  unlock_requirement: z.record(z.any()).default({}),
  rarity: RarityEnum,
  is_active: z.boolean().default(true),
  is_limited: z.boolean().default(false),
  available_until: z.string().nullable(),
  created_at: z.string().optional(),
})

export type ProfileFrame = z.infer<typeof ProfileFrameSchema>

// Profile Title
export const ProfileTitleSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  display_text: z.string(),
  color: z.string().nullable(),
  gradient: z.string().nullable(),
  icon: z.string().nullable(),
  emoji: z.string().nullable(),
  unlock_type: UnlockTypeEnum,
  unlock_requirement: z.record(z.any()).default({}),
  rarity: RarityEnum,
  category: TitleCategoryEnum.nullable(),
  is_active: z.boolean().default(true),
  is_limited: z.boolean().default(false),
  created_at: z.string().optional(),
})

export type ProfileTitle = z.infer<typeof ProfileTitleSchema>

// Profile Color Theme
export const ProfileColorSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  primary_color: z.string(),
  secondary_color: z.string().nullable(),
  accent_color: z.string().nullable(),
  background_gradient: z.string().nullable(),
  text_color: z.string().default("#FFFFFF"),
  unlock_type: UnlockTypeEnum,
  unlock_requirement: z.record(z.any()).default({}),
  rarity: RarityEnum,
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
})

export type ProfileColor = z.infer<typeof ProfileColorSchema>

// Profile Background
export const ProfileBackgroundSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  background_type: BackgroundTypeEnum,
  background_value: z.string(),
  overlay_opacity: z.number().default(0.5),
  unlock_type: UnlockTypeEnum,
  unlock_requirement: z.record(z.any()).default({}),
  rarity: RarityEnum,
  is_active: z.boolean().default(true),
  is_limited: z.boolean().default(false),
  created_at: z.string().optional(),
})

export type ProfileBackground = z.infer<typeof ProfileBackgroundSchema>

// User Profile Customization
export const UserProfileCustomizationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  equipped_frame_id: z.string().uuid().nullable(),
  equipped_title_id: z.string().uuid().nullable(),
  equipped_color_id: z.string().uuid().nullable(),
  equipped_background_id: z.string().uuid().nullable(),
  showcase_badge_ids: z.array(z.string().uuid()).default([]),
  custom_bio: z.string().nullable(),
  bio_emoji: z.string().nullable(),
  show_level: z.boolean().default(true),
  show_xp: z.boolean().default(true),
  show_badges_count: z.boolean().default(true),
  show_events_count: z.boolean().default(true),
  show_friends_count: z.boolean().default(true),
  show_crew: z.boolean().default(true),
  custom_status: z.string().nullable(),
  status_emoji: z.string().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type UserProfileCustomization = z.infer<
  typeof UserProfileCustomizationSchema
>

// Unlocked Item (générique)
export const UnlockedItemSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  unlocked_at: z.string(),
  unlock_source: z.string().nullable(),
})

export type UnlockedItem = z.infer<typeof UnlockedItemSchema>

// User Customization Items (retour de get_user_customization_items)
export const UserCustomizationItemsSchema = z.object({
  frames: z.array(ProfileFrameSchema.extend({ unlocked_at: z.string() })),
  titles: z.array(ProfileTitleSchema.extend({ unlocked_at: z.string() })),
  colors: z.array(ProfileColorSchema.extend({ unlocked_at: z.string() })),
  backgrounds: z.array(ProfileBackgroundSchema.extend({ unlocked_at: z.string() })),
  equipped: z
    .object({
      frame: ProfileFrameSchema.nullable(),
      title: ProfileTitleSchema.nullable(),
      color: ProfileColorSchema.nullable(),
      background: ProfileBackgroundSchema.nullable(),
      showcase_badges: z.array(z.string().uuid()),
      custom_bio: z.string().nullable(),
      custom_status: z.string().nullable(),
      preferences: z.object({
        show_level: z.boolean(),
        show_xp: z.boolean(),
        show_badges_count: z.boolean(),
        show_events_count: z.boolean(),
        show_friends_count: z.boolean(),
        show_crew: z.boolean(),
      }),
    })
    .nullable(),
})

export type UserCustomizationItems = z.infer<typeof UserCustomizationItemsSchema>

/* ==========================================================================
   TYPES COMPOSÉS
   ========================================================================== */

export interface ProfileFrameWithUnlock extends ProfileFrame {
  unlocked: boolean
  unlocked_at?: string
}

export interface ProfileTitleWithUnlock extends ProfileTitle {
  unlocked: boolean
  unlocked_at?: string
}

export interface ProfileColorWithUnlock extends ProfileColor {
  unlocked: boolean
  unlocked_at?: string
}

export interface ProfileBackgroundWithUnlock extends ProfileBackground {
  unlocked: boolean
  unlocked_at?: string
}

export interface ProfileDisplayData {
  frame?: ProfileFrame
  title?: ProfileTitle
  color?: ProfileColor
  background?: ProfileBackground
  bio?: string
  status?: string
  statusEmoji?: string
  showcaseBadges?: string[]
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

// Obtenir le style CSS du cadre
export function getFrameStyle(frame: ProfileFrame): React.CSSProperties {
  const style: React.CSSProperties = {}

  if (frame.border_style) {
    const [width, type, color] = frame.border_style.split(" ")
    style.borderWidth = width
    style.borderStyle = type as any
    style.borderColor = color
  }

  if (frame.gradient_colors && frame.gradient_colors.length >= 2) {
    style.background = `linear-gradient(135deg, ${frame.gradient_colors.join(", ")})`
  }

  return style
}

// Obtenir le style CSS du titre
export function getTitleStyle(title: ProfileTitle): React.CSSProperties {
  const style: React.CSSProperties = {}

  if (title.color) {
    style.color = title.color
  }

  if (title.gradient) {
    style.background = title.gradient
    style.WebkitBackgroundClip = "text"
    style.WebkitTextFillColor = "transparent"
  }

  return style
}

// Obtenir le style CSS du thème de couleur
export function getColorThemeStyle(color: ProfileColor): React.CSSProperties {
  return {
    "--primary-color": color.primary_color,
    "--secondary-color": color.secondary_color || color.primary_color,
    "--accent-color": color.accent_color || color.primary_color,
    "--text-color": color.text_color,
  } as React.CSSProperties
}

// Obtenir le style CSS du background
export function getBackgroundStyle(
  background: ProfileBackground
): React.CSSProperties {
  const style: React.CSSProperties = {}

  if (background.background_type === "gradient") {
    style.background = background.background_value
  } else if (background.background_type === "image") {
    style.backgroundImage = `url(${background.background_value})`
    style.backgroundSize = "cover"
    style.backgroundPosition = "center"
  }

  return style
}

// Vérifier si un item peut être débloqué
export function canUnlockItem(
  unlockType: UnlockType,
  requirement: Record<string, any>,
  userData: {
    level?: number
    achievements?: string[]
    coins?: number
    isVip?: boolean
  }
): boolean {
  switch (unlockType) {
    case "free":
      return true
    case "level":
      return (userData.level || 1) >= (requirement.level || 0)
    case "achievement":
      return userData.achievements?.includes(requirement.achievement_id) || false
    case "purchase":
      return (userData.coins || 0) >= (requirement.coins || 0)
    case "vip":
      return userData.isVip || false
    default:
      return false
  }
}

// Obtenir le texte de condition de déverrouillage
export function getUnlockRequirementText(
  unlockType: UnlockType,
  requirement: Record<string, any>
): string {
  switch (unlockType) {
    case "free":
      return "Disponible gratuitement"
    case "level":
      return `Atteindre le niveau ${requirement.level || "?"}`
    case "achievement":
      return requirement.achievement_name || "Compléter un succès"
    case "purchase":
      return `${requirement.coins || "?"} coins`
    case "event":
      return requirement.event_name || "Participer à un événement"
    case "vip":
      return "Réservé aux membres VIP"
    default:
      return "Conditions inconnues"
  }
}

// Formater le nom de la rareté
export function formatRarity(rarity: Rarity): string {
  return RARITY_CONFIG[rarity].name
}

// Obtenir la couleur de la rareté
export function getRarityColor(rarity: Rarity): string {
  return RARITY_CONFIG[rarity].color
}

// Obtenir le bg de la rareté
export function getRarityBg(rarity: Rarity): string {
  return RARITY_CONFIG[rarity].bgColor
}
