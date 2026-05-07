import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // RLS already restricts to linked parent.
  const { data, error } = await supabase
    .from("mentor_sessions")
    .select(`
      id, mentor_id, mentee_user_id, scheduled_for, duration_minutes,
      meeting_url, meeting_provider, status, parent_approval_id,
      amount_dh, amount_coins, is_intro, parent_attended, recorded,
      created_at, completed_at, cancelled_at,
      mentor:mentor_id ( id, expertise_tags, bio, hourly_rate_dh, rating )
    `)
    .order("scheduled_for", { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sessions: data ?? [] })
}
