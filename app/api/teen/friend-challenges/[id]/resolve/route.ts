/**
 * Wave 2 / TICKET-019 (FD1) — manually resolve a friend challenge.
 * POST /api/teen/friend-challenges/[id]/resolve
 *
 * Caller must be a participant. RPC enforces "too_early" gate: callable only
 * after ends_at is reached OR one side hit target_value. The FD4 cron
 * (app/api/cron/friend-challenge-resolve) calls the same RPC for batch sweeps.
 *
 * Wraps RPC resolve_friend_challenge_v2 (mig 078).
 */
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
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

    const supabase = await createClient()
    const { data, error } = await supabase.rpc("resolve_friend_challenge_v2", {
      p_challenge_id: id,
    })

    if (error) {
      console.error("[teen/friend-challenges/resolve] rpc error:", error)
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
  } catch (err) {
    console.error("[teen/friend-challenges/resolve] unexpected:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "server_error" },
      { status: 500 }
    )
  }
}
