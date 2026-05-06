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

    // Check if it's a quest or challenge
    const { data: quest } = await supabase
      .from('quests')
      .select('id, xp_reward')
      .eq('id', questId)
      .single()

    let xpReward = 0
    let questType = 'quest'

    if (quest) {
      xpReward = quest.xp_reward || 50

      // Update quest progress
      const { error: progressError } = await supabase
        .from('quest_progress')
        .upsert({
          quest_id: questId,
          teen_id: teenId,
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'quest_id,teen_id'
        })

      if (progressError) {
        // Try updating quest directly
        await supabase
          .from('quests')
          .update({ status: 'completed' })
          .eq('id', questId)
      }
    } else {
      // Try daily challenges
      const { data: challenge, error: challengeError } = await supabase
        .from('daily_challenges')
        .select('id, challenge:challenges(xp_reward)')
        .eq('id', questId)
        .eq('teen_id', teenId)
        .single()

      if (challengeError || !challenge) {
        return NextResponse.json({ error: 'Quest not found' }, { status: 404 })
      }

      xpReward = (challenge.challenge as unknown as { xp_reward?: number } | null)?.xp_reward || 50
      questType = 'challenge'

      // Update challenge status
      const { error: updateError } = await supabase
        .from('daily_challenges')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString() 
        })
        .eq('id', questId)

      if (updateError) {
        console.error('Failed to complete challenge:', updateError)
        return NextResponse.json({ error: 'Failed to complete challenge' }, { status: 500 })
      }
    }

    // Award XP
    if (xpReward > 0) {
      try {
        await supabase.rpc('add_user_xp', {
          p_user_id: teenId,
          p_xp_amount: xpReward,
          p_source_type: questType,
          p_source_id: questId,
        })
      } catch (xpError) {
        console.error('Failed to award XP:', xpError)
        // Don't fail the request if XP award fails
      }
    }

    // Create activity for the feed
    try {
      await supabase.from('activities').insert({
        user_id: teenId,
        type: 'quest_completed',
        metadata: {
          quest_id: questId,
          quest_type: questType,
          xp_earned: xpReward,
        },
      })
    } catch (activityError) {
      console.error('Failed to create activity:', activityError)
    }

    return NextResponse.json({ 
      success: true, 
      type: questType,
      xpEarned: xpReward,
    })
  } catch (error) {
    console.error('Error completing quest:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
