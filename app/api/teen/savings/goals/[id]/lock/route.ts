import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") {
    return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
  }

  const body = (await request.json()) as { amount_coins?: number }
  const amount = Number(body.amount_coins)
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { success: false, error: "amount_coins requis" },
      { status: 400 }
    )
  }

  const admin = createServiceRoleClient()
  const { data, error } = await admin.rpc("lock_to_goal", {
    p_teen_id: userInfo.profileId,
    p_goal_id: id,
    p_amount: Math.floor(amount),
  })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  if (!data?.success) {
    return NextResponse.json(
      { success: false, error: data?.error ?? "lock_failed", data },
      { status: 400 }
    )
  }
  return NextResponse.json({ success: true, data })
}
