/**
 * Wave D.10 — CNDP / Loi 09-08 right-to-portability.
 *
 * POST /api/me/data-export
 *
 * Auth: required (cookie session). Service-role / anon callers are rejected.
 * Body: none.
 * Returns:
 *   200 { ok: true, mode: 'inline', export_id, exported_at, data: {...} }
 *      OR
 *   200 { ok: true, mode: 'signed_url', export_id, download_url, expires_at }
 *
 * The export aggregates every row scoped to the caller (no cross-user PII).
 * Tables that don't exist for the caller's role are skipped and listed in
 * `_notes.skipped`. The only mutation performed is the `data_exports` log row.
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/* ------------------------------------------------------------------------ */
/* Shape helpers                                                            */
/* ------------------------------------------------------------------------ */

type SkipNote = { table: string; reason: string }

interface ExportPayload {
  exported_at: string
  user_id: string
  role: string
  data: Record<string, unknown>
  _notes: { skipped: SkipNote[]; warnings: string[] }
}

/**
 * Wrap a Supabase select. If the table doesn't exist or RLS denies access,
 * record the skip rather than failing the whole export.
 */
async function safeSelect(
  client: ReturnType<typeof createServiceRoleClient>,
  table: string,
  builder: (q: any) => any,
  notes: SkipNote[],
): Promise<any[] | null> {
  try {
    const { data, error } = await builder(client.from(table).select("*"))
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

/* ------------------------------------------------------------------------ */
/* Per-role gatherers                                                       */
/* ------------------------------------------------------------------------ */

async function gatherTeen(
  sr: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  notes: SkipNote[],
): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {}

  data.profile = await safeSelect(sr, "profiles", q => q.eq("id", userId), notes)
  data.teen = await safeSelect(sr, "teens", q => q.eq("id", userId), notes)
  data.teen_full_profile = await safeSelect(sr, "teen_full_profile", q => q.eq("id", userId), notes)
  data.user_xp = await safeSelect(sr, "user_xp", q => q.eq("teen_id", userId), notes)
  data.xp_transactions = await safeSelect(sr, "xp_transactions", q => q.eq("teen_id", userId), notes)
  data.user_coins = await safeSelect(sr, "user_coins", q => q.eq("teen_id", userId), notes)
  data.coin_transactions = await safeSelect(sr, "coin_transactions", q => q.eq("teen_id", userId), notes)
  data.escrow_ledger = await safeSelect(sr, "escrow_ledger", q => q.eq("teen_id", userId), notes)
  data.user_missions = await safeSelect(sr, "user_missions", q => q.eq("teen_id", userId), notes)
  data.parent_chores = await safeSelect(sr, "parent_chores", q => q.eq("teen_id", userId), notes)
  data.parent_chore_completions = await safeSelect(
    sr,
    "parent_chore_completions",
    q => q.eq("teen_id", userId),
    notes,
  )
  data.parental_approvals = await safeSelect(sr, "parental_approvals", q => q.eq("teen_id", userId), notes)
  data.behavioral_signals = await safeSelect(sr, "behavioral_signals", q => q.eq("teen_id", userId), notes)
  data.affinity_scores = await safeSelect(sr, "affinity_scores", q => q.eq("teen_id", userId), notes)

  data.food_orders = await safeSelect(sr, "food_orders", q => q.eq("teen_id", userId), notes)
  data.ride_bookings = await safeSelect(sr, "ride_bookings", q => q.eq("teen_id", userId), notes)
  data.marketplace_listings = await safeSelect(
    sr,
    "marketplace_listings",
    q => q.eq("seller_user_id", userId),
    notes,
  )
  data.feed_posts = await safeSelect(sr, "feed_posts", q => q.eq("user_id", userId), notes)
  // Only the user's OWN reactions, not reactions on their posts.
  data.feed_likes = await safeSelect(sr, "feed_likes", q => q.eq("user_id", userId), notes)
  data.mentor_sessions = await safeSelect(sr, "mentor_sessions", q => q.eq("mentee_user_id", userId), notes)
  data.user_notifications = await safeSelect(sr, "user_notifications", q => q.eq("user_id", userId), notes)
  data.notification_preferences = await safeSelect(
    sr,
    "notification_preferences",
    q => q.eq("user_id", userId),
    notes,
  )

  return data
}

async function gatherParent(
  sr: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  notes: SkipNote[],
): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {}

  data.profile = await safeSelect(sr, "profiles", q => q.eq("id", userId), notes)
  data.parent_chores = await safeSelect(sr, "parent_chores", q => q.eq("parent_id", userId), notes)
  data.parental_approvals = await safeSelect(sr, "parental_approvals", q => q.eq("parent_id", userId), notes)
  data.escrow_ledger = await safeSelect(sr, "escrow_ledger", q => q.eq("parent_id", userId), notes)
  data.food_orders = await safeSelect(sr, "food_orders", q => q.eq("parent_id", userId), notes)
  data.ride_bookings = await safeSelect(sr, "ride_bookings", q => q.eq("parent_id", userId), notes)
  data.user_notifications = await safeSelect(sr, "user_notifications", q => q.eq("user_id", userId), notes)
  data.notification_preferences = await safeSelect(
    sr,
    "notification_preferences",
    q => q.eq("user_id", userId),
    notes,
  )
  data.family_subscriptions = await safeSelect(
    sr,
    "family_subscriptions",
    q => q.eq("parent_id", userId),
    notes,
  )
  data.parent_teen_links = await safeSelect(
    sr,
    "parent_teen_links",
    q => q.eq("parent_id", userId),
    notes,
  )

  return data
}

