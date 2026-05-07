/**
 * V1.2 — Admin: reject a pending mentor KYC application.
 *
 * POST /api/admin/mentors/:id/reject
 *   body: { reason: string }   (required, non-empty, ≤ 1000 chars)
 *
 * Side-effects:
 *   - mentors.status              → 'rejected'
 *   - mentors.kyc_status          → 'rejected'
 *   - kyc_documents.status        → 'rejected' (rejection_reason stamped) for
 *                                   mentor's documents (subject_kind='mentor')
 *   - admin_audit_logs            → INSERT (§29.8)
 *   - user_notifications          → notify mentor with the rejection reason
 *
 * Auth: caller MUST be admin (admin_roles row). Service role used only AFTER
 * the auth gate.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  // 1. Auth via cookie session
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 })
  }

  // 2. Admin gate
  const sr = createServiceRoleClient()
  const { data: role } = await sr
    .from("admin_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle()
  if (!role || !["admin", "super_admin", "moderator"].includes(role.role)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 })
  }

  // 3. Validate body
  const body = (await req.json().catch(() => ({}))) as { reason?: unknown }
  const reason = typeof body.reason === "string" ? body.reason.trim() : ""
  if (!reason || reason.length > 1000) {
    return NextResponse.json({ ok: false, error: "reason_required" }, { status: 400 })
  }

  // 4. Fetch mentor
  const { data: mentor, error: mErr } = await sr
    .from("mentors")
    .select("id, user_id, status, kyc_status")
    .eq("id", id)
    .maybeSingle()
  if (mErr) return NextResponse.json({ ok: false, error: mErr.message }, { status: 500 })
  if (!mentor) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 })
  if (mentor.status === "rejected") {
    return NextResponse.json({ ok: false, error: "already_rejected" }, { status: 400 })
  }

  const nowIso = new Date().toISOString()

  // 5. Flip mentor status + kyc_status
  const { error: upErr } = await sr
    .from("mentors")
    .update({ status: "rejected", kyc_status: "rejected" })
    .eq("id", id)
  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 })

  // 6. Reject pending mentor KYC documents (best-effort)
  if (mentor.user_id) {
    await sr
      .from("kyc_documents")
      .update({
        status: "rejected",
        reviewed_by: user.id,
        reviewed_at: nowIso,
        rejection_reason: reason,
      })
      .eq("owner_user_id", mentor.user_id)
      .eq("subject_kind", "mentor")
      .neq("status", "approved")
  }

  // 7. Audit log (§29.8)
  await sr.from("admin_audit_logs").insert({
    user_id: user.id,
    action: "mentor.reject",
    target_type: "mentor",
    target_id: id,
    payload: {
      previous_status: mentor.status,
      previous_kyc_status: mentor.kyc_status,
      reason,
    },
  })

  // 8. Notify mentor (best-effort)
  if (mentor.user_id) {
    await sr.from("user_notifications").insert({
      user_id: mentor.user_id,
      title: "Candidature mentor refusée",
      body: `Motif : ${reason}`,
      priority: "high",
      action_url: "/mentor/kyc",
      data: { kind: "mentor.rejected", mentor_id: id, reason },
    })
  }

  return NextResponse.json({ ok: true, mentor_id: id, status: "rejected" })
}
