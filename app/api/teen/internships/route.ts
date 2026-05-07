import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const ageRaw = searchParams.get("age")

  let q = supabase
    .from("internships")
    .select("id, partner_id, title, description, duration, age_min, age_max, application_deadline, spots_total, spots_taken, paid, stipend_dh, required_skills, status")
    .eq("status", "open")
    .order("application_deadline", { ascending: true, nullsFirst: false })
    .limit(50)

  if (ageRaw) {
    const age = Number(ageRaw)
    q = q.lte("age_min", age).gte("age_max", age)
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ internships: data ?? [] })
}
