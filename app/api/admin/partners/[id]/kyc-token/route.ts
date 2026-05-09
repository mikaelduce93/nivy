/**
 * Wave 3B.3 — admin issues a single-use, time-bound KYC token for a prospect
 * partner so they can upload KYC docs BEFORE their auth.users provisioning
 * (canon §2 stage 4 + §4.6).
 *
 * POST /api/admin/partners/[id]/kyc-token
 *   { ttl_days?: number (1-30, default 7) }
 *
 * Returns: { success, token, expires_at, kyc_url }
 *   - `token` is the raw value — the ONLY time it's exposed. Admin shares it
 *     out-of-band with the prospect via email/phone.
 *   - DB stores sha256(token) only (canon: never log raw secrets).
 */
import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { issueKycToken } from "@/lib/partners/kyc-token"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ADMIN_ROLES = new Set(["admin", "super_admin", "moderator"])
const bodySchema = z.object({ ttl_days: z.number().int().min(1).max(30).optional() })

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: partnerId } = await ctx.params
  if (!partnerId) {
    return NextResponse.json({ success: false, error: "id_required" }, { status: 400 })
  }

  let body: z.infer<typeof bodySchema> = {}
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    body = {}
  }

  const supabase = await createClient()
  const {
    data: { user: caller },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !caller) {
    return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 })
  }

  const sr = createServiceRoleClient()
  const { data: role } = await sr
    .from("admin_roles")
    .select("role")
    .eq("profile_id", caller.id)
    .maybeSingle()
  if (!role || !ADMIN_ROLES.has(role.role)) {
    return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 })
  }

  const { data: partner } = await sr
    .from("partners")
    .select("id, status, partner_type")
    .eq("id", partnerId)
    .maybeSingle()
  if (!partner) {
    return NextResponse.json({ success: false, error: "partner_not_found" }, { status: 404 })
  }

  const issued = issueKycToken(body.ttl_days)
  const { error: insErr } = await sr.from("partner_kyc_tokens").insert({
    partner_id: partnerId,
    token_hash: issued.hash,
    issued_by: caller.id,
    expires_at: issued.expires_at,
  })
  if (insErr) {
    return NextResponse.json({ success: false, error: insErr.message }, { status: 500 })
  }

  await sr.from("audit_log").insert({
    actor_id: caller.id,
    action: "partner_kyc.token.issue",
    resource_type: "partner",
    resource_id: partnerId,
    metadata: { expires_at: issued.expires_at, ttl_days: body.ttl_days ?? 7 },
  })

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")
  const kycUrl = `${appUrl}/devenir-partenaire/kyc?token=${encodeURIComponent(issued.raw)}`

  return NextResponse.json({
    success: true,
    token: issued.raw,
    expires_at: issued.expires_at,
    kyc_url: kycUrl,
    partner_id: partnerId,
  })
}
