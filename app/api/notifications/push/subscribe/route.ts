/**
 * NIVY - Legacy Push Subscribe API (V1.3-D fix)
 * =============================================
 *
 * DEPRECATED — kept alive only because:
 *   1. `public/sw.js` `pushsubscriptionchange` still POSTs here.
 *   2. Some older clients may still call this URL.
 *
 * The canonical endpoint is `/api/notifications/subscribe` (V1.2 Wave 3 U3).
 * Migrate clients to that route. New code MUST NOT call this one.
 *
 * V1.3-D fix (TICKET-049 follow-up):
 *   The previous implementation wrote columns that DO NOT EXIST on the
 *   production `push_subscriptions` table (migration 016):
 *     - `p256dh_key`  → real column is `p256dh`
 *     - `auth_key`    → real column is `auth`
 *     - `expiration_time` → no such column
 *   As a result, every subscription created via the legacy SW callback or
 *   the old client silently failed to insert (or inserted with NULLs into
 *   non-existent columns) and those users NEVER received pushes.
 *
 *   This rewrite:
 *     - accepts BOTH legacy (`p256dh_key`/`auth_key`) and canonical
 *       (`p256dh`/`auth`) body shapes,
 *     - writes the real schema (`p256dh`, `auth`, `is_active=true`),
 *     - upserts on `(user_id, endpoint)` to match the table's UNIQUE,
 *     - derives user_id from the auth session (SW only sends rotated subs,
 *       it cannot know the userId),
 *     - returns `X-Deprecated` so we can monitor traffic and retire it.
 *
 * POST /api/notifications/push/subscribe
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withSecurity } from '@/lib/security/api-middleware'

export const runtime = 'nodejs'

const DEPRECATION_HEADER = {
  'X-Deprecated': 'use /api/notifications/subscribe',
} as const

interface IncomingKeys {
  p256dh?: string
  auth?: string
  // legacy aliases the old client sometimes nested under .keys
  p256dh_key?: string
  auth_key?: string
}

interface IncomingSubscription {
  endpoint?: string
  expirationTime?: number | null
  keys?: IncomingKeys
  // legacy flat aliases
  p256dh?: string
  auth?: string
  p256dh_key?: string
  auth_key?: string
}

interface SubscribeBody {
  subscription?: IncomingSubscription
  // legacy callers passed userId explicitly; canonical derives from session.
  userId?: string
  // legacy SW signal (informational only)
  rotated?: boolean
}

function detectDeviceType(ua: string | null): 'web' | 'android' | 'ios' {
  if (!ua) return 'web'
  if (/android/i.test(ua)) return 'android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  return 'web'
}

function detectBrowser(ua: string | null): string | null {
  if (!ua) return null
  if (/edg\//i.test(ua)) return 'edge'
  if (/chrome\//i.test(ua)) return 'chrome'
  if (/firefox\//i.test(ua)) return 'firefox'
  if (/safari\//i.test(ua)) return 'safari'
  return 'other'
}

function extractKeys(sub: IncomingSubscription): { p256dh: string | null; auth: string | null } {
  const p256dh =
    sub.keys?.p256dh ??
    sub.keys?.p256dh_key ??
    sub.p256dh ??
    sub.p256dh_key ??
    null
  const auth =
    sub.keys?.auth ??
    sub.keys?.auth_key ??
    sub.auth ??
    sub.auth_key ??
    null
  return { p256dh, auth }
}

export const POST = withSecurity(async (request: NextRequest) => {
  let body: SubscribeBody
  try {
    body = (await request.json()) as SubscribeBody
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400, headers: DEPRECATION_HEADER },
    )
  }

  const sub = body?.subscription
  if (!sub?.endpoint) {
    return NextResponse.json(
      { error: 'Missing subscription.endpoint' },
      { status: 400, headers: DEPRECATION_HEADER },
    )
  }

  const { p256dh, auth } = extractKeys(sub)
  if (!p256dh || !auth) {
    return NextResponse.json(
      { error: 'Missing subscription keys (p256dh/auth)' },
      { status: 400, headers: DEPRECATION_HEADER },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: DEPRECATION_HEADER },
    )
  }

  // If a legacy caller passed userId, enforce match — SW does not pass it.
  if (body.userId && body.userId !== user.id) {
    return NextResponse.json(
      { error: 'User ID mismatch' },
      { status: 403, headers: DEPRECATION_HEADER },
    )
  }

  const ua = request.headers.get('user-agent')
  const { error: upsertError } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh,
        auth,
        device_type: detectDeviceType(ua),
        browser: detectBrowser(ua),
        is_active: true,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,endpoint' },
    )

  if (upsertError) {
    console.error('[push/subscribe legacy] upsert failed:', upsertError.message)
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500, headers: DEPRECATION_HEADER },
    )
  }

  console.log(
    '[push/subscribe legacy] saved subscription for user',
    user.id,
    body.rotated ? '(rotated via SW)' : '',
  )

  return NextResponse.json(
    { success: true, message: 'Push subscription saved successfully' },
    { headers: DEPRECATION_HEADER },
  )
}, { rateLimit: 'api' })
