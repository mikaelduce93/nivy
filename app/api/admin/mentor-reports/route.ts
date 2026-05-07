/**
 * V1.2 — Admin: list mentor session reports for moderation.
 *
 * GET /api/admin/mentor-reports?status=open|dismissed|resolved_strike|resolved_no_action&limit=50
 *
 * Returns: { ok, reports: [...] } — joins minimal session/mentor info.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const VALID_STATUS = new Set([
  "open",
  "dismissed",
  "resolved_strike",
  "resolved_no_action",
])

export async function GET(req: Request) {
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

  const url = new URL(req.url)
  const statusParam = url.searchParams.get("status")
  const status = statusParam && VALID_STATUS.has(statusParam) ? statusParam : null
  const rawLimit = Number(url.searchParams.get("limit") ?? "50")
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(1, rawLimit), 200) : 50

  let q = sr
    .from("mentor_session_reports")
    .select(
      "id, session_id, reporter_user_id, reporter_role, category, description, status, resolution_note, resolved_by, resolved_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit)

  if (status) q = q.eq("status", status)

  const { data: reports, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  // Enrich: pull session+mentor info so admins see who is involved.
  const sessionIds = Array.from(new Set((reports ?? []).map((r) => r.session_id)))
  const sessionsById = new Map<
    string,
    { id: string; mentor_id: string; mentee_user_id: string; scheduled_for: string; status: string }
  >()
  if (sessionIds.length) {
    const { data: sessions } = await sr
      .from("mentor_sessions")
      .select("id, mentor_id, mentee_user_id, scheduled_for, status")
      .in("id", sessionIds)
    for (const s of sessions ?? []) sessionsById.set(s.id, s)
  }

  const mentorIds = Array.from(
    new Set(Array.from(sessionsById.values()).map((s) => s.mentor_id)),
  )
  const mentorsById = new Map<string, { id: string; user_id: string | null; status: string }>()
  if (mentorIds.length) {
    const { data: mentors } = await sr
      .from("mentors")
      .select("id, user_id, status")
      .in("id", mentorIds)
    for (const m of mentors ?? []) mentorsById.set(m.id, m)
  }

  const enriched = (reports ?? []).map((r) => {
    const session = sessionsById.get(r.session_id) ?? null
    const mentor = session ? mentorsById.get(session.mentor_id) ?? null : null
    return {
      ...r,
      session,
      mentor,
    }
  })

  return NextResponse.json({ ok: true, reports: enriched, count: enriched.length })
}
