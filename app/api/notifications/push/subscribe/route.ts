/**
 * TEENS PARTY MOROCCO - Push Subscribe API
 * =========================================
 *
 * Endpoint pour enregistrer une souscription push
 * POST /api/notifications/push/subscribe
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withSecurity } from '@/lib/security/api-middleware'

interface PushSubscription {
  endpoint: string
  expirationTime: number | null
  keys: {
    p256dh: string
    auth: string
  }
}

interface SubscribeRequest {
  subscription: PushSubscription
  userId: string
}

export const POST = withSecurity(async (request: NextRequest) => {
  try {
    const body: SubscribeRequest = await request.json()
    const { subscription, userId } = body

    if (!subscription?.endpoint || !subscription?.keys || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: subscription or userId' },
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

    // Upsert la souscription (update si existe, insert sinon)
    const { error: upsertError } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh_key: subscription.keys.p256dh,
          auth_key: subscription.keys.auth,
          expiration_time: subscription.expirationTime,
          user_agent: request.headers.get('user-agent') || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'endpoint',
          ignoreDuplicates: false,
        }
      )

    if (upsertError) {
      console.error('[Push Subscribe] Database error:', upsertError)
      return NextResponse.json(
        { error: 'Failed to save subscription' },
        { status: 500 }
      )
    }

    // Log pour analytics
    console.log('[Push Subscribe] Subscription saved for user:', userId)

    return NextResponse.json({
      success: true,
      message: 'Push subscription saved successfully',
    })
  } catch (error) {
    console.error('[Push Subscribe] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}, { rateLimit: 'api' })
