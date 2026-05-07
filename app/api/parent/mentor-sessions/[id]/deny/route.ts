import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const reason: string | null = body.reason ?? null

  const { data, error } = await supabase.rpc("parent_deny_session", {
    p_session_id: id,
    p_parent_id: user.id,
    p_reason: reason,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const j = data as { success?: boolean } | null
  if (!j?.success) return NextResponse.json(j ?? { error: "failed" }, { status: 400 })
  return NextResponse.json(data)
}
