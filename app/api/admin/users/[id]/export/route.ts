/**
 * Wave V1.2-E — Admin: export any user's data.
 *
 * GET /api/admin/users/:id/export
 *
 * Same shape as /api/me/data-export but admin can trigger for any user_id.
 * Auth: admin / super_admin / moderator. Audit log mandatory.
 *
 * Response:
 *   200 { ok: true, mode: 'inline', export_id, exported_at, data: {...} }
 *      OR
 *   200 { ok: true, mode: 'signed_url', export_id, download_url, expires_at }
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type SkipNote = { table: string; reason: string }
type SR = ReturnType<typeof createServiceRoleClient>

const INLINE_BYTE_THRESHOLD = 1_048_576 // 1 MB
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24

async function safeSelect(
  sr: SR,
  table: string,
  builder: (q: any) => any,
  notes: SkipNote[],
): Promise<any[] | null> {
  try {
    const { data, error } = await builder(sr.from(table).select("*"))
    if (error) {
      notes.push({ table, reason: error.message })
      return null
    }
    return data ?? []
  } catch (e: any) {
    notes.push({ table, reason: e?.message || "exception" })
    return null
  }
}

async function gatherTeen(sr: SR, userId: string, notes: SkipNote[]) {
  const data: Record<string, unknown> = {}
  data.profile = await safeSelect(sr, "profiles", (q) => q.eq("id", userId), notes)
  data.teen = await safeSelect(sr, "teens", (q) => q.eq("id", userId), notes)
  data.user_xp = await safeSelect(sr, "user_xp", (q) => q.eq("teen_id", userId), notes)
  data.xp_transactions = await safeSelect(sr, "xp_transactions", (q) => q.eq("teen_id", userId), notes)
  data.user_coins = await safeSelect(sr, "user_coins", (q) => q.eq("teen_id", userId), notes)
  data.coin_transactions = await safeSelect(sr, "coin_transactions", (q) => q.eq("teen_id", userId), notes)
  data.escrow_ledger = await safeSelect(sr, "escrow_ledger", (q) => q.eq("teen_id", userId), notes)
  data.user_missions = await safeSelect(sr, "user_missions", (q) => q.eq("teen_id", userId), notes)
  data.parent_chores = await safeSelect(sr, "parent_chores", (q) => q.eq("teen_id", userId), notes)
  data.parent_chore_completions = await safeSelect(
    sr,
    "parent_chore_completions",
    (q) => q.eq("teen_id", userId),
    notes,
  )
  data.parental_approvals = await safeSelect(sr, "parental_approvals", (q) => q.eq("teen_id", userId), notes)
  data.behavioral_signals = await safeSelect(sr, "behavioral_signals", (q) => q.eq("teen_id", userId), notes)
  data.affinity_scores = await safeSelect(sr, "affinity_scores", (q) => q.eq("teen_id", userId), notes)
  data.food_orders = await safeSelect(sr, "food_orders", (q) => q.eq("teen_id", userId), notes)
  data.ride_bookings = await safeSelect(sr, "ride_bookings", (q) => q.eq("teen_id", userId), notes)
  data.marketplace_listings = await safeSelect(
    sr,
    "marketplace_listings",
    (q) => q.eq("seller_user_id", userId),
    notes,
  )
  data.feed_posts = await safeSelect(sr, "feed_posts", (q) => q.eq("user_id", userId), notes)
  data.feed_likes = await safeSelect(sr, "feed_likes", (q) => q.eq("user_id", userId), notes)
  data.mentor_sessions = await safeSelect(sr, "mentor_sessions", (q) => q.eq("mentee_user_id", userId), notes)
  data.user_notifications = await safeSelect(sr, "user_notifications", (q) => q.eq("user_id", userId), notes)
  data.notification_preferences = await safeSelect(
    sr,
    "notification_preferences",
    (q) => q.eq("user_id", userId),
    notes,
  )
  return data
}

async function gatherParent(sr: SR, userId: string, notes: SkipNote[]) {
  const data: Record<string, unknown> = {}
  data.profile = await safeSelect(sr, "profiles", (q) => q.eq("id", userId), notes)
  data.parent_chores = await safeSelect(sr, "parent_chores", (q) => q.eq("parent_id", userId), notes)
  data.parental_approvals = await safeSelect(sr, "parental_approvals", (q) => q.eq("parent_id", userId), notes)
  data.escrow_ledger = await safeSelect(sr, "escrow_ledger", (q) => q.eq("parent_id", userId), notes)
  data.food_orders = await safeSelect(sr, "food_orders", (q) => q.eq("parent_id", userId), notes)
  data.ride_bookings = await safeSelect(sr, "ride_bookings", (q) => q.eq("parent_id", userId), notes)
  data.user_notifications = await safeSelect(sr, "user_notifications", (q) => q.eq("user_id", userId), notes)
  data.notification_preferences = await safeSelect(
    sr,
    "notification_preferences",
    (q) => q.eq("user_id", userId),
    notes,
  )
  data.family_subscriptions = await safeSelect(
    sr,
    "family_subscriptions",
    (q) => q.eq("owner_id", userId),
    notes,
  )
  data.parent_teen_links = await safeSelect(sr, "parent_teen_links", (q) => q.eq("parent_id", userId), notes)
  return data
}

async function gatherFallback(sr: SR, userId: string, notes: SkipNote[]) {
  const data: Record<string, unknown> = {}
  data.profile = await safeSelect(sr, "profiles", (q) => q.eq("id", userId), notes)
  data.user_notifications = await safeSelect(sr, "user_notifications", (q) => q.eq("user_id", userId), notes)
  data.notification_preferences = await safeSelect(
    sr,
    "notification_preferences",
    (q) => q.eq("user_id", userId),
    notes,
  )
  return data
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: targetUserId } = await ctx.params

  // 1. Admin auth.
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 })
  }
  const sr = createServiceRoleClient()
  const { data: role } = await sr
    .from("admin_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle()
  if (!role || !["admin", "super_admin", "moderator"].includes(role.role)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 })
  }

  // 2. Resolve target profile.
  const { data: profile } = await sr
    .from("profiles")
    .select("id, email, role")
    .eq("id", targetUserId)
    .maybeSingle()
  if (!profile) {
    return NextResponse.json({ ok: false, error: "profile_not_found" }, { status: 404 })
  }
  const targetRole: string = profile.role || "unknown"

  // 3. Insert data_exports audit row.
  const requestedAt = new Date().toISOString()
  const { data: logRow, error: logErr } = await sr
    .from("data_exports")
    .insert({
      user_id: targetUserId,
      export_type: "admin_export",
      status: "processing",
      requested_at: requestedAt,
    })
    .select("id")
    .single()
  if (logErr || !logRow) {
    return NextResponse.json(
      { ok: false, error: logErr?.message || "log_failed" },
      { status: 500 },
    )
  }
  const exportId: string = logRow.id

  // 4. Gather.
  const skipped: SkipNote[] = []
  const warnings: string[] = []
  let data: Record<string, unknown> = {}
  try {
    if (targetRole === "teen") data = await gatherTeen(sr, targetUserId, skipped)
    else if (targetRole === "parent") data = await gatherParent(sr, targetUserId, skipped)
    else {
      warnings.push(`unknown_role_fallback: ${targetRole}`)
      data = await gatherFallback(sr, targetUserId, skipped)
    }
  } catch (e: any) {
    await sr
      .from("data_exports")
      .update({ status: "failed", completed_at: new Date().toISOString() })
      .eq("id", exportId)
    return NextResponse.json(
      { ok: false, error: e?.message || "gather_failed", export_id: exportId },
      { status: 500 },
    )
  }

  const payload = {
    exported_at: new Date().toISOString(),
    user_id: targetUserId,
    role: targetRole,
    triggered_by_admin: user.id,
    data,
    _notes: { skipped, warnings },
  }

  // 5. Audit log (mandatory for admin export).
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  await sr.from("admin_audit_logs").insert({
    user_id: user.id,
    action: "user.data_export.admin",
    target_type: "user",
    target_id: targetUserId,
    payload: { export_id: exportId, target_role: targetRole, exported_at: payload.exported_at },
    ip_address: ip,
  })

  // 6. Inline vs signed-URL.
  const json = JSON.stringify(payload)
  const byteLen = Buffer.byteLength(json, "utf8")

  if (byteLen <= INLINE_BYTE_THRESHOLD) {
    await sr
      .from("data_exports")
      .update({ status: "ready", completed_at: new Date().toISOString() })
      .eq("id", exportId)
    return NextResponse.json({
      ok: true,
      mode: "inline" as const,
      export_id: exportId,
      exported_at: payload.exported_at,
      data: payload,
    })
  }

  const objectPath = `${targetUserId}/admin-${exportId}.json`
  const upload = await sr.storage
    .from("user-exports")
    .upload(objectPath, new Blob([json], { type: "application/json" }), {
      contentType: "application/json",
      upsert: true,
    })
  if (upload.error) {
    warnings.push(`storage_upload_failed: ${upload.error.message}`)
    await sr
      .from("data_exports")
      .update({ status: "ready", completed_at: new Date().toISOString() })
      .eq("id", exportId)
    return NextResponse.json({
      ok: true,
      mode: "inline" as const,
      export_id: exportId,
      exported_at: payload.exported_at,
      data: payload,
    })
  }

  const signed = await sr.storage
    .from("user-exports")
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS)
  if (signed.error || !signed.data?.signedUrl) {
    await sr
      .from("data_exports")
      .update({ status: "failed", completed_at: new Date().toISOString() })
      .eq("id", exportId)
    return NextResponse.json(
      { ok: false, error: signed.error?.message || "signed_url_failed", export_id: exportId },
      { status: 500 },
    )
  }

  const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString()
  await sr
    .from("data_exports")
    .update({
      status: "ready",
      completed_at: new Date().toISOString(),
      file_url: objectPath,
    })
    .eq("id", exportId)

  return NextResponse.json({
    ok: true,
    mode: "signed_url" as const,
    export_id: exportId,
    exported_at: payload.exported_at,
    download_url: signed.data.signedUrl,
    expires_at: expiresAt,
  })
}
