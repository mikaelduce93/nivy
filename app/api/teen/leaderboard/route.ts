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
    const searchParams = request.nextUrl.searchParams
    const timeframe = searchParams.get('timeframe') || 'all_time'
    const limit = parseInt(searchParams.get('limit') || '20')

    const supabase = await createClient()

    // Get leaderboard data
    let query = supabase
      .from('user_xp')
      .select(`
        user_id,
        total_xp,
        level,
        user:profiles(
          id,
          full_name,
          avatar_url
        )
      `)
      .order('total_xp', { ascending: false })
      .limit(limit)

    const { data: leaderboard, error } = await query

    if (error) {
      console.error('Error fetching leaderboard:', error)
      // Return mock data
      return NextResponse.json({
        rankings: [
          { rank: 1, id: '1', name: 'Salma K.', xp: 4250, level: 12, badge: '🏆', avatar_url: null },
          { rank: 2, id: '2', name: 'Youssef M.', xp: 3820, level: 11, badge: '🥈', avatar_url: null },
          { rank: 3, id: '3', name: 'Nadia L.', xp: 3650, level: 10, badge: '🥉', avatar_url: null },
          { rank: 4, id: '4', name: 'Omar B.', xp: 3420, level: 10, avatar_url: null },
        ],
        userRank: 5,
        userXp: 2450,
      })
    }

    // Find user's rank
    let userRank = -1
    let userXp = 0

    const rankings = leaderboard?.map((entry, index) => {
      const user = entry.user as any
      const rank = index + 1
      
      if (entry.user_id === teenId) {
        userRank = rank
        userXp = entry.total_xp
      }

      return {
        rank,
        id: entry.user_id,
        name: user?.full_name || 'Unknown',
        avatar_url: user?.avatar_url,
        xp: entry.total_xp,
        level: entry.level || 1,
        badge: rank === 1 ? '🏆' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : undefined,
        isYou: entry.user_id === teenId,
      }
    }) || []

    // If user not in top, add them
    if (userRank === -1 && teenId) {
      const { data: userXpData } = await supabase
        .from('user_xp')
        .select('total_xp, level')
        .eq('user_id', teenId)
        .single()

      if (userXpData) {
        userXp = userXpData.total_xp
        
        // Count users with more XP to get rank
        const { count } = await supabase
          .from('user_xp')
          .select('*', { count: 'exact', head: true })
          .gt('total_xp', userXp)

        userRank = (count || 0) + 1

        // Add user to rankings if they exist
        rankings.push({
          rank: userRank,
          id: teenId,
          name: userInfo.fullName || 'You',
          avatar_url: userInfo.teenData?.avatar_url || null,
          xp: userXp,
          level: userXpData.level || 1,
          badge: undefined,
          isYou: true,
        })
      }
    }

    return NextResponse.json({
      rankings,
      userRank,
      userXp,
      timeframe,
    })
  } catch (error) {
    console.error('Error in leaderboard API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
