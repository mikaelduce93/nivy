/**
 * Wave C.8 — Admin: approve a moderation_queue row.
 *
 * POST /api/admin/moderation/:id/approve
 *
 * Generic handler — works for any content_type currently in the queue
 * (feed_post, marketplace_listing, etc.). Approval semantics depend on
 * content_type; we update both moderation_queue and the underlying row.
 *
 * Side-effects:
 *   - moderation_queue.status     → 'approved' + reviewed_by/at
 *   - underlying content row      → status flipped to its 'live' state
 *   - admin_audit_logs            → INSERT (§29.8)
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const APPROVED_STATUS_BY_CONTENT_TYPE: Record<string, { table: string; status: string }> = {
  feed_post: { table: "feed_posts", status: "published" },
  marketplace_listing: { table: "marketplace_listings", status: "active" },
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
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
    .update({ status: "approved", reviewed_by: user.id, reviewed_at: nowIso })
    .eq("id", id)
  if (qErr) return NextResponse.json({ success: false, error: qErr.message }, { status: 500 })

  // Flip underlying content row when we know the mapping
  const mapping = APPROVED_STATUS_BY_CONTENT_TYPE[row.content_type]
  if (mapping && row.content_id) {
    await sr.from(mapping.table).update({ status: mapping.status }).eq("id", row.content_id)
  }

  await sr.from("admin_audit_logs").insert({
    user_id: user.id,
    action: "moderation.approve",
    target_type: row.content_type,
    target_id: row.content_id,
    payload: { queue_id: id },
  })

  return NextResponse.json({ success: true, queue_id: id, status: "approved" })
}
