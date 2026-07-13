import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/get-user-role'

// Shape of the `user_activities.data` jsonb payload (written on insert by
// quest-complete, xp, badge, etc.). Frontier type for the Json column.
interface ActivityData {
  type?: string
  quest_name?: string
  amount?: number
  badge_name?: string
  friend_name?: string
  event_name?: string
  new_level?: number
  streak_days?: number
}

export async function GET(request: NextRequest) {
  try {
    const userInfo = await getUserRole()
    
    if (!userInfo || userInfo.role !== 'teen') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const teenId = userInfo.teenData?.id
    if (!teenId) {
      return NextResponse.json({ error: 'Teen ID not found' }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()

    // Get activities. Canonical table is `user_activities` (migration 018) —
    // the old `.from('activities')` hit a non-existent table → permanent empty
    // screen. The semantic activity type lives in the `data` jsonb (set on
    // insert), not in a `type`/`metadata` column.
    const { data: activities, error, count } = await supabase
      .from('user_activities')
      .select('*', { count: 'exact' })
      .eq('user_id', teenId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching activities:', error)
      // Honest empty payload — the UI renders NivEmpty for []. No fake EN mock
      // that would mask a real DB error behind plausible-looking activity.
      return NextResponse.json({ activities: [], total: 0, hasMore: false })
    }

    const formattedActivities = activities?.map(activity => {
      // user_activities stores the payload in the `data` jsonb column; the
      // semantic type is `data.type` (written on insert by quest-complete etc.).
      const metadata = (activity.data ?? {}) as ActivityData

      // Determine activity type and text
      let type = 'general'
      let text = activity.title || activity.description || 'Activity'
      let icon = 'Activity'
      let color = 'text-zinc-400'

      switch (metadata.type) {
        case 'quest_completed':
          type = 'quest'
          text = `Completed quest: ${metadata.quest_name || 'Quest'}`
          icon = 'Target'
          color = 'text-success-soft'
          break
        case 'xp_earned':
          type = 'xp'
          text = `Earned ${metadata.amount || 0} XP`
          icon = 'Zap'
          color = 'text-brand-soft'
          break
        case 'badge_unlocked':
          type = 'badge'
          text = `Unlocked badge: ${metadata.badge_name || 'Badge'}`
          icon = 'Award'
          color = 'text-brand-soft'
          break
        case 'friend_added':
          type = 'social'
          text = `Made a new friend: ${metadata.friend_name || 'Friend'}`
          icon = 'Users'
          color = 'text-accent-soft'
          break
        case 'event_attended':
          type = 'event'
          text = `Attended event: ${metadata.event_name || 'Event'}`
          icon = 'Calendar'
          color = 'text-info-soft'
          break
        case 'level_up':
          type = 'level'
          text = `Reached Level ${metadata.new_level || 0}!`
          icon = 'TrendingUp'
          color = 'text-success-soft'
          break
        case 'streak':
          type = 'streak'
          text = `${metadata.streak_days || 0} day streak!`
          icon = 'Flame'
          color = 'text-orange-500'
          break
      }

      return {
        id: activity.id,
        type,
        text,
        icon,
        color,
        time: formatRelativeTime(activity.created_at ?? new Date().toISOString()),
        metadata,
      }
    }) || []

    return NextResponse.json({
      activities: formattedActivities,
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    })
  } catch (error) {
    console.error('Error in activities API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return date.toLocaleDateString()
}
