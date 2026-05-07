import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * Decide an internship application.
 * The path param :id is the application_id.
 * Body: { decision: 'accepted'|'rejected'|'shortlisted', notes?: string }
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const decision: string = body.decision
  const notes: string | null = body.notes ?? null
  if (!["accepted", "rejected", "shortlisted"].includes(decision)) {
    return NextResponse.json({ error: "invalid_decision" }, { status: 400 })
  }

  const { data, error } = await supabase.rpc("decide_internship_application", {
    p_application_id: id,
    p_decider_id: user.id,
    p_decision: decision,
    p_notes: notes,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const j = data as { success?: boolean } | null
  if (!j?.success) return NextResponse.json(j ?? { error: "failed" }, { status: 400 })
  return NextResponse.json(data)
}
