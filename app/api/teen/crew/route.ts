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

    // Get user's crew (circle where they are a member)
    const { data: memberships, error } = await supabase
      .from('circle_members')
      .select(`
        *,
        circles (
          id,
          name,
          description,
          avatar_url,
          theme_color,
          emoji,
          message_count,
          created_by
        )
      `)
      .eq('teen_id', teenId)
      .eq('status', 'active')
      .limit(1)

    if (error) {
      console.error('Error fetching crew:', error)
      return NextResponse.json({ crew: null })
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ crew: null })
    }

    const membership = memberships[0]
    const circle = membership.circles as any

    if (!circle) {
      return NextResponse.json({ crew: null })
    }

    // Get member count and members list
    const { data: members, count: memberCount } = await supabase
      .from('circle_members')
      .select(`
        id,
        role,
        teen:teen_id (
          id,
          first_name,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('circle_id', circle.id)
      .eq('status', 'active')
      .limit(10)

    // Get crew XP (sum of all members XP or specific crew XP)
    const memberIds = members?.map(m => (m.teen as any)?.id).filter(Boolean) || []
    let totalXp = 0
    
    if (memberIds.length > 0) {
      const { data: xpData } = await supabase
        .from('user_xp')
        .select('total_xp')
        .in('user_id', memberIds)

      totalXp = xpData?.reduce((sum, x) => sum + (x.total_xp || 0), 0) || 0
    }

    // Get crew rank (placeholder - would need a proper ranking system)
    const crewRank = 3 // Placeholder

    // Get active battles (placeholder)
    const activeBattles = [
      {
        id: '1',
        opponent: 'NIGHT OWLS',
        status: 'in_progress',
        ourScore: 2450,
        theirScore: 2120,
        endsIn: '2h 30m',
      },
      {
        id: '2',
        opponent: 'PHOENIX SQUAD',
        status: 'pending',
        ourScore: 0,
        theirScore: 0,
        endsIn: 'Starts tomorrow',
      },
    ]

    return NextResponse.json({
      crew: {
        id: circle.id,
        name: circle.name,
        description: circle.description,
        avatar_url: circle.avatar_url,
        theme_color: circle.theme_color,
        emoji: circle.emoji,
        tier: totalXp > 10000 ? 'Gold' : totalXp > 5000 ? 'Silver' : 'Bronze',
        role: membership.role,
        stats: {
          totalXp,
          memberCount: memberCount || 0,
          battlesWon: 8, // Placeholder
          cityRank: crewRank,
        },
        members: members?.map(m => ({
          id: (m.teen as any)?.id,
          name: (m.teen as any)?.first_name,
          avatar_url: (m.teen as any)?.avatar_url,
          role: m.role,
          isOwner: m.role === 'owner',
        })) || [],
        activeBattles,
      },
    })
  } catch (error) {
    console.error('Error in crew API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create or join crew
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
    const { action, name, crewId } = body

    const supabase = await createClient()

    if (action === 'create') {
      if (!name) {
        return NextResponse.json({ error: 'Crew name is required' }, { status: 400 })
      }

      // Create circle as crew
      const { data: circle, error } = await supabase
        .from('circles')
        .insert({
          name,
          description: 'Crew created for battles',
          circle_type: 'private',
          theme_color: 'coral',
          created_by: teenId,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating crew:', error)
        return NextResponse.json({ error: 'Failed to create crew' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        crew: circle,
      })
    }

    if (action === 'join') {
      if (!crewId) {
        return NextResponse.json({ error: 'Crew ID is required' }, { status: 400 })
      }

      // Check if crew exists
      const { data: circle } = await supabase
        .from('circles')
        .select('id, name')
        .eq('id', crewId)
        .single()

      if (!circle) {
        return NextResponse.json({ error: 'Crew not found' }, { status: 404 })
      }

      // Join the crew
      const { error } = await supabase
        .from('circle_members')
        .insert({
          circle_id: crewId,
          teen_id: teenId,
          role: 'member',
          status: 'active',
        })

      if (error) {
        console.error('Error joining crew:', error)
        return NextResponse.json({ error: 'Failed to join crew' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Joined crew successfully',
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in crew POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
