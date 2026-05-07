import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("mentors")
    .select("id, expertise_tags, years_experience, bio, intro_video_url, hourly_rate_dh, free_intro_session, age_min_mentee, age_max_mentee, rating, sessions_count, status, kyc_status")
    .eq("id", id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.status !== "active") return NextResponse.json({ error: "not_found" }, { status: 404 })
  return NextResponse.json({ mentor: data })
}
