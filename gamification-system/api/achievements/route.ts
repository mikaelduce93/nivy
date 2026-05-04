/**
 * TEENS PARTY MOROCCO - Achievements API Routes
 * ==============================================
 *
 * API routes pour le système d'achievements.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getAchievements,
  getAchievementStats,
  updateAchievementProgress,
  unlockAchievement,
  checkAndUnlockAchievements,
  getRecentlyUnlocked,
  getNextAchievements,
  trackAchievementEvent,
} from '../../features/achievements/actions'

/* ==========================================================================
   GET /api/achievements
   ========================================================================== */

/**
 * Récupère les achievements d'un teen
 * Query params: teenId, category (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teenId = searchParams.get('teenId')
    const category = searchParams.get('category')
    const type = searchParams.get('type') // 'all', 'stats', 'recent', 'next'

    if (!teenId) {
      return NextResponse.json(
        { success: false, error: 'teenId requis' },
        { status: 400 }
      )
    }

    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Verify teen belongs to user
    const { data: teen } = await supabase
      .from('teens')
      .select('id, parent_id')
      .eq('id', teenId)
      .single()

    if (!teen || teen.parent_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    // Handle different types of requests
    switch (type) {
      case 'stats': {
        const statsResult = await getAchievementStats(teenId)
        return NextResponse.json(statsResult)
      }

      case 'recent': {
        const limit = parseInt(searchParams.get('limit') || '10')
        const recentResult = await getRecentlyUnlocked(teenId, limit)
        return NextResponse.json(recentResult)
      }

      case 'next': {
        const nextLimit = parseInt(searchParams.get('limit') || '5')
        const nextResult = await getNextAchievements(teenId, nextLimit)
        return NextResponse.json(nextResult)
      }

      default: {
        const result = await getAchievements({
          teenId,
          category: category as any,
        })
        return NextResponse.json(result)
      }
    }
  } catch (error: any) {
    console.error('[API/achievements] GET Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/* ==========================================================================
   POST /api/achievements
   ========================================================================== */

/**
 * Actions sur les achievements
 * Body: { action, teenId, ...params }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, teenId, ...params } = body

    if (!teenId) {
      return NextResponse.json(
        { success: false, error: 'teenId requis' },
        { status: 400 }
      )
    }

    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Verify teen belongs to user
    const { data: teen } = await supabase
      .from('teens')
      .select('id, parent_id')
      .eq('id', teenId)
      .single()

    if (!teen || teen.parent_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    // Handle different actions
    switch (action) {
      case 'update_progress': {
        const { achievementCode, progress, increment } = params
        if (!achievementCode) {
          return NextResponse.json(
            { success: false, error: 'achievementCode requis' },
            { status: 400 }
          )
        }
        const progressResult = await updateAchievementProgress({
          teenId,
          achievementCode,
          progress: progress || 1,
          increment: increment !== false,
        })
        return NextResponse.json(progressResult)
      }

      case 'unlock': {
        const { achievementCode: unlockCode } = params
        if (!unlockCode) {
          return NextResponse.json(
            { success: false, error: 'achievementCode requis' },
            { status: 400 }
          )
        }
        const unlockResult = await unlockAchievement({
          teenId,
          achievementCode: unlockCode,
        })
        return NextResponse.json(unlockResult)
      }

      case 'check_all': {
        const checkResult = await checkAndUnlockAchievements(teenId)
        return NextResponse.json(checkResult)
      }

      case 'track_event': {
        const { eventType, eventData } = params
        if (!eventType) {
          return NextResponse.json(
            { success: false, error: 'eventType requis' },
            { status: 400 }
          )
        }
        const trackResult = await trackAchievementEvent(teenId, eventType, eventData || {})
        return NextResponse.json(trackResult)
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Action non reconnue' },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error('[API/achievements] POST Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
