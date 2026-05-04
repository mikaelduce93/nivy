import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/teen/education/tutorials
 * Fetch educational tutorials with progress
 *
 * Query params:
 * - teenId: UUID of the teen (required)
 * - subject: Filter by subject (optional)
 * - type: 'educational' | 'passion' (default: educational)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teenId = searchParams.get("teenId")
    const subject = searchParams.get("subject")
    const type = searchParams.get("type") || "educational"

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

    if (type === "educational") {
      // Fetch educational tutorials
      let query = supabase
        .from("educational_tutorials")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (subject) {
        query = query.eq("subject", subject)
      }

      const { data: tutorials, error } = await query

      if (error) {
        console.error("Error fetching tutorials:", error)
        return NextResponse.json(
          { error: "Failed to fetch tutorials" },
          { status: 500 }
        )
      }

      // Get progress
      const { data: progress } = await supabase
        .from("educational_tutorial_progress")
        .select("*")
        .eq("teen_id", teenId)

      const tutorialsWithProgress = tutorials?.map((tutorial) => {
        const tutorialProgress = progress?.find((p) => p.tutorial_id === tutorial.id)
        return {
          ...tutorial,
          progress_percent: tutorialProgress?.progress_percent || 0,
          watch_time_seconds: tutorialProgress?.watch_time_seconds || 0,
          completed: tutorialProgress?.completed || false,
          completed_at: tutorialProgress?.completed_at || null,
        }
      })

      return NextResponse.json({
        success: true,
        tutorials: tutorialsWithProgress,
      })
    } else {
      // Fetch passion tutorials
      let query = supabase
        .from("passion_tutorials")
        .select("*, passion_paths(name, category)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (subject) {
        query = query.eq("category", subject)
      }

      const { data: tutorials, error } = await query

      if (error) {
        console.error("Error fetching passion tutorials:", error)
        return NextResponse.json(
          { error: "Failed to fetch tutorials" },
          { status: 500 }
        )
      }

      // Get progress
      const { data: progress } = await supabase
        .from("passion_tutorial_progress")
        .select("*")
        .eq("teen_id", teenId)

      const tutorialsWithProgress = tutorials?.map((tutorial) => {
        const tutorialProgress = progress?.find((p) => p.tutorial_id === tutorial.id)
        return {
          ...tutorial,
          progress_percent: tutorialProgress?.progress_percent || 0,
          watch_time_seconds: tutorialProgress?.watch_time_seconds || 0,
          completed: tutorialProgress?.completed || false,
          completed_at: tutorialProgress?.completed_at || null,
        }
      })

      return NextResponse.json({
        success: true,
        tutorials: tutorialsWithProgress,
      })
    }
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teen/education/tutorials
 * Update tutorial progress
 *
 * Body:
 * - teenId: UUID of the teen
 * - tutorialId: UUID of the tutorial
 * - type: 'educational' | 'passion'
 * - progressPercent: Current progress percentage
 * - watchTimeSeconds: Additional watch time to add
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teenId, tutorialId, type = "educational", progressPercent, watchTimeSeconds } = body

    if (!teenId || !tutorialId) {
      return NextResponse.json(
        { error: "teenId and tutorialId are required" },
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

    const tableName = type === "educational"
      ? "educational_tutorial_progress"
      : "passion_tutorial_progress"

    const tutorialTable = type === "educational"
      ? "educational_tutorials"
      : "passion_tutorials"

    // Get tutorial details
    const { data: tutorial } = await supabase
      .from(tutorialTable)
      .select("*")
      .eq("id", tutorialId)
      .single()

    if (!tutorial) {
      return NextResponse.json(
        { error: "Tutorial not found" },
        { status: 404 }
      )
    }

    // Get current progress
    const { data: currentProgress } = await supabase
      .from(tableName)
      .select("*")
      .eq("teen_id", teenId)
      .eq("tutorial_id", tutorialId)
      .single()

    const newProgressPercent = Math.min(100, progressPercent || currentProgress?.progress_percent || 0)
    const newWatchTime = (currentProgress?.watch_time_seconds || 0) + (watchTimeSeconds || 0)
    const completionThreshold = tutorial.completion_threshold || 80
    const isCompleted = newProgressPercent >= completionThreshold
    const wasAlreadyCompleted = currentProgress?.completed || false

    // Calculate XP if newly completed
    let xpEarned = 0
    if (isCompleted && !wasAlreadyCompleted) {
      xpEarned = tutorial.xp_reward || 30
    }

    // Upsert progress
    const { error: upsertError } = await supabase
      .from(tableName)
      .upsert({
        teen_id: teenId,
        tutorial_id: tutorialId,
        progress_percent: newProgressPercent,
        watch_time_seconds: newWatchTime,
        completed: isCompleted,
        completed_at: isCompleted && !wasAlreadyCompleted ? new Date().toISOString() : currentProgress?.completed_at,
        xp_earned: (currentProgress?.xp_earned || 0) + xpEarned,
        last_watched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "teen_id,tutorial_id",
      })

    if (upsertError) {
      console.error("Error updating progress:", upsertError)
      return NextResponse.json(
        { error: "Failed to update progress" },
        { status: 500 }
      )
    }

    // Award XP if newly completed
    if (xpEarned > 0) {
      await supabase.rpc("add_xp_to_user", {
        p_teen_id: teenId,
        p_xp_amount: xpEarned,
        p_source_type: type === "educational" ? "edu_tutorial" : "passion_tutorial",
        p_source_id: tutorialId,
        p_description: `Tutoriel complete: ${tutorial.title}`,
      })
    }

    return NextResponse.json({
      success: true,
      progress: {
        progressPercent: newProgressPercent,
        watchTimeSeconds: newWatchTime,
        completed: isCompleted,
        xpEarned,
        newlyCompleted: isCompleted && !wasAlreadyCompleted,
      },
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
