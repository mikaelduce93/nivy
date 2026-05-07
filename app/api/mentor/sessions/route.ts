import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/mentor/sessions
// Returns the authenticated mentor's sessions (RLS already restricts to the
// mentor's own rows via mentors.user_id = auth.uid()).
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: mentor, error: mentorErr } = await supabase
    .from("mentors")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (mentorErr) return NextResponse.json({ error: mentorErr.message }, { status: 500 })
  if (!mentor) return NextResponse.json({ sessions: [] })

  const url = new URL(request.url)
  const status = url.searchParams.get("status")

  let q = supabase
    .from("mentor_sessions")
    .select(`
      id, mentor_id, mentee_user_id, scheduled_for, duration_minutes,
      meeting_url, meeting_provider, status, parent_approval_id,
      amount_dh, amount_coins, is_intro, parent_attended, recorded,
      rating_by_mentee, rating_by_mentor, notes,
      created_at, completed_at, cancelled_at
    `)
    .eq("mentor_id", mentor.id)
    .order("scheduled_for", { ascending: false })
    .limit(200)

  if (status) {
    q = q.eq("status", status)
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sessions: data ?? [] })
}
