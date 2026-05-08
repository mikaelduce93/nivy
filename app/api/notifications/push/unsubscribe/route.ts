/**
 * NIVY - Legacy Push Unsubscribe API (V1.3-D fix)
 * ===============================================
 *
 * DEPRECATED — prefer `DELETE /api/notifications/subscribe` (V1.2 Wave 3 U3).
 *
 * The original route was schema-correct (`endpoint`, `user_id` exist) but
 * required a client-supplied `userId` and hard-deleted the row. The canonical
 * route soft-disables (`is_active=false`) so we can audit / re-enable, and
 * derives `user_id` from the auth session.
 *
 * This route now mirrors the canonical semantics, accepts both legacy and
 * canonical body shapes, and returns `X-Deprecated`.
 *
 * POST /api/notifications/push/unsubscribe
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withSecurity } from '@/lib/security/api-middleware'

export const runtime = 'nodejs'

const DEPRECATION_HEADER = {
  'X-Deprecated': 'use /api/notifications/subscribe',
} as const

interface UnsubscribeBody {
  endpoint?: string
  // legacy callers passed userId explicitly; canonical derives from session.
  userId?: string
}

export const POST = withSecurity(async (request: NextRequest) => {
  let body: UnsubscribeBody
  try {
    body = (await request.json()) as UnsubscribeBody
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400, headers: DEPRECATION_HEADER },
    )
  }

  if (!body?.endpoint) {
    return NextResponse.json(
      { error: 'Missing endpoint' },
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

  if (body.userId && body.userId !== user.id) {
    return NextResponse.json(
      { error: 'User ID mismatch' },
      { status: 403, headers: DEPRECATION_HEADER },
    )
  }

  const { error: updateError } = await supabase
    .from('push_subscriptions')
    .update({ is_active: false })
    .eq('endpoint', body.endpoint)
    .eq('user_id', user.id)

  if (updateError) {
    console.error('[push/unsubscribe legacy] update failed:', updateError.message)
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500, headers: DEPRECATION_HEADER },
    )
  }

  console.log('[push/unsubscribe legacy] disabled subscription for user', user.id)

  return NextResponse.json(
    { success: true, message: 'Push subscription removed successfully' },
    { headers: DEPRECATION_HEADER },
  )
}, { rateLimit: 'api' })
