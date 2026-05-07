/**
 * Wave D.10 — CNDP / Loi 09-08 right-to-erasure (account deletion request).
 *
 * POST /api/me/data-delete
 *
 * Auth: required (cookie session). Service-role / anon callers are rejected.
 * Body: { confirm: string }   // must equal the user's email OR "DELETE MY ACCOUNT"
 *
 * Returns 200 { ok: true, deletion_scheduled_for: ISO8601, request_id }
 *         400 if confirm doesn't match
 *         409 if a pending request already exists
 *
 * Side-effects:
 *   - INSERT  data_deletion_requests (status='pending', scheduled_for=now+30d)
 *   - UPDATE  profiles.is_deletion_pending = true
 *   - INSERT  admin_audit_logs        (action='user.data_delete.request')
 *   - INSERT  data_exports            (export_type='erasure' audit row)
 *   - sendMail(best-effort) confirming the 30-day grace period
 *
 * Out of scope: the actual erasure cron that wipes data after the grace period.
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { resend, EMAIL_FROM, isResendConfigured } from "@/lib/resend"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const GRACE_PERIOD_DAYS = 30
const CONFIRM_PHRASE = "DELETE MY ACCOUNT"

export async function POST(request: Request) {
  // 1. Cookie-bound auth.
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 })
  }

  // 2. Parse body.
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 })
  }
  const confirm: string = typeof body?.confirm === "string" ? body.confirm.trim() : ""
  if (!confirm) {
    return NextResponse.json(
      { ok: false, error: "confirm_required" },
      { status: 400 },
    )
  }

  // 3. Service-role for cross-table writes (audit log, deletion queue).
  const sr = createServiceRoleClient()

  // 4. Resolve canonical email for matching.
  const { data: profile } = await sr
    .from("profiles")
    .select("id, email, full_name, role, is_deletion_pending")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ ok: false, error: "profile_not_found" }, { status: 404 })
  }

  // 5. Verify confirmation phrase.
  const userEmail: string = (profile.email || user.email || "").toLowerCase()
  const matchesEmail = confirm.toLowerCase() === userEmail && userEmail.length > 0
  const matchesPhrase = confirm === CONFIRM_PHRASE
  if (!matchesEmail && !matchesPhrase) {
    return NextResponse.json(
      { ok: false, error: "confirmation_mismatch" },
      { status: 400 },
    )
  }

  // 6. Reject duplicates — one pending request at a time (DB-level unique index too).
  const { data: existing } = await sr
    .from("data_deletion_requests")
    .select("id, scheduled_for, status")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      {
        ok: false,
        error: "already_pending",
        request_id: existing.id,
        deletion_scheduled_for: existing.scheduled_for,
      },
      { status: 409 },
    )
  }

  // 7. Compute schedule + capture metadata.
  const now = new Date()
  const scheduledFor = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  const ua = request.headers.get("user-agent") || null

  // 8. Insert deletion request.
  const { data: req, error: reqErr } = await sr
    .from("data_deletion_requests")
    .insert({
      user_id: user.id,
      requested_at: now.toISOString(),
      scheduled_for: scheduledFor.toISOString(),
      status: "pending",
      confirmed_via: matchesEmail ? "email_match" : "phrase_match",
      ip_address: ip,
      user_agent: ua,
    })
    .select("id")
    .single()

  if (reqErr || !req) {
    return NextResponse.json(
      { ok: false, error: reqErr?.message || "insert_failed" },
      { status: 500 },
    )
  }

  // 9. Flag profile (best-effort — non-fatal).
  await sr
    .from("profiles")
    .update({ is_deletion_pending: true, updated_at: now.toISOString() })
    .eq("id", user.id)

  // 10. Audit log (§29.8 invariant).
  await sr.from("admin_audit_logs").insert({
    user_id: user.id,
    action: "user.data_delete.request",
    target_type: "user",
    target_id: user.id,
    payload: {
      request_id: req.id,
      scheduled_for: scheduledFor.toISOString(),
      grace_period_days: GRACE_PERIOD_DAYS,
      confirmed_via: matchesEmail ? "email_match" : "phrase_match",
      role: profile.role,
    },
    ip_address: ip,
  })

  // 11. Mirror as an audit row in data_exports for unified subject-rights ledger.
  await sr.from("data_exports").insert({
    user_id: user.id,
    export_type: "erasure",
    status: "requested",
    requested_at: now.toISOString(),
  })

  // 12. Confirmation email (best-effort).
  if (isResendConfigured() && resend && userEmail) {
    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: userEmail,
        subject: "Demande de suppression de compte Nivy enregistrée",
        text: [
          `Bonjour ${profile.full_name || ""},`,
          "",
          "Nous avons bien enregistré votre demande de suppression de compte Nivy.",
          "",
          `Conformément à la Loi 09-08 (CNDP), vos données seront effacées le ${scheduledFor.toISOString().slice(0, 10)} (délai de grâce de ${GRACE_PERIOD_DAYS} jours).`,
          "",
          "Pendant cette période, votre compte est verrouillé. Pour annuler la suppression, contactez le support avant cette date.",
          "",
          "— L'équipe Nivy",
        ].join("\n"),
      })
    } catch (e) {
      // best-effort — don't fail the request
      console.warn("[data-delete] email send failed", e)
    }
  }

  return NextResponse.json({
    ok: true,
    request_id: req.id,
    deletion_scheduled_for: scheduledFor.toISOString(),
    grace_period_days: GRACE_PERIOD_DAYS,
  })
}
