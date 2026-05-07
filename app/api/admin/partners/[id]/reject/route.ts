/**
 * Wave C.7 — Admin: reject a partner KYC application.
 *
 * POST /api/admin/partners/:id/reject
 *   body: { reason: string }   (required, non-empty, ≤ 1000 chars)
 *
 * Side-effects:
 *   - partners.status              → 'rejected'
 *   - kyc_documents.status         → 'rejected' (rejection_reason stamped)
 *   - admin_audit_logs             → INSERT (§29.8)
 *   - user_notifications           → partner owner notified with reason
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

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

  const { data: partner, error: pErr } = await sr
    .from("partners")
    .select("id, email, company_name, status")
    .eq("id", id)
    .maybeSingle()
  if (pErr) return NextResponse.json({ success: false, error: pErr.message }, { status: 500 })
  if (!partner) return NextResponse.json({ success: false, error: "not_found" }, { status: 404 })

  const nowIso = new Date().toISOString()

  const { error: upErr } = await sr
    .from("partners")
    .update({ status: "rejected", updated_at: nowIso })
    .eq("id", id)
  if (upErr) return NextResponse.json({ success: false, error: upErr.message }, { status: 500 })

  await sr
    .from("kyc_documents")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: nowIso,
      rejection_reason: reason,
    })
    .eq("partner_id", id)
    .neq("status", "approved")

  await sr.from("admin_audit_logs").insert({
    user_id: user.id,
    action: "partner.reject",
    target_type: "partner",
    target_id: id,
    payload: { previous_status: partner.status, reason },
  })

  const { data: ownerProfile } = await sr
    .from("profiles")
    .select("id")
    .eq("email", partner.email)
    .maybeSingle()
  if (ownerProfile?.id) {
    await sr.from("user_notifications").insert({
      user_id: ownerProfile.id,
      title: "Demande partenaire refusée",
      body: `${partner.company_name} : ${reason}`,
      priority: "high",
      action_url: "/partner/kyc",
      data: { kind: "partner.rejected", partner_id: id, reason },
    })
  }

  return NextResponse.json({ success: true, partner_id: id, status: "rejected" })
}