async function gatherPartner(
  sr: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  notes: SkipNote[],
): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {}

  data.profile = await safeSelect(sr, "profiles", q => q.eq("id", userId), notes)
  data.partner_staff = await safeSelect(sr, "partner_staff", q => q.eq("user_id", userId), notes)

  // Find linked partner ids via partner_staff
  const staffRows = (data.partner_staff as any[] | null) || []
  const partnerIds = Array.from(new Set(staffRows.map(r => r?.partner_id).filter(Boolean)))

  if (partnerIds.length > 0) {
    data.partners = await safeSelect(sr, "partners", q => q.in("id", partnerIds), notes)
    data.food_orders = await safeSelect(
      sr,
      "food_orders",
      q => q.in("partner_id", partnerIds),
      notes,
    )
  } else {
    data.partners = []
    data.food_orders = []
  }

  data.user_notifications = await safeSelect(sr, "user_notifications", q => q.eq("user_id", userId), notes)
  data.notification_preferences = await safeSelect(
    sr,
    "notification_preferences",
    q => q.eq("user_id", userId),
    notes,
  )

  return data
}

async function gatherFallback(
  sr: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  notes: SkipNote[],
): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {}
  data.profile = await safeSelect(sr, "profiles", q => q.eq("id", userId), notes)
  data.user_notifications = await safeSelect(sr, "user_notifications", q => q.eq("user_id", userId), notes)
  data.notification_preferences = await safeSelect(
    sr,
    "notification_preferences",
    q => q.eq("user_id", userId),
    notes,
  )
  return data
}

/* ------------------------------------------------------------------------ */
/* Handler                                                                  */
/* ------------------------------------------------------------------------ */

const INLINE_BYTE_THRESHOLD = 1_048_576 // 1 MB
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 // 24h

export async function POST() {
  // 1. Cookie-bound auth — service-role / anon callers are implicitly rejected.
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json(
      { ok: false, error: "unauthenticated" },
      { status: 401 },
    )
  }

  const sr = createServiceRoleClient()

  // 2. Resolve role from canonical profile row.
  const { data: profile } = await sr
    .from("profiles")
    .select("id, email, role")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "profile_not_found" },
      { status: 404 },
    )
  }

  const role: string = profile.role || "unknown"

  // 3. Log the request as 'requested' (data_exports is an audit table).
  const requestedAt = new Date().toISOString()
  const { data: logRow, error: logErr } = await sr
    .from("data_exports")
    .insert({
      user_id: user.id,
      export_type: "export",
      status: "requested",
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

  // 4. Mark processing.
  await sr.from("data_exports").update({ status: "processing" }).eq("id", exportId)

  // 5. Gather data per role (error-tolerant).
  const skipped: SkipNote[] = []
  const warnings: string[] = []

  let data: Record<string, unknown> = {}
  try {
    if (role === "teen") data = await gatherTeen(sr, user.id, skipped)
    else if (role === "parent") data = await gatherParent(sr, user.id, skipped)
    else if (role === "partner") data = await gatherPartner(sr, user.id, skipped)
    else {
      warnings.push(`unknown_role_fallback: ${role}`)
      data = await gatherFallback(sr, user.id, skipped)
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

  const payload: ExportPayload = {
    exported_at: new Date().toISOString(),
    user_id: user.id,
    role,
    data,
    _notes: { skipped, warnings },
  }

  // 6. Decide inline vs signed-URL based on size.
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

  // 7. Large payload — try to upload to private bucket.
  const objectPath = `${user.id}/${exportId}.json`
  const upload = await sr.storage
    .from("user-exports")
    .upload(objectPath, new Blob([json], { type: "application/json" }), {
      contentType: "application/json",
      upsert: true,
    })

  if (upload.error) {
    // Bucket missing or upload failed — fall back to inline (acceptable per spec).
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
      file_url: objectPath, // canonical location; URL is regenerable
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
