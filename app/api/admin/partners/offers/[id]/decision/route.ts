/**
 * Wave 3A — admin offer-moderation decision (canon §4.1).
 *
 * POST /api/admin/partners/offers/:id/decision
 *   { decision: 'approved' | 'rejected', reason?: string }
 *
 * Approve flips `status='approved'` and `is_active=true` (the DB CHECK
 * `NOT is_active OR status='approved'` enforces atomicity at the schema
 * level). Reject flips `status='rejected'` and stores reason. Either way,
 * audit_log is written.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ADMIN_ROLES = new Set(["admin", "super_admin", "moderator"])

interface DecisionBody {
  decision?: "approved" | "rejected"
  reason?: string
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json({ success: false, error: "id_required" }, { status: 400 })
  }

  let body: DecisionBody = {}
  try {
    body = (await request.json()) as DecisionBody
  } catch {
    body = {}
  }
  if (body.decision !== "approved" && body.decision !== "rejected") {
    return NextResponse.json(
      { success: false, error: "decision must be 'approved' or 'rejected'" },
      { status: 400 },
    )
  }

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
  if (!role || !ADMIN_ROLES.has(role.role)) {
    return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 })
  }

  const { data: offer, error: fetchErr } = await sr
    .from("partner_offers")
    .select("id, partner_id, status, is_active, title")
    .eq("id", id)
    .maybeSingle()
  if (fetchErr) return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 })
  if (!offer) return NextResponse.json({ success: false, error: "not_found" }, { status: 404 })

  const nowIso = new Date().toISOString()

  if (body.decision === "approved") {
    const { error: upErr } = await sr
      .from("partner_offers")
      .update({
        status: "approved",
        is_active: true,
        approved_at: nowIso,
        approved_by: user.id,
        rejection_reason: null,
        updated_at: nowIso,
      })
      .eq("id", id)
    if (upErr) {
      return NextResponse.json({ success: false, error: upErr.message }, { status: 500 })
    }
  } else {
    const { error: upErr } = await sr
      .from("partner_offers")
      .update({
        status: "rejected",
        is_active: false,
        rejection_reason: body.reason ?? null,
        approved_at: null,
        approved_by: null,
        updated_at: nowIso,
      })
      .eq("id", id)
    if (upErr) {
      return NextResponse.json({ success: false, error: upErr.message }, { status: 500 })
    }
  }

  await sr.from("audit_log").insert({
    actor_id: user.id,
    action: `partner_offer.${body.decision}`,
    resource_type: "partner_offer",
    resource_id: id,
    metadata: {
      partner_id: offer.partner_id,
      previous_status: offer.status,
      reason: body.reason ?? null,
    },
  })

  return NextResponse.json({ success: true, decision: body.decision, offer_id: id })
}
