/**
 * TEENS PARTY MOROCCO - Social Sharing Schema
 * ============================================
 *
 * Types et configurations pour le système de partage social.
 */

import { z } from "zod"

/* ==========================================================================
   ENUMS
   ========================================================================== */

export const PlatformSlugEnum = z.enum([
  "instagram",
  "tiktok",
  "snapchat",
  "whatsapp",
  "facebook",
  "twitter",
  "copy_link",
])
export type PlatformSlug = z.infer<typeof PlatformSlugEnum>

export const ContentTypeEnum = z.enum([
  "badge",
  "level_up",
  "event",
  "challenge",
  "vip",
  "stats",
  "referral",
  "collection",
  "achievement",
  "activity",
])
export type ContentType = z.infer<typeof ContentTypeEnum>

export const AchievementConditionEnum = z.enum([
  "total_shares",
  "platform_shares",
  "viral",
  "first_share",
])
export type AchievementCondition = z.infer<typeof AchievementConditionEnum>

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

export const PLATFORM_CONFIG: Record<
  PlatformSlug,
  {
    name: string
    icon: string
    color: string
    bgColor: string
    supportsDirectShare: boolean
    supportsStories: boolean
    shareType: "url" | "native" | "clipboard"
  }
> = {
  instagram: {
    name: "Instagram",
    icon: "Instagram",
    color: "text-pink-500",
    bgColor: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400",
    supportsDirectShare: false,
    supportsStories: true,
    shareType: "native",
  },
  tiktok: {
    name: "TikTok",
    icon: "Music2",
    color: "text-white",
    bgColor: "bg-black",
    supportsDirectShare: false,
    supportsStories: false,
    shareType: "native",
  },
  snapchat: {
    name: "Snapchat",
    icon: "Ghost",
    color: "text-black",
    bgColor: "bg-yellow-400",
    supportsDirectShare: false,
    supportsStories: true,
    shareType: "native",
  },
  whatsapp: {
    name: "WhatsApp",
    icon: "MessageCircle",
    color: "text-white",
    bgColor: "bg-green-500",
    supportsDirectShare: true,
    supportsStories: true,
    shareType: "url",
  },
  facebook: {
    name: "Facebook",
    icon: "Facebook",
    color: "text-white",
    bgColor: "bg-blue-600",
    supportsDirectShare: true,
    supportsStories: true,
    shareType: "url",
  },
  twitter: {
    name: "X (Twitter)",
    icon: "Twitter",
    color: "text-white",
    bgColor: "bg-black",
    supportsDirectShare: true,
    supportsStories: false,
    shareType: "url",
  },
  copy_link: {
    name: "Copier le lien",
    icon: "Link",
    color: "text-white",
    bgColor: "bg-indigo-500",
    supportsDirectShare: false,
    supportsStories: false,
    shareType: "clipboard",
  },
}

export const SHARE_MESSAGES: Record<ContentType, string> = {
  badge: "J'ai débloqué un nouveau badge !",
  level_up: "Je viens de monter de niveau !",
  event: "J'étais à cet événement incroyable !",
  challenge: "J'ai relevé le défi !",
  vip: "Je suis maintenant VIP !",
  stats: "Découvre mes stats de l'année !",
  referral: "Rejoins-moi sur Teens Party Morocco !",
  collection: "J'ai complété cette collection !",
  achievement: "Nouveau succès débloqué !",
  activity: "Regardez ce que j'ai fait !",
}

export const HASHTAGS = [
  "TeensPartyMorocco",
  "TPM",
  "PartyMaroc",
  "SoireeMaroc",
  "TeensMorocco",
]

/* ==========================================================================
   SCHEMAS
   ========================================================================== */

// Sharing Platform
export const SharingPlatformSchema = z.object({
  id: z.string().uuid(),
  slug: PlatformSlugEnum,
  name: z.string(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  base_share_url: z.string().nullable(),
  url_params: z.record(z.any()).default({}),
  is_active: z.boolean().default(true),
  sort_order: z.number().default(0),
  created_at: z.string().optional(),
})

export type SharingPlatform = z.infer<typeof SharingPlatformSchema>

// Share Template
export const ShareTemplateSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  content_type: ContentTypeEnum,
  title_template: z.string(),
  description_template: z.string().nullable(),
  hashtags: z.array(z.string()).default([]),
  default_image_url: z.string().nullable(),
  generate_image: z.boolean().default(false),
  image_template_id: z.string().uuid().nullable(),
  xp_reward: z.number().default(0),
  coins_reward: z.number().default(0),
  first_share_bonus: z.number().default(0),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type ShareTemplate = z.infer<typeof ShareTemplateSchema>

// User Share
export const UserShareSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  template_id: z.string().uuid().nullable(),
  platform_id: z.string().uuid(),
  content_type: ContentTypeEnum,
  content_id: z.string().uuid().nullable(),
  shared_title: z.string(),
  shared_description: z.string().nullable(),
  shared_url: z.string().nullable(),
  shared_image_url: z.string().nullable(),
  share_code: z.string().nullable(),
  click_count: z.number().default(0),
  conversion_count: z.number().default(0),
  xp_earned: z.number().default(0),
  coins_earned: z.number().default(0),
  rewards_claimed: z.boolean().default(false),
  created_at: z.string().optional(),
})

export type UserShare = z.infer<typeof UserShareSchema>

// Sharing Achievement
export const SharingAchievementSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  condition_type: AchievementConditionEnum,
  condition_value: z.number().default(1),
  condition_platform_id: z.string().uuid().nullable(),
  xp_reward: z.number().default(0),
  coins_reward: z.number().default(0),
  badge_id: z.string().uuid().nullable(),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
})

export type SharingAchievement = z.infer<typeof SharingAchievementSchema>

