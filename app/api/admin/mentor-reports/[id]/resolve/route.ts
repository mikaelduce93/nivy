/**
 * V1.2 — Admin: resolve a mentor session report.
 *
 * POST /api/admin/mentor-reports/:id/resolve
 *   body: {
 *     decision: 'dismissed' | 'resolved_no_action' | 'resolved_strike',
 *     note?: string,
 *     // strike-only fields:
 *     severity?: 'low' | 'medium' | 'high',
 *     reason?: string
 *   }
 *
 * Side-effects:
 *   - mentor_session_reports.status        → decision
 *   - mentor_session_reports.resolved_by   → admin id
 *   - mentor_session_reports.resolved_at   → now
 *   - mentor_session_reports.resolution_note → note
 *   - admin_audit_logs                     → INSERT
 *   - if decision == 'resolved_strike':
 *       INSERT INTO mentor_strikes (...)  (graceful no-op if migration 064
 *       has not yet been applied — caller is informed via response flag)
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const DECISIONS = new Set(["dismissed", "resolved_no_action", "resolved_strike"])
const SEVERITIES = new Set(["low", "medium", "high"])

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 })
  }

  const sr = createServiceRoleClient()
  const { data: role } = await sr
    .from("admin_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle()
  if (!role || !["admin", "super_admin", "moderator"].includes(role.role)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const decision = typeof body.decision === "string" ? body.decision : ""
  if (!DECISIONS.has(decision)) {
    return NextResponse.json({ ok: false, error: "invalid_decision" }, { status: 400 })
  }
  const note =
    typeof body.note === "string" && body.note.trim()
      ? body.note.trim().slice(0, 2000)
      : null
  const severity =
    typeof body.severity === "string" && SEVERITIES.has(body.severity)
      ? body.severity
      : "medium"
  const strikeReason =
    typeof body.reason === "string" && body.reason.trim()
      ? body.reason.trim().slice(0, 1000)
      : null

  if (decision === "resolved_strike" && !strikeReason) {
    return NextResponse.json(
      { ok: false, error: "strike_reason_required" },
      { status: 400 },
    )
  }

  // Fetch the report + the session it's against
  const { data: report, error: rErr } = await sr
    .from("mentor_session_reports")
    .select("id, session_id, reporter_user_id, status")
    .eq("id", id)
    .maybeSingle()
  if (rErr) return NextResponse.json({ ok: false, error: rErr.message }, { status: 500 })
  if (!report) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 })
  if (report.status !== "open") {
    return NextResponse.json(
      { ok: false, error: "already_resolved", current_status: report.status },
      { status: 400 },
    )
  }

  const { data: session, error: sErr } = await sr
    .from("mentor_sessions")
    .select("id, mentor_id")
    .eq("id", report.session_id)
    .maybeSingle()
  if (sErr) return NextResponse.json({ ok: false, error: sErr.message }, { status: 500 })
  if (!session) {
    return NextResponse.json({ ok: false, error: "session_missing" }, { status: 500 })
  }

  const nowIso = new Date().toISOString()
  let strikeId: string | null = null
  let strikesTableMissing = false

  // 1. If a strike was decided, try to insert it FIRST. If the table is
  //    missing (migration 064 not yet applied) we degrade gracefully.
  if (decision === "resolved_strike") {
    try {
      const { data: strike, error: stErr } = await sr
        .from("mentor_strikes")
        .insert({
          mentor_id: session.mentor_id,
          reporter_id: report.reporter_user_id,
          reason: strikeReason,
          severity,
          status: "active",
          related_session: session.id,
          notes: note,
        })
        .select("id")
        .single()
      if (stErr) {
        // Heuristic: undefined_table → 42P01.
        // postgrest-js surfaces .code on the error.
        const code = (stErr as { code?: string }).code
        if (code === "42P01" || /relation .* does not exist/i.test(stErr.message)) {
          strikesTableMissing = true
        } else {
          return NextResponse.json({ ok: false, error: stErr.message }, { status: 500 })
        }
      } else {
        strikeId = strike?.id ?? null
      }
    } catch {
      strikesTableMissing = true
    }
  }

  // 2. Mark the report resolved.
  const { error: upErr } = await sr
    .from("mentor_session_reports")
    .update({
      status: decision,
      resolution_note: note,
      resolved_by: user.id,
      resolved_at: nowIso,
    })
    .eq("id", id)
  if (upErr) {
    return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 })
  }

  // 3. Audit log
  await sr.from("admin_audit_logs").insert({
    user_id: user.id,
    action: "mentor_report.resolve",
    target_type: "mentor_session_report",
    target_id: id,
    payload: {
      decision,
      session_id: session.id,
      mentor_id: session.mentor_id,
      strike_id: strikeId,
      strikes_table_missing: strikesTableMissing,
      severity: decision === "resolved_strike" ? severity : null,
    },
  })

  return NextResponse.json({
    ok: true,
    report_id: id,
    status: decision,
    strike_id: strikeId,
    strikes_table_missing: strikesTableMissing,
  })
}
