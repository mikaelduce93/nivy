import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: pathways, error } = await supabase
    .from("career_pathways")
    .select("id, slug, title, description, icon, category, recommended_mentor_tags")
    .eq("is_active", true)
    .order("title")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let progress: Record<string, { milestones_completed: number; total_milestones: number; declared_interest_at: string }> = {}
  if (user) {
    const { data: prog } = await supabase
      .from("teen_pathway_progress")
      .select("pathway_id, milestones_completed, total_milestones, declared_interest_at")
      .eq("teen_id", user.id)
    for (const p of prog ?? []) {
      progress[p.pathway_id] = {
        milestones_completed: p.milestones_completed,
        total_milestones: p.total_milestones,
        declared_interest_at: p.declared_interest_at,
      }
    }
  }

  return NextResponse.json({
    pathways: (pathways ?? []).map(p => ({ ...p, progress: progress[p.id] ?? null })),
  })
}
