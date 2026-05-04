/**
 * TEENS PARTY MOROCCO - Gamified Notifications Actions
 * =====================================================
 *
 * Server actions pour les notifications gamifiées.
 */

"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  type UserNotification,
  type NotificationPreferences,
  type NotificationsResponse,
  type NotificationCategory,
  type NotificationPriority,
  type NotificationAnimation,
} from "./schema"

/* ==========================================================================
   GET NOTIFICATIONS
   ========================================================================== */

/**
 * Récupérer les notifications d'un utilisateur
 */
export async function getUserNotifications(
  userId: string,
  options: {
    limit?: number
    offset?: number
    unreadOnly?: boolean
  } = {}
): Promise<NotificationsResponse | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("get_user_notifications", {
    p_user_id: userId,
    p_limit: options.limit || 50,
    p_offset: options.offset || 0,
    p_unread_only: options.unreadOnly || false,
  })

  if (error) {
    console.error("Error fetching notifications:", error)
    return null
  }

  return data as NotificationsResponse
}

/**
 * Récupérer le nombre de notifications non lues
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from("user_notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false)
    .eq("is_dismissed", false)

  if (error) {
    console.error("Error counting unread:", error)
    return 0
  }

  return count || 0
}

/**
 * Récupérer les notifications récentes (pour le toast)
 */
export async function getRecentNotifications(
  userId: string,
  since: string
): Promise<UserNotification[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("is_dismissed", false)
    .gt("created_at", since)
    .order("created_at", { ascending: false })
    .limit(10)

  if (error) {
    console.error("Error fetching recent notifications:", error)
    return []
  }

  return data || []
}

/* ==========================================================================
   CREATE NOTIFICATIONS
   ========================================================================== */

/**
 * Créer une notification à partir d'un template
 */
export async function createNotificationFromTemplate(
  userId: string,
  templateSlug: string,
  data: Record<string, any> = {},
  scheduledFor?: string
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  const supabase = await createClient()

  const { data: notificationId, error } = await supabase.rpc(
    "create_notification_from_template",
    {
      p_user_id: userId,
      p_template_slug: templateSlug,
      p_data: data,
      p_scheduled_for: scheduledFor || null,
    }
  )

  if (error) {
    console.error("Error creating notification:", error)
    return { success: false, error: error.message }
  }

  if (!notificationId) {
    return { success: false, error: "Notification not created (preferences or inactive template)" }
  }

  revalidatePath("/notifications")

  return { success: true, notificationId }
}

/**
 * Créer une notification personnalisée
 */
