/**
 * Wave V1.2-E — Admin: send a broadcast notification.
 *
 * GET  /api/admin/broadcasts        List historical broadcasts (audit-log driven).
 * POST /api/admin/broadcasts        Send a new broadcast.
 *
 * Body (POST):
 *   {
 *     audience: 'teens' | 'parents' | 'all' | 'tier',
 *     tier?: 'free' | 'family' | 'plus' | 'pro',  // when audience='tier'
 *     title: string,                               // ≤ 120 chars
 *     body: string,                                // ≤ 500 chars
 *     action_url?: string,
 *     priority?: 'low' | 'normal' | 'high',
 *   }
 *
 * Effects:
 *   - Resolves recipient user_ids (capped at 1000 per call).
 *   - Inserts user_notifications rows in chunks of 500.
 *   - Does NOT push directly. The fan-out cron (Wave D.11) reads these and pushes.
 *   - admin_audit_logs row recording recipient_count + filter.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const RECIPIENT_CAP = 1000
const INSERT_CHUNK = 500

type Audience = "teens" | "parents" | "all" | "tier"
type Priority = "low" | "normal" | "high"

interface BroadcastBody {
  audience?: string
  tier?: string
  title?: string
  body?: string
  action_url?: string
  priority?: string
}

async function requireAdmin(): Promise<
  | { ok: true; userId: string }
  | { ok: false; res: NextResponse }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    return {
      ok: false,
      res: NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 }),
    }
  }
  const sr = createServiceRoleClient()
  const { data: role } = await sr
    .from("admin_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle()
  if (!role || !["admin", "super_admin"].includes(role.role)) {
    return {
      ok: false,
      res: NextResponse.json({ success: false, error: "forbidden" }, { status: 403 }),
    }
  }
  return { ok: true, userId: user.id }
}

/* ------------------------------------------------------------------------ */
/* GET                                                                      */
/* ------------------------------------------------------------------------ */

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res

  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 200)
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10) || 0, 0)

  const sr = createServiceRoleClient()
  const { data, error, count } = await sr
    .from("admin_audit_logs")
    .select("id, user_id, action, target_type, target_id, payload, created_at", { count: "exact" })
    .eq("action", "broadcast.send")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, broadcasts: data ?? [], total: count ?? 0, limit, offset })
}

/* ------------------------------------------------------------------------ */
/* POST                                                                     */
/* ------------------------------------------------------------------------ */

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res
  const adminId = auth.userId

  let body: BroadcastBody
  try {
    body = (await req.json()) as BroadcastBody
  } catch {
    return NextResponse.json({ success: false, error: "invalid_json" }, { status: 400 })
  }

  const audience = body.audience as Audience | undefined
  const tier = typeof body.tier === "string" ? body.tier.trim() : ""
  const title = typeof body.title === "string" ? body.title.trim() : ""
  const text = typeof body.body === "string" ? body.body.trim() : ""
  const actionUrl =
    typeof body.action_url === "string" && body.action_url.trim() ? body.action_url.trim() : null
  const priority = (body.priority || "normal") as Priority

  if (!audience || !["teens", "parents", "all", "tier"].includes(audience)) {
    return NextResponse.json({ success: false, error: "invalid_audience" }, { status: 400 })
  }
  if (audience === "tier" && !tier) {
    return NextResponse.json({ success: false, error: "tier_required" }, { status: 400 })
  }
  if (!title || title.length > 120) {
    return NextResponse.json({ success: false, error: "invalid_title" }, { status: 400 })
  }
  if (!text || text.length > 500) {
    return NextResponse.json({ success: false, error: "invalid_body" }, { status: 400 })
  }
  if (!["low", "normal", "high"].includes(priority)) {
    return NextResponse.json({ success: false, error: "invalid_priority" }, { status: 400 })
  }

  const sr = createServiceRoleClient()

  // 1. Resolve recipients (capped).
  const userIds = await resolveAudience(sr, audience, tier)
  const truncated = userIds.length > RECIPIENT_CAP
  const recipients = truncated ? userIds.slice(0, RECIPIENT_CAP) : userIds

  if (recipients.length === 0) {
    return NextResponse.json({ success: false, error: "no_recipients" }, { status: 400 })
  }

  const broadcastId = crypto.randomUUID()
  const groupKey = `broadcast:${broadcastId}`
  const nowIso = new Date().toISOString()

  // 2. Insert user_notifications in chunks. The fan-out cron (Wave D.11)
  // will pick them up and dispatch push.
  let inserted = 0
  for (let i = 0; i < recipients.length; i += INSERT_CHUNK) {
    const chunk = recipients.slice(i, i + INSERT_CHUNK).map((uid) => ({
      user_id: uid,
      title,
      body: text,
      priority,
      action_url: actionUrl,
      group_key: groupKey,
      data: { kind: "broadcast", broadcast_id: broadcastId, audience, tier: tier || null },
    }))
    const { error } = await sr.from("user_notifications").insert(chunk)
    if (error) {
      // Audit partial failure and abort (no rollback — already-inserted rows stay).
      await sr.from("admin_audit_logs").insert({
        user_id: adminId,
        action: "broadcast.send.partial_failure",
        target_type: "broadcast",
        target_id: broadcastId,
        payload: {
          reason: error.message,
          inserted_so_far: inserted,
          target_count: recipients.length,
          audience,
          tier: tier || null,
          title,
          chunk_size: chunk.length,
        },
      })
      return NextResponse.json(
        {
          success: false,
          error: "insert_failed",
          inserted,
          target_count: recipients.length,
          broadcast_id: broadcastId,
        },
        { status: 500 },
      )
    }
    inserted += chunk.length
  }

  // 3. Audit log.
  await sr.from("admin_audit_logs").insert({
    user_id: adminId,
    action: "broadcast.send",
    target_type: "broadcast",
    target_id: broadcastId,
    payload: {
      audience,
      tier: tier || null,
      title,
      body: text,
      action_url: actionUrl,
      priority,
      recipient_count: inserted,
      cap_reached: truncated,
      sent_at: nowIso,
    },
  })

  return NextResponse.json({
    success: true,
    broadcast_id: broadcastId,
    recipient_count: inserted,
    cap_reached: truncated,
  })
}

/* ------------------------------------------------------------------------ */
/* Audience resolution                                                      */
/* ------------------------------------------------------------------------ */

type SR = ReturnType<typeof createServiceRoleClient>

async function resolveAudience(sr: SR, audience: Audience, tier: string): Promise<string[]> {
  if (audience === "teens" || audience === "parents" || audience === "all") {
    let q = sr.from("profiles").select("id").eq("is_deletion_pending", false).limit(RECIPIENT_CAP + 1)
    if (audience === "teens") q = q.eq("role", "teen")
    if (audience === "parents") q = q.eq("role", "parent")
    const { data } = await q
    return (data ?? []).map((r) => r.id as string).filter(Boolean)
  }
  // audience === 'tier' — join user_subscriptions → subscription_plans by plan_id
  // and pick active subscriptions whose plan.tier matches.
  const { data: plans } = await sr.from("subscription_plans").select("id, tier").eq("tier", tier)
  const planIds = (plans ?? []).map((p) => p.id as string).filter(Boolean)
  if (planIds.length === 0) return []
  const { data: subs } = await sr
    .from("user_subscriptions")
    .select("user_id")
    .in("plan_id", planIds)
    .eq("status", "active")
    .limit(RECIPIENT_CAP + 1)
  const ids = Array.from(new Set((subs ?? []).map((s) => s.user_id as string).filter(Boolean)))
  return ids
}
