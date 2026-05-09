/**
 * Wave 3B.3 — admin per-document KYC decision (canon §4.6).
 *
 * POST /api/admin/partners/kyc/:doc_id/decision
 *   { decision: 'approved' | 'rejected', reason?: string }
 *
 * Flips a single kyc_documents row. The `partners.status='active'`
 * activation gate (mig 099 + activate route) keeps blocking until the doc
 * pipeline reports all required pieces approved — this endpoint just
 * progresses the per-doc status.
 *
 * audit_log written. Admin-only. No bulk action here (Wave 4 task).
 */
import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ADMIN_ROLES = new Set(["admin", "super_admin", "moderator"])
const bodySchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().max(500).optional(),
})

export async function POST(
  request: Request,
  ctx: { params: Promise<{ doc_id: string }> },
) {
  const { doc_id } = await ctx.params
  if (!doc_id) {
    return NextResponse.json({ success: false, error: "doc_id_required" }, { status: 400 })
  }

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ success: false, error: "invalid_body" }, { status: 400 })
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

  const { data: doc } = await sr
    .from("kyc_documents")
    .select("id, partner_id, doc_type, status")
    .eq("id", doc_id)
    .maybeSingle()
  if (!doc) {
    return NextResponse.json({ success: false, error: "not_found" }, { status: 404 })
  }

  if (body.decision === "rejected" && !body.reason?.trim()) {
    return NextResponse.json(
      { success: false, error: "reason_required_for_rejection" },
      { status: 400 },
    )
  }

  const nowIso = new Date().toISOString()
  const { error: upErr } = await sr
    .from("kyc_documents")
    .update({
      status: body.decision,
      reviewed_by: user.id,
      reviewed_at: nowIso,
      rejection_reason: body.decision === "rejected" ? body.reason ?? null : null,
    })
    .eq("id", doc_id)
  if (upErr) {
    return NextResponse.json({ success: false, error: upErr.message }, { status: 500 })
  }

  await sr.from("audit_log").insert({
    actor_id: user.id,
    action: `partner_kyc.${body.decision}`,
    resource_type: "kyc_document",
    resource_id: doc_id,
    metadata: {
      partner_id: doc.partner_id,
      doc_type: doc.doc_type,
      previous_status: doc.status,
      reason: body.reason ?? null,
    },
  })

  return NextResponse.json({ success: true, doc_id, status: body.decision })
}
