
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * SOCIAL GRAPH & CREWS
 * ====================
 * 
 * Gestion des Crews, XP partagé, et Buddy Quests.
 */

export interface CrewXPGoal {
  crewId: string
  targetXP: number
  currentXP: number
  deadline: string
  reward: any
}

export async function getCrewXPStatus(crewId: string) {
  const supabase = await createClient()
  
  // 1. Calculer XP total du crew (somme des membres cette semaine)
  const { data: members } = await supabase
    .from('crew_members')
    .select('user_id')
    .eq('crew_id', crewId)
    
  if (!members || members.length === 0) return { totalXP: 0 }
    
  const userIds = members.map(m => m.user_id)
  
  // Récupérer XP gagné cette semaine par ces users
  const startOfWeek = new Date()
  startOfWeek.setHours(0,0,0,0)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1) // Lundi
  
  const { data: xpEntries } = await supabase
    .from('xp_ledger')
    .select('amount')
    .in('teen_id', userIds)
    .gte('created_at', startOfWeek.toISOString())
    
  const totalXP = xpEntries?.reduce((sum, entry) => sum + entry.amount, 0) || 0
  
  return {
    totalXP,
    goal: 5000, // Objectif hebdo statique pour l'instant
    progress: Math.min(100, (totalXP / 5000) * 100),
    contributors: userIds.length
  }
}

export async function createBuddyQuest(hostId: string, friendId: string, questTemplateId: string) {
  const supabase = await createClient()
  
  // Créer une mission partagée
  const { data, error } = await supabase
    .from('buddy_quests')
    .insert({
      host_id: hostId,
      friend_id: friendId,
      quest_template_id: questTemplateId,
      status: 'pending',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
    })
    .select()
    .single()
    
  if (error) throw error
  return data
}

export async function checkLocalRivalry(schoolId: string) {
  const supabase = await createClient()
  
  // Top 3 crews de l'école
  const { data } = await supabase
    .rpc('get_school_leaderboard', { school_id: schoolId })
    
  return data
}



