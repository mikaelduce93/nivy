import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") {
    return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
  }

  const admin = createServiceRoleClient()

  // Confirm ownership before delegating to the RPC (RPC also re-checks).
  const { data: goal } = await admin
    .from("savings_goals")
    .select("teen_id, status")
    .eq("id", id)
    .maybeSingle()
  if (!goal || goal.teen_id !== userInfo.profileId) {
    return NextResponse.json(
      { success: false, error: "Goal introuvable" },
      { status: 404 }
    )
  }

  const { data, error } = await admin.rpc("release_from_goal", {
    p_goal_id: id,
    p_reason: "cancelled",
  })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  if (!data?.success) {
    return NextResponse.json(
      { success: false, error: data?.error ?? "cancel_failed", data },
      { status: 400 }
    )
  }
  return NextResponse.json({ success: true, data })
}
