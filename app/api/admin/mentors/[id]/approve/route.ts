import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NextResponse } from "next/server"

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase.rpc("admin_approve_mentor", {
    p_mentor_id: id,
    p_admin_user_id: user.id,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const j = data as { success?: boolean } | null
  if (!j?.success) return NextResponse.json(j ?? { error: "failed" }, { status: 400 })

  // Wave 6B — flip profiles.is_onboarded=true so the middleware onboarding
  // gate stops looping the approved mentor on /mentor/onboarding/kyc. The
  // RPC handles the mentors.kyc_status flip but doesn't touch profiles
  // (canonical service-role mutation lives in app code per canon §6).
  const sr = createServiceRoleClient()
  const { data: mentorRow } = await sr
    .from("mentors")
    .select("user_id")
    .eq("id", id)
    .maybeSingle()
  if (mentorRow?.user_id) {
    await sr
      .from("profiles")
      .update({ is_onboarded: true })
      .eq("id", mentorRow.user_id)
  }

  return NextResponse.json(data)
}
