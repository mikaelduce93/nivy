import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/gamification/pillars
 * Fetch pillar scores for a teen
 *
 * Query params:
 * - teenId: UUID of the teen
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teenId = searchParams.get("teenId")

    if (!teenId) {
      return NextResponse.json(
        { error: "teenId is required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get pillar scores using the database function
    const { data: scores, error } = await supabase
      .rpc("get_pillar_scores", { p_teen_id: teenId })

    if (error) {
      console.error("Error fetching pillar scores:", error)
      return NextResponse.json(
        { error: "Failed to fetch pillar scores" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      scores: scores || {
        school_score: 50,
        sport_score: 50,
        crea_score: 50,
        balance_multiplier: 1.0,
        last_balance_check: null,
        average_score: 50,
      },
    })
  } catch (error) {
    console.error("Unexpected error in pillars API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/gamification/pillars
 * Recalculate pillar scores or claim balance bonus
 *
 * Body:
 * - teenId: UUID of the teen
 * - action: "recalculate" | "claim_bonus"
 * - pillar?: "school" | "sport" | "crea" (for single pillar recalculation)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teenId, action, pillar } = body

    if (!teenId) {
      return NextResponse.json(
        { error: "teenId is required" },
        { status: 400 }
      )
    }

    if (!action || !["recalculate", "claim_bonus"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'recalculate' or 'claim_bonus'" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (action === "recalculate") {
      if (pillar && ["school", "sport", "crea"].includes(pillar)) {
        // Recalculate single pillar
        const { data, error } = await supabase
          .rpc("update_pillar_score", {
            p_teen_id: teenId,
            p_pillar: pillar,
          })

        if (error) {
          console.error("Error recalculating pillar:", error)
          return NextResponse.json(
            { error: "Failed to recalculate pillar score" },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          pillar,
          new_score: data,
        })
      } else {
        // Recalculate all pillars
        const { data, error } = await supabase
          .rpc("recalculate_all_pillar_scores", { p_teen_id: teenId })

        if (error) {
          console.error("Error recalculating all pillars:", error)
          return NextResponse.json(
            { error: "Failed to recalculate pillar scores" },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          scores: data,
        })
      }
    }

    if (action === "claim_bonus") {
      // Calculate and claim the balance bonus
      const { data, error } = await supabase
        .rpc("calculate_balance_bonus", { p_teen_id: teenId })

      if (error) {
        console.error("Error claiming balance bonus:", error)
        return NextResponse.json(
          { error: "Failed to claim balance bonus" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        result: data,
      })
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Unexpected error in pillars API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
