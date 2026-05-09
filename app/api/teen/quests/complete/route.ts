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
    // Wave 6J — idempotency flag. When true, the XP grant below is
    // skipped so a replay (double-click, retry, history-back) never
    // re-credits canonical XP via add_xp_to_user.
    let alreadyCompleted = false

    if (quest) {
      xpReward = quest.xp_reward || 50

      // Wave 6J — pre-check quest_progress for an existing completion.
      // The upsert below has `onConflict: 'quest_id,teen_id'` and would
      // happily overwrite a completed row with the same status — that
      // path looked successful and fired a second add_xp_to_user grant.
      // Now we read first and short-circuit on prior completion.
      const { data: existingProgress } = await supabase
        .from('quest_progress')
        .select('status')
        .eq('quest_id', questId)
        .eq('teen_id', teenId)
        .maybeSingle()
      if (existingProgress?.status === 'completed') {
        alreadyCompleted = true
      }

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
        // Wave 6C — CANON-GAME-011: do NOT fall back to writing
        // `quests.status` directly. The catalogue row is shared across
        // all teens; per-teen completion lives in `quest_progress`.
        // Falsifying the catalogue would also short-circuit the
        // canonical add_xp_to_user grant below, since `xpReward > 0`
        // would still trigger a write under a corrupted state.
        console.error('quest_progress upsert failed:', progressError)
        return NextResponse.json(
          { error: 'Failed to complete quest', details: progressError.message },
          { status: 500 },
        )
      }
    } else {
      // Try daily challenges
      const { data: challenge, error: challengeError } = await supabase
        .from('daily_challenges')
        .select('id, status, challenge:challenges(xp_reward)')
        .eq('id', questId)
        .eq('teen_id', teenId)
        .single()

      if (challengeError || !challenge) {
        return NextResponse.json({ error: 'Quest not found' }, { status: 404 })
      }

      // Wave 6J — daily_challenges idempotency: skip the XP grant if
      // the row was already flipped to 'completed' on a prior call.
      if ((challenge as { status?: string }).status === 'completed') {
        alreadyCompleted = true
      }

      xpReward = (challenge.challenge as unknown as { xp_reward?: number } | null)?.xp_reward || 50
      questType = 'challenge'

      // Update challenge status (idempotent — same row on replay).
      const { error: updateError } = await supabase
        .from('daily_challenges')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', questId)

      if (updateError) {
        console.error('Failed to complete challenge:', updateError)
        return NextResponse.json({ error: 'Failed to complete challenge' }, { status: 500 })
      }
    }

    // Award XP — canonical RPC per docs/canon/economy-payments.locked.md §7.
    // No silent catch-and-fake-success: a money/XP RPC failure must surface
    // to the client so the optimistic UI is rolled back.
    //
    // Wave 6J — idempotency: skip the grant if the quest/challenge was
    // already completed on a prior call. The route still returns
    // success: true (the quest IS completed) but with `xpEarned: 0`
    // and `idempotent_replay: true` so the UI can show "déjà complété"
    // instead of crediting fake XP.
    let xpAwarded = 0
    if (xpReward > 0 && !alreadyCompleted) {
      const { error: xpError } = await supabase.rpc('add_xp_to_user', {
        p_teen_id: teenId,
        p_xp_amount: xpReward,
        p_source_type: questType,
        p_source_category: 'quest',
        p_source_id: questId,
        p_description: `Completed ${questType} ${questId}`,
      })

      if (xpError) {
        console.error('add_xp_to_user RPC failed:', xpError)
        return NextResponse.json(
          { ok: false, error: 'Failed to award XP', details: xpError.message },
          { status: 500 }
        )
      }
      xpAwarded = xpReward
    }

    // Wave 6J — only log a fresh activity when this call actually
    // completed the quest. A replay would otherwise duplicate the feed
    // entry and inflate the user's "quest_completed" history.
    if (!alreadyCompleted) {
      try {
        await supabase.from('activities').insert({
          user_id: teenId,
          type: 'quest_completed',
          metadata: {
            quest_id: questId,
            quest_type: questType,
            xp_earned: xpAwarded,
          },
        })
      } catch (activityError) {
        console.error('Failed to create activity:', activityError)
      }
    }

    return NextResponse.json({
      success: true,
      type: questType,
      xpEarned: xpAwarded,
      idempotent_replay: alreadyCompleted,
    })
  } catch (error) {
    console.error('Error completing quest:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
