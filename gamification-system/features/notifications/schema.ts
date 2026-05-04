/**
 * TEENS PARTY MOROCCO - Gamified Notifications Schema
 * =====================================================
 *
 * Types et configurations pour les notifications gamifiées.
 */

import { z } from "zod"

/* ==========================================================================
   ENUMS
   ========================================================================== */

export const NotificationCategoryEnum = z.enum([
  "achievement",
  "social",
  "event",
  "challenge",
  "reward",
  "system",
])
export type NotificationCategory = z.infer<typeof NotificationCategoryEnum>

export const NotificationPriorityEnum = z.enum([
  "low",
  "normal",
  "high",
  "urgent",
])
export type NotificationPriority = z.infer<typeof NotificationPriorityEnum>

export const NotificationAnimationEnum = z.enum([
  "confetti",
  "glow",
  "shake",
  "bounce",
  "pulse",
  "slide",
])
export type NotificationAnimation = z.infer<typeof NotificationAnimationEnum>

export const NotificationSoundEnum = z.enum([
  "success",
  "achievement",
  "social",
  "alert",
  "reward",
  "none",
])
export type NotificationSound = z.infer<typeof NotificationSoundEnum>

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

export const CATEGORY_CONFIG: Record<
  NotificationCategory,
  {
    name: string
    icon: string
    color: string
    bgColor: string
    defaultSound: NotificationSound
  }
> = {
  achievement: {
    name: "Succès",
    icon: "Trophy",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
    defaultSound: "achievement",
  },
  social: {
    name: "Social",
    icon: "Users",
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    defaultSound: "social",
  },
  event: {
    name: "Événements",
    icon: "Calendar",
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    defaultSound: "alert",
  },
  challenge: {
    name: "Défis",
    icon: "Target",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    defaultSound: "success",
  },
  reward: {
    name: "Récompenses",
    icon: "Gift",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    defaultSound: "reward",
  },
  system: {
    name: "Système",
    icon: "Bell",
    color: "text-zinc-400",
    bgColor: "bg-zinc-500/20",
    defaultSound: "none",
  },
}

export const PRIORITY_CONFIG: Record<
  NotificationPriority,
  {
    name: string
    displayDuration: number // ms
    allowDismiss: boolean
    showInCenter: boolean
  }
> = {
  low: {
    name: "Basse",
    displayDuration: 3000,
    allowDismiss: true,
    showInCenter: false,
  },
  normal: {
    name: "Normale",
    displayDuration: 5000,
    allowDismiss: true,
    showInCenter: false,
  },
  high: {
    name: "Haute",
    displayDuration: 8000,
    allowDismiss: true,
    showInCenter: true,
  },
  urgent: {
    name: "Urgente",
    displayDuration: 0, // Ne disparaît pas automatiquement
    allowDismiss: false,
    showInCenter: true,
  },
}

export const ANIMATION_EFFECTS: Record<
  NotificationAnimation,
  {
    className: string
    duration: number
  }
> = {
  confetti: { className: "animate-confetti", duration: 2000 },
  glow: { className: "animate-glow", duration: 1500 },
  shake: { className: "animate-shake", duration: 500 },
  bounce: { className: "animate-bounce", duration: 1000 },
  pulse: { className: "animate-pulse", duration: 2000 },
  slide: { className: "animate-slide-in", duration: 300 },
}

/* ==========================================================================
   SCHEMAS
   ========================================================================== */

// Notification Template
export const NotificationTemplateSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  category: NotificationCategoryEnum,
  title_template: z.string(),
  body_template: z.string(),
  icon: z.string().nullable(),
  emoji: z.string().nullable(),
  priority: NotificationPriorityEnum.default("normal"),
  color: z.string().nullable(),
  animation: NotificationAnimationEnum.nullable(),
  sound: NotificationSoundEnum.nullable(),
  xp_reward: z.number().default(0),
  coin_reward: z.number().default(0),
  is_pushable: z.boolean().default(true),
  is_dismissable: z.boolean().default(true),
  auto_dismiss_seconds: z.number().nullable(),
  requires_action: z.boolean().default(false),
  action_url: z.string().nullable(),
  action_label: z.string().nullable(),
  group_key: z.string().nullable(),
  max_group_size: z.number().default(5),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
})

export type NotificationTemplate = z.infer<typeof NotificationTemplateSchema>

