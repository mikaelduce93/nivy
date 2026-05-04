/**
 * TEENS PARTY MOROCCO - Push Unsubscribe API
 * ==========================================
 *
 * Endpoint pour supprimer une souscription push
 * POST /api/notifications/push/unsubscribe
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withSecurity } from '@/lib/security/api-middleware'

interface UnsubscribeRequest {
  endpoint: string
  userId: string
}

export const POST = withSecurity(async (request: NextRequest) => {
  try {
    const body: UnsubscribeRequest = await request.json()
    const { endpoint, userId } = body

    if (!endpoint || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: endpoint or userId' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Vérifier que l'userId correspond à l'utilisateur authentifié
    if (user.id !== userId) {
      return NextResponse.json(
        { error: 'User ID mismatch' },
        { status: 403 }
      )
    }

    // Supprimer la souscription
    const { error: deleteError } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('[Push Unsubscribe] Database error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove subscription' },
        { status: 500 }
      )
    }

    // Log pour analytics
    console.log('[Push Unsubscribe] Subscription removed for user:', userId)

    return NextResponse.json({
      success: true,
      message: 'Push subscription removed successfully',
    })
  } catch (error) {
    console.error('[Push Unsubscribe] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}, { rateLimit: 'api' })
