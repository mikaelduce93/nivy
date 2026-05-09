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
      // Wave 6C — CANON-GAME-010: do NOT fall back to writing
      // `quests.status` directly. `quests` is a global content row
      // shared by every teen; writing per-teen state to it would corrupt
      // the catalogue for everyone (e.g. mark a quest "in_progress"
      // globally because one teen started it). The canonical per-teen
      // state lives in `quest_progress`; if the upsert fails, surface
      // the error instead of silently falsifying the catalogue.
      console.error('quest_progress upsert failed:', progressError)
      return NextResponse.json(
        { error: 'Failed to start quest', details: progressError.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, type: 'quest' })
  } catch (error) {
    console.error('Error starting quest:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
