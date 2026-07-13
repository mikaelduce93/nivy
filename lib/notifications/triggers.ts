import webPush from 'web-push'
import { getPublicAppConfig } from '@/lib/config/app-config'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// Initialize Supabase Admin Client (canonical service-role helper)
const supabase = createServiceRoleClient()

// Initialize Web Push
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || `mailto:${getPublicAppConfig().supportEmail}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string
  data?: any
}

async function sendPushNotification(userId: string, payload: NotificationPayload) {
  try {
    // Get user subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (!subscriptions || subscriptions.length === 0) return

    const notifications = subscriptions.map(sub =>
      webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      ).catch(err => {
        if (err.statusCode === 410) {
          // Subscription expired, remove it
          supabase.from('push_subscriptions').delete().match({ endpoint: sub.endpoint })
        }
        console.error('Push error:', err)
      })
    )

    await Promise.all(notifications)
  } catch (error) {
    console.error('Error sending push:', error)
  }
}

export async function checkStreakDanger() {
  console.log('Checking streak danger...')
  
  // Find users with active streak > 0, last activity yesterday, and no activity today
  // And local time is evening (this runs via cron so we assume it runs in evening)
  
  // For simplicity in this demo, we select users who haven't logged activity in > 20 hours
  // In production, we'd query exact dates
  
  const { data: streaks } = await supabase
    .from('user_streaks')
    .select('teen_id, current_streak, last_activity_date')
    .gt('current_streak', 0)

  if (!streaks) return

  const now = new Date()
  const dangerThreshold = 20 // hours since last activity (assuming daily check at 8 PM)

  for (const streak of streaks) {
    if (!streak.last_activity_date) continue
    const lastActivity = new Date(streak.last_activity_date)
    const diffHours = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60)

    // If > 24h, streak is already lost usually, but let's say "danger" is between 20h and 24h
    if (diffHours >= 20 && diffHours < 24) {
      await sendPushNotification(streak.teen_id, {
        title: "🔥 Ton streak est en danger !",
        body: `Tu vas perdre ta série de ${streak.current_streak} jours ! Connecte-toi vite !`,
        url: "/teen/streak",
        data: { type: "streak_danger" }
      })
    }
  }
}

export async function checkDailyRewards() {
  console.log('Checking daily rewards...')
  
  // Check users who haven't spun the wheel today
  // This requires tracking last spin date
  
  const { data: users } = await supabase
    .from('wheel_streaks')
    .select('user_id, last_spin_date')

  if (!users) return

  const today = new Date().toDateString()

  for (const user of users) {
    const lastSpin = user.last_spin_date ? new Date(user.last_spin_date).toDateString() : null
    
    if (lastSpin !== today) {
      await sendPushNotification(user.user_id, {
        title: "🎁 Ta roue quotidienne t'attend",
        body: "Viens tourner la roue et gagner des récompenses !",
        url: "/gamification/roue",
        data: { type: "daily_reward" }
      })
    }
  }
}

export async function checkLeaderboardChanges() {
  // Complex logic: check rank changes.
  // Simplified: Notify top 10 users if they dropped rank
  console.log('Checking leaderboard...')
  // Placeholder implementation
}

