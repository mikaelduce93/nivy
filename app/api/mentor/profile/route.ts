import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/mentor/profile — fetch the authenticated mentor's profile.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("mentors")
    .select(`
      id, user_id, expertise_tags, years_experience, bio, intro_video_url,
      hourly_rate_dh, free_intro_session, status, kyc_status,
      age_min_mentee, age_max_mentee, rating, sessions_count,
      approved_by, approved_at, created_at
    `)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "mentor_profile_not_found" }, { status: 404 })
  return NextResponse.json({ profile: data })
}

// PATCH /api/mentor/profile — update editable mentor fields.
// RLS policy `mentors_self_update` (migration 059) gates this to user_id=auth.uid().
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))

  const patch: Record<string, unknown> = {}
  if (Array.isArray(body.expertise_tags)) {
    patch.expertise_tags = body.expertise_tags.filter((t: unknown) => typeof t === "string")
  }
  if (typeof body.bio === "string" || body.bio === null) {
    patch.bio = body.bio
  }
  if (body.hourly_rate_dh !== undefined) {
    const n = Number(body.hourly_rate_dh)
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: "invalid_hourly_rate_dh" }, { status: 400 })
    }
    patch.hourly_rate_dh = n
  }
  if (typeof body.free_intro_session === "boolean") {
    patch.free_intro_session = body.free_intro_session
  }
  if (body.age_min_mentee !== undefined) {
    const n = Number(body.age_min_mentee)
    if (!Number.isInteger(n) || n < 13 || n > 17) {
      return NextResponse.json({ error: "invalid_age_min_mentee" }, { status: 400 })
    }
    patch.age_min_mentee = n
  }
  if (body.age_max_mentee !== undefined) {
    const n = Number(body.age_max_mentee)
    if (!Number.isInteger(n) || n < 13 || n > 17) {
      return NextResponse.json({ error: "invalid_age_max_mentee" }, { status: 400 })
    }
    patch.age_max_mentee = n
  }
  if (body.years_experience !== undefined) {
    const n = Number(body.years_experience)
    if (!Number.isInteger(n) || n < 0) {
      return NextResponse.json({ error: "invalid_years_experience" }, { status: 400 })
    }
    patch.years_experience = n
  }
  if (typeof body.intro_video_url === "string" || body.intro_video_url === null) {
    patch.intro_video_url = body.intro_video_url
  }

  if (
    typeof patch.age_min_mentee === "number" &&
    typeof patch.age_max_mentee === "number" &&
    (patch.age_min_mentee as number) > (patch.age_max_mentee as number)
  ) {
    return NextResponse.json({ error: "age_min_greater_than_age_max" }, { status: 400 })
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no_fields_to_update" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("mentors")
    .update(patch)
    .eq("user_id", user.id)
    .select(`
      id, expertise_tags, years_experience, bio, intro_video_url,
      hourly_rate_dh, free_intro_session, age_min_mentee, age_max_mentee
    `)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, profile: data })
}
