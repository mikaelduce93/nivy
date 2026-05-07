/**
 * Wave V1.2-E — Admin: anonymize a user.
 *
 * POST /api/admin/users/:id/anonymize
 *   Body (optional): { reason: string }
 *
 * Companion to user-side /api/me/data-delete. Performs the actual data
 * minimization (Loi 09-08 / CNDP) while preserving rows whose deletion would
 * destroy accounting integrity (coin_transactions, escrow_ledger, marketplace
 * transaction history, etc.).
 *
 * Effects:
 *   - profiles  → email/full_name/avatar_url redacted; is_deletion_pending=true
 *   - teens     → avatar_url=null, date_of_birth=null  (best-effort)
 *   - data_deletion_requests row updated (or inserted) with anonymized=true
 *   - admin_audit_logs entry action='user.anonymize'
 *
 * Auth: admin / super_admin only (NOT moderator).
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const REDACTED_EMAIL = (id: string) => `redacted+${id}@anonymized.nivy.local`
const REDACTED_NAME = "Utilisateur anonymisé"

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: targetUserId } = await ctx.params

  // 1. Auth + admin gate.
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
  if (!role || !["admin", "super_admin"].includes(role.role)) {
    return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 })
  }
  if (user.id === targetUserId) {
    return NextResponse.json(
      { success: false, error: "cannot_anonymize_self" },
      { status: 400 },
    )
  }

  // 2. Body (optional reason).
  let reason = ""
  try {
    const body = (await req.json()) as { reason?: unknown }
    if (typeof body?.reason === "string") reason = body.reason.trim().slice(0, 1000)
  } catch {
    // no body, fine
  }

  // 3. Verify target exists.
  const { data: targetProfile, error: pErr } = await sr
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", targetUserId)
    .maybeSingle()
  if (pErr) {
    return NextResponse.json({ success: false, error: pErr.message }, { status: 500 })
  }
  if (!targetProfile) {
    return NextResponse.json({ success: false, error: "not_found" }, { status: 404 })
  }

  const nowIso = new Date().toISOString()
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null

  // 4. Redact profile.
  const { error: upErr } = await sr
    .from("profiles")
    .update({
      email: REDACTED_EMAIL(targetUserId),
      full_name: REDACTED_NAME,
      avatar_url: null,
      is_deletion_pending: true,
      updated_at: nowIso,
    })
    .eq("id", targetUserId)
  if (upErr) {
    return NextResponse.json({ success: false, error: upErr.message }, { status: 500 })
  }

  // 5. Best-effort PII strip on adjacent tables. Each non-fatal.
  try {
    await sr
      .from("teens")
      .update({ avatar_url: null, date_of_birth: null })
      .eq("id", targetUserId)
  } catch {
    /* table missing or row absent — fine */
  }

  // 6. Upsert deletion request with anonymized flag.
  const { data: existing } = await sr
    .from("data_deletion_requests")
    .select("id")
    .eq("user_id", targetUserId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  let requestId: string
  if (existing?.id) {
    await sr
      .from("data_deletion_requests")
      .update({
        anonymized: true,
        anonymized_at: nowIso,
        anonymized_by: user.id,
        status: "completed",
        completed_at: nowIso,
        notes: reason || null,
      })
      .eq("id", existing.id)
    requestId = existing.id as string
  } else {
    const { data: inserted, error: insErr } = await sr
      .from("data_deletion_requests")
      .insert({
        user_id: targetUserId,
        requested_at: nowIso,
        scheduled_for: nowIso,
        status: "completed",
        confirmed_via: "admin_action",
        anonymized: true,
        anonymized_at: nowIso,
        anonymized_by: user.id,
        completed_at: nowIso,
        ip_address: ip,
        notes: reason || null,
      })
      .select("id")
      .single()
    if (insErr || !inserted) {
      return NextResponse.json(
        { success: false, error: insErr?.message || "deletion_record_failed" },
        { status: 500 },
      )
    }
    requestId = inserted.id as string
  }

  // 7. Audit log.
  await sr.from("admin_audit_logs").insert({
    user_id: user.id,
    action: "user.anonymize",
    target_type: "user",
    target_id: targetUserId,
    payload: {
      reason: reason || null,
      previous_role: targetProfile.role,
      deletion_request_id: requestId,
      anonymized_at: nowIso,
    },
    ip_address: ip,
  })

  return NextResponse.json({
    success: true,
    user_id: targetUserId,
    deletion_request_id: requestId,
    anonymized_at: nowIso,
  })
}
