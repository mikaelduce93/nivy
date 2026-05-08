/**
 * Wave 2 / TICKET-019 (FD1) — record progress on a friend challenge.
 * POST /api/teen/friend-challenges/[id]/progress
 *
 * Caller must be creator or opponent of an active challenge.
 * Body: { delta?: number, metadata?: object }
 *
 * Wraps RPC record_friend_challenge_progress_v2 (mig 078). The RPC mirrors
 * the participant's score back into friend_challenges.progress_creator /
 * progress_opponent so list views stay cheap.
 */
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface ProgressBody {
  delta?: number
  metadata?: Record<string, unknown> | null
}

export async function POST(
  request: Request,
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

    const body = (await request.json().catch(() => ({}))) as ProgressBody
    const delta = typeof body.delta === "number" && Number.isFinite(body.delta)
      ? Math.max(0, Math.floor(body.delta))
      : 1

    const supabase = await createClient()
    const { data, error } = await supabase.rpc(
      "record_friend_challenge_progress_v2",
      {
        p_challenge_id: id,
        p_delta: delta,
        p_metadata: body.metadata ?? {},
      }
    )

    if (error) {
      console.error("[teen/friend-challenges/progress] rpc error:", error)
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
    console.error("[teen/friend-challenges/progress] unexpected:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "server_error" },
      { status: 500 }
    )
  }
}
