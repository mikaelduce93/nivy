/**
 * V1.2 — Admin: close an internship to new applications.
 *
 * POST /api/admin/internships/:id/close
 *
 * Side-effects:
 *   - internships.status   → 'closed'
 *   - admin_audit_logs     → INSERT (§29.8)
 *
 * Idempotent-ish: returns 400 if the internship is already closed/filled/
 * cancelled, so admins don't accidentally re-stamp audit rows.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
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

  const { data: internship, error: iErr } = await sr
    .from("internships")
    .select("id, status, title")
    .eq("id", id)
    .maybeSingle()
  if (iErr) return NextResponse.json({ ok: false, error: iErr.message }, { status: 500 })
  if (!internship) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 })
  if (internship.status !== "open" && internship.status !== "draft") {
    return NextResponse.json(
      { ok: false, error: "not_open", current_status: internship.status },
      { status: 400 },
    )
  }

  const { error: upErr } = await sr
    .from("internships")
    .update({ status: "closed" })
    .eq("id", id)
  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 })

  await sr.from("admin_audit_logs").insert({
    user_id: user.id,
    action: "internship.close",
    target_type: "internship",
    target_id: id,
    payload: { previous_status: internship.status, title: internship.title },
  })

  return NextResponse.json({ ok: true, internship_id: id, status: "closed" })
}
