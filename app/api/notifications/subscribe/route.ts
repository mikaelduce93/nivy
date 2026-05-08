/**
 * Canonical Push Subscribe endpoint (TICKET-044, V1.2 Wave 3).
 *
 * Replaces the legacy /api/notifications/push/subscribe which writes the
 * wrong column names (p256dh_key/auth_key) — this route writes the actual
 * production schema (`p256dh`, `auth`, `is_active`) consumed by
 * /api/cron/notification-fan-out and `lib/notifications/push.ts`.
 *
 *   POST   { subscription, userAgent? }   — upsert subscription
 *   DELETE { endpoint }                   — deactivate subscription
 *   GET                                   — return current user status
 *
 * The legacy route still exists for SW pushsubscriptionchange callbacks;
 * client code should migrate to this route. We do not delete the old route
 * here — that's a separate cleanup.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { withSecurity } from "@/lib/security/api-middleware"
import { sendTestPush } from "@/lib/notifications/push"

export const runtime = "nodejs"

interface IncomingSubscription {
  endpoint: string
  expirationTime?: number | null
  keys: { p256dh: string; auth: string }
}

interface SubscribeBody {
  subscription: IncomingSubscription
  userAgent?: string
  sendTest?: boolean
}

interface UnsubscribeBody {
  endpoint: string
}

function detectDeviceType(ua: string | null): "web" | "android" | "ios" {
  if (!ua) return "web"
  if (/android/i.test(ua)) return "android"
  if (/iphone|ipad|ipod/i.test(ua)) return "ios"
  return "web"
}

function detectBrowser(ua: string | null): string | null {
  if (!ua) return null
  if (/edg\//i.test(ua)) return "edge"
  if (/chrome\//i.test(ua)) return "chrome"
  if (/firefox\//i.test(ua)) return "firefox"
  if (/safari\//i.test(ua)) return "safari"
  return "other"
}

export const POST = withSecurity(
  async (request: NextRequest) => {
    let body: SubscribeBody
    try {
      body = (await request.json()) as SubscribeBody
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const sub = body?.subscription
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return NextResponse.json(
        { error: "Missing subscription fields" },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const ua = body.userAgent || request.headers.get("user-agent")
    const { error: upsertError } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
          device_type: detectDeviceType(ua),
          browser: detectBrowser(ua),
          is_active: true,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "user_id,endpoint" },
      )

    if (upsertError) {
      console.error(
        "[notifications/subscribe] upsert failed:",
        upsertError.message,
      )
      return NextResponse.json(
        { error: "Failed to save subscription" },
        { status: 500 },
      )
    }

    // Best-effort test push so the teen sees confirmation immediately.
    let test: Awaited<ReturnType<typeof sendTestPush>> | null = null
    if (body.sendTest !== false) {
      try {
        test = await sendTestPush(user.id)
      } catch (e) {
        console.warn("[notifications/subscribe] test push failed:", e)
      }
    }

    return NextResponse.json({ success: true, test })
  },
  { rateLimit: "api" },
)

export const DELETE = withSecurity(
  async (request: NextRequest) => {
    let body: UnsubscribeBody
    try {
      body = (await request.json()) as UnsubscribeBody
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    if (!body?.endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .update({ is_active: false })
      .eq("endpoint", body.endpoint)
      .eq("user_id", user.id)

    if (error) {
      console.error("[notifications/subscribe] DELETE failed:", error.message)
      return NextResponse.json(
        { error: "Failed to remove subscription" },
        { status: 500 },
      )
    }
    return NextResponse.json({ success: true })
  },
  { rateLimit: "api" },
)

export const GET = withSecurity(
  async () => {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, device_type, browser, is_active, last_used_at")
      .eq("user_id", user.id)
      .eq("is_active", true)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      enabled: (data?.length ?? 0) > 0,
      subscriptions: data ?? [],
    })
  },
  { rateLimit: "api" },
)
