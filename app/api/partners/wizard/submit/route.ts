/**
 * Wave 3A — canonical partner wizard submission (canon §2 stage 2, §4.7).
 *
 * POST /api/partners/wizard/submit
 *
 * Captures the wizard payload + chosen password. Inserts:
 *   - partners (status='pending')
 *   - type-specific child rows (locations, discounts, venue, club, education)
 *   - partner_pending_credentials (transient — consumed at admin activation)
 *
 * DOES NOT call supabase.auth.signUp. The auth user is provisioned only at
 * `/api/admin/partners/[id]/activate` (canon §2 stage 6, §4.7).
 *
 * If any child insert fails, the partner row is rolled back so we never leave
 * an orphan partners row behind.
 */
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { withSecurity } from "@/lib/security/api-middleware"
import { hashPassword } from "@/lib/auth/password"

const PARTNER_TYPES = ["retail", "venue", "club", "education", "food"] as const

const wizardSchema = z.object({
  partner_type: z.enum(PARTNER_TYPES),
  company_name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  phone: z.string().min(6).max(40).optional().nullable(),
  website: z.string().url().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  contact_person_name: z.string().max(120).optional().nullable(),
  contact_person_role: z.string().max(120).optional().nullable(),
  contact_person_phone: z.string().max(40).optional().nullable(),
  contact_person_email: z.string().email().optional().nullable(),
  // Legal / Moroccan specific
  rc_number: z.string().max(40).optional().nullable(),
  ice_number: z.string().max(40).optional().nullable(),
  patente_number: z.string().max(40).optional().nullable(),
  // Type-specific payloads — keep loose at this layer; downstream handlers
  // do their own narrower validation.
  locations: z.array(z.record(z.unknown())).optional(),
  discounts: z.array(z.record(z.unknown())).optional(),
  venue_details: z.record(z.unknown()).optional(),
  menu_items: z.array(z.record(z.unknown())).optional(),
  event_packages: z.array(z.record(z.unknown())).optional(),
  club_details: z.record(z.unknown()).optional(),
  offerings: z.array(z.record(z.unknown())).optional(),
  education_details: z.record(z.unknown()).optional(),
  courses: z.array(z.record(z.unknown())).optional(),
})

type WizardInput = z.infer<typeof wizardSchema>

export const POST = withSecurity(async (request: NextRequest) => {
  let parsed: WizardInput
  try {
    const body = await request.json()
    parsed = wizardSchema.parse(body)
  } catch (e) {
    const message = e instanceof z.ZodError ? e.issues : "invalid_body"
    return NextResponse.json(
      { success: false, error: "invalid_body", details: message },
      { status: 400 },
    )
  }

  const sr = createServiceRoleClient()

  // Reject if email already has a pending or active partner row.
  const { data: existing } = await sr
    .from("partners")
    .select("id, status")
    .eq("email", parsed.email)
    .maybeSingle()
  if (existing) {
    return NextResponse.json(
      {
        success: false,
        error:
          existing.status === "active"
            ? "email_already_active_partner"
            : "email_already_in_review",
      },
      { status: 409 },
    )
  }

  const { data: partner, error: pErr } = await sr
    .from("partners")
    .insert({
      partner_type: parsed.partner_type,
      company_name: parsed.company_name,
      email: parsed.email,
      phone: parsed.phone ?? null,
      website: parsed.website ?? null,
      description: parsed.description ?? null,
      contact_person_name: parsed.contact_person_name ?? null,
      contact_person_role: parsed.contact_person_role ?? null,
      contact_person_phone: parsed.contact_person_phone ?? null,
      contact_person_email: parsed.contact_person_email ?? null,
      rc_number: parsed.rc_number ?? null,
      ice_number: parsed.ice_number ?? null,
      patente_number: parsed.patente_number ?? null,
      status: "pending",
    })
    .select("id, email, partner_type")
    .single()

  if (pErr || !partner) {
    return NextResponse.json(
      { success: false, error: pErr?.message ?? "partner_insert_failed" },
      { status: 500 },
    )
  }

  const partnerId = partner.id

  // Type-specific child rows. Any failure rolls back the partner row.
  try {
    if (parsed.partner_type === "retail") {
      await handleRetail(sr, partnerId, parsed)
    } else if (parsed.partner_type === "venue") {
      await handleVenue(sr, partnerId, parsed)
    } else if (parsed.partner_type === "club") {
      await handleClub(sr, partnerId, parsed)
    } else if (parsed.partner_type === "education") {
      await handleEducation(sr, partnerId, parsed)
    }
    // 'food' carries no extra wizard tables in v1 — just the partners row.

    // Stage password (transient — consumed at admin activation).
    const passwordHash = await hashPassword(parsed.password)
    const { error: credErr } = await sr.from("partner_pending_credentials").insert({
      partner_id: partnerId,
      password_hash: passwordHash,
      email: parsed.email,
    })
    if (credErr) throw new Error(credErr.message)

    await sr.from("audit_log").insert({
      action: "partner.wizard.submit",
      resource_type: "partner",
      resource_id: partnerId,
      metadata: { partner_type: parsed.partner_type, email_domain: parsed.email.split("@")[1] ?? null },
    })
  } catch (err) {
    // Best-effort rollback. Service role bypasses RLS.
    await sr.from("partner_pending_credentials").delete().eq("partner_id", partnerId)
    await sr.from("partners").delete().eq("id", partnerId)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "wizard_submit_failed",
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    partner_id: partnerId,
    next_step: "kyc_upload_pending_admin_review",
  })
}, { rateLimit: "api" })

