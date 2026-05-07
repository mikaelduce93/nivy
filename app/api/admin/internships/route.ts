/**
 * V1.2 — Admin: post a new internship.
 *
 * POST /api/admin/internships
 *   body: {
 *     title: string,                     // required
 *     description?: string | null,
 *     partner_id?: string | null,
 *     city?: string | null,              // persisted into application_form metadata
 *     duration?: '1_day'|'1_week'|'2_weeks'|'summer'|'part_time_school_year',
 *     age_min: number,                   // 13..17
 *     age_max: number,                   // 13..17, >= age_min
 *     spots_total: number,               // > 0
 *     paid?: boolean,
 *     stipend_dh?: number | null,
 *     application_deadline?: string | null   // ISO date
 *   }
 *
 * Inserts into `internships` with status='open'. Audit logs the action.
 *
 * NOTE: Per Wave γ spec the age band is constrained to 13–17. Migration 059
 * allows age_max up to 18, but the API gate limits to 17 to align with the
 * teen-only policy.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const VALID_DURATIONS = new Set([
  "1_day",
  "1_week",
  "2_weeks",
  "summer",
  "part_time_school_year",
])

export async function POST(req: Request) {
  // 1. Auth
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
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const title = typeof body.title === "string" ? body.title.trim() : ""
  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim()
      : null
  const partner_id =
    typeof body.partner_id === "string" && body.partner_id.length > 0 ? body.partner_id : null
  const city =
    typeof body.city === "string" && body.city.trim() ? body.city.trim() : null
  const duration =
    typeof body.duration === "string" && VALID_DURATIONS.has(body.duration)
      ? body.duration
      : "1_week"
  const age_min = Number(body.age_min)
  const age_max = Number(body.age_max)
  const spots_total = Number(body.spots_total)
  const paid = body.paid === true
  const stipend_dh =
    typeof body.stipend_dh === "number" && Number.isFinite(body.stipend_dh)
      ? body.stipend_dh
      : null
  const application_deadline =
    typeof body.application_deadline === "string" && body.application_deadline.length > 0
      ? body.application_deadline
      : null

  if (!title || title.length > 200) {
    return NextResponse.json({ ok: false, error: "invalid_title" }, { status: 400 })
  }
  if (description && description.length > 2000) {
    return NextResponse.json({ ok: false, error: "description_too_long" }, { status: 400 })
  }
  if (
    !Number.isInteger(age_min) ||
    !Number.isInteger(age_max) ||
    age_min < 13 ||
    age_max > 17 ||
    age_min > age_max
  ) {
    return NextResponse.json({ ok: false, error: "invalid_age_band" }, { status: 400 })
  }
  if (!Number.isInteger(spots_total) || spots_total < 1) {
    return NextResponse.json({ ok: false, error: "invalid_spots_total" }, { status: 400 })
  }

  // 4. Build application_form metadata (city stashed here since `internships`
  //    has no `city` column — see internship-form.tsx note).
  const applicationForm: Record<string, unknown> = {}
  if (city) applicationForm.city = city

  const insertRow = {
    partner_id,
    title,
    description,
    duration,
    age_min,
    age_max,
    spots_total,
    paid,
    stipend_dh,
    application_deadline,
    status: "open",
    application_form: applicationForm,
  }

  // 5. Insert
  const { data: row, error: insErr } = await sr
    .from("internships")
    .insert(insertRow)
    .select("id, status, title")
    .single()
  if (insErr) {
    return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 })
  }

  // 6. Audit log
  await sr.from("admin_audit_logs").insert({
    user_id: user.id,
    action: "internship.create",
    target_type: "internship",
    target_id: row.id,
    payload: {
      title: row.title,
      partner_id,
      age_min,
      age_max,
      spots_total,
      duration,
      paid,
    },
  })

  return NextResponse.json({ ok: true, internship_id: row.id, status: row.status })
}
