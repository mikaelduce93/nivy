import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const expertise: string[] = Array.isArray(body.expertise) ? body.expertise : []
  const bio: string | null = body.bio ?? null
  const hourly_rate: number = Number(body.hourly_rate ?? 0)

  const { data, error } = await supabase.rpc("apply_mentor", {
    p_user_id: user.id,
    p_expertise: expertise,
    p_bio: bio,
    p_hourly_rate: hourly_rate,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
