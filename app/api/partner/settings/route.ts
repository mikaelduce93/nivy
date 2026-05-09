/**
 * Wave 3B.3 — partner self-service settings (canon §3.1, D2 fix).
 *
 * GET  /api/partner/settings   → returns the partner row scoped to caller's email
 * PATCH /api/partner/settings  → updates the canonical-allowed fields only:
 *                                  company_name, phone, website, description,
 *                                  sub_category, business_hours
 *
 * Hard rules (canon D2 / §6 F4):
 *   - partner_type, status, email, approved_at/by, kyc_status are NEVER
 *     mutable from the partner side. They live on the admin path only.
 *   - audit_log written on successful update.
 *   - Sensitive copy field changes do NOT auto-flip status (Wave 4 work to
 *     define which edits trigger re-moderation; for now we just persist).
 */
import { NextResponse } from "next/server"
import { z } from "zod"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ALLOWED_FIELDS = [
  "company_name",
  "phone",
  "website",
  "description",
  "sub_category",
  "business_hours",
] as const

const patchSchema = z.object({
  company_name: z.string().min(2).max(120).optional(),
  phone: z.string().min(6).max(40).nullable().optional(),
  website: z.string().url().max(200).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  sub_category: z.string().max(60).nullable().optional(),
  business_hours: z.record(z.unknown()).nullable().optional(),
})

export async function GET() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "partner") {
    return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 })
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("partners")
    .select(
      "id, email, partner_type, status, company_name, sub_category, phone, website, description, business_hours, created_at, updated_at",
    )
    .eq("email", userInfo.email)
    .maybeSingle()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ success: false, error: "partner_not_found" }, { status: 404 })
  return NextResponse.json({ success: true, partner: data })
}

export async function PATCH(request: Request) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "partner") {
    return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 })
  }

  let parsed: z.infer<typeof patchSchema>
  try {
    parsed = patchSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ success: false, error: "invalid_body" }, { status: 400 })
  }

  // Build the update payload from the allow-list only — defence in depth
  // against client-side mass-assignment of forbidden fields.
  const update: Record<string, unknown> = {}
  for (const k of ALLOWED_FIELDS) {
    if (k in parsed) update[k] = (parsed as Record<string, unknown>)[k]
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ success: false, error: "no_fields" }, { status: 400 })
  }
  update.updated_at = new Date().toISOString()

  const sr = createServiceRoleClient()
  const { data: partner } = await sr
    .from("partners")
    .select("id, status, partner_type")
    .eq("email", userInfo.email)
    .maybeSingle()
  if (!partner) {
    return NextResponse.json({ success: false, error: "partner_not_found" }, { status: 404 })
  }

  const { data: updated, error: updErr } = await sr
    .from("partners")
    .update(update)
    .eq("id", partner.id)
    .select(
      "id, email, partner_type, status, company_name, sub_category, phone, website, description, business_hours, updated_at",
    )
    .single()
  if (updErr) {
    return NextResponse.json({ success: false, error: updErr.message }, { status: 500 })
  }

  await sr.from("audit_log").insert({
    actor_id: userInfo.profileId,
    action: "partner.settings.update",
    resource_type: "partner",
    resource_id: partner.id,
    metadata: { fields: Object.keys(update).filter((k) => k !== "updated_at") },
  })

  return NextResponse.json({ success: true, partner: updated })
}
