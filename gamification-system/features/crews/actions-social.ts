
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * ACTIONS SOCIAL GRAPH (10/10)
 * ============================
 */

/**
 * Invite un ami pour une quête duo (Buddy Quest)
 */
export async function inviteBuddyForQuest(friendId: string, questTemplateId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('buddy_quests')
    .insert({
      host_id: user.id,
      friend_id: friendId,
      quest_template_id: questTemplateId,
      status: 'pending',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })
    .select()
    .single()

  if (error) throw error
  revalidatePath('/teen/social')
  return { success: true, data }
}

/**
 * Accepter une quête duo
 */
export async function acceptBuddyQuest(questId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('buddy_quests')
    .update({ status: 'active' })
    .eq('id', questId)
    .eq('friend_id', user.id) // Security check

  if (error) throw error
  revalidatePath('/teen/social')
  return { success: true }
}

/**
 * Contribuer à un objectif de Crew (Crew Goal)
 */
export async function contributeToCrewGoal(goalId: string, xpAmount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 1. Check if user is in crew (Logic simplified)
  // ...

  // 2. Update Goal
  const { error } = await supabase.rpc('increment_crew_goal', {
    goal_id: goalId,
    amount: xpAmount
  })

  if (error) throw error
  revalidatePath('/teen/crew')
  return { success: true }
}



