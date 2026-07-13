
'use server'

import { createClient } from '@/lib/supabase/server'

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

  // La table `buddy_quests` n'existe pas dans le schéma live (feature non provisionnée).
  // L'appel échouait toujours au runtime ; on remonte une erreur explicite.
  void friendId
  void questTemplateId
  throw new Error('Buddy quests not available: buddy_quests table is not provisioned')
}

/**
 * Accepter une quête duo
 */
export async function acceptBuddyQuest(questId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // La table `buddy_quests` n'existe pas dans le schéma live (feature non provisionnée).
  void questId
  throw new Error('Buddy quests not available: buddy_quests table is not provisioned')
}

/**
 * Contribuer à un objectif de Crew (Crew Goal)
 */
export async function contributeToCrewGoal(goalId: string, xpAmount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // La RPC `increment_crew_goal` n'existe pas dans le schéma live (feature non provisionnée).
  // L'appel échouait toujours au runtime ; on remonte une erreur explicite.
  void supabase
  void goalId
  void xpAmount
  throw new Error('Crew goals not available: increment_crew_goal RPC is not provisioned')
}