export async function createCustomNotification(
  userId: string,
  options: {
    title: string
    body: string
    category?: NotificationCategory
    icon?: string
    emoji?: string
    priority?: NotificationPriority
    color?: string
    animation?: NotificationAnimation
    xpReward?: number
    coinReward?: number
    actionUrl?: string
    actionLabel?: string
    data?: Record<string, any>
  }
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  const supabase = await createClient()

  const { data: notificationId, error } = await supabase.rpc(
    "send_custom_notification",
    {
      p_user_id: userId,
      p_title: options.title,
      p_body: options.body,
      p_category: options.category || "system",
      p_icon: options.icon || null,
      p_emoji: options.emoji || null,
      p_priority: options.priority || "normal",
      p_color: options.color || null,
      p_animation: options.animation || null,
      p_xp_reward: options.xpReward || 0,
      p_coin_reward: options.coinReward || 0,
      p_action_url: options.actionUrl || null,
      p_action_label: options.actionLabel || null,
      p_data: options.data || {},
    }
  )

  if (error) {
    console.error("Error creating custom notification:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/notifications")

  return { success: true, notificationId }
}

/**
 * Envoyer une notification à plusieurs utilisateurs
 */
export async function sendBulkNotification(
  userIds: string[],
  templateSlug: string,
  data: Record<string, any> = {}
): Promise<{ success: boolean; sentCount: number; errors: string[] }> {
  const results = await Promise.all(
    userIds.map((userId) =>
      createNotificationFromTemplate(userId, templateSlug, data)
    )
  )

  const sentCount = results.filter((r) => r.success).length
  const errors = results
    .filter((r) => !r.success && r.error)
    .map((r) => r.error as string)

  return { success: sentCount > 0, sentCount, errors }
}

/* ==========================================================================
   NOTIFICATION ACTIONS
   ========================================================================== */

/**
 * Marquer des notifications comme lues
 */
export async function markNotificationsAsRead(
  userId: string,
  notificationIds?: string[]
): Promise<{ success: boolean; count: number }> {
  const supabase = await createClient()

  const { data: count, error } = await supabase.rpc("mark_notifications_read", {
    p_user_id: userId,
    p_notification_ids: notificationIds || null,
  })

  if (error) {
    console.error("Error marking notifications as read:", error)
    return { success: false, count: 0 }
  }

  revalidatePath("/notifications")

  return { success: true, count: count || 0 }
}

/**
 * Marquer une notification comme cliquée
 */
export async function markNotificationClicked(
  userId: string,
  notificationId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("user_notifications")
    .update({
      is_clicked: true,
      clicked_at: new Date().toISOString(),
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("user_id", userId)

  if (error) {
    console.error("Error marking notification clicked:", error)
    return { success: false }
  }

  revalidatePath("/notifications")

  return { success: true }
}

/**
 * Dismisser une notification
 */
export async function dismissNotification(
  userId: string,
  notificationId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("user_notifications")
    .update({
      is_dismissed: true,
      dismissed_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("user_id", userId)

  if (error) {
    console.error("Error dismissing notification:", error)
    return { success: false }
  }

  revalidatePath("/notifications")

  return { success: true }
}

/**
 * Dismisser toutes les notifications lues
 */
export async function dismissReadNotifications(
  userId: string
): Promise<{ success: boolean; count: number }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_notifications")
    .update({
      is_dismissed: true,
      dismissed_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("is_read", true)
    .eq("is_dismissed", false)
    .select("id")

  if (error) {
    console.error("Error dismissing read notifications:", error)
    return { success: false, count: 0 }
  }

  revalidatePath("/notifications")

  return { success: true, count: data?.length || 0 }
}

/* ==========================================================================
   REWARDS
   ========================================================================== */

/**
 * Réclamer les récompenses d'une notification
 */
export async function claimNotificationRewards(
  userId: string,
  notificationId: string
): Promise<{
  success: boolean
  xp?: number
  coins?: number
  error?: string
}> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("claim_notification_rewards", {
    p_user_id: userId,
    p_notification_id: notificationId,
  })

  if (error) {
    console.error("Error claiming rewards:", error)
    return { success: false, error: error.message }
  }

  if (!data.success) {
    return { success: false, error: data.error }
  }

  revalidatePath("/notifications")
  revalidatePath("/profile")

  return {
    success: true,
    xp: data.xp,
    coins: data.coins,
  }
}

/**
 * Réclamer toutes les récompenses en attente
 */
export async function claimAllPendingRewards(
  userId: string
): Promise<{
  success: boolean
  totalXp: number
  totalCoins: number
  claimedCount: number
}> {
  const supabase = await createClient()

  // Récupérer toutes les notifications avec récompenses non réclamées
  const { data: notifications, error } = await supabase
    .from("user_notifications")
    .select("id, xp_reward, coin_reward")
    .eq("user_id", userId)
    .eq("rewards_claimed", false)
    .or("xp_reward.gt.0,coin_reward.gt.0")

  if (error || !notifications) {
    return { success: false, totalXp: 0, totalCoins: 0, claimedCount: 0 }
  }

  let totalXp = 0
  let totalCoins = 0
  let claimedCount = 0

  for (const notif of notifications) {
    const result = await claimNotificationRewards(userId, notif.id)
    if (result.success) {
      totalXp += result.xp || 0
      totalCoins += result.coins || 0
      claimedCount++
    }
  }

  return { success: true, totalXp, totalCoins, claimedCount }
}

/* ==========================================================================
   PREFERENCES
   ========================================================================== */

/**
 * Récupérer les préférences de notification
 */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching preferences:", error)
    return null
  }

  // Si pas de préférences, créer les valeurs par défaut
  if (!data) {
    const { data: newPrefs, error: insertError } = await supabase
      .from("notification_preferences")
      .insert({ user_id: userId })
      .select()
      .single()

    if (insertError) {
      console.error("Error creating default preferences:", insertError)
      return null
    }

    return newPrefs
  }

  return data
}

/**
 * Mettre à jour les préférences de notification
 */
export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<NotificationPreferences>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Supprimer les champs non modifiables
  const { id, user_id, created_at, ...safeUpdates } = updates as any

  const { error } = await supabase
    .from("notification_preferences")
    .update({
      ...safeUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)

  if (error) {
    console.error("Error updating preferences:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/settings")

  return { success: true }
}

/**
 * Toggle une catégorie de notifications
 */
export async function toggleNotificationCategory(
  userId: string,
  category: NotificationCategory,
  enabled: boolean
): Promise<{ success: boolean }> {
  const columnMap: Record<NotificationCategory, string> = {
    achievement: "achievements_enabled",
    social: "social_enabled",
    event: "events_enabled",
    challenge: "challenges_enabled",
    reward: "rewards_enabled",
    system: "system_enabled",
  }

  return updateNotificationPreferences(userId, {
    [columnMap[category]]: enabled,
  } as any)
}

/* ==========================================================================
   PUSH NOTIFICATIONS
   ========================================================================== */

/**
 * Enregistrer un abonnement push
 */
export async function registerPushSubscription(
  userId: string,
  subscription: {
    endpoint: string
    p256dh: string
    auth: string
    deviceType?: "web" | "android" | "ios"
    deviceName?: string
    browser?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      device_type: subscription.deviceType,
      device_name: subscription.deviceName,
      browser: subscription.browser,
      is_active: true,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: "user_id,endpoint" }
  )

  if (error) {
    console.error("Error registering push subscription:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Supprimer un abonnement push
 */
export async function unregisterPushSubscription(
  userId: string,
  endpoint: string
): Promise<{ success: boolean }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint)

  if (error) {
    console.error("Error unregistering push subscription:", error)
    return { success: false }
  }

  return { success: true }
}

/**
 * Récupérer les abonnements push d'un utilisateur
 */
export async function getPushSubscriptions(
  userId: string
): Promise<Array<{ endpoint: string; deviceType: string; deviceName: string }>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, device_type, device_name")
    .eq("user_id", userId)
    .eq("is_active", true)

  if (error) {
    console.error("Error fetching push subscriptions:", error)
    return []
  }

  return (
    data?.map((d) => ({
      endpoint: d.endpoint,
      deviceType: d.device_type || "unknown",
      deviceName: d.device_name || "Unknown device",
    })) || []
  )
}

/* ==========================================================================
   TRIGGERED NOTIFICATIONS
   ========================================================================== */

/**
 * Déclencher une notification pour un événement
 */
export async function triggerNotification(
  userId: string,
  event: string,
  data: Record<string, any> = {}
): Promise<{ success: boolean; notificationId?: string }> {
  // Mapper l'événement au template
  const eventTemplateMap: Record<string, string> = {
    level_up: "level_up",
    badge_earned: "badge_earned",
    streak_milestone: "streak_milestone",
    friend_request: "friend_request",
    friend_accepted: "friend_accepted",
    crew_invite: "crew_invite",
    event_reminder: "event_reminder",
    event_live: "event_live",
    event_checkin: "event_checkin_bonus",
    challenge_new: "challenge_new",
    challenge_completed: "challenge_completed",
    duel_received: "duel_received",
    duel_result: "duel_result",
    daily_reward: "daily_reward",
    wheel_available: "wheel_available",
    shop_item: "shop_item_available",
    weekly_recap: "weekly_recap",
    inactivity: "inactivity_reminder",
    new_feature: "new_feature",
  }

  const templateSlug = eventTemplateMap[event]
  if (!templateSlug) {
    console.warn(`No template found for event: ${event}`)
    return { success: false }
  }

  return createNotificationFromTemplate(userId, templateSlug, data)
}

/**
 * Envoyer un rappel d'événement
 */
export async function sendEventReminder(
  userId: string,
  eventId: string,
  eventName: string,
  timeUntil: string
): Promise<{ success: boolean }> {
  return createNotificationFromTemplate(userId, "event_reminder", {
    event_id: eventId,
    event_name: eventName,
    time_until: timeUntil,
  })
}

/**
 * Envoyer une notification de level up
 */
export async function sendLevelUpNotification(
  userId: string,
  level: number
): Promise<{ success: boolean }> {
  return createNotificationFromTemplate(userId, "level_up", {
    level: level.toString(),
  })
}

/**
 * Envoyer une notification de badge débloqué
 */
export async function sendBadgeEarnedNotification(
  userId: string,
  badgeName: string,
  badgeDescription: string
): Promise<{ success: boolean }> {
  return createNotificationFromTemplate(userId, "badge_earned", {
    badge_name: badgeName,
    badge_description: badgeDescription,
  })
}

/* ==========================================================================
   ANALYTICS
   ========================================================================== */

/**
 * Obtenir les stats des notifications
 */
export async function getNotificationStats(userId: string): Promise<{
  total: number
  unread: number
  pendingRewards: number
  pendingXp: number
  pendingCoins: number
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_notifications")
    .select("is_read, xp_reward, coin_reward, rewards_claimed")
    .eq("user_id", userId)
    .eq("is_dismissed", false)

  if (error || !data) {
    return {
      total: 0,
      unread: 0,
      pendingRewards: 0,
      pendingXp: 0,
      pendingCoins: 0,
    }
  }

  const stats = data.reduce(
    (acc, notif) => {
      acc.total++
      if (!notif.is_read) acc.unread++
      if (
        !notif.rewards_claimed &&
        (notif.xp_reward > 0 || notif.coin_reward > 0)
      ) {
        acc.pendingRewards++
        acc.pendingXp += notif.xp_reward
        acc.pendingCoins += notif.coin_reward
      }
      return acc
    },
    { total: 0, unread: 0, pendingRewards: 0, pendingXp: 0, pendingCoins: 0 }
  )

  return stats
}
