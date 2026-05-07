import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { QuestRecommender } from '@/lib/gamification/quest-recommender'
import { getUserRole } from '@/lib/auth/get-user-role'

// Type mapping for legacy UI shape (used by <AICompanion>).
const typeMapping: Record<string, string> = {
  school: 'education',
  sport: 'crew',
  social: 'crew',
  crea: 'entertainment',
  event: 'event',
  daily: 'mission',
}

const ALLOWED_RPC_TYPES = new Set(['quiz', 'mission', 'event', 'partner_offer'])

type RecRow = { id: string; content_type: string; score: number; reason: string }

function parseRecRows(data: unknown): RecRow[] {
  if (!Array.isArray(data)) return []
  return data
    .map((row) => {
      if (typeof row === 'string') {
        try {
          return JSON.parse(row) as RecRow
        } catch {
          return null
        }
      }
      if (row && typeof row === 'object' && 'id' in (row as Record<string, unknown>)) {
        return row as RecRow
      }
      return null
    })
    .filter((r): r is RecRow => !!r && typeof r.id === 'string')
}

async function hydrateRecommendations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: RecRow[],
  contentType: string,
) {
  if (rows.length === 0) return []
  const ids = rows.map((r) => r.id)

  switch (contentType) {
    case 'quiz': {
      const { data } = await supabase
        .from('educational_quizzes')
        .select('id, code, title, description, subject, difficulty, grade_level, time_limit_minutes, passing_score, xp_reward, icon, tags')
        .in('id', ids)
      return rows.map((r) => ({
        ...r,
        item: (data ?? []).find((q) => q.id === r.id) ?? null,
      }))
    }
    case 'mission': {
      const { data } = await supabase
        .from('mission_templates')
        .select('id, code, name, description, mission_type, category, xp_reward, difficulty, icon, tags')
        .in('id', ids)
      return rows.map((r) => ({
        ...r,
        item: (data ?? []).find((m) => m.id === r.id) ?? null,
      }))
    }
    case 'event': {
      const { data } = await supabase
        .from('events')
        .select('id, slug, title, description, event_date, starts_at, city, image_url, age_min, age_max, price_dh, price_coins, tags')
        .in('id', ids)
      return rows.map((r) => ({
        ...r,
        item: (data ?? []).find((e) => e.id === r.id) ?? null,
      }))
    }
    case 'partner_offer': {
      const { data } = await supabase
        .from('partner_offers')
        .select('id, partner_id, title, description, offer_type, discount_pct, price_coins, price_dh, valid_until, tags')
        .in('id', ids)
      return rows.map((r) => ({
        ...r,
        item: (data ?? []).find((o) => o.id === r.id) ?? null,
      }))
    }
    default:
      return rows.map((r) => ({ ...r, item: null }))
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const contentType = url.searchParams.get('type')
  const nRaw = url.searchParams.get('n')
  const n = nRaw ? Math.min(Math.max(parseInt(nRaw, 10) || 5, 1), 20) : 5

  // Wave 1.4 — when ?type=quiz|mission|event|partner_offer is passed, dispatch to the
  // recommend_for_teen RPC and hydrate the rows. Without ?type the legacy
  // QuestRecommender output is returned (used by <AICompanion>).
  if (contentType) {
    if (!ALLOWED_RPC_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: `Unsupported type '${contentType}'. Allowed: ${[...ALLOWED_RPC_TYPES].join(', ')}` },
        { status: 400 },
      )
    }

    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== 'teen' || !userInfo.teenData?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const teenId = userInfo.teenData.id
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('recommend_for_teen', {
      p_teen_id: teenId,
      p_content_type: contentType,
      p_n: n,
    })
    if (error) {
      console.error('[teen/recommendations] RPC error:', error)
      return NextResponse.json({ error: 'Failed to compute recommendations' }, { status: 500 })
    }

    const rows = parseRecRows(data)
    const hydrated = await hydrateRecommendations(supabase, rows, contentType)
    return NextResponse.json({ success: true, type: contentType, count: hydrated.length, recommendations: hydrated })
  }

  // ----- Legacy code path (unchanged): kept so <AICompanion> stays green -----
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let recommendations: any[] = []
    try {
      const questRecos = await QuestRecommender.getRecommendations({
        teenId: user.id,
        limit: 5,
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

    if (recommendations.length === 0) {
      const { data: events } = await supabase
        .from('events')
        .select('id, title, xp_reward')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .limit(3)
      if (events) {
        recommendations = events.map((e) => ({
          id: e.id,
          title: e.title,
          type: 'event',
          xp: e.xp_reward || 25,
          xp_reward: e.xp_reward || 25,
        }))
      }
    }

    if (recommendations.length === 0) {
      recommendations = [
        { id: 'complete-profile', title: 'Complète ton profil', type: 'mission', xp: 100, xp_reward: 100, action: '/teen/profile/edit' },
        { id: 'explore-map', title: 'Explore la map', type: 'event', xp: 25, xp_reward: 25, action: '/teen/social?tab=map' },
      ]
    }

    await supabase.from('quest_recommendation_logs').insert({
      teen_id: user.id,
      recommendations,
      context: { source: 'api_route', timestamp: new Date().toISOString() },
    })

    return NextResponse.json({ success: true, recommendations, count: recommendations.length })
  } catch (error: any) {
    console.error('[Recommendations] API Error:', error)
    return NextResponse.json({
      success: true,
      recommendations: [
        { id: 'explore-app', title: "Explore l'app", type: 'mission', xp: 25, xp_reward: 25 },
      ],
      count: 1,
      fallback: true,
    })
  }
}
