import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const cover_letter: string | null = body.cover_letter ?? null
  const portfolio_urls: string[] = Array.isArray(body.portfolio_urls) ? body.portfolio_urls : []

  const { data, error } = await supabase.rpc("apply_to_internship", {
    p_internship_id: id,
    p_applicant_id: user.id,
    p_cover_letter: cover_letter,
    p_portfolio_urls: portfolio_urls,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const j = data as { success?: boolean } | null
  if (!j?.success) return NextResponse.json(j ?? { error: "failed" }, { status: 400 })
  return NextResponse.json(data)
}
