import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/teen/creativity/creations
 * Fetch creations with filters
 *
 * Query params:
 * - teenId: UUID of the teen (optional, for own creations)
 * - pathId: Filter by passion path (optional)
 * - featured: Show only featured creations (optional)
 * - feed: Show feed from all users (optional, for discovery)
 * - limit: Number of results (default: 20)
 * - offset: Pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teenId = searchParams.get("teenId")
    const pathId = searchParams.get("pathId")
    const featured = searchParams.get("featured") === "true"
    const feed = searchParams.get("feed") === "true"
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")

    const supabase = await createClient()

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Build query
    let query = supabase
      .from("teen_creations")
      .select(`
        *,
        passion_paths (id, name, category, icon, color),
        teens:teen_id (id, first_name, avatar_url)
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (teenId && !feed) {
      query = query.eq("teen_id", teenId)
    }

    if (pathId) {
      query = query.eq("path_id", pathId)
    }

    if (featured) {
      query = query.eq("is_featured", true)
    }

    const { data: creations, error, count } = await query

    if (error) {
      console.error("Error fetching creations:", error)
      return NextResponse.json(
        { error: "Failed to fetch creations" },
        { status: 500 }
      )
    }

    // Check if current user has liked each creation
    let creationsWithLikes = creations
    if (teenId) {
      const creationIds = creations?.map((c) => c.id) || []

      const { data: userLikes } = await supabase
        .from("creation_likes")
        .select("creation_id")
        .eq("liker_teen_id", teenId)
        .in("creation_id", creationIds)

      const likedIds = userLikes?.map((l) => l.creation_id) || []

      creationsWithLikes = creations?.map((creation) => ({
        ...creation,
        is_liked_by_user: likedIds.includes(creation.id),
      }))
    }

    // Get total count for pagination
    let totalQuery = supabase
      .from("teen_creations")
      .select("*", { count: "exact", head: true })

    if (teenId && !feed) {
      totalQuery = totalQuery.eq("teen_id", teenId)
    }
    if (pathId) {
      totalQuery = totalQuery.eq("path_id", pathId)
    }
    if (featured) {
      totalQuery = totalQuery.eq("is_featured", true)
    }

    const { count: totalCount } = await totalQuery

    return NextResponse.json({
      success: true,
      creations: creationsWithLikes,
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (totalCount || 0),
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

/**
 * POST /api/teen/creativity/creations
 * Create a new creation or perform actions
 *
 * Body:
 * - teenId: UUID of the teen
 * - action: 'create' | 'delete' | 'like' | 'unlike'
 * - For create:
 *   - pathId: UUID of the passion path
 *   - title: Title of the creation
 *   - description: Description (optional)
 *   - mediaUrl: URL of the media
 *   - mediaType: 'image' | 'video' | 'audio' | 'document'
 *   - tags: Array of tags (optional)
 * - For delete/like/unlike:
 *   - creationId: UUID of the creation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teenId, action } = body

    if (!teenId || !action) {
      return NextResponse.json(
        { error: "teenId and action are required" },
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

    if (action === "create") {
      const { pathId, title, description, mediaUrl, mediaType, tags } = body

      if (!pathId || !title || !mediaUrl || !mediaType) {
        return NextResponse.json(
          { error: "pathId, title, mediaUrl, and mediaType are required" },
          { status: 400 }
        )
      }

      // Verify teen is enrolled in this path
      const { data: enrollment } = await supabase
        .from("teen_passion_paths")
        .select("id")
        .eq("teen_id", teenId)
        .eq("path_id", pathId)
        .single()

      if (!enrollment) {
        return NextResponse.json(
          { error: "Not enrolled in this passion path" },
          { status: 400 }
        )
      }

      // Create the creation
      const { data: creation, error } = await supabase
        .from("teen_creations")
        .insert({
          teen_id: teenId,
          path_id: pathId,
          title,
          description: description || null,
          media_url: mediaUrl,
          media_type: mediaType,
          tags: tags || [],
          likes_count: 0,
          is_featured: false,
          created_at: new Date().toISOString(),
        })
        .select(`
          *,
          passion_paths (id, name, category, icon, color)
        `)
        .single()

      if (error) {
        console.error("Error creating creation:", error)
        return NextResponse.json(
          { error: "Failed to create" },
          { status: 500 }
        )
      }

      // Get path info for XP
      const { data: path } = await supabase
        .from("passion_paths")
        .select("name, xp_multiplier")
        .eq("id", pathId)
        .single()

      // Award XP for creating
      const baseXp = 30
      const multiplier = path?.xp_multiplier || 1
      const xpReward = Math.round(baseXp * multiplier)

      await supabase.rpc("add_xp_to_user", {
        p_teen_id: teenId,
        p_xp_amount: xpReward,
        p_source_type: "creation_upload",
        p_source_id: creation.id,
        p_description: `Nouvelle creation: ${title}`,
      })

      // Add XP to path
      try {
        await supabase.rpc("add_path_xp", {
          p_teen_id: teenId,
          p_path_id: pathId,
          p_xp_amount: xpReward,
        })
      } catch {
        // Function might not exist yet, that's ok
      }

      return NextResponse.json({
        success: true,
        message: "Creation uploaded successfully",
        creation,
        xpEarned: xpReward,
      })
    }

    if (action === "delete") {
      const { creationId } = body

      if (!creationId) {
        return NextResponse.json(
          { error: "creationId is required" },
          { status: 400 }
        )
      }

      // Verify ownership
      const { data: creation } = await supabase
        .from("teen_creations")
        .select("teen_id")
        .eq("id", creationId)
        .single()

      if (!creation || creation.teen_id !== teenId) {
        return NextResponse.json(
          { error: "Not authorized to delete this creation" },
          { status: 403 }
        )
      }

      // Delete likes first
      await supabase
        .from("creation_likes")
        .delete()
        .eq("creation_id", creationId)

      // Delete creation
      const { error } = await supabase
        .from("teen_creations")
        .delete()
        .eq("id", creationId)

      if (error) {
        console.error("Error deleting creation:", error)
        return NextResponse.json(
          { error: "Failed to delete" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: "Creation deleted",
      })
    }

    if (action === "like") {
      const { creationId } = body

      if (!creationId) {
        return NextResponse.json(
          { error: "creationId is required" },
          { status: 400 }
        )
      }

      // Check if already liked
      const { data: existing } = await supabase
        .from("creation_likes")
        .select("id")
        .eq("creation_id", creationId)
        .eq("liker_teen_id", teenId)
        .single()

      if (existing) {
        return NextResponse.json({
          success: true,
          message: "Already liked",
          alreadyLiked: true,
        })
      }

      // Get creation info
      const { data: creation } = await supabase
        .from("teen_creations")
        .select("teen_id, title, likes_count")
        .eq("id", creationId)
        .single()

      if (!creation) {
        return NextResponse.json(
          { error: "Creation not found" },
          { status: 404 }
        )
      }

      // Can't like own creation
      if (creation.teen_id === teenId) {
        return NextResponse.json(
          { error: "Cannot like your own creation" },
          { status: 400 }
        )
      }

      // Create like
      const { error: likeError } = await supabase
        .from("creation_likes")
        .insert({
          creation_id: creationId,
          liker_teen_id: teenId,
          created_at: new Date().toISOString(),
        })

      if (likeError) {
        console.error("Error liking:", likeError)
        return NextResponse.json(
          { error: "Failed to like" },
          { status: 500 }
        )
      }

      // Update likes count
      const { data: updated } = await supabase
        .from("teen_creations")
        .update({ likes_count: (creation.likes_count || 0) + 1 })
        .eq("id", creationId)
        .select("likes_count")
        .single()

      // Award XP to creation owner for receiving a like
      await supabase.rpc("add_xp_to_user", {
        p_teen_id: creation.teen_id,
        p_xp_amount: 5,
        p_source_type: "creation_like_received",
        p_source_id: creationId,
        p_description: `Like recu sur: ${creation.title}`,
      })

      return NextResponse.json({
        success: true,
        message: "Liked!",
        newLikesCount: updated?.likes_count || 0,
      })
    }

    if (action === "unlike") {
      const { creationId } = body

      if (!creationId) {
        return NextResponse.json(
          { error: "creationId is required" },
          { status: 400 }
        )
      }

      // Delete like
      const { error: unlikeError } = await supabase
        .from("creation_likes")
        .delete()
        .eq("creation_id", creationId)
        .eq("liker_teen_id", teenId)

      if (unlikeError) {
        console.error("Error unliking:", unlikeError)
        return NextResponse.json(
          { error: "Failed to unlike" },
          { status: 500 }
        )
      }

      // Update likes count
      const { data: creation } = await supabase
        .from("teen_creations")
        .select("likes_count")
        .eq("id", creationId)
        .single()

      if (creation) {
        await supabase
          .from("teen_creations")
          .update({ likes_count: Math.max(0, (creation.likes_count || 0) - 1) })
          .eq("id", creationId)
      }

      return NextResponse.json({
        success: true,
        message: "Unliked",
        newLikesCount: Math.max(0, (creation?.likes_count || 0) - 1),
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
