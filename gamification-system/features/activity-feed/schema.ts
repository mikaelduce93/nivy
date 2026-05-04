/**
 * TEENS PARTY MOROCCO - Activity Feed Schema
 * ==========================================
 *
 * Types et configurations pour le fil d'activité social.
 */

import { z } from "zod"

/* ==========================================================================
   ENUMS
   ========================================================================== */

export const ActivityCategoryEnum = z.enum([
  "achievement",
  "social",
  "event",
  "game",
  "collection",
  "milestone",
])
export type ActivityCategory = z.infer<typeof ActivityCategoryEnum>

export const ActivityVisibilityEnum = z.enum([
  "public",
  "friends",
  "private",
])
export type ActivityVisibility = z.infer<typeof ActivityVisibilityEnum>

export const ReactionTypeEnum = z.enum([
  "like",
  "love",
  "fire",
  "party",
  "congrats",
])
export type ReactionType = z.infer<typeof ReactionTypeEnum>

export const FeedOrderEnum = z.enum([
  "recent",
  "popular",
  "relevance",
])
export type FeedOrder = z.infer<typeof FeedOrderEnum>

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

export const CATEGORY_CONFIG: Record<
  ActivityCategory,
  {
    name: string
    icon: string
    color: string
    bgColor: string
  }
> = {
  achievement: {
    name: "Succès",
    icon: "Trophy",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
  },
  social: {
    name: "Social",
    icon: "Users",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  event: {
    name: "Événements",
    icon: "Calendar",
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
  },
  game: {
    name: "Jeux",
    icon: "Gamepad2",
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
  },
  collection: {
    name: "Collections",
    icon: "Layers",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
  },
  milestone: {
    name: "Jalons",
    icon: "Flag",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
  },
}

export const REACTION_CONFIG: Record<
  ReactionType,
  {
    emoji: string
    label: string
    color: string
  }
> = {
  like: { emoji: "👍", label: "J'aime", color: "text-blue-400" },
  love: { emoji: "❤️", label: "J'adore", color: "text-red-400" },
  fire: { emoji: "🔥", label: "En feu", color: "text-orange-400" },
  party: { emoji: "🎉", label: "Félicitations", color: "text-purple-400" },
  congrats: { emoji: "🎊", label: "Bravo", color: "text-yellow-400" },
}

export const ACTIVITY_TYPE_TEMPLATES: Record<
  string,
  {
    titleTemplate: string
    descriptionTemplate?: string
    showImage: boolean
  }
> = {
  badge_earned: {
    titleTemplate: "a débloqué le badge {{badge_name}}",
    descriptionTemplate: "{{badge_description}}",
    showImage: true,
  },
  level_up: {
    titleTemplate: "a atteint le niveau {{level}}",
    showImage: false,
  },
  milestone_reached: {
    titleTemplate: "a atteint un nouveau jalon : {{milestone}}",
    showImage: false,
  },
  streak_achieved: {
    titleTemplate: "a maintenu une série de {{days}} jours !",
    showImage: false,
  },
  vip_tier_up: {
    titleTemplate: "est maintenant {{tier_name}} !",
    showImage: true,
  },
  friend_added: {
    titleTemplate: "est maintenant ami avec {{friend_name}}",
    showImage: false,
  },
  crew_joined: {
    titleTemplate: "a rejoint le crew {{crew_name}}",
    showImage: true,
  },
  crew_created: {
    titleTemplate: "a créé le crew {{crew_name}}",
    showImage: true,
  },
  event_attended: {
    titleTemplate: "a assisté à {{event_name}}",
    showImage: true,
  },
  event_checkin: {
    titleTemplate: "est à {{event_name}}",
    showImage: false,
  },
  game_won: {
    titleTemplate: "a gagné une partie de {{game_name}}",
    showImage: false,
  },
  game_high_score: {
    titleTemplate: "a établi un nouveau record : {{score}} points !",
    showImage: false,
  },
  duel_won: {
    titleTemplate: "a battu {{opponent}} en duel !",
    showImage: false,
  },
  challenge_completed: {
    titleTemplate: "a terminé le défi {{challenge_name}}",
    showImage: true,
  },
  rare_item_collected: {
    titleTemplate: "a obtenu {{item_name}} ({{rarity}})",
    showImage: true,
  },
  collection_completed: {
    titleTemplate: "a complété la collection {{collection_name}} !",
    showImage: true,
  },
}

/* ==========================================================================
   SCHEMAS
   ========================================================================== */

// Activity Type
export const ActivityTypeSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  emoji: z.string().nullable(),
  color: z.string().nullable(),
  category: ActivityCategoryEnum,
  is_public_by_default: z.boolean().default(true),
  points: z.number().default(0),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
})