// User Notification
export const UserNotificationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  template_id: z.string().uuid().nullable(),
  title: z.string(),
  body: z.string(),
  icon: z.string().nullable(),
  emoji: z.string().nullable(),
  image_url: z.string().nullable(),
  data: z.record(z.any()).default({}),
  priority: NotificationPriorityEnum.default("normal"),
  color: z.string().nullable(),
  animation: NotificationAnimationEnum.nullable(),
  xp_reward: z.number().default(0),
  coin_reward: z.number().default(0),
  rewards_claimed: z.boolean().default(false),
  action_url: z.string().nullable(),
  action_label: z.string().nullable(),
  is_read: z.boolean().default(false),
  read_at: z.string().nullable(),
  is_clicked: z.boolean().default(false),
  clicked_at: z.string().nullable(),
  is_dismissed: z.boolean().default(false),
  dismissed_at: z.string().nullable(),
  group_key: z.string().nullable(),
  group_count: z.number().default(1),
  push_sent: z.boolean().default(false),
  push_sent_at: z.string().nullable(),
  push_clicked: z.boolean().default(false),
  scheduled_for: z.string().nullable(),
  expires_at: z.string().nullable(),
  created_at: z.string().optional(),
})

export type UserNotification = z.infer<typeof UserNotificationSchema>

// Notification Preferences
export const NotificationPreferencesSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  push_enabled: z.boolean().default(true),
  email_enabled: z.boolean().default(true),
  in_app_enabled: z.boolean().default(true),
  achievements_enabled: z.boolean().default(true),
  social_enabled: z.boolean().default(true),
  events_enabled: z.boolean().default(true),
  challenges_enabled: z.boolean().default(true),
  rewards_enabled: z.boolean().default(true),
  system_enabled: z.boolean().default(true),
  quiet_hours_enabled: z.boolean().default(false),
  quiet_hours_start: z.string().nullable(),
  quiet_hours_end: z.string().nullable(),
  digest_enabled: z.boolean().default(false),
  digest_time: z.string().default("18:00"),
  max_daily_push: z.number().default(10),
  sounds_enabled: z.boolean().default(true),
  vibration_enabled: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>

// Push Subscription
export const PushSubscriptionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  endpoint: z.string(),
  p256dh: z.string(),
  auth: z.string(),
  device_type: z.enum(["web", "android", "ios"]).nullable(),
  device_name: z.string().nullable(),
  browser: z.string().nullable(),
  is_active: z.boolean().default(true),
  last_used_at: z.string().optional(),
  created_at: z.string().optional(),
})

export type PushSubscription = z.infer<typeof PushSubscriptionSchema>

// Notifications Response
export const NotificationsResponseSchema = z.object({
  notifications: z.array(UserNotificationSchema),
  unread_count: z.number(),
  total_count: z.number(),
})

export type NotificationsResponse = z.infer<typeof NotificationsResponseSchema>

/* ==========================================================================
   TYPES COMPOSÉS
   ========================================================================== */

export interface NotificationWithTemplate extends UserNotification {
  template?: NotificationTemplate
}

export interface NotificationGroup {
  key: string
  notifications: UserNotification[]
  latestNotification: UserNotification
  count: number
}

export interface NotificationStats {
  total: number
  unread: number
  byCategory: Record<NotificationCategory, number>
  rewardsPending: number
  pendingXp: number
  pendingCoins: number
}

