import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/get-user-role'

type ProfileJoin = {
  id: string
  full_name: string | null
  avatar_url: string | null
} | null

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

    // Get friends from friendships table
    const { data: friendships, error: friendshipsError } = await supabase
      .from('friendships')
      .select(`
        id,
        status,
        friend:profiles!friendships_friend_id_fkey(
          id,
          full_name,
          avatar_url
        ),
        user:profiles!friendships_user_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .or(`user_id.eq.${teenId},friend_id.eq.${teenId}`)
      .eq('status', 'accepted')

    if (friendshipsError) {
      console.error('Error fetching friendships:', friendshipsError)
      // No fake friends: return an honest unavailable response.
      return NextResponse.json({
        friends: [],
        total: 0,
        status: 'unavailable',
        error: 'Friends list temporarily unavailable',
      })
    }

    // Get online status from presence table
    const friendIds = friendships?.map(f => {
      const friend = f.friend as unknown as ProfileJoin
      const user = f.user as unknown as ProfileJoin
      return friend?.id === teenId ? user?.id : friend?.id
    }).filter(Boolean) || []

    let presenceData: Record<string, string> = {}
    if (friendIds.length > 0) {
      const { data: presence } = await supabase
        .from('user_presence')
        .select('user_id, status')
        .in('user_id', friendIds)

      if (presence) {
        presenceData = presence.reduce((acc, p) => {
          acc[p.user_id] = p.status
          return acc
        }, {} as Record<string, string>)
      }
    }

    // Get XP data for friends
    let xpData: Record<string, number> = {}
    if (friendIds.length > 0) {
      const { data: xp } = await supabase
        .from('user_xp')
        .select('user_id, total_xp')
        .in('user_id', friendIds)

      if (xp) {
        xpData = xp.reduce((acc, x) => {
          acc[x.user_id] = x.total_xp
          return acc
        }, {} as Record<string, number>)
      }
    }

    // Format response. Real mutual-friend counts are not computed yet:
    // expose `mutual: 0` with `mutual_calculated: false` rather than a fake value.
    const friends = friendships?.flatMap(f => {
      const friend = f.friend as unknown as ProfileJoin
      const user = f.user as unknown as ProfileJoin
      const friendData: ProfileJoin = friend?.id === teenId ? user : friend
      const friendId = friendData?.id
      if (!friendId) return []

      return [{
        id: friendId,
        name: friendData?.full_name || 'Unknown',
        avatar_url: friendData?.avatar_url,
        status: presenceData[friendId] || 'offline',
        xp: xpData[friendId] || 0,
        mutual: 0,
        mutual_calculated: false,
      }]
    }) || []

    return NextResponse.json({
      friends,
      total: friends.length,
    })
  } catch (error) {
    console.error('Error in friends API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Add friend
export async function POST(request: NextRequest) {
  try {
    const userInfo = await getUserRole()
    
    if (!userInfo || userInfo.role !== 'teen') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const teenId = userInfo.teenData?.id
    if (!teenId) {
      return NextResponse.json({ error: 'Teen ID not found' }, { status: 400 })
    }

    const body = await request.json()
    const { friendId } = body

    if (!friendId) {
      return NextResponse.json({ error: 'Friend ID required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if friendship already exists
    const { data: existing } = await supabase
      .from('friendships')
      .select('id')
      .or(`and(user_id.eq.${teenId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${teenId})`)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Friendship already exists' }, { status: 400 })
    }

    // Create friendship request
    const { data, error } = await supabase
      .from('friendships')
      .insert({
        user_id: teenId,
        friend_id: friendId,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating friendship:', error)
      return NextResponse.json({ error: 'Failed to send friend request' }, { status: 500 })
    }

    return NextResponse.json({ success: true, friendship: data })
  } catch (error) {
    console.error('Error in friends POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
