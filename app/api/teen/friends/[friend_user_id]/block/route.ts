/**
 * POST   /api/teen/friends/[friend_user_id]/block — block a friend (delegates to canonical).
 * DELETE /api/teen/friends/[friend_user_id]/block — unblock.
 *
 * Both routes thin-wrap /api/teen/block (the canonical universal endpoint)
 * via the same RPC `block_user_v2` so behavior is identical.
 *
 * Canon §3 + §8 + §11 row 5 (MISSING — must build).
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ friend_user_id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { friend_user_id } = await params
  if (!friend_user_id) {
    return NextResponse.json({ error: "friend_user_id required" }, { status: 400 })
  }
  if (friend_user_id === user.id) {
    return NextResponse.json(
      { error: "Tu ne peux pas te bloquer toi-même" },
      { status: 400 }
    )
  }

  let reason: string | undefined
  try {
    const body = await request.json()
    reason = typeof body?.reason === "string" ? body.reason : undefined
  } catch {
    /* no body — fine */
  }

  const { data, error } = await supabase.rpc("block_user_v2", {
    p_blocker: user.id,
    p_blocked: friend_user_id,
    p_reason: reason ?? null,
  })

  if (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }

  return NextResponse.json({ success: true, block_id: data ?? null }, { status: 201 })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ friend_user_id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { friend_user_id } = await params
  if (!friend_user_id) {
    return NextResponse.json({ error: "friend_user_id required" }, { status: 400 })
  }

  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", friend_user_id)

  if (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
