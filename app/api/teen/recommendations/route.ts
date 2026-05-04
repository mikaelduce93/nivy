import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { QuestRecommender } from '@/lib/gamification/quest-recommender'

// Type mapping for UI
const typeMapping: Record<string, string> = {
  school: 'education',
  sport: 'crew',
  social: 'crew',
  crea: 'entertainment',
  event: 'event',
  daily: 'mission',
}

export async function GET() {
  const supabase = await createClient()
  
  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 2. Get recommendations from QuestRecommender
    let recommendations: any[] = []
    
    try {
      const questRecos = await QuestRecommender.getRecommendations({
        teenId: user.id,
        limit: 5
      })
      
      recommendations = questRecos.map((q: any) => ({
        id: q.questId,
        title: q.metadata?.title || q.metadata?.name || 'Mission disponible',
        type: typeMapping[q.metadata?.category] || typeMapping[q.type] || 'mission',
        xp: q.metadata?.xp_reward || 50,
        xp_reward: q.metadata?.xp_reward || 50,
        description: q.metadata?.description,
        reasons: q.reasons,
        score: q.score,
      }))
    } catch (questError) {
      console.warn('[Recommendations] QuestRecommender failed, using fallback:', questError)
    }
    
    // 3. If no quests, fetch events as fallback
    if (recommendations.length === 0) {
      const { data: events } = await supabase
        .from('events')
        .select('id, title, xp_reward')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .limit(3)
      
      if (events) {
        recommendations = events.map(e => ({
          id: e.id,
          title: e.title,
          type: 'event',
          xp: e.xp_reward || 25,
          xp_reward: e.xp_reward || 25,
        }))
      }
    }
    
    // 4. Still empty? Add profile completion as fallback
    if (recommendations.length === 0) {
      recommendations = [
        {
          id: 'complete-profile',
          title: 'Complète ton profil',
          type: 'mission',
          xp: 100,
          xp_reward: 100,
          action: '/teen/profile/edit',
        },
        {
          id: 'explore-map',
          title: 'Explore la map',
          type: 'event',
          xp: 25,
          xp_reward: 25,
          action: '/teen/social?tab=map',
        }
      ]
    }

    // 5. Log for analytics (silent fail)
    await supabase.from('quest_recommendation_logs').insert({
      teen_id: user.id,
      recommendations: recommendations,
      context: { source: 'api_route', timestamp: new Date().toISOString() }
    })

    return NextResponse.json({ 
      success: true, 
      recommendations,
      count: recommendations.length
    })
  } catch (error: any) {
    console.error('[Recommendations] API Error:', error)
    
    // Return fallback recommendations even on error
    return NextResponse.json({ 
      success: true, 
      recommendations: [
        {
          id: 'explore-app',
          title: 'Explore l\'app',
          type: 'mission',
          xp: 25,
          xp_reward: 25,
        }
      ],
      count: 1,
      fallback: true
    })
  }
}


