/**
 * POST /api/admin/marketplace/moderate/:listing_id
 * Body: { decision: 'approve' | 'reject', reason?: string }
 *
 * Admin moderates a pending listing. Approve → status='active'.
 * Writes admin_audit_logs row (§29.8 invariant).
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(
  request: Request,
  ctx: { params: Promise<{ listing_id: string }> }
) {
  const { listing_id } = await ctx.params
  const userInfo = await getUserRole()
  if (!userInfo || (userInfo.role !== "admin" && userInfo.role !== "super_admin" && userInfo.role !== "moderator")) {
    return NextResponse.json({ success: false, error: "admin_only" }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const decision = String(body.decision ?? "")
  const reason = body.reason ? String(body.reason) : null
  if (decision !== "approve" && decision !== "reject") {
    return NextResponse.json({ success: false, error: "invalid_decision" }, { status: 400 })
  }

  const sb = createServiceRoleClient()
  const { data: listing, error: fetchErr } = await sb
    .from("marketplace_listings")
    .select("id, status, moderation_id")
    .eq("id", listing_id)
    .maybeSingle()
  if (fetchErr) return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 })
  if (!listing) return NextResponse.json({ success: false, error: "not_found" }, { status: 404 })
  if (listing.status !== "pending_moderation") {
    return NextResponse.json({ success: false, error: "not_in_moderation", status: listing.status }, { status: 400 })
  }

  const newStatus = decision === "approve" ? "active" : "removed"
  const { error: upErr } = await sb
    .from("marketplace_listings")
    .update({ status: newStatus })
    .eq("id", listing_id)
  if (upErr) return NextResponse.json({ success: false, error: upErr.message }, { status: 500 })

  if (listing.moderation_id) {
    await sb
      .from("moderation_queue")
      .update({
        status: decision === "approve" ? "approved" : "rejected",
        reviewed_by: userInfo.profileId,
        reviewed_at: new Date().toISOString(),
        reason,
      })
      .eq("id", listing.moderation_id)
  }

  // Audit log (§29.8)
  await sb.from("admin_audit_logs").insert({
    user_id: userInfo.profileId,
    action: `marketplace.${decision}`,
    target_type: "marketplace_listing",
    target_id: listing_id,
    payload: { reason },
  })

  return NextResponse.json({ success: true, listing_id, status: newStatus })
}
