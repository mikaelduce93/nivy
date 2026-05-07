/**
 * V1.2 — Mentor marks a session as completed.
 *
 * POST /api/mentor/sessions/:id/complete
 *
 * Calls the SECURITY DEFINER RPC `mentor_complete_session(p_session_id)`
 * (migration 065). The RPC enforces:
 *   - caller is the mentor on the session (mentors.user_id = auth.uid())
 *   - session.status is currently 'approved' or 'dispatched'
 *   - sets status='completed', completed_at=NOW()
 *   - bumps mentors.sessions_count
 *   - emits a teen rating-nudge notification
 */
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 })

  const { data, error } = await supabase.rpc("mentor_complete_session", {
    p_session_id: id,
  })
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  const j = data as { success?: boolean; error?: string } | null
  if (!j?.success) {
    const errCode = j?.error ?? "failed"
    const status =
      errCode === "session_not_found"
        ? 404
        : errCode === "unauthorized_caller" || errCode === "unauthenticated"
          ? 403
          : 400
    return NextResponse.json({ ok: false, ...j }, { status })
  }
  return NextResponse.json({ ok: true, ...j })
}
