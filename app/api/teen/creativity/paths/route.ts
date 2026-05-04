import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/teen/creativity/paths
 * Fetch passion paths and teen's progress
 *
 * Query params:
 * - teenId: UUID of the teen (required)
 * - category: Filter by category (optional)
 * - includeAll: Include all paths or just enrolled (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teenId = searchParams.get("teenId")
    const category = searchParams.get("category")
    const includeAll = searchParams.get("includeAll") !== "false"

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

    // Get teen's enrolled paths with progress
    const { data: enrolledPaths, error: enrolledError } = await supabase
      .from("teen_passion_paths")
      .select(`
        *,
        passion_paths (*)
      `)
      .eq("teen_id", teenId)

    if (enrolledError) {
      console.error("Error fetching enrolled paths:", enrolledError)
      return NextResponse.json(
        { error: "Failed to fetch paths" },
        { status: 500 }
      )
    }

    // Get all available paths if requested
    let allPaths = null
    if (includeAll) {
      let query = supabase
        .from("passion_paths")
        .select("*")
        .eq("is_active", true)
        .order("name")

      if (category) {
        query = query.eq("category", category)
      }

      const { data: paths } = await query

      // Mark paths teen is enrolled in
      const enrolledPathIds = enrolledPaths?.map((ep) => ep.path_id) || []
      allPaths = paths?.map((path) => ({
        ...path,
        is_enrolled: enrolledPathIds.includes(path.id),
      }))
    }

    // Get creation counts for each enrolled path
    const pathsWithStats = await Promise.all(
      (enrolledPaths || []).map(async (enrollment) => {
        const path = enrollment.passion_paths

        // Count creations in this path
        const { count: creationsCount } = await supabase
          .from("teen_creations")
          .select("*", { count: "exact", head: true })
          .eq("teen_id", teenId)
          .eq("path_id", path.id)

        // Get total likes on creations in this path
        const { data: creations } = await supabase
          .from("teen_creations")
          .select("likes_count")
          .eq("teen_id", teenId)
          .eq("path_id", path.id)

        const totalLikes = creations?.reduce((sum, c) => sum + (c.likes_count || 0), 0) || 0

        // Calculate level progress
        const xpForNextLevel = (enrollment.level + 1) * 500
        const progressPercent = Math.min(100, (enrollment.xp_in_path / xpForNextLevel) * 100)

        return {
          enrollment: {
            id: enrollment.id,
            level: enrollment.level,
            xp_in_path: enrollment.xp_in_path,
            started_at: enrollment.started_at,
            achievements: enrollment.achievements || [],
          },
          path,
          stats: {
            creations_count: creationsCount || 0,
            total_likes: totalLikes,
            xp_for_next_level: xpForNextLevel,
            progress_percent: Math.round(progressPercent),
          },
        }
      })
    )

    // Calculate overall stats
    const overallStats = {
      total_paths: pathsWithStats.length,
      total_creations: pathsWithStats.reduce((sum, p) => sum + p.stats.creations_count, 0),
      total_likes: pathsWithStats.reduce((sum, p) => sum + p.stats.total_likes, 0),
      total_xp: pathsWithStats.reduce((sum, p) => sum + p.enrollment.xp_in_path, 0),
      highest_level: Math.max(...pathsWithStats.map((p) => p.enrollment.level), 0),
    }

    // Get categories
    const categories = [...new Set(allPaths?.map((p) => p.category) || [])]

    return NextResponse.json({
      success: true,
      enrolledPaths: pathsWithStats,
      allPaths,
      categories,
      stats: overallStats,
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
 * POST /api/teen/creativity/paths
 * Enroll in a passion path or update progress
 *
 * Body:
 * - teenId: UUID of the teen
 * - pathId: UUID of the path
 * - action: 'enroll' | 'leave' | 'add_xp'
 * - xpAmount: Amount of XP to add (for add_xp action)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teenId, pathId, action, xpAmount } = body

    if (!teenId || !pathId || !action) {
      return NextResponse.json(
        { error: "teenId, pathId, and action are required" },
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

    // Verify path exists
    const { data: path, error: pathError } = await supabase
      .from("passion_paths")
      .select("*")
      .eq("id", pathId)
      .single()

    if (pathError || !path) {
      return NextResponse.json(
        { error: "Path not found" },
        { status: 404 }
      )
    }

    if (action === "enroll") {
      // Check if already enrolled
      const { data: existing } = await supabase
        .from("teen_passion_paths")
        .select("id")
        .eq("teen_id", teenId)
        .eq("path_id", pathId)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: "Already enrolled in this path" },
          { status: 400 }
        )
      }

      // Create enrollment
      const { data: enrollment, error } = await supabase
        .from("teen_passion_paths")
        .insert({
          teen_id: teenId,
          path_id: pathId,
          level: 1,
          xp_in_path: 0,
          started_at: new Date().toISOString(),
          achievements: [],
        })
        .select()
        .single()

      if (error) {
        console.error("Error enrolling in path:", error)
        return NextResponse.json(
          { error: "Failed to enroll" },
          { status: 500 }
        )
      }

      // Award XP for starting a new path
      await supabase.rpc("add_xp_to_user", {
        p_teen_id: teenId,
        p_xp_amount: 50,
        p_source_type: "passion_path_start",
        p_source_id: pathId,
        p_description: `Debut du parcours: ${path.name}`,
      })

      return NextResponse.json({
        success: true,
        message: "Enrolled successfully",
        enrollment,
        xpEarned: 50,
      })
    }

    if (action === "leave") {
      const { error } = await supabase
        .from("teen_passion_paths")
        .delete()
        .eq("teen_id", teenId)
        .eq("path_id", pathId)

      if (error) {
        console.error("Error leaving path:", error)
        return NextResponse.json(
          { error: "Failed to leave path" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: "Left path successfully",
      })
    }

    if (action === "add_xp") {
      if (!xpAmount || xpAmount <= 0) {
        return NextResponse.json(
          { error: "Valid xpAmount is required" },
          { status: 400 }
        )
      }

      // Get current enrollment
      const { data: enrollment } = await supabase
        .from("teen_passion_paths")
        .select("*")
        .eq("teen_id", teenId)
        .eq("path_id", pathId)
        .single()

      if (!enrollment) {
        return NextResponse.json(
          { error: "Not enrolled in this path" },
          { status: 400 }
        )
      }

      // Calculate new XP and level
      const newXp = enrollment.xp_in_path + xpAmount
      const xpForNextLevel = (enrollment.level + 1) * 500
      let newLevel = enrollment.level
      let remainingXp = newXp
      let leveledUp = false

      // Check for level up
      while (remainingXp >= xpForNextLevel) {
        remainingXp -= xpForNextLevel
        newLevel++
        leveledUp = true
      }

      // Update enrollment
      const { data: updatedEnrollment, error } = await supabase
        .from("teen_passion_paths")
        .update({
          xp_in_path: leveledUp ? remainingXp : newXp,
          level: newLevel,
        })
        .eq("id", enrollment.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating XP:", error)
        return NextResponse.json(
          { error: "Failed to update XP" },
          { status: 500 }
        )
      }

      // Award bonus XP for leveling up
      if (leveledUp) {
        const levelUpBonus = newLevel * 100
        await supabase.rpc("add_xp_to_user", {
          p_teen_id: teenId,
          p_xp_amount: levelUpBonus,
          p_source_type: "passion_level_up",
          p_source_id: pathId,
          p_description: `Niveau ${newLevel} atteint: ${path.name}`,
        })
      }

      return NextResponse.json({
        success: true,
        enrollment: updatedEnrollment,
        leveledUp,
        newLevel,
        bonusXp: leveledUp ? newLevel * 100 : 0,
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
