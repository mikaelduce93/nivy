import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(_request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: pathway, error: pathErr } = await supabase
    .from("career_pathways")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle()
  if (pathErr || !pathway) return NextResponse.json({ error: "pathway_not_found" }, { status: 404 })

  const { error } = await supabase
    .from("teen_pathway_progress")
    .upsert({
      teen_id: user.id,
      pathway_id: pathway.id,
      last_active_at: new Date().toISOString(),
    }, { onConflict: "teen_id,pathway_id" })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, pathway_id: pathway.id })
}
