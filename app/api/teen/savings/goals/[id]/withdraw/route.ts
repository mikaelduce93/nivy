/**
 * Wave 2B / canon §10 — terminal savings redemption.
 * POST /api/teen/savings/goals/:id/withdraw
 *
 * Body: { destination?: 'spendable' }   // defaults to 'spendable'
 *
 * Wraps SECURITY DEFINER RPC `withdraw_from_goal` (mig 098). The RPC enforces
 * ownership (auth.uid() == goal.teen_id) and the `status='achieved'` precondition;
 * unlocks goal coins by flipping the row to status='withdrawn'.
 */
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") {
    return NextResponse.json(
      { success: false, error: "unauthenticated" },
      { status: 401 }
    )
  }

  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json(
      { success: false, error: "id required" },
      { status: 400 }
    )
  }

  let body: { destination?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const destination = body.destination ?? "spendable"

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("withdraw_from_goal", {
    p_goal_id: id,
    p_destination: destination,
    p_metadata: {},
  })

  if (error) {
    console.error("[teen/savings/withdraw] rpc error:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }

  const result = data as { success?: boolean; error?: string } | null
  if (!result?.success) {
    return NextResponse.json(
      { success: false, error: result?.error ?? "rpc_failed", detail: result },
      { status: 400 }
    )
  }

  return NextResponse.json(result)
}
