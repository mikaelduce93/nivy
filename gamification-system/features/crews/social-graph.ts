
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
    .from('xp_transactions')
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

