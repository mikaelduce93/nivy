import { createClient } from '@supabase/supabase-js'
import webPush from 'web-push'
import { getPublicAppConfig } from '@/lib/config/app-config'

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
      .select('subscription')
      .eq('user_id', userId)

    if (!subscriptions || subscriptions.length === 0) return

    const notifications = subscriptions.map(sub => 
      webPush.sendNotification(
        sub.subscription as any,
        JSON.stringify(payload)
      ).catch(err => {
        if (err.statusCode === 410) {
          // Subscription expired, remove it
          supabase.from('push_subscriptions').delete().match({ subscription: sub.subscription })
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
    .select('user_id, current_streak, last_activity_date')
    .gt('current_streak', 0)
  
  if (!streaks) return

  const now = new Date()
  const dangerThreshold = 20 // hours since last activity (assuming daily check at 8 PM)

  for (const streak of streaks) {
    const lastActivity = new Date(streak.last_activity_date)
    const diffHours = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60)
    
    // If > 24h, streak is already lost usually, but let's say "danger" is between 20h and 24h
    if (diffHours >= 20 && diffHours < 24) {
      await sendPushNotification(streak.user_id, {
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
    .from('user_gamification') // Assuming this table exists
    .select('user_id, last_wheel_spin')
  
  if (!users) return

  const today = new Date().toDateString()

  for (const user of users) {
    const lastSpin = user.last_wheel_spin ? new Date(user.last_wheel_spin).toDateString() : null
    
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

