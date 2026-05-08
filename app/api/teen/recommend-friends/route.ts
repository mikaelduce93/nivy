/**
 * GET /api/teen/recommend-friends?limit=10
 *
 * Wave-2 / TICKET-021 — opponent picker for the friend-challenge creation
 * form (FD2). Wraps the SECURITY DEFINER RPC `public.recommend_friends`
 * (migration 079) and returns up to N candidate teens ranked by
 * teen_neighbours.similarity (with on-the-fly affinity-cosine fallback).
 *
 * Auth: teen-only. Caller's teen_id is read from getUserRole().
 *
 * Response shape:
 *   {
 *     success: true,
 *     count: number,
 *     recommendations: Array<{
 *       teen_id: string
 *       name: string
 *       level: number
 *       last_seen: string | null   // ISO timestamp
 *       similarity: number
 *       source: 'neighbours' | 'affinity'
 *     }>
 *   }
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { getUserRole } from '@/lib/auth/get-user-role'

export const dynamic = 'force-dynamic'

type FriendRecRow = {
  teen_id: string
  name: string
  level: number
  last_seen: string | null
  similarity: number
  source: 'neighbours' | 'affinity'
}

function parseRows(data: unknown): FriendRecRow[] {
  if (!Array.isArray(data)) return []
  return data
    .map((row) => {
      let parsed: unknown = row
      if (typeof row === 'string') {
        try {
          parsed = JSON.parse(row)
        } catch {
          return null
        }
      }
      if (!parsed || typeof parsed !== 'object') return null
      const r = parsed as Record<string, unknown>
      if (typeof r.teen_id !== 'string') return null
      const source = r.source === 'affinity' ? 'affinity' : 'neighbours'
      return {
        teen_id: r.teen_id,
        name: typeof r.name === 'string' ? r.name : 'Anonyme',
        level: typeof r.level === 'number' ? r.level : Number(r.level) || 1,
        last_seen:
          typeof r.last_seen === 'string' || r.last_seen === null
            ? (r.last_seen as string | null)
            : null,
        similarity:
          typeof r.similarity === 'number'
            ? r.similarity
            : Number(r.similarity) || 0,
        source,
      } satisfies FriendRecRow
    })
    .filter((r): r is FriendRecRow => r !== null)
}

export async function GET(request: NextRequest) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== 'teen' || !userInfo.teenData?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const teenId = userInfo.teenData.id

  const url = new URL(request.url)
  const limitRaw = url.searchParams.get('limit')
  const limit = limitRaw
    ? Math.min(Math.max(parseInt(limitRaw, 10) || 10, 1), 50)
    : 10

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('recommend_friends', {
    p_teen_id: teenId,
    p_limit: limit,
  })

  if (error) {
    console.error('[teen/recommend-friends] RPC error:', error)
    return NextResponse.json(
      { error: 'Failed to compute friend recommendations' },
      { status: 500 },
    )
  }

  const recommendations = parseRows(data)
  return NextResponse.json({
    success: true,
    count: recommendations.length,
    recommendations,
  })
}
