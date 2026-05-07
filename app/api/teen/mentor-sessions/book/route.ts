import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { mentor_id, scheduled_for, duration_minutes, consent_recorded } = body
  if (!mentor_id || !scheduled_for) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 })
  }

  // V1.2-A: consent_recorded gate. Migration 065 added the optional 5th
  // arg with DEFAULT FALSE so omitting it stays backward-compatible.
  const { data, error } = await supabase.rpc("book_mentor_session", {
    p_mentor_id: mentor_id,
    p_mentee_user_id: user.id,
    p_scheduled_for: scheduled_for,
    p_duration_minutes: Number(duration_minutes ?? 30),
    p_consent_recorded: Boolean(consent_recorded),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const j = data as { success?: boolean; error?: string } | null
  if (!j?.success) return NextResponse.json(j ?? { error: "failed" }, { status: 400 })
  return NextResponse.json(data)
}
