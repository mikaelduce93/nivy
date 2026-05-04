import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/teen/circles
 * Fetch circles for a teen
 *
 * Query params:
 * - teenId: UUID of the teen (required)
 * - type: 'all' | 'owned' | 'member' (default: all)
 * - includePublic: Include public circles for discovery (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teenId = searchParams.get("teenId")
    const type = searchParams.get("type") || "all"
    const includePublic = searchParams.get("includePublic") === "true"

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

    // Get teen's circles with member info
    let query = supabase
      .from("circle_members")
      .select(`
        *,
        circles (
          *,
          created_by,
          teens:created_by (id, first_name, avatar_url)
        )
      `)
      .eq("teen_id", teenId)
      .eq("status", "active")

    const { data: memberships, error } = await query

    if (error) {
      console.error("Error fetching circles:", error)
      return NextResponse.json(
        { error: "Failed to fetch circles" },
        { status: 500 }
      )
    }

    // Enrich with stats
    const circlesWithStats = await Promise.all(
      (memberships || []).map(async (membership) => {
        const circle = membership.circles

        // Get member count
        const { count: memberCount } = await supabase
          .from("circle_members")
          .select("*", { count: "exact", head: true })
          .eq("circle_id", circle.id)
          .eq("status", "active")

        // Get unread count
        const { count: unreadCount } = await supabase
          .from("circle_messages")
          .select("*", { count: "exact", head: true })
          .eq("circle_id", circle.id)
          .eq("is_deleted", false)
          .gt("created_at", membership.last_read_at || membership.joined_at)

        // Get last message
        const { data: lastMessages } = await supabase
          .from("circle_messages")
          .select(`
            id,
            content,
            message_type,
            created_at,
            sender:sender_id (id, first_name)
          `)
          .eq("circle_id", circle.id)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(1)

        // Filter by type
        if (type === "owned" && membership.role !== "owner") return null
        if (type === "member" && membership.role === "owner") return null

        return {
          id: circle.id,
          name: circle.name,
          description: circle.description,
          avatar_url: circle.avatar_url,
          cover_url: circle.cover_url,
          theme_color: circle.theme_color,
          emoji: circle.emoji,
          circle_type: circle.circle_type,
          created_by: circle.created_by,
          creator: circle.teens,
          membership: {
            role: membership.role,
            joined_at: membership.joined_at,
            notifications_enabled: membership.notifications_enabled,
            is_muted: membership.status === "muted",
          },
          stats: {
            member_count: memberCount || 0,
            unread_count: unreadCount || 0,
            message_count: circle.message_count || 0,
          },
          last_message: lastMessages?.[0] || null,
          last_activity_at: circle.last_activity_at,
        }
      })
    )

    // Filter out nulls and sort by last activity
    const circles = circlesWithStats
      .filter(Boolean)
      .sort((a, b) => {
        const aDate = new Date(a!.last_activity_at).getTime()
        const bDate = new Date(b!.last_activity_at).getTime()
        return bDate - aDate
      })

    // Get public circles for discovery if requested
    let publicCircles = null
    if (includePublic) {
      const memberCircleIds = circles.map((c) => c!.id)

      const { data: public_circles } = await supabase
        .from("circles")
        .select(`
          *,
          teens:created_by (id, first_name, avatar_url)
        `)
        .eq("circle_type", "public")
        .eq("is_active", true)
        .not("id", "in", `(${memberCircleIds.join(",")})`)
        .order("message_count", { ascending: false })
        .limit(10)

      publicCircles = await Promise.all(
        (public_circles || []).map(async (circle) => {
          const { count } = await supabase
            .from("circle_members")
            .select("*", { count: "exact", head: true })
            .eq("circle_id", circle.id)
            .eq("status", "active")

          return {
            ...circle,
            creator: circle.teens,
            member_count: count || 0,
          }
        })
      )
    }

    // Get pending invitations count
    const { count: pendingInvitations } = await supabase
      .from("circle_invitations")
      .select("*", { count: "exact", head: true })
      .eq("invited_teen_id", teenId)
      .eq("status", "pending")

    return NextResponse.json({
      success: true,
      circles,
      publicCircles,
      stats: {
        total_circles: circles.length,
        total_unread: circles.reduce((sum, c) => sum + (c?.stats.unread_count || 0), 0),
        pending_invitations: pendingInvitations || 0,
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
 * POST /api/teen/circles
 * Create a circle or perform actions
 *
 * Body:
 * - teenId: UUID of the teen
 * - action: 'create' | 'join' | 'leave' | 'update' | 'delete'
 * - For create:
 *   - name, description, circle_type, theme_color, emoji
 * - For join/leave/delete:
 *   - circleId
 * - For update:
 *   - circleId, updates (object)
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
      const { name, description, circle_type, theme_color, emoji, avatar_url } = body

      if (!name) {
        return NextResponse.json(
          { error: "name is required" },
          { status: 400 }
        )
      }

      // Create circle
      const { data: circle, error } = await supabase
        .from("circles")
        .insert({
          name,
          description: description || null,
          circle_type: circle_type || "private",
          theme_color: theme_color || "cyan",
          emoji: emoji || null,
          avatar_url: avatar_url || null,
          created_by: teenId,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating circle:", error)
        return NextResponse.json(
          { error: "Failed to create circle" },
          { status: 500 }
        )
      }

      // Award XP for creating a circle
      await supabase.rpc("add_xp_to_user", {
        p_teen_id: teenId,
        p_xp_amount: 25,
        p_source_type: "circle_create",
        p_source_id: circle.id,
        p_description: `Cercle cree: ${name}`,
      })

      return NextResponse.json({
        success: true,
        message: "Circle created successfully",
        circle,
        xpEarned: 25,
      })
    }

    if (action === "join") {
      const { circleId } = body

      if (!circleId) {
        return NextResponse.json(
          { error: "circleId is required" },
          { status: 400 }
        )
      }

      // Check if circle exists and is public
      const { data: circle } = await supabase
        .from("circles")
        .select("id, name, circle_type, max_members")
        .eq("id", circleId)
        .single()

      if (!circle) {
        return NextResponse.json(
          { error: "Circle not found" },
          { status: 404 }
        )
      }

      if (circle.circle_type !== "public") {
        return NextResponse.json(
          { error: "This circle requires an invitation" },
          { status: 403 }
        )
      }

      // Check member count
      const { count: memberCount } = await supabase
        .from("circle_members")
        .select("*", { count: "exact", head: true })
        .eq("circle_id", circleId)
        .eq("status", "active")

      if (memberCount && memberCount >= circle.max_members) {
        return NextResponse.json(
          { error: "Circle is full" },
          { status: 400 }
        )
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from("circle_members")
        .select("id, status")
        .eq("circle_id", circleId)
        .eq("teen_id", teenId)
        .single()

      if (existing) {
        if (existing.status === "active") {
          return NextResponse.json(
            { error: "Already a member" },
            { status: 400 }
          )
        }

        // Reactivate membership
        await supabase
          .from("circle_members")
          .update({ status: "active", joined_at: new Date().toISOString() })
          .eq("id", existing.id)
      } else {
        // Create membership
        await supabase
          .from("circle_members")
          .insert({
            circle_id: circleId,
            teen_id: teenId,
            role: "member",
            status: "active",
          })
      }

      // Add system message
      await supabase.rpc("send_circle_message", {
        p_circle_id: circleId,
        p_sender_id: teenId,
        p_content: "a rejoint le cercle",
        p_message_type: "system",
      })

      return NextResponse.json({
        success: true,
        message: "Joined circle successfully",
      })
    }

    if (action === "leave") {
      const { circleId } = body

      if (!circleId) {
        return NextResponse.json(
          { error: "circleId is required" },
          { status: 400 }
        )
      }

      // Check if member and not owner
      const { data: membership } = await supabase
        .from("circle_members")
        .select("id, role")
        .eq("circle_id", circleId)
        .eq("teen_id", teenId)
        .single()

      if (!membership) {
        return NextResponse.json(
          { error: "Not a member of this circle" },
          { status: 400 }
        )
      }

      if (membership.role === "owner") {
        return NextResponse.json(
          { error: "Owner cannot leave. Transfer ownership or delete the circle." },
          { status: 400 }
        )
      }

      // Update membership status
      await supabase
        .from("circle_members")
        .update({ status: "left", updated_at: new Date().toISOString() })
        .eq("id", membership.id)

      // Add system message
      await supabase.rpc("send_circle_message", {
        p_circle_id: circleId,
        p_sender_id: teenId,
        p_content: "a quitte le cercle",
        p_message_type: "system",
      })

      return NextResponse.json({
        success: true,
        message: "Left circle successfully",
      })
    }

    if (action === "update") {
      const { circleId, updates } = body

      if (!circleId || !updates) {
        return NextResponse.json(
          { error: "circleId and updates are required" },
          { status: 400 }
        )
      }

      // Check if owner or admin
      const { data: membership } = await supabase
        .from("circle_members")
        .select("role")
        .eq("circle_id", circleId)
        .eq("teen_id", teenId)
        .single()

      if (!membership || !["owner", "admin"].includes(membership.role)) {
        return NextResponse.json(
          { error: "Not authorized to update this circle" },
          { status: 403 }
        )
      }

      // Allowed fields to update
      const allowedFields = ["name", "description", "avatar_url", "cover_url", "theme_color", "emoji", "circle_type", "max_members"]
      const sanitizedUpdates: Record<string, unknown> = {}

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          sanitizedUpdates[field] = updates[field]
        }
      }

      sanitizedUpdates.updated_at = new Date().toISOString()

      const { data: circle, error } = await supabase
        .from("circles")
        .update(sanitizedUpdates)
        .eq("id", circleId)
        .select()
        .single()

      if (error) {
        console.error("Error updating circle:", error)
        return NextResponse.json(
          { error: "Failed to update circle" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: "Circle updated successfully",
        circle,
      })
    }

    if (action === "delete") {
      const { circleId } = body

      if (!circleId) {
        return NextResponse.json(
          { error: "circleId is required" },
          { status: 400 }
        )
      }

      // Check if owner
      const { data: membership } = await supabase
        .from("circle_members")
        .select("role")
        .eq("circle_id", circleId)
        .eq("teen_id", teenId)
        .single()

      if (!membership || membership.role !== "owner") {
        return NextResponse.json(
          { error: "Only the owner can delete the circle" },
          { status: 403 }
        )
      }

      // Soft delete (mark as inactive)
      await supabase
        .from("circles")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", circleId)

      return NextResponse.json({
        success: true,
        message: "Circle deleted successfully",
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