// ---------------------------------------------------------------------------
// Type-specific handlers — kept narrow; tolerant of the loose wizard payload.
// ---------------------------------------------------------------------------

async function handleRetail(sr: any, partnerId: string, data: WizardInput) {
  if (data.locations?.length) {
    const rows = data.locations.map((loc: any) => ({
      partner_id: partnerId,
      label: loc.location_name ?? loc.label ?? null,
      address: loc.address,
      city: loc.city,
      postal_code: loc.postal_code,
      phone: loc.phone,
    }))
    const { error } = await sr.from("partner_locations").insert(rows)
    if (error) throw new Error(`locations_insert_failed: ${error.message}`)
  }
  if (data.discounts?.length) {
    const rows = data.discounts.map((d: any) => ({
      partner_id: partnerId,
      title: d.discount_name ?? d.title,
      description: d.description ?? null,
      discount_type: d.discount_type,
      discount_value: d.discount_value,
      min_vip_level: d.min_vip_level,
      min_purchase_amount: d.min_purchase_amount,
      max_discount_amount: d.max_discount_amount,
      valid_from: d.valid_from,
      valid_until: d.valid_until,
      // canon §4.1: never live on create.
      status: "draft",
      is_active: false,
    }))
    const { error } = await sr.from("partner_offers").insert(rows)
    if (error) throw new Error(`offers_insert_failed: ${error.message}`)
  }
}

async function handleVenue(sr: any, partnerId: string, data: WizardInput) {
  if (data.venue_details) {
    const { error } = await sr.from("partner_venues").insert({
      partner_id: partnerId,
      ...(data.venue_details as Record<string, unknown>),
    })
    if (error) throw new Error(`venue_insert_failed: ${error.message}`)
  }
}

async function handleClub(sr: any, partnerId: string, data: WizardInput) {
  if (data.club_details) {
    const { error } = await sr.from("partner_clubs").insert({
      partner_id: partnerId,
      ...(data.club_details as Record<string, unknown>),
    })
    if (error) throw new Error(`club_insert_failed: ${error.message}`)
  }
}

async function handleEducation(sr: any, partnerId: string, data: WizardInput) {
  if (data.education_details) {
    const { error } = await sr
      .from("partners")
      .update({ business_hours: { education_details: data.education_details, courses: data.courses ?? [] } })
      .eq("id", partnerId)
    if (error) throw new Error(`education_update_failed: ${error.message}`)
  }
}
