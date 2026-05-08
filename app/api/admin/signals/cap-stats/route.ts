/**
 * Wave 3 — TICKET-039 — Admin: cap-stats inspector.
 *
 * GET /api/admin/signals/cap-stats
 *   Query params (all optional):
 *     teen_id   uuid    scope to a single teen
 *     limit     int     default 50, max 200 (top rows by count)
 *
 * Returns:
 *   - top (teen_id, tag) buckets for the current UTC day
 *   - recent burst_detected / tag_cap_exceeded audit rows (last 24h)
 *
 * This endpoint is operational/diagnostic only — it never mutates state.
 * Auth: admin / super_admin / moderator.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { CAP_PER_TAG_PER_DAY, BURST_THRESHOLD, BURST_WINDOW_MS } from "@/lib/analytics/signals"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface SignalRow {
  teen_id: string
  metadata: Record<string, unknown> | null
}

interface AuditRow {
  id: number | string
  action: string
  target_id: string | null
  payload: Record<string, unknown> | null
  created_at: string
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json(
      { success: false, error: "unauthenticated" },
      { status: 401 }
    )
  }

  const sr = createServiceRoleClient()
  const { data: role } = await sr
    .from("admin_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle()
  if (!role || !["admin", "super_admin", "moderator"].includes(role.role)) {
    return NextResponse.json(
      { success: false, error: "forbidden" },
      { status: 403 }
    )
  }

  const url = new URL(req.url)
  const teenId = url.searchParams.get("teen_id")
  const rawLimit = Number(url.searchParams.get("limit") ?? "50")
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1), 200)

  // --- Today (UTC) (teen, tag) histogram ----------------------------------
  const dayStart = new Date(
    Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate()
    )
  ).toISOString()

  let signalsQ = sr
    .from("behavioral_signals")
    .select("teen_id, metadata")
    .gte("created_at", dayStart)
    .limit(50_000) // safety cap; full-day per-teen stats are an admin tool
  if (teenId) signalsQ = signalsQ.eq("teen_id", teenId)

  const { data: signals, error: signalsErr } = await signalsQ
  if (signalsErr) {
    return NextResponse.json(
      { success: false, error: signalsErr.message },
      { status: 500 }
    )
  }

  const buckets = new Map<string, { teen_id: string; tag: string; count: number }>()
  for (const row of (signals ?? []) as SignalRow[]) {
    const tags = row.metadata && Array.isArray((row.metadata as { tags?: unknown }).tags)
      ? ((row.metadata as { tags: unknown[] }).tags.filter(
          (t): t is string => typeof t === "string"
        ))
      : []
    for (const rawTag of tags) {
      const tag = rawTag.trim().toLowerCase()
      if (!tag) continue
      const k = `${row.teen_id}::${tag}`
      const cur = buckets.get(k)
      if (cur) cur.count += 1
      else buckets.set(k, { teen_id: row.teen_id, tag, count: 1 })
    }
  }
  const topBuckets = Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((b) => ({
      ...b,
      over_cap: b.count >= CAP_PER_TAG_PER_DAY,
    }))

  // --- Recent anti-cheat audit rows (last 24h) ----------------------------
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: audit } = await sr
    .from("admin_audit_logs")
    .select("id, action, target_id, payload, created_at")
    .in("action", ["signals.burst_detected", "signals.tag_cap_exceeded"])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit)

  return NextResponse.json({
    success: true,
    config: {
      cap_per_tag_per_day: CAP_PER_TAG_PER_DAY,
      burst_threshold: BURST_THRESHOLD,
      burst_window_ms: BURST_WINDOW_MS,
    },
    today_utc_start: dayStart,
    teen_id: teenId,
    top_tag_buckets: topBuckets,
    recent_audit_events: (audit ?? []) as AuditRow[],
  })
}
