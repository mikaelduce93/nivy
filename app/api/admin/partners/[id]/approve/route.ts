/**
 * Wave C.7 — Admin: approve a partner KYC application.
 *
 * POST /api/admin/partners/:id/approve
 *
 * Side-effects:
 *   - partners.status                  → 'active'
 *   - kyc_documents.status             → 'approved'  (all docs for partner)
 *   - kyc_documents.reviewed_by/at     → admin id / now
 *   - admin_audit_logs                 → INSERT (§29.8 invariant)
 *   - user_notifications               → optional toast for partner owner
 *
 * Auth: caller MUST be admin (admin_roles row). Service role used only AFTER
 * the auth gate.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  // 1. Validate caller via cookie session
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 })
  }

  // 2. Admin gate
  const sr = createServiceRoleClient()
  const { data: role } = await sr
    .from("admin_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle()
  if (!role || !["admin", "super_admin", "moderator"].includes(role.role)) {
    return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 })
  }

  // 3. Fetch partner (must exist + not already active)
  const { data: partner, error: pErr } = await sr
    .from("partners")
    .select("id, email, company_name, status")
    .eq("id", id)
    .maybeSingle()
  if (pErr) return NextResponse.json({ success: false, error: pErr.message }, { status: 500 })
  if (!partner) return NextResponse.json({ success: false, error: "not_found" }, { status: 404 })
  if (partner.status === "active") {
    return NextResponse.json({ success: false, error: "already_active" }, { status: 400 })
  }

  const nowIso = new Date().toISOString()

  // 4. Flip partner status
  const { error: upErr } = await sr
    .from("partners")
    .update({ status: "active", updated_at: nowIso })
    .eq("id", id)
  if (upErr) return NextResponse.json({ success: false, error: upErr.message }, { status: 500 })

  // 5. Approve all submitted KYC documents (best effort — non-fatal if zero docs)
  await sr
    .from("kyc_documents")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: nowIso,
      rejection_reason: null,
    })
    .eq("partner_id", id)
    .neq("status", "approved")

  // 6. Audit log (§29.8)
  await sr.from("admin_audit_logs").insert({
    user_id: user.id,
    action: "partner.approve",
    target_type: "partner",
    target_id: id,
    payload: { previous_status: partner.status },
  })

  // 7. Notify partner (best-effort; partner login is by email so we look up profile)
  const { data: ownerProfile } = await sr
    .from("profiles")
    .select("id")
    .eq("email", partner.email)
    .maybeSingle()
  if (ownerProfile?.id) {
    await sr.from("user_notifications").insert({
      user_id: ownerProfile.id,
      title: "Compte partenaire approuvé",
      body: `${partner.company_name} est désormais actif. Bienvenue sur Nivy.`,
      priority: "high",
      action_url: "/partner",
      data: { kind: "partner.approved", partner_id: id },
    })
  }

  return NextResponse.json({ success: true, partner_id: id, status: "active" })
}