// User Sharing Stats
export const UserSharingStatsSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  total_shares: z.number().default(0),
  total_clicks: z.number().default(0),
  total_conversions: z.number().default(0),
  shares_by_platform: z.record(z.number()).default({}),
  shares_by_type: z.record(z.number()).default({}),
  current_share_streak: z.number().default(0),
  longest_share_streak: z.number().default(0),
  last_share_date: z.string().nullable(),
  total_xp_earned: z.number().default(0),
  total_coins_earned: z.number().default(0),
  first_share_at: z.string().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type UserSharingStats = z.infer<typeof UserSharingStatsSchema>

// Referral Code
export const ReferralCodeSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  code: z.string(),
  referrer_xp_reward: z.number().default(100),
  referrer_coins_reward: z.number().default(50),
  referee_xp_reward: z.number().default(50),
  referee_coins_reward: z.number().default(25),
  total_uses: z.number().default(0),
  successful_conversions: z.number().default(0),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
})

export type ReferralCode = z.infer<typeof ReferralCodeSchema>

// Referral Use
export const ReferralUseSchema = z.object({
  id: z.string().uuid(),
  referral_code_id: z.string().uuid(),
  referred_user_id: z.string().uuid(),
  status: z.enum(["pending", "completed", "rewarded"]).default("pending"),
  referrer_rewarded: z.boolean().default(false),
  referee_rewarded: z.boolean().default(false),
  created_at: z.string().optional(),
  completed_at: z.string().nullable(),
})

export type ReferralUse = z.infer<typeof ReferralUseSchema>

/* ==========================================================================
   TYPES COMPOSÉS
   ========================================================================== */

export interface ShareContent {
  type: ContentType
  id?: string
  title: string
  description?: string
  imageUrl?: string
  data?: Record<string, any>
}

export interface ShareResult {
  success: boolean
  shareId?: string
  shareCode?: string
  shareUrl?: string
  xpEarned?: number
  coinsEarned?: number
  isFirstShare?: boolean
  achievement?: SharingAchievement
}

export interface ShareOptions {
  platform: PlatformSlug
  content: ShareContent
  templateSlug?: string
  customHashtags?: string[]
}

export interface ReferralInfo {
  code: string
  totalUses: number
  successfulConversions: number
  pendingRewards: number
  shareUrl: string
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

// Obtenir la config d'une plateforme
export function getPlatformConfig(platform: PlatformSlug) {
  return PLATFORM_CONFIG[platform]
}

// Générer le texte de partage
export function generateShareText(
  template: string,
  data: Record<string, any>
): string {
  let text = template
  Object.entries(data).forEach(([key, value]) => {
    text = text.replace(new RegExp(`{{${key}}}`, "g"), String(value))
  })
  return text
}

// Générer les hashtags
export function generateHashtags(
  baseHashtags: string[] = [],
  customHashtags: string[] = []
): string {
  const allHashtags = [...new Set([...HASHTAGS, ...baseHashtags, ...customHashtags])]
  return allHashtags.map((h) => `#${h}`).join(" ")
}

// Construire l'URL de partage
export function buildShareUrl(
  platform: PlatformSlug,
  content: ShareContent,
  baseUrl: string = "https://teenspartymorocco.ma"
): string {
  const shareUrl = `${baseUrl}/share/${content.type}/${content.id || ""}`
  const text = encodeURIComponent(content.title)

  switch (platform) {
    case "whatsapp":
      return `https://wa.me/?text=${text}%20${encodeURIComponent(shareUrl)}`
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${text}`
    case "twitter": {
      const hashtags = generateHashtags()
      return `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}&hashtags=${encodeURIComponent(hashtags.replace(/#/g, "").replace(/ /g, ","))}`
    }
    default:
      return shareUrl
  }
}

// Vérifier si le partage natif est supporté
export function isNativeShareSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.share
}

// Partage natif
export async function nativeShare(options: {
  title: string
  text: string
  url?: string
}): Promise<boolean> {
  if (!isNativeShareSupported()) {
    return false
  }

  try {
    await navigator.share(options)
    return true
  } catch (error) {
    // L'utilisateur a annulé ou erreur
    return false
  }
}

// Copier dans le presse-papiers
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback pour les anciens navigateurs
    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.style.position = "fixed"
    textArea.style.left = "-999999px"
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand("copy")
      document.body.removeChild(textArea)
      return true
    } catch {
      document.body.removeChild(textArea)
      return false
    }
  }
}

// Formater le code referral pour affichage
export function formatReferralCode(code: string): string {
  // Ajouter des tirets tous les 3 caractères pour lisibilité
  return code.match(/.{1,3}/g)?.join("-") || code
}

// Générer l'URL de referral
export function generateReferralUrl(
  code: string,
  baseUrl: string = "https://teenspartymorocco.ma"
): string {
  return `${baseUrl}/join?ref=${code}`
}

// Calculer le taux de conversion
export function calculateConversionRate(
  clicks: number,
  conversions: number
): number {
  if (clicks === 0) return 0
  return Math.round((conversions / clicks) * 100)
}

// Obtenir les plateformes populaires
export function getPopularPlatforms(): PlatformSlug[] {
  return ["instagram", "whatsapp", "snapchat", "tiktok"]
}

// Obtenir le message par défaut pour un type de contenu
export function getDefaultShareMessage(type: ContentType): string {
  return SHARE_MESSAGES[type]
}

// Vérifier si une plateforme supporte les stories
export function supportsStories(platform: PlatformSlug): boolean {
  return PLATFORM_CONFIG[platform].supportsStories
}

// Obtenir l'icône de la plateforme
export function getPlatformIcon(platform: PlatformSlug): string {
  return PLATFORM_CONFIG[platform].icon
}
