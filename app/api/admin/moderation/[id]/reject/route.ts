/**
 * POST /api/admin/moderation/:id/reject — binary reject shortcut.
 *
 * Wave C.8 shipped this as the proofs surface's binary action. Wave 6H
 * hardens it to match the 7-decision dispatcher canon:
 *   - permission via canonical `requireAdminPermission('content.view')`
 *   - audit via canonical `logAdminAction()` (throws on failure)
 *   - already_reviewed → 409 (was 400)
 *   - content adapter sourced from lib/admin/moderation-adapters.ts
 *
 * Reject semantics = `delete` decision in the canonical adapter (flips
 * content row → removed/rejected). Reason required, ≤ 1000 chars.
 */
import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  logAdminAction,
  requireAdminPermission,
} from "@/lib/auth/admin-permissions"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { adapterFor } from "@/lib/admin/moderation-adapters"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  let admin
  try {
    admin = await requireAdminPermission("content.view")
  } catch {
    return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as { reason?: unknown }
  const reason = typeof body.reason === "string" ? body.reason.trim() : ""
  if (!reason || reason.length > 1000) {
    return NextResponse.json({ success: false, error: "reason_required" }, { status: 400 })
  }

  // Untyped on purpose: `moderation_queue` / `user_reports` and the
  // adapter-resolved content tables (e.g. `partner_offers`) predate the
  // last `types/supabase.ts` codegen and are absent from the generated
  // `Database` type even though they exist live (see migrations
  // 055/056/097). Casting to the base `SupabaseClient` here avoids a
  // false "table does not exist" tsc error for tables that are real in
  // the DB but missing from the (stale) generated schema, and avoids
  // resolving `.from(adapter.table)` against the full table-name union.
  const sr = createServiceRoleClient() as unknown as SupabaseClient
  const { data: row, error: fetchErr } = await sr
    .from("moderation_queue")
    .select("id, content_type, content_id, status")
    .eq("id", id)
    .maybeSingle()
  if (fetchErr) return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 })
  if (!row) return NextResponse.json({ success: false, error: "not_found" }, { status: 404 })
  if (row.status !== "pending") {
    return NextResponse.json(
      { success: false, error: "already_reviewed", status: row.status },
      { status: 409 },
    )
  }

  const adapter = adapterFor(row.content_type)
  if (!adapter) {
    return NextResponse.json(
      { success: false, error: "unsupported_content_type", content_type: row.content_type },
      { status: 409 },
    )
  }
  const update = adapter.effectFor("delete")
  if (!update) {
    return NextResponse.json(
      {
        success: false,
        error: "unsupported_action",
        content_type: row.content_type,
        decision: "delete",
      },
      { status: 409 },
    )
  }

  const nowIso = new Date().toISOString()

  // Resolve owner BEFORE the update so we can notify even if the row
  // reshapes.
  let ownerId: string | null = null
  if (row.content_id) {
    const { data: contentRow } = await sr
      .from(adapter.table)
      .select(`id, ${adapter.ownerCol}`)
      .eq("id", row.content_id)
      .maybeSingle()
    if (contentRow) {
      const asRecord = contentRow as unknown as Record<string, unknown>
      const v = asRecord[adapter.ownerCol]
      ownerId = typeof v === "string" ? v : null
    }
  }

  const { error: qErr } = await sr
    .from("moderation_queue")
    .update({ status: "rejected", reviewed_by: admin.profileId, reviewed_at: nowIso, reason })
    .eq("id", id)
  if (qErr) return NextResponse.json({ success: false, error: qErr.message }, { status: 500 })

  if (row.content_id) {
    const { error: contentErr } = await sr
      .from(adapter.table)
      .update(update)
      .eq("id", row.content_id)
    if (contentErr) {
      return NextResponse.json(
        { success: false, error: "content_update_failed", detail: contentErr.message },
        { status: 500 },
      )
    }
  }

  // Sync user_reports — Wave 6H: filter on `'open'`, surface error.
  const { error: reportsErr } = await sr
    .from("user_reports")
    .update({
      status: "actioned",
      resolved_by: admin.profileId,
      resolved_at: nowIso,
    })
    .eq("target_type", row.content_type)
    .eq("target_id", row.content_id)
    .eq("status", "open")
  if (reportsErr) {
    return NextResponse.json(
      { success: false, error: "user_reports_sync_failed", detail: reportsErr.message },
      { status: 500 },
    )
  }

  await logAdminAction({
    actor_id: admin.profileId,
    actor_role: admin.subRole,
    action: "moderation.reject",
    resource_type: row.content_type,
    resource_id: row.content_id,
    target_user_id: ownerId,
    metadata: { queue_id: id, reason, decision: "delete" },
  })

  if (ownerId) {
    await sr.from("user_notifications").insert({
      user_id: ownerId,
      title: "Contenu refusé",
      body: reason,
      priority: "normal",
      data: {
        kind: "moderation.rejected",
        content_type: row.content_type,
        content_id: row.content_id,
        reason,
      },
    })
  }

  return NextResponse.json({ success: true, queue_id: id, status: "rejected" })
}
