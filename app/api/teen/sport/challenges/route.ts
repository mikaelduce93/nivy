import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/teen/sport/challenges
 * Fetch physical challenges with progress
 *
 * Query params:
 * - teenId: UUID of the teen (required)
 * - type: 'daily' | 'weekly' | 'monthly' | 'special' (optional)
 * - category: sport category filter (optional)
 * - status: 'active' | 'completed' | 'all' (default: all)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teenId = searchParams.get("teenId")
    const type = searchParams.get("type")
    const category = searchParams.get("category")
    const status = searchParams.get("status") || "all"

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

    // Get challenges
    let challengeQuery = supabase
      .from("physical_challenges")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (type) {
      challengeQuery = challengeQuery.eq("challenge_type", type)
    }
    if (category) {
      challengeQuery = challengeQuery.eq("sport_category", category)
    }

    // Filter by validity dates
    const today = new Date().toISOString().split("T")[0]
    challengeQuery = challengeQuery
      .or(`valid_from.is.null,valid_from.lte.${today}`)
      .or(`valid_until.is.null,valid_until.gte.${today}`)

    const { data: challenges, error } = await challengeQuery

    if (error) {
      console.error("Error fetching challenges:", error)
      return NextResponse.json(
        { error: "Failed to fetch challenges" },
        { status: 500 }
      )
    }

    // Get teen's progress
    const { data: progress } = await supabase
      .from("teen_physical_challenge_progress")
      .select("*")
      .eq("teen_id", teenId)

    // Merge challenges with progress
    const challengesWithProgress = challenges?.map((challenge) => {
      const challengeProgress = progress?.find((p) => p.challenge_id === challenge.id)

      return {
        ...challenge,
        progress: challengeProgress ? {
          id: challengeProgress.id,
          current_value: challengeProgress.current_value,
          progress_percent: Math.min(100, Math.round((challengeProgress.current_value / challenge.objective_value) * 100)),
          completed: challengeProgress.completed,
          completed_at: challengeProgress.completed_at,
          validated: challengeProgress.validated,
          proof_url: challengeProgress.proof_url,
          xp_earned: challengeProgress.xp_earned,
          started_at: challengeProgress.started_at,
        } : null,
        is_started: !!challengeProgress,
        is_completed: challengeProgress?.completed || false,
      }
    })

    // Filter by status
    let filteredChallenges = challengesWithProgress
    if (status === "active") {
      filteredChallenges = challengesWithProgress?.filter((c) => c.is_started && !c.is_completed)
    } else if (status === "completed") {
      filteredChallenges = challengesWithProgress?.filter((c) => c.is_completed)
    }

    // Calculate stats
    const stats = {
      total: challenges?.length || 0,
      started: challengesWithProgress?.filter((c) => c.is_started).length || 0,
      completed: challengesWithProgress?.filter((c) => c.is_completed).length || 0,
      totalXpEarned: progress?.reduce((sum, p) => sum + (p.xp_earned || 0), 0) || 0,
    }

    return NextResponse.json({
      success: true,
      challenges: filteredChallenges,
      stats,
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teen/sport/challenges
 * Start a challenge or update progress
 *
 * Body:
 * - teenId: UUID of the teen
 * - challengeId: UUID of the challenge
 * - action: 'start' | 'update' | 'complete'
 * - value: Current progress value (for update)
 * - proofUrl: URL of proof photo/video (for complete)
 * - proofType: 'photo' | 'video' | 'screenshot' | 'manual'
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teenId, challengeId, action, value, proofUrl, proofType } = body

    if (!teenId || !challengeId || !action) {
      return NextResponse.json(
        { error: "teenId, challengeId, and action are required" },
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

    // Get challenge details
    const { data: challenge, error: challengeError } = await supabase
      .from("physical_challenges")
      .select("*")
      .eq("id", challengeId)
      .single()

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      )
    }

    if (action === "start") {
      // Check if already started
      const { data: existing } = await supabase
        .from("teen_physical_challenge_progress")
        .select("id")
        .eq("teen_id", teenId)
        .eq("challenge_id", challengeId)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: "Challenge already started" },
          { status: 400 }
        )
      }

      // Start the challenge
      const { data: progress, error } = await supabase
        .from("teen_physical_challenge_progress")
        .insert({
          teen_id: teenId,
          challenge_id: challengeId,
          current_value: 0,
          objective_value: challenge.objective_value,
          started_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error("Error starting challenge:", error)
        return NextResponse.json(
          { error: "Failed to start challenge" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: "Challenge started",
        progress,
      })
    }

    if (action === "update") {
      if (value === undefined) {
        return NextResponse.json(
          { error: "value is required for update action" },
          { status: 400 }
        )
      }

      // Get current progress
      const { data: currentProgress } = await supabase
        .from("teen_physical_challenge_progress")
        .select("*")
        .eq("teen_id", teenId)
        .eq("challenge_id", challengeId)
        .single()

      if (!currentProgress) {
        return NextResponse.json(
          { error: "Challenge not started" },
          { status: 400 }
        )
      }

      if (currentProgress.completed) {
        return NextResponse.json(
          { error: "Challenge already completed" },
          { status: 400 }
        )
      }

      const newValue = Math.max(0, value)
      const isCompleted = newValue >= challenge.objective_value

      // Update progress
      const updateData: Record<string, unknown> = {
        current_value: Math.min(newValue, challenge.objective_value),
        updated_at: new Date().toISOString(),
      }

      if (isCompleted) {
        updateData.completed = true
        updateData.completed_at = new Date().toISOString()
      }

      const { data: updatedProgress, error } = await supabase
        .from("teen_physical_challenge_progress")
        .update(updateData)
        .eq("id", currentProgress.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating progress:", error)
        return NextResponse.json(
          { error: "Failed to update progress" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: isCompleted ? "Challenge completed!" : "Progress updated",
        progress: updatedProgress,
        completed: isCompleted,
      })
    }

    if (action === "complete") {
      // Get current progress
      const { data: currentProgress } = await supabase
        .from("teen_physical_challenge_progress")
        .select("*")
        .eq("teen_id", teenId)
        .eq("challenge_id", challengeId)
        .single()

      if (!currentProgress) {
        return NextResponse.json(
          { error: "Challenge not started" },
          { status: 400 }
        )
      }

      if (currentProgress.completed && currentProgress.validated) {
        return NextResponse.json(
          { error: "Challenge already validated" },
          { status: 400 }
        )
      }

      // Complete and validate the challenge
      const xpReward = challenge.xp_reward || 50

      const { data: updatedProgress, error } = await supabase
        .from("teen_physical_challenge_progress")
        .update({
          current_value: challenge.objective_value,
          completed: true,
          completed_at: new Date().toISOString(),
          validated: true,
          validated_at: new Date().toISOString(),
          proof_url: proofUrl || null,
          proof_type: proofType || "manual",
          xp_earned: xpReward,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentProgress.id)
        .select()
        .single()

      if (error) {
        console.error("Error completing challenge:", error)
        return NextResponse.json(
          { error: "Failed to complete challenge" },
          { status: 500 }
        )
      }

      // Award XP
      await supabase.rpc("add_xp_to_user", {
        p_teen_id: teenId,
        p_xp_amount: xpReward,
        p_source_type: "physical_challenge",
        p_source_id: challengeId,
        p_description: `Defi physique complete: ${challenge.name}`,
      })

      return NextResponse.json({
        success: true,
        message: "Challenge completed and validated!",
        progress: updatedProgress,
        xpEarned: xpReward,
      })
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
