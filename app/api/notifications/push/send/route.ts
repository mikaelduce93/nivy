/**
 * TEENS PARTY MOROCCO - Push Send API
 * ====================================
 *
 * Endpoint pour envoyer une notification push
 * POST /api/notifications/push/send
 *
 * Note: Cet endpoint est destiné aux appels serveur internes
 * ou aux admin. Il utilise web-push pour envoyer les notifications.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withSecurity } from '@/lib/security/api-middleware'
import { getPublicAppConfig } from '@/lib/config/app-config'

// Types
interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, unknown>
  actions?: Array<{ action: string; title: string; icon?: string }>
  requireInteraction?: boolean
}

interface SendPushRequest {
  userId?: string
  userIds?: string[]
  payload: PushNotificationPayload
}

// VAPID keys - En production, utiliser des variables d'environnement
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || `mailto:${getPublicAppConfig().contactEmail}`

export const POST = withSecurity(async (request: NextRequest) => {
  try {
    // Admin-only: blasting push to arbitrary users requires admin role.
    // (Wave-A audit: was wide open to any authenticated user.)
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: adminRole } = await supabase
      .from('admin_roles')
      .select('role')
      .eq('profile_id', user.id)
      .maybeSingle()
    if (!adminRole) {
      return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })
    }

    // Vérifier les clés VAPID
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.error('[Push Send] VAPID keys not configured')
      return NextResponse.json(
        { error: 'Push notifications not configured' },
        { status: 503 }
      )
    }

    const body: SendPushRequest = await request.json()
    const { userId, userIds, payload } = body

    if (!payload?.title || !payload?.body) {
      return NextResponse.json(
        { error: 'Missing required fields: title and body' },
        { status: 400 }
      )
    }

    if (!userId && (!userIds || userIds.length === 0)) {
      return NextResponse.json(
        { error: 'Missing required field: userId or userIds' },
        { status: 400 }
      )
    }

    // Récupérer les souscriptions pour le(s) utilisateur(s)
    const targetUserIds = userIds || (userId ? [userId] : [])

    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', targetUserIds)

    if (fetchError) {
      console.error('[Push Send] Failed to fetch subscriptions:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: 'No subscriptions found for target users',
      })
    }

    // Préparer le payload de notification
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-72x72.png',
      tag: payload.tag || `notification-${Date.now()}`,
      data: payload.data || {},
      actions: payload.actions,
      requireInteraction: payload.requireInteraction || false,
    })

    // Dynamically import web-push (pour éviter les erreurs SSR)
    let webpush: typeof import('web-push')
    try {
      webpush = await import('web-push')
      webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    } catch {
      console.error('[Push Send] web-push not available')
      return NextResponse.json(
        { error: 'Push service not available' },
        { status: 503 }
      )
    }

    // Envoyer les notifications
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_key,
          },
        }

        try {
          await webpush.sendNotification(pushSubscription, notificationPayload)
          return { success: true, endpoint: sub.endpoint }
        } catch (error: unknown) {
          const pushError = error as { statusCode?: number }
          // Si la souscription est expirée, la supprimer
          if (pushError.statusCode === 410 || pushError.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint)
            console.log('[Push Send] Removed expired subscription:', sub.endpoint)
          }
          throw error
        }
      })
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    console.log(`[Push Send] Sent: ${sent}, Failed: ${failed}`)

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: subscriptions.length,
    })
  } catch (error) {
    console.error('[Push Send] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}, { rateLimit: 'api' })
