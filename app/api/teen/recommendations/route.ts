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

/**
 * V1.3-A — parse recommend_for_teen v4's `reason` text blob into a JSONB
 * `recommendation_factors` payload. Format produced by mig 085:
 *   "aff=0.50 col=0.10 fr=0.00 nov=0.50 ctx=1.00 diff=0.61 [coldstart]"
 * We pluck the numeric factors so the rollup cron can later compute
 * novelty_count via `(recommendation_factors->>'nov')::numeric >= 0.5`
 * without re-parsing the string at aggregation time.
 */
function parseReasonToFactors(reason: string | undefined): Record<string, number | boolean> {
  const out: Record<string, number | boolean> = {}
  if (!reason || typeof reason !== 'string') return out
  const numeric = ['aff', 'col', 'fr', 'nov', 'ctx', 'diff']
  for (const k of numeric) {
    const m = new RegExp(`\\b${k}=(-?[0-9]+(?:\\.[0-9]+)?)`).exec(reason)
    if (m) out[k] = Number(m[1])
  }
  if (/seen7d=1/.test(reason)) out.seen7d = true
  if (/\[coldstart\]/.test(reason)) out.coldstart = true
  if (/\[no-neighbours\]/.test(reason)) out.no_neighbours = true
  if (/\[lang-fallback\]/.test(reason)) out.lang_fallback = true
  return out
}

/**
 * V1.3-A (Layer 1) — persist each served recommendation as an impression row
 * in `content_recommendations`. Best-effort: failures here MUST NOT break
 * the user-facing recommendation response. The unique index
 * `idx_recommendations_unique_per_day` enforces 1 row per
 * (teen_id, content_type, content_id, UTC date), so re-calls within the
 * same UTC day are de-duped via UPSERT.
 *
 * Schema reminder (mig 034):
 *   id, teen_id, content_type, content_id, recommendation_score,
 *   confidence_level, recommendation_factors jsonb, status, user_feedback,
 *   actual_performance, recommended_at, shown_at, expires_at.
 *
 * status='shown' is set immediately because the server returns these rows
 * to the client which renders them on receipt; the click correlation in
 * /api/teen/quiz/[id] (POST start) flips status to 'accepted' on click and
 * /api/teen/quiz/submit (or signal=complete) flips it to 'completed'.
 */
async function persistImpressions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teenId: string,
  contentType: string,
  rows: RecRow[],
): Promise<void> {
  if (rows.length === 0) return
  const now = new Date()
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const payload = rows.map((r) => ({
    teen_id: teenId,
    content_type: contentType,
    content_id: r.id,
    // Cast: `recommend_for_teen` returns score on a [-1, ~1.5] scale; the
    // schema column is numeric(5,2). Round to 2 decimals and clamp to a
    // safe band so a stray weight never bursts the precision budget.
    recommendation_score: Math.max(-99.99, Math.min(99.99, Number(r.score ?? 0))),
    confidence_level: null,
    recommendation_factors: parseReasonToFactors(r.reason),
    status: 'shown',
    recommended_at: now.toISOString(),
    shown_at: now.toISOString(),
    expires_at: expires.toISOString(),
  }))
  try {
    const { error } = await supabase
      .from('content_recommendations')
      .upsert(payload, {
        // The functional unique index `idx_recommendations_unique_per_day`
        // covers (teen_id, content_type, content_id, to_utc_date(recommended_at)).
        // PostgREST cannot target a functional unique index by name in upsert
        // hints; use ignoreDuplicates so a same-day re-impression is a no-op
        // rather than an error.
        ignoreDuplicates: true,
      })
    if (error) {
      console.warn('[teen/recommendations] impression persist failed:', error.message)
    }
  } catch (err) {
    console.warn('[teen/recommendations] impression persist threw:', (err as Error).message)
  }
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
    // V1.3-A — persist impressions BEFORE hydration so the rollup ledger
    // is filled even if hydration errors. Best-effort, non-blocking on
    // failure (logged inside).
    await persistImpressions(supabase, teenId, contentType, rows)
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
