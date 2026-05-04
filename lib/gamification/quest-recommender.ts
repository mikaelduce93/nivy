
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/get-user-role'

/**
 * QUEST RECOMMENDER ENGINE
 * ========================
 * 
 * Moteur de recommandation intelligent pour les quêtes quotidiennes.
 * 
 * Score = (Intérêt * 1.5) + (Nouveauté * 1.2) + (Social * 1.1) + (Priorité Piliers) - (Fatigue * 2.0)
 */

export interface QuestRecommendationParams {
  teenId: string
  date?: string
  limit?: number
  excludeQuestIds?: string[]
}

export interface ScoredQuest {
  questId: string
  score: number
  reasons: string[]
  type: 'daily' | 'social' | 'event' | 'pillar'
  metadata: any
}

export class QuestRecommender {
  
  /**
   * Génère les recommandations de quêtes pour un ado
   */
  static async getRecommendations(params: QuestRecommendationParams): Promise<ScoredQuest[]> {
    const supabase = await createClient()
    const { teenId } = params
    
    // 1. Charger le profil complet (Intérêts, Piliers, Niveau)
    const { data: profile } = await supabase
      .from('teens')
      .select('*, user_xp(*)')
      .eq('id', teenId)
      .single()
      
    if (!profile) throw new Error('Profil non trouvé')
      
    // 2. Charger l'historique récent (Anti-fatigue)
    const { data: history } = await supabase
      .from('user_challenges')
      .select('challenge_id, completed_at, status')
      .eq('teen_id', teenId)
      .order('created_at', { ascending: false })
      .limit(50)
      
    // 3. Charger les quêtes candidates (Pool)
    const { data: candidates } = await supabase
      .from('challenges_templates')
      .select('*')
      .eq('is_active', true)
      
    if (!candidates) return []
      
    // 4. Scoring de chaque candidat
    const scoredQuests: ScoredQuest[] = candidates.map(quest => {
      let score = 50 // Base score
      const reasons: string[] = []
      
      // -- A. Intérêts (Boost fort)
      const interests = profile.interests || []
      if (interests.some((i: string) => quest.tags?.includes(i))) {
        score += 30
        reasons.push('interest_match')
      }
      
      // -- B. Équilibre Piliers (Boost ciblé)
      // Si un pilier est faible (< 40), on booste les quêtes de ce pilier
      const pillars = profile.user_xp?.[0] || {}
      if (quest.category === 'school' && (pillars.school_score || 0) < 40) {
        score += 25
        reasons.push('pillar_catchup_school')
      }
      if (quest.category === 'sport' && (pillars.sport_score || 0) < 40) {
        score += 25
        reasons.push('pillar_catchup_sport')
      }
      if (quest.category === 'crea' && (pillars.crea_score || 0) < 40) {
        score += 25
        reasons.push('pillar_catchup_crea')
      }
      
      // -- C. Anti-Fatigue (Malus fort)
      // Si déjà fait récemment (7 jours)
      const recent = history?.find((h: any) => h.challenge_id === quest.id)
      if (recent) {
        const daysAgo = (Date.now() - new Date(recent.completed_at || 0).getTime()) / (1000 * 60 * 60 * 24)
        if (daysAgo < 3) {
           score -= 100 // Bloquant
           reasons.push('fatigue_block')
        } else if (daysAgo < 7) {
           score -= 40 // Déconseillé
           reasons.push('fatigue_penalty')
        }
      }
      
      // -- D. Timing & Live-Ops (Boost contextuel)
      // TODO: Connecter au Live-Ops calendar (ex: "Mercredi Passion" booste Crea)
      const dayOfWeek = new Date().getDay()
      if (dayOfWeek === 1 && quest.category === 'school') { // Lundi = Quiz/School
        score += 15
        reasons.push('ritual_monday_school')
      }
      if (dayOfWeek === 3 && quest.category === 'crea') { // Mercredi = Passion
        score += 15
        reasons.push('ritual_wednesday_crea')
      }
      if (dayOfWeek === 5 && quest.category === 'social') { // Vendredi = Crew
        score += 20
        reasons.push('ritual_friday_social')
      }
      
      return {
        questId: quest.id,
        score,
        reasons,
        type: 'daily',
        metadata: quest
      }
    })
    
    // 5. Trier et Filtrer
    return scoredQuests
      .filter(q => q.score > 0) // Exclure les bloqués
      .sort((a, b) => b.score - a.score)
      .slice(0, params.limit || 3)
  }
}



