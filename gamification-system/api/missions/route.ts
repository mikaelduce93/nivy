/**
 * TEENS PARTY MOROCCO - Missions API Routes
 * ==========================================
 *
 * API endpoints pour le système de missions.
 */

import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import {
  GetMissionsInputSchema,
  calculateProgressPercentage,
  getTimeRemaining,
  isMissionNew,
} from "../../features/missions/schema"

/* ==========================================================================
   GET /api/missions
   Récupère les missions de l'utilisateur
   ========================================================================== */

export async function GET(request: NextRequest) {
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

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type") || undefined
    const status = searchParams.get("status") || undefined
    const category = searchParams.get("category") || undefined
    const includeExpired = searchParams.get("includeExpired") === "true"

    // Validate input
    const validatedInput = GetMissionsInputSchema.safeParse({
      type,
      status,
      category,
      includeExpired,
    })

    if (!validatedInput.success) {
      return NextResponse.json(
        { error: "Paramètres invalides", details: validatedInput.error.errors },
        { status: 400 }
      )
    }

    // Call Supabase function
    const { data, error } = await supabase.rpc("get_user_missions", {
      p_user_id: user.id,
      p_type: validatedInput.data.type || null,
      p_status: validatedInput.data.status || null,
      p_include_expired: validatedInput.data.includeExpired,
    })

    if (error) {
      console.error("Error fetching missions:", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Transform data
    const missions = (data || []).map((m: any) => ({
      id: m.mission_id,
      user_mission_id: m.user_mission_id,
      type: m.type,
      category: m.category,
      name: m.name,
      description: m.description,
      icon: m.icon,
      xp_reward: m.xp_reward,
      bonus_reward: m.bonus_reward,
      target_count: m.target_count,
      current_progress: m.current_progress || 0,
      status: m.status,
      progress_percentage: calculateProgressPercentage(
        m.current_progress || 0,
        m.target_count
      ),
      time_remaining: getTimeRemaining(m.expires_at),
      expires_at: m.expires_at,
      is_new: m.started_at ? isMissionNew(m.started_at) : false,
    }))

    // Filter by category if specified
    const filtered = category
      ? missions.filter((m: any) => m.category === category)
      : missions

    return NextResponse.json({
      missions: filtered,
      total: filtered.length,
    })
  } catch (error) {
    console.error("Error in GET /api/missions:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

/* ==========================================================================
   POST /api/missions/progress
   Met à jour la progression d'une mission
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
    const { trigger_type, metadata } = body

    if (!trigger_type) {
      return NextResponse.json(
        { error: "trigger_type requis" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase.rpc("update_mission_progress", {
      p_user_id: user.id,
      p_trigger_type: trigger_type,
      p_metadata: metadata || {},
    })

    if (error) {
      console.error("Error updating mission progress:", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      updated_count: data?.updated_count || 0,
      completed_missions: data?.completed_missions || [],
    })
  } catch (error) {
    console.error("Error in POST /api/missions/progress:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
