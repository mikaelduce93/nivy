/**
 * Wave 3 — TICKET-008: Approve / reject an AI-generated quiz pending review.
 *
 * POST /api/admin/content/review/:id
 *   body: { action: 'approve' } | { action: 'reject', reason: string }
 *
 * Side-effects:
 *   - approve → educational_quizzes.is_active = true (quiz goes live)
 *   - reject  → educational_quizzes.is_active stays false; rejection logged
 *               in admin_audit_logs with reason
 *   - both    → admin_audit_logs INSERT (action='content.review.approve' or
 *               'content.review.reject', target_type='educational_quizzes')
 *
 * Auth: requires admin/super_admin/moderator role in admin_roles.
 * Scope: only quizzes with code LIKE 'AI_%' (ticket constraint).
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ADMIN_ROLES = new Set(["admin", "super_admin", "moderator"])

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  // 1. Auth gate
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

  // 2. Parse body
  let body: { action?: unknown; reason?: unknown }
  try {
    body = (await req.json()) as { action?: unknown; reason?: unknown }
  } catch {
    return NextResponse.json({ success: false, error: "invalid_json" }, { status: 400 })
  }
  const action = typeof body.action === "string" ? body.action : null
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ success: false, error: "invalid_action" }, { status: 400 })
  }

  // 3. Fetch quiz, verify it's an AI-generated pending row
  const { data: quiz, error: fetchErr } = await sr
    .from("educational_quizzes")
    .select("id, code, is_active, title")
    .eq("id", id)
    .maybeSingle()
  if (fetchErr) {
    return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 })
  }
  if (!quiz) {
    return NextResponse.json({ success: false, error: "not_found" }, { status: 404 })
  }
  if (!quiz.code || !quiz.code.startsWith("AI_")) {
    return NextResponse.json({ success: false, error: "not_ai_generated" }, { status: 400 })
  }
  if (quiz.is_active === true) {
    return NextResponse.json(
      { success: false, error: "already_active" },
      { status: 400 },
    )
  }

  // 4. Apply decision
  if (action === "approve") {
    const { error: upErr } = await sr
      .from("educational_quizzes")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("id", id)
    if (upErr) {
      return NextResponse.json({ success: false, error: upErr.message }, { status: 500 })
    }

    await sr.from("admin_audit_logs").insert({
      user_id: user.id,
      action: "content.review.approve",
      target_type: "educational_quizzes",
      target_id: id,
      payload: { code: quiz.code, title: quiz.title },
    })

    return NextResponse.json({ success: true, id, status: "approved" })
  }

  // action === 'reject'
  const reason = typeof body.reason === "string" ? body.reason.trim() : ""
  if (!reason) {
    return NextResponse.json({ success: false, error: "reason_required" }, { status: 400 })
  }

  // is_active stays false; we just log the rejection.
  await sr.from("admin_audit_logs").insert({
    user_id: user.id,
    action: "content.review.reject",
    target_type: "educational_quizzes",
    target_id: id,
    payload: { code: quiz.code, title: quiz.title, reason },
  })

  return NextResponse.json({ success: true, id, status: "rejected" })
}
