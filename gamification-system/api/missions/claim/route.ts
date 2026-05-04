/**
 * TEENS PARTY MOROCCO - Mission Claim API Route
 * ==============================================
 *
 * API endpoint pour réclamer les récompenses de mission.
 */

import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

/* ==========================================================================
   POST /api/missions/claim
   Réclame la récompense d'une mission complétée
   ========================================================================== */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { user_mission_id } = body

    if (!user_mission_id) {
      return NextResponse.json(
        { error: "user_mission_id requis" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase.rpc("claim_mission_rewards", {
      p_user_id: user.id,
      p_user_mission_id: user_mission_id,
    })

    if (error) {
      console.error("Error claiming mission reward:", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!data?.success) {
      return NextResponse.json(
        { error: "Impossible de réclamer la récompense" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      xp_earned: data.xp_earned || 0,
      bonus_reward: data.bonus_reward || null,
    })
  } catch (error) {
    console.error("Error in POST /api/missions/claim:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
