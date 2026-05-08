/**
 * Canonical web-push helper (TICKET-044, V1.2 Wave 3).
 *
 * Server-only. Sends a single Web Push notification to a teen by user_id,
 * fanning out across that user's active push_subscriptions rows. Failed
 * endpoints with status 404/410 are pruned automatically. Mirrors the
 * payload schema consumed by `public/sw.js` (do NOT edit the SW — that's
 * U2's lane in Wave 2).
 *
 * Schema source of truth: `push_subscriptions(endpoint, p256dh, auth,
 * is_active)` per migration 016 + `types/supabase.ts`. The legacy
 * `/api/notifications/push/subscribe` route writes the wrong column names
 * (`p256dh_key`/`auth_key`); the new `/api/notifications/subscribe` route
 * owned by this ticket writes the correct columns.
 *
 * Usage:
 *   import { sendPushToUser } from '@/lib/notifications/push'
 *   await sendPushToUser(userId, { title, body, url })
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getPublicAppConfig } from "@/lib/config/app-config"

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  url?: string
  data?: Record<string, unknown>
  actions?: Array<{ action: string; title: string; icon?: string }>
  requireInteraction?: boolean
}

export interface PushSendResult {
  attempted: number
  delivered: number
  pruned: number
  noSubscriptions: boolean
  vapidConfigured: boolean
}

let webpushPromise: Promise<typeof import("web-push") | null> | null = null

async function getWebPush(): Promise<typeof import("web-push") | null> {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  if (!vapidPublic || !vapidPrivate) return null

  if (!webpushPromise) {
    webpushPromise = (async () => {
      try {
        const mod = await import("web-push")
        const subject =
          process.env.VAPID_SUBJECT ||
          `mailto:${getPublicAppConfig().contactEmail || "noreply@nivy.app"}`
        mod.setVapidDetails(subject, vapidPublic, vapidPrivate)
        return mod
      } catch (e) {
        console.error("[lib/notifications/push] web-push import failed:", e)
        return null
      }
    })()
  }
  return webpushPromise
}

/**
 * Send a push to all active subscriptions for a single user_id.
 * Idempotent and resilient: never throws — returns counters instead.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  client?: SupabaseClient,
): Promise<PushSendResult> {
  const supabase = client ?? createServiceRoleClient()
  const webpush = await getWebPush()
  const result: PushSendResult = {
    attempted: 0,
    delivered: 0,
    pruned: 0,
    noSubscriptions: false,
    vapidConfigured: !!webpush,
  }

  if (!userId) return result

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, is_active")
    .eq("user_id", userId)
    .eq("is_active", true)

  if (error) {
    console.error("[lib/notifications/push] fetch subs failed:", error)
    return result
  }
  if (!subs || subs.length === 0) {
    result.noSubscriptions = true
    return result
  }
  if (!webpush) return result

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/badge-72x72.png",
    tag: payload.tag || `nivy-${Date.now()}`,
    url: payload.url || "/",
    data: { url: payload.url || "/", ...(payload.data || {}) },
    actions: payload.actions,
    requireInteraction: !!payload.requireInteraction,
  })

  result.attempted = subs.length

  const settled = await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        )
        return "delivered" as const
      } catch (err: unknown) {
        const e = err as { statusCode?: number }
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", s.endpoint)
          return "pruned" as const
        }
        throw err
      }
    }),
  )

  for (const r of settled) {
    if (r.status === "fulfilled") {
      if (r.value === "delivered") result.delivered++
      else if (r.value === "pruned") result.pruned++
    }
  }

  return result
}

/**
 * Convenience wrapper for sending a "test" push — used by the permission
 * prompt confirmation flow and admin diagnostics.
 */
export async function sendTestPush(userId: string): Promise<PushSendResult> {
  return sendPushToUser(userId, {
    title: "Notifications activées",
    body: "Tu recevras tes rappels de quizz et tâches ici.",
    url: "/teen",
    tag: "nivy-push-test",
    data: { type: "push_test" },
  })
}
