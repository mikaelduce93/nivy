import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/get-user-role'

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

    const supabase = await createClient()

    // Get coins balance
    const { data: coinsData } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', teenId)
      .single()

    // Get XP data
    const { data: xpData } = await supabase
      .from('user_xp')
      .select('total_xp, level')
      .eq('user_id', teenId)
      .single()

    // Get streak
    const { data: streakData } = await supabase
      .from('user_streaks')
      .select('current_streak')
      .eq('user_id', teenId)
      .single()

    // Get recent transactions
    const { data: transactions } = await supabase
      .from('coin_transactions')
      .select('*')
      .eq('user_id', teenId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get user badges/achievements
    const { data: achievements } = await supabase
      .from('user_achievements')
      .select(`
        id,
        unlocked_at,
        achievement:achievements(
          id,
          name,
          description,
          icon,
          rarity,
          xp_reward
        )
      `)
      .eq('user_id', teenId)

    // Calculate level progress
    const totalXp = xpData?.total_xp || 0
    const level = xpData?.level || 1
    const xpForCurrentLevel = (level - 1) * 1000
    const xpForNextLevel = level * 1000
    const xpInLevel = totalXp - xpForCurrentLevel
    const progressPercent = Math.min(Math.round((xpInLevel / (xpForNextLevel - xpForCurrentLevel)) * 100), 100)

    return NextResponse.json({
      coins: coinsData?.balance || 0,
      xp: {
        total: totalXp,
        level: level,
        progressPercent: progressPercent,
        xpToNextLevel: xpForNextLevel - totalXp,
      },
      streak: streakData?.current_streak || 0,
      transactions: transactions?.map(tx => ({
        id: tx.id,
        type: tx.amount > 0 ? 'earned' : 'spent',
        amount: tx.amount,
        reason: tx.description || tx.source_type,
        time: formatRelativeTime(tx.created_at),
      })) || [],
      badges: achievements?.map(a => ({
        id: a.achievement?.id,
        name: a.achievement?.name,
        icon: a.achievement?.icon,
        rarity: a.achievement?.rarity,
        unlocked: true,
        unlockedAt: a.unlocked_at,
      })) || [],
    })
  } catch (error) {
    console.error('Error in wallet API:', error)
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

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}
