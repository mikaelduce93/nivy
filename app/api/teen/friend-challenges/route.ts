/**
 * Wave 2 / TICKET-019 (FD1) — Friend Challenges v2 API.
 *
 *   GET  /api/teen/friend-challenges
 *        List the caller's friend challenges (creator OR opponent), most-recent first.
 *        Optional ?status=pending|active|completed|cancelled|expired
 *        Optional ?role=creator|opponent (default: both)
 *
 *   POST /api/teen/friend-challenges
 *        Create a v2 friend challenge. Caller is the challenger.
 *        Body: {
 *          opponentId, challengeKind, rules?, name?, targetValue?,
 *          durationHours?, xpStake?, expiresInHours?
 *        }
 *
 * Mutations call SECURITY DEFINER RPC create_friend_challenge_v2 (mig 078)
 * via the user-bound Supabase client so auth.uid() resolves to the teen.
 */
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface CreateBody {
  opponentId?: string
  challengeKind?:
    | "quiz_battle"
    | "mission_race"
    | "physical_count"
    | "streak_race"
    | "xp_duel"
    | "custom"
  rules?: Record<string, unknown> | null
  name?: string | null
  targetValue?: number | null
  durationHours?: number | null
  xpStake?: number | null
  expiresInHours?: number | null
}

export async function GET(request: Request) {
  try {
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "teen") {
      return NextResponse.json(
        { success: false, error: "unauthenticated" },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const status = url.searchParams.get("status")
    const role = url.searchParams.get("role") // creator | opponent | null

    const supabase = await createClient()
    const teenId = userInfo.profileId

    let query = supabase
      .from("friend_challenges")
      .select(
        "id, creator_id, opponent_id, name, challenge_kind, rules, target_value, " +
          "starts_at, ends_at, status, acceptance_status, " +
          "progress_creator, progress_opponent, xp_pot, " +
          "accepted_at, completed_at, expires_at, winner_id, is_draw, evidence_url, " +
          "created_at, updated_at"
      )
      .order("updated_at", { ascending: false })
      .limit(100)

    if (role === "creator") {
      query = query.eq("creator_id", teenId)
    } else if (role === "opponent") {
      query = query.eq("opponent_id", teenId)
    } else {
      query = query.or(`creator_id.eq.${teenId},opponent_id.eq.${teenId}`)
    }

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query
    if (error) {
      console.error("[teen/friend-challenges:GET] query error:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, challenges: data ?? [] })
  } catch (err) {
    console.error("[teen/friend-challenges:GET] unexpected:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "server_error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "teen") {
      return NextResponse.json(
        { success: false, error: "unauthenticated" },
        { status: 401 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as CreateBody
    if (!body.opponentId) {
      return NextResponse.json(
        { success: false, error: "opponentId required" },
        { status: 400 }
      )
    }
    if (!body.challengeKind) {
      return NextResponse.json(
        { success: false, error: "challengeKind required" },
        { status: 400 }
      )
    }
    if (body.opponentId === userInfo.profileId) {
      return NextResponse.json(
        { success: false, error: "cannot challenge yourself" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data, error } = await supabase.rpc("create_friend_challenge_v2", {
      p_opponent_id: body.opponentId,
      p_challenge_kind: body.challengeKind,
      p_rules: body.rules ?? {},
      p_name: body.name ?? null,
      p_target_value: body.targetValue ?? null,
      p_duration_hours: body.durationHours ?? 168,
      p_xp_stake: body.xpStake ?? 0,
      p_expires_in_hours: body.expiresInHours ?? 48,
    })

    if (error) {
      console.error("[teen/friend-challenges:POST] rpc error:", error)
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
    console.error("[teen/friend-challenges:POST] unexpected:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "server_error" },
      { status: 500 }
    )
  }
}
