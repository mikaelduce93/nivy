import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const tag = searchParams.get("tag")
  const minRating = searchParams.get("min_rating")

  let q = supabase
    .from("mentors")
    .select("id, expertise_tags, years_experience, bio, hourly_rate_dh, free_intro_session, age_min_mentee, age_max_mentee, rating, sessions_count")
    .eq("status", "active")
    .eq("kyc_status", "approved")

  if (tag) q = q.contains("expertise_tags", [tag])
  if (minRating) q = q.gte("rating", Number(minRating))

  const { data, error } = await q.order("rating", { ascending: false, nullsFirst: false }).limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ mentors: data ?? [] })
}
