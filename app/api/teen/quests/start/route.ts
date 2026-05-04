import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/get-user-role'

export async function POST(request: NextRequest) {
  try {
    const userInfo = await getUserRole()
    
    if (!userInfo || userInfo.role !== 'teen') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { questId, teenId } = body

    if (!questId || !teenId) {
      return NextResponse.json({ error: 'Missing questId or teenId' }, { status: 400 })
    }

    // Verify the teen ID matches the logged in user
    if (teenId !== userInfo.teenData?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = await createClient()

    // Check if quest exists
    const { data: quest, error: questError } = await supabase
      .from('quests')
      .select('id, status')
      .eq('id', questId)
      .single()

    if (questError || !quest) {
      // Try daily challenges
      const { data: challenge, error: challengeError } = await supabase
        .from('daily_challenges')
        .select('id, status')
        .eq('id', questId)
        .eq('teen_id', teenId)
        .single()

      if (challengeError || !challenge) {
        return NextResponse.json({ error: 'Quest not found' }, { status: 404 })
      }

      // Update challenge status
      const { error: updateError } = await supabase
        .from('daily_challenges')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', questId)

      if (updateError) {
        console.error('Failed to update challenge:', updateError)
        return NextResponse.json({ error: 'Failed to start challenge' }, { status: 500 })
      }

      return NextResponse.json({ success: true, type: 'challenge' })
    }

    // Create or update quest progress for the teen
    const { error: progressError } = await supabase
      .from('quest_progress')
      .upsert({
        quest_id: questId,
        teen_id: teenId,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'quest_id,teen_id'
      })

    if (progressError) {
      console.error('Failed to create quest progress:', progressError)
      // Try updating the quest directly if no progress table
      const { error: questUpdateError } = await supabase
        .from('quests')
        .update({ status: 'in_progress' })
        .eq('id', questId)

      if (questUpdateError) {
        console.error('Failed to update quest:', questUpdateError)
      }
    }

    return NextResponse.json({ success: true, type: 'quest' })
  } catch (error) {
    console.error('Error starting quest:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
