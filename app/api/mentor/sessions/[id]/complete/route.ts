import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// POST /api/mentor/sessions/[id]/complete
// Marks an approved mentor session as completed.
//
// NOTE: there is no dedicated `complete_mentor_session` RPC in
// gamification-system/database/migrations/059_mentorship_career_rpcs.sql today.
// We do an RLS-bounded UPDATE here: the mentor_sessions RLS policy already
// restricts visibility to the owning mentor (m.user_id = auth.uid()), and the
// `mentors_self_update` policy lets the mentor mutate their own row. For
// mentor_sessions itself there is currently no mentor-side UPDATE policy,
// so this endpoint will fail at RLS until a follow-up RPC
// (`mentor_complete_session(session_id)`) is added. Wired here so the UI is
// ready; backend can swap the implementation without changing the route.
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Ownership check via mentors table (defense in depth on top of RLS).
  const { data: mentor } = await supabase
    .from("mentors")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (!mentor) return NextResponse.json({ error: "not_a_mentor" }, { status: 403 })

  const { data: session, error: sErr } = await supabase
    .from("mentor_sessions")
    .select("id, mentor_id, status")
    .eq("id", id)
    .limit(1)
    .maybeSingle()

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })
  if (!session) return NextResponse.json({ error: "session_not_found" }, { status: 404 })
  if (session.mentor_id !== mentor.id) {
    return NextResponse.json({ error: "not_session_owner" }, { status: 403 })
  }
  if (session.status !== "approved" && session.status !== "dispatched") {
    return NextResponse.json({ error: "session_not_in_completable_state", status: session.status }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("mentor_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, status, completed_at")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message, hint: "RLS may block this until a mentor_complete_session RPC is added (see migration 059)." }, { status: 500 })
  return NextResponse.json({ success: true, session: data })
}
