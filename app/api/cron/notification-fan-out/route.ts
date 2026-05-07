/**
 * W-D.11 — Notification fan-out cron.
 *
 * Schedule: every 5 minutes (registered in vercel.json).
 * For up to 200 pending `user_notifications` rows where push_sent=false and
 * scheduled_for is null or already due, dispatches Web Push via VAPID and
 * marks push_sent=true. Respects per-user quiet hours (default 22:00–07:00
 * Africa/Casablanca per whitepaper §29 #10).
 *
 * Auth: Vercel cron header OR Bearer CRON_SECRET. Fail-CLOSED if CRON_SECRET
 * is unset (matches feed-seed pattern from Wave A.7).
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getPublicAppConfig } from "@/lib/config/app-config"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const BATCH_LIMIT = 200
const DEFAULT_QUIET_START = 22 // 22:00 local
const DEFAULT_QUIET_END = 7 // 07:00 local
const CASA_OFFSET_HOURS = 1 // Africa/Casablanca = UTC+1 year-round

function isInQuietHours(
  nowUtc: Date,
  startHour: number,
  endHour: number,
): boolean {
  // Convert UTC to Casa local hour.
  const localHour = (nowUtc.getUTCHours() + CASA_OFFSET_HOURS + 24) % 24
  if (startHour === endHour) return false
  if (startHour < endHour) {
    return localHour >= startHour && localHour < endHour
  }
  // Wraps midnight (e.g. 22 -> 7)
  return localHour >= startHour || localHour < endHour
}

function parseHour(s: string | null | undefined, fallback: number): number {
  if (!s) return fallback
  const m = /^(\d{1,2})/.exec(s)
  if (!m) return fallback
  const h = parseInt(m[1], 10)
  return Number.isFinite(h) && h >= 0 && h < 24 ? h : fallback
}

export async function GET(request: NextRequest) {
  const isVercelCron = request.headers.get("x-vercel-cron") !== null
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  const hasValidBearer =
    typeof cronSecret === "string" &&
    cronSecret.length > 0 &&
    authHeader === `Bearer ${cronSecret}`
  if (!isVercelCron && !hasValidBearer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const startedAt = Date.now()
  const supabase = createServiceRoleClient()

  // Pull up to N pending pushes
  const { data: pending, error: pendingErr } = await supabase
    .from("user_notifications")
    .select("id, user_id, title, body, icon, action_url, data, scheduled_for")
    .eq("push_sent", false)
    .or("scheduled_for.is.null,scheduled_for.lte." + new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT)

  if (pendingErr) {
    console.error("[cron/notification-fan-out] query failed:", pendingErr)
    return NextResponse.json(
      { error: "Failed to query notifications", detail: pendingErr.message },
      { status: 500 },
    )
  }

  const rows = pending ?? []
  if (rows.length === 0) {
    return NextResponse.json({
      processed: 0,
      sent: 0,
      deferred_quiet: 0,
      no_subs: 0,
      duration_ms: Date.now() - startedAt,
    })
  }

  // Pre-fetch quiet-hour preferences in one go.
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)))
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("user_id, push_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end")
    .in("user_id", userIds)
  const prefMap = new Map<string, { push_enabled: boolean; quiet: boolean; start: number; end: number }>()
  for (const p of prefs ?? []) {
    prefMap.set(p.user_id, {
      push_enabled: p.push_enabled !== false,
      quiet: p.quiet_hours_enabled ?? true,
      start: parseHour(p.quiet_hours_start as unknown as string, DEFAULT_QUIET_START),
      end: parseHour(p.quiet_hours_end as unknown as string, DEFAULT_QUIET_END),
    })
  }

  // Lazy-load web-push only if VAPID is configured.
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  const vapidSubject =
    process.env.VAPID_SUBJECT ||
    `mailto:${getPublicAppConfig().contactEmail || "noreply@nivy.app"}`

  let webpush: typeof import("web-push") | null = null
  if (vapidPublic && vapidPrivate) {
    try {
      webpush = await import("web-push")
      webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
    } catch (e) {
      console.error("[cron/notification-fan-out] web-push import failed:", e)
      webpush = null
    }
  }

  const now = new Date()
  let sent = 0
  let deferredQuiet = 0
  let noSubs = 0
  let markedDelivered = 0

  for (const row of rows) {
    try {
      const pref = prefMap.get(row.user_id)
      if (pref && pref.push_enabled === false) {
        // Push disabled — mark as sent so we don't re-pick endlessly; in-app row stays.
        await supabase
          .from("user_notifications")
          .update({ push_sent: true, push_sent_at: now.toISOString() })
          .eq("id", row.id)
        markedDelivered++
        continue
      }

      const quietOn = pref?.quiet ?? true
      const qStart = pref?.start ?? DEFAULT_QUIET_START
      const qEnd = pref?.end ?? DEFAULT_QUIET_END
      if (quietOn && isInQuietHours(now, qStart, qEnd)) {
        deferredQuiet++
        continue
      }

      // Look up user's active push subscriptions.
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth, is_active")
        .eq("user_id", row.user_id)
        .eq("is_active", true)

      if (!subs || subs.length === 0) {
        // No subscriptions — mark sent (best effort) so we don't loop.
        await supabase
          .from("user_notifications")
          .update({ push_sent: true, push_sent_at: now.toISOString() })
          .eq("id", row.id)
        noSubs++
        continue
      }

      if (!webpush) {
        // VAPID not configured — leave for next run; do NOT mark sent.
        continue
      }

      const payload = JSON.stringify({
        title: row.title,
        body: row.body,
        icon: row.icon || "/icons/icon-192x192.png",
        badge: "/icons/badge-72x72.png",
        tag: `notif-${row.id}`,
        data: { url: row.action_url || "/", ...((row.data as object | null) ?? {}) },
      })

      const results = await Promise.allSettled(
        subs.map(async (s) => {
          try {
            await webpush!.sendNotification(
              {
                endpoint: s.endpoint,
                keys: { p256dh: s.p256dh, auth: s.auth },
              },
              payload,
            )
          } catch (err: unknown) {
            const e = err as { statusCode?: number }
            if (e.statusCode === 404 || e.statusCode === 410) {
              await supabase
                .from("push_subscriptions")
                .delete()
                .eq("endpoint", s.endpoint)
            }
            throw err
          }
        }),
      )

      const ok = results.some((r) => r.status === "fulfilled")
      if (ok) sent++

      await supabase
        .from("user_notifications")
        .update({ push_sent: true, push_sent_at: now.toISOString() })
        .eq("id", row.id)
    } catch (perRowErr) {
      console.error(
        `[cron/notification-fan-out] row ${row.id} failed:`,
        perRowErr,
      )
    }
  }

  return NextResponse.json({
    processed: rows.length,
    sent,
    deferred_quiet: deferredQuiet,
    no_subs: noSubs,
    marked_delivered: markedDelivered,
    duration_ms: Date.now() - startedAt,
  })
}