export type ActivityType = z.infer<typeof ActivityTypeSchema>

// User Activity
export const UserActivitySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  activity_type_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  image_url: z.string().nullable(),
  data: z.record(z.any()).default({}),
  target_id: z.string().uuid().nullable(),
  target_type: z.string().nullable(),
  likes_count: z.number().default(0),
  comments_count: z.number().default(0),
  shares_count: z.number().default(0),
  visibility: ActivityVisibilityEnum.default("friends"),
  is_pinned: z.boolean().default(false),
  is_highlighted: z.boolean().default(false),
  is_hidden: z.boolean().default(false),
  hidden_reason: z.string().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type UserActivity = z.infer<typeof UserActivitySchema>

// Activity Like
export const ActivityLikeSchema = z.object({
  id: z.string().uuid(),
  activity_id: z.string().uuid(),
  user_id: z.string().uuid(),
  reaction_type: ReactionTypeEnum.default("like"),
  created_at: z.string().optional(),
})

export type ActivityLike = z.infer<typeof ActivityLikeSchema>

// Activity Comment
export const ActivityCommentSchema = z.object({
  id: z.string().uuid(),
  activity_id: z.string().uuid(),
  user_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable(),
  content: z.string(),
  is_edited: z.boolean().default(false),
  is_hidden: z.boolean().default(false),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type ActivityComment = z.infer<typeof ActivityCommentSchema>

// Feed Preferences
export const FeedPreferencesSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  show_friends_activities: z.boolean().default(true),
  show_crew_activities: z.boolean().default(true),
  show_following_activities: z.boolean().default(true),
  show_achievements: z.boolean().default(true),
  show_level_ups: z.boolean().default(true),
  show_events: z.boolean().default(true),
  show_games: z.boolean().default(true),
  show_collections: z.boolean().default(true),
  show_social: z.boolean().default(true),
  notify_likes: z.boolean().default(true),
  notify_comments: z.boolean().default(true),
  notify_mentions: z.boolean().default(true),
  feed_order: FeedOrderEnum.default("recent"),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type FeedPreferences = z.infer<typeof FeedPreferencesSchema>

// Visibility Settings
export const VisibilitySettingsSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  auto_publish_badges: z.boolean().default(true),
  auto_publish_level_ups: z.boolean().default(true),
  auto_publish_event_attendance: z.boolean().default(true),
  auto_publish_challenges: z.boolean().default(true),
  auto_publish_collections: z.boolean().default(true),
  auto_publish_crew_joins: z.boolean().default(false),
  default_visibility: ActivityVisibilityEnum.default("friends"),
  allow_comments: z.boolean().default(true),
  allow_likes: z.boolean().default(true),
  allow_shares: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type VisibilitySettings = z.infer<typeof VisibilitySettingsSchema>

// Feed Response
export const FeedResponseSchema = z.object({
  activities: z.array(
    UserActivitySchema.extend({
      activity_type: z.string(),
      icon: z.string().nullable(),
      emoji: z.string().nullable(),
      color: z.string().nullable(),
      category: ActivityCategoryEnum,
      liked_by_me: z.boolean(),
    })
  ),
  has_more: z.boolean(),
})

export type FeedResponse = z.infer<typeof FeedResponseSchema>

/* ==========================================================================
   TYPES COMPOSÉS
   ========================================================================== */

export interface ActivityWithUser extends UserActivity {
  user: {
    id: string
    username: string
    avatar_url?: string
    vip_tier?: string
  }
  activity_type: ActivityType
  liked_by_me: boolean
  my_reaction?: ReactionType
}

export interface CommentWithUser extends ActivityComment {
  user: {
    id: string
    username: string
    avatar_url?: string
  }
  replies?: CommentWithUser[]
}

export interface ActivityStats {
  totalActivities: number
  likesReceived: number
  commentsReceived: number
  mostLikedActivity?: UserActivity
  activityByCategory: Record<ActivityCategory, number>
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

// Obtenir la config d'une catégorie
export function getCategoryConfig(category: ActivityCategory) {
  return CATEGORY_CONFIG[category]
}

// Obtenir la config d'une réaction
export function getReactionConfig(reaction: ReactionType) {
  return REACTION_CONFIG[reaction]
}

// Formater le temps relatif
export function formatRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)

  if (diffMins < 1) return "À l'instant"
  if (diffMins < 60) return `Il y a ${diffMins}min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays < 7) return `Il y a ${diffDays}j`
  if (diffWeeks < 4) return `Il y a ${diffWeeks}sem`

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  })
}

// Générer le titre d'une activité
export function generateActivityTitle(
  typeSlug: string,
  data: Record<string, any>,
  username: string
): string {
  const template = ACTIVITY_TYPE_TEMPLATES[typeSlug]
  if (!template) return `${username} a fait quelque chose`

  let title = `${username} ${template.titleTemplate}`

  // Remplacer les placeholders
  Object.entries(data).forEach(([key, value]) => {
    title = title.replace(`{{${key}}}`, String(value))
  })

  return title
}

// Grouper les activités par jour
export function groupActivitiesByDay(
  activities: ActivityWithUser[]
): Map<string, ActivityWithUser[]> {
  const groups = new Map<string, ActivityWithUser[]>()

  activities.forEach((activity) => {
    const date = new Date(activity.created_at || "")
    const dayKey = date.toISOString().split("T")[0]

    if (!groups.has(dayKey)) {
      groups.set(dayKey, [])
    }
    groups.get(dayKey)!.push(activity)
  })

  return groups
}

// Formater le label du jour
export function formatDayLabel(dateString: string): string {
  const today = new Date()
  const date = new Date(dateString)

  const isToday = date.toDateString() === today.toDateString()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  if (isToday) return "Aujourd'hui"
  if (isYesterday) return "Hier"

  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

// Compter les réactions par type
export function countReactionsByType(
  likes: ActivityLike[]
): Record<ReactionType, number> {
  return likes.reduce(
    (acc, like) => {
      acc[like.reaction_type] = (acc[like.reaction_type] || 0) + 1
      return acc
    },
    {} as Record<ReactionType, number>
  )
}

// Obtenir les top réactions
export function getTopReactions(
  likes: ActivityLike[],
  limit: number = 3
): ReactionType[] {
  const counts = countReactionsByType(likes)
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([type]) => type as ReactionType)
}

// Vérifier si une activité peut être affichée à un utilisateur
export function canViewActivity(
  activity: UserActivity,
  viewerId: string,
  areFriends: boolean
): boolean {
  if (activity.is_hidden) return false
  if (activity.user_id === viewerId) return true
  if (activity.visibility === "public") return true
  if (activity.visibility === "friends" && areFriends) return true
  return false
}

// Créer un placeholder pour une activité (skeleton)
export function createActivityPlaceholder(): Partial<ActivityWithUser> {
  return {
    id: `placeholder-${Math.random()}`,
    title: "",
    description: null,
    likes_count: 0,
    comments_count: 0,
    created_at: new Date().toISOString(),
  }
}
