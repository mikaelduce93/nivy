/**
 * POST /api/admin/moderation/:id/approve — binary approve shortcut.
 *
 * Wave C.8 shipped this as the proofs surface's binary action. Wave 6H
 * hardens it to the same canon as the 7-decision dispatcher
 * (`/api/admin/moderation/[id]/decision`):
 *   - permission via canonical `requireAdminPermission('content.view')`
 *     (was: inline admin_roles read)
 *   - audit via canonical `logAdminAction()` which throws on failure
 *     (was: raw audit_log insert that swallowed errors)
 *   - already_reviewed → 409 (was: 400 — inconsistent with /decision)
 *   - content adapter sourced from lib/admin/moderation-adapters.ts so
 *     `partner_offer` and any future content_type stay covered without
 *     a parallel map drift
 *
 * Approval semantics = `restore` decision in the canonical adapter
 * (flips queue → approved + content row → published/active).
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

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  // Canonical permission gate (Wave 4A pattern).
  let admin
  try {
    admin = await requireAdminPermission("content.view")
  } catch {
    return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 })
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
  // "Approve" maps to the canonical `restore` decision (flip content
  // back to its live state). If the adapter doesn't support restore for
  // a given content_type, surface 409 rather than fake success.
  const update = adapter.effectFor("restore")
  if (!update) {
    return NextResponse.json(
      {
        success: false,
        error: "unsupported_action",
        content_type: row.content_type,
        decision: "restore",
      },
      { status: 409 },
    )
  }

  const nowIso = new Date().toISOString()

  const { error: qErr } = await sr
    .from("moderation_queue")
    .update({ status: "approved", reviewed_by: admin.profileId, reviewed_at: nowIso })
    .eq("id", id)
  if (qErr) return NextResponse.json({ success: false, error: qErr.message }, { status: 500 })

  if (row.content_id) {
    const { error: contentErr } = await sr
      .from(adapter.table)
      .update(update)
      .eq("id", row.content_id)
    if (contentErr) {
      return NextResponse.json(
        {
          success: false,
          error: "content_update_failed",
          detail: contentErr.message,
        },
        { status: 500 },
      )
    }
  }

  // Sync user_reports — Wave 6H: filter on `'open'`, not `'pending'`,
  // and surface error on failure.
  const { error: reportsErr } = await sr
    .from("user_reports")
    .update({
      status: "dismissed",
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

  // Audit log — throws on failure (canon §10 FORBIDDEN #9).
  await logAdminAction({
    actor_id: admin.profileId,
    actor_role: admin.subRole,
    action: "moderation.approve",
    resource_type: row.content_type,
    resource_id: row.content_id,
    metadata: { queue_id: id, decision: "restore" },
  })

  return NextResponse.json({ success: true, queue_id: id, status: "approved" })
}
