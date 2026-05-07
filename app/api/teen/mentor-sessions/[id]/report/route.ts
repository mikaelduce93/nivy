/**
 * V1.2 — Teen reports a mentor session.
 *
 * POST /api/teen/mentor-sessions/:id/report
 *   body: {
 *     category: 'inappropriate' | 'late' | 'no_show' | 'safety',
 *     description?: string   // optional, ≤ 2000 chars
 *   }
 *
 * Auth: cookie session must own the session as mentee_user_id.
 * Insert goes through service role AFTER ownership verification, but a
 * matching INSERT policy on `mentor_session_reports` also gates same-user
 * direct calls.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const CATEGORIES = new Set(["inappropriate", "late", "no_show", "safety"])

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

  const body = (await req.json().catch(() => ({}))) as {
    category?: unknown
    description?: unknown
  }
  const category = typeof body.category === "string" ? body.category : ""
  if (!CATEGORIES.has(category)) {
    return NextResponse.json({ ok: false, error: "invalid_category" }, { status: 400 })
  }
  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim().slice(0, 2000)
      : null

  // Ownership verification: caller must be the mentee on the session.
  const sr = createServiceRoleClient()
  const { data: session, error: sErr } = await sr
    .from("mentor_sessions")
    .select("id, mentee_user_id, mentor_id")
    .eq("id", id)
    .maybeSingle()
  if (sErr) return NextResponse.json({ ok: false, error: sErr.message }, { status: 500 })
  if (!session) {
    return NextResponse.json({ ok: false, error: "session_not_found" }, { status: 404 })
  }
  if (session.mentee_user_id !== user.id) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 })
  }

  const { data: row, error: insErr } = await sr
    .from("mentor_session_reports")
    .insert({
      session_id: id,
      reporter_user_id: user.id,
      reporter_role: "teen",
      category,
      description,
      status: "open",
    })
    .select("id, created_at")
    .single()
  if (insErr) {
    return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    report_id: row.id,
    session_id: id,
    status: "open",
    created_at: row.created_at,
  })
}
