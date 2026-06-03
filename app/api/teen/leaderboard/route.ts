import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
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

    // #32 — XP rankings span all teens; user_xp RLS is self/parent-read only,
    // so the (authz'd via getUserRole) social reads use the service-role client.
    const supabase = createServiceRoleClient()

    // #32 — user_xp keys on teen_id (not user_id), level is current_level, and
    // there's no FK user_xp→profiles (so the embed is unresolvable). Read the
    // ranking, then resolve names/avatars from profiles separately.
    const query = supabase
      .from('user_xp')
      .select('teen_id, total_xp, current_level')
      .order('total_xp', { ascending: false })
      .limit(limit)

    const { data: leaderboard, error } = await query

    if (error) {
      console.error('Error fetching leaderboard:', error)
      // No fake data: return an honest unavailable response.
      return NextResponse.json({
        rankings: [],
        userRank: null,
        userXp: 0,
        timeframe,
        status: 'unavailable',
        error: 'Leaderboard temporarily unavailable',
      })
    }

    // Resolve names/avatars (profiles.id == teens.id == user_xp.teen_id).
    const rankTeenIds = (leaderboard ?? []).map((e) => e.teen_id as string).filter(Boolean)
    const profileById = new Map<string, { full_name: string | null; avatar_url: string | null }>()
    if (rankTeenIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', rankTeenIds)
      for (const p of profs ?? []) profileById.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url })
    }

    // Find user's rank
    let userRank = -1
    let userXp = 0

    const rankings = leaderboard?.map((entry, index) => {
      const user = profileById.get(entry.teen_id as string) ?? null
      const rank = index + 1

      if (entry.teen_id === teenId) {
        userRank = rank
        userXp = entry.total_xp
      }

      return {
        rank,
        id: entry.teen_id,
        name: user?.full_name || 'Unknown',
        avatar_url: user?.avatar_url,
        xp: entry.total_xp,
        level: entry.current_level || 1,
        badge: rank === 1 ? '🏆' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : undefined,
        isYou: entry.teen_id === teenId,
      }
    }) || []

    // If user not in top, add them
    if (userRank === -1 && teenId) {
      // Canon: user_xp PK is teen_id, level column is current_level.
      const { data: userXpData } = await supabase
        .from('user_xp')
        .select('total_xp, current_level')
        .eq('teen_id', teenId)
        .maybeSingle()

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
          avatar_url: userInfo.teenData?.avatar_url || undefined,
          xp: userXp,
          level: userXpData.current_level || 1,
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