export interface NotificationToast {
  id: string
  notification: UserNotification
  visible: boolean
  progress: number
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

// Obtenir la configuration d'une catégorie
export function getCategoryConfig(category: NotificationCategory) {
  return CATEGORY_CONFIG[category]
}

// Obtenir la durée d'affichage d'une notification
export function getDisplayDuration(
  notification: UserNotification
): number {
  if (notification.priority === "urgent") return 0
  return PRIORITY_CONFIG[notification.priority].displayDuration
}

// Vérifier si une notification peut être dismissée
export function canDismiss(notification: UserNotification): boolean {
  return PRIORITY_CONFIG[notification.priority].allowDismiss
}

// Vérifier si une notification doit être affichée au centre
export function shouldShowInCenter(notification: UserNotification): boolean {
  return PRIORITY_CONFIG[notification.priority].showInCenter
}

// Vérifier si une notification a des récompenses
export function hasRewards(notification: UserNotification): boolean {
  return (
    (notification.xp_reward > 0 || notification.coin_reward > 0) &&
    !notification.rewards_claimed
  )
}

// Grouper les notifications par catégorie
export function groupNotificationsByCategory(
  notifications: UserNotification[]
): Record<string, UserNotification[]> {
  return notifications.reduce(
    (acc, notif) => {
      // Déterminer la catégorie depuis les données ou utiliser "system" par défaut
      const category = (notif.data as any)?.category || "system"
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(notif)
      return acc
    },
    {} as Record<string, UserNotification[]>
  )
}

// Grouper les notifications par group_key
export function groupNotifications(
  notifications: UserNotification[]
): NotificationGroup[] {
  const groups: Record<string, UserNotification[]> = {}

  notifications.forEach((notif) => {
    const key = notif.group_key || notif.id
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(notif)
  })

  return Object.entries(groups).map(([key, notifs]) => ({
    key,
    notifications: notifs,
    latestNotification: notifs[0],
    count: notifs.reduce((sum, n) => sum + n.group_count, 0),
  }))
}

// Calculer les stats des notifications
export function calculateNotificationStats(
  notifications: UserNotification[]
): NotificationStats {
  const stats: NotificationStats = {
    total: notifications.length,
    unread: 0,
    byCategory: {
      achievement: 0,
      social: 0,
      event: 0,
      challenge: 0,
      reward: 0,
      system: 0,
    },
    rewardsPending: 0,
    pendingXp: 0,
    pendingCoins: 0,
  }

  notifications.forEach((notif) => {
    if (!notif.is_read) stats.unread++

    const category = (notif.data as any)?.category as NotificationCategory
    if (category && stats.byCategory[category] !== undefined) {
      stats.byCategory[category]++
    }

    if (hasRewards(notif)) {
      stats.rewardsPending++
      stats.pendingXp += notif.xp_reward
      stats.pendingCoins += notif.coin_reward
    }
  })

  return stats
}

// Formater le temps depuis la notification
export function formatNotificationTime(createdAt: string): string {
  const now = new Date()
  const created = new Date(createdAt)
  const diffMs = now.getTime() - created.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "À l'instant"
  if (diffMins < 60) return `Il y a ${diffMins}min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays < 7) return `Il y a ${diffDays}j`

  return created.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  })
}

// Obtenir l'icône par défaut selon le type
export function getDefaultIcon(notification: UserNotification): string {
  if (notification.icon) return notification.icon

  const category = (notification.data as any)?.category as NotificationCategory
  if (category && CATEGORY_CONFIG[category]) {
    return CATEGORY_CONFIG[category].icon
  }

  return "Bell"
}

// Générer le message de groupe
export function getGroupMessage(count: number, category?: string): string {
  if (count <= 1) return ""

  const categoryName = category
    ? CATEGORY_CONFIG[category as NotificationCategory]?.name.toLowerCase() || "notifications"
    : "notifications"

  return `et ${count - 1} autre${count > 2 ? "s" : ""} ${categoryName}`
}

// Vérifier si on est dans les heures calmes
export function isInQuietHours(
  prefs: NotificationPreferences
): boolean {
  if (!prefs.quiet_hours_enabled || !prefs.quiet_hours_start || !prefs.quiet_hours_end) {
    return false
  }

  const now = new Date()
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`

  const start = prefs.quiet_hours_start
  const end = prefs.quiet_hours_end

  // Gérer le cas où les heures calmes traversent minuit
  if (start > end) {
    return currentTime >= start || currentTime <= end
  }

  return currentTime >= start && currentTime <= end
}

// Trier les notifications par priorité et date
export function sortNotifications(
  notifications: UserNotification[]
): UserNotification[] {
  const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 }

  return [...notifications].sort((a, b) => {
    // D'abord par priorité
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (priorityDiff !== 0) return priorityDiff

    // Ensuite par date (plus récent en premier)
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  })
}

// Créer une notification locale (pour preview)
export function createLocalNotification(
  partial: Partial<UserNotification>
): UserNotification {
  return {
    id: crypto.randomUUID(),
    user_id: "",
    template_id: null,
    title: partial.title || "Notification",
    body: partial.body || "",
    icon: partial.icon || null,
    emoji: partial.emoji || null,
    image_url: partial.image_url || null,
    data: partial.data || {},
    priority: partial.priority || "normal",
    color: partial.color || null,
    animation: partial.animation || null,
    xp_reward: partial.xp_reward || 0,
    coin_reward: partial.coin_reward || 0,
    rewards_claimed: false,
    action_url: partial.action_url || null,
    action_label: partial.action_label || null,
    is_read: false,
    read_at: null,
    is_clicked: false,
    clicked_at: null,
    is_dismissed: false,
    dismissed_at: null,
    group_key: partial.group_key || null,
    group_count: 1,
    push_sent: false,
    push_sent_at: null,
    push_clicked: false,
    scheduled_for: null,
    expires_at: null,
    created_at: new Date().toISOString(),
  }
}
