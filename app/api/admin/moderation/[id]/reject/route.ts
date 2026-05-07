/**
 * Wave C.8 — Admin: reject a moderation_queue row.
 *
 * POST /api/admin/moderation/:id/reject
 *   body: { reason: string }   (required, non-empty, ≤ 1000 chars)
 *
 * Side-effects:
 *   - moderation_queue.status     → 'rejected' + reason + reviewed_by/at
 *   - underlying content row      → status='rejected' (when mapping known)
 *   - admin_audit_logs            → INSERT (§29.8)
 *   - user_notifications          → submitter notified with reason
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const CONTENT_TABLES: Record<string, { table: string; ownerCol: string }> = {
  feed_post: { table: "feed_posts", ownerCol: "user_id" },
  marketplace_listing: { table: "marketplace_listings", ownerCol: "seller_user_id" },
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 })
  }

  const sr = createServiceRoleClient()
  const { data: role } = await sr
    .from("admin_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle()
  if (!role || !["admin", "super_admin", "moderator"].includes(role.role)) {
    return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as { reason?: unknown }
  const reason = typeof body.reason === "string" ? body.reason.trim() : ""
  if (!reason || reason.length > 1000) {
    return NextResponse.json({ success: false, error: "reason_required" }, { status: 400 })
  }

  const { data: row, error: fetchErr } = await sr
    .from("moderation_queue")
    .select("id, content_type, content_id, status")
    .eq("id", id)
    .maybeSingle()
  if (fetchErr) return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 })
  if (!row) return NextResponse.json({ success: false, error: "not_found" }, { status: 404 })
  if (row.status !== "pending") {
    return NextResponse.json({ success: false, error: "already_reviewed", status: row.status }, { status: 400 })
  }

  const nowIso = new Date().toISOString()

  const { error: qErr } = await sr
    .from("moderation_queue")
    .update({ status: "rejected", reviewed_by: user.id, reviewed_at: nowIso, reason })
    .eq("id", id)
  if (qErr) return NextResponse.json({ success: false, error: qErr.message }, { status: 500 })

  const mapping = CONTENT_TABLES[row.content_type]
  let ownerId: string | null = null
  if (mapping && row.content_id) {
    const { data: contentRow } = await sr
      .from(mapping.table)
      .select(`id, ${mapping.ownerCol}`)
      .eq("id", row.content_id)
      .maybeSingle()
    if (contentRow) {
      const asRecord = contentRow as unknown as Record<string, unknown>
      const v = asRecord[mapping.ownerCol]
      ownerId = typeof v === "string" ? v : null
    }
    await sr.from(mapping.table).update({ status: "rejected" }).eq("id", row.content_id)
  }

  await sr.from("admin_audit_logs").insert({
    user_id: user.id,
    action: "moderation.reject",
    target_type: row.content_type,
    target_id: row.content_id,
    payload: { queue_id: id, reason },
  })

  if (ownerId) {
    await sr.from("user_notifications").insert({
      user_id: ownerId,
      title: "Contenu refusé",
      body: reason,
      priority: "normal",
      data: { kind: "moderation.rejected", content_type: row.content_type, content_id: row.content_id, reason },
    })
  }

  return NextResponse.json({ success: true, queue_id: id, status: "rejected" })
}
