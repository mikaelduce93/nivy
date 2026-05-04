import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/teen/circles/members
 * Fetch members of a circle or pending invitations
 *
 * Query params:
 * - circleId: UUID of the circle (required)
 * - teenId: UUID of the teen (required)
 * - type: 'members' | 'invitations' | 'pending' (default: members)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const circleId = searchParams.get("circleId")
    const teenId = searchParams.get("teenId")
    const type = searchParams.get("type") || "members"

    if (!circleId || !teenId) {
      return NextResponse.json(
        { error: "circleId and teenId are required" },
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

    // Verify membership
    const { data: membership } = await supabase
      .from("circle_members")
      .select("id, role, status")
      .eq("circle_id", circleId)
      .eq("teen_id", teenId)
      .single()

    if (!membership || membership.status !== "active") {
      return NextResponse.json(
        { error: "Not a member of this circle" },
        { status: 403 }
      )
    }

    if (type === "members") {
      const { data: members, error } = await supabase
        .from("circle_members")
        .select(`
          *,
          teen:teen_id (id, first_name, last_name, avatar_url)
        `)
        .eq("circle_id", circleId)
        .eq("status", "active")
        .order("role", { ascending: true })
        .order("joined_at", { ascending: true })

      if (error) {
        console.error("Error fetching members:", error)
        return NextResponse.json(
          { error: "Failed to fetch members" },
          { status: 500 }
        )
      }

      // Role order for sorting
      const roleOrder = { owner: 0, admin: 1, moderator: 2, member: 3 }
      const sortedMembers = members?.sort((a, b) => {
        return (roleOrder[a.role as keyof typeof roleOrder] || 3) -
          (roleOrder[b.role as keyof typeof roleOrder] || 3)
      })

      return NextResponse.json({
        success: true,
        members: sortedMembers,
        currentUserRole: membership.role,
      })
    }

    if (type === "invitations") {
      // Only admins can see invitations
      if (!["owner", "admin"].includes(membership.role)) {
        return NextResponse.json(
          { error: "Not authorized" },
          { status: 403 }
        )
      }

      const { data: invitations, error } = await supabase
        .from("circle_invitations")
        .select(`
          *,
          invited_teen:invited_teen_id (id, first_name, last_name, avatar_url),
          inviter:invited_by (id, first_name)
        `)
        .eq("circle_id", circleId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching invitations:", error)
        return NextResponse.json(
          { error: "Failed to fetch invitations" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        invitations,
      })
    }

    if (type === "pending") {
      // Get pending invitations for the current teen
      const { data: invitations, error } = await supabase
        .from("circle_invitations")
        .select(`
          *,
          circle:circle_id (id, name, avatar_url, theme_color, emoji),
          inviter:invited_by (id, first_name, avatar_url)
        `)
        .eq("invited_teen_id", teenId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching pending invitations:", error)
        return NextResponse.json(
          { error: "Failed to fetch invitations" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        invitations,
      })
    }

    return NextResponse.json(
      { error: "Invalid type" },
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

/**
 * POST /api/teen/circles/members
 * Manage circle members and invitations
 *
 * Body:
 * - teenId: UUID of the teen performing the action
 * - circleId: UUID of the circle
 * - action: 'invite' | 'accept' | 'decline' | 'cancel' | 'kick' | 'ban' | 'promote' | 'demote' | 'mute' | 'unmute'
 * - For invite:
 *   - targetTeenId, message
 * - For accept/decline:
 *   - invitationId
 * - For kick/ban/promote/demote/mute/unmute:
 *   - targetTeenId, newRole (for promote/demote)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teenId, circleId, action } = body

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

    if (action === "invite") {
      const { targetTeenId, message } = body

      if (!circleId || !targetTeenId) {
        return NextResponse.json(
          { error: "circleId and targetTeenId are required" },
          { status: 400 }
        )
      }

      // Verify membership and permission
      const { data: membership } = await supabase
        .from("circle_members")
        .select("role, status")
        .eq("circle_id", circleId)
        .eq("teen_id", teenId)
        .single()

      if (!membership || membership.status !== "active") {
        return NextResponse.json(
          { error: "Not a member of this circle" },
          { status: 403 }
        )
      }

      // Check if target is already a member
      const { data: existingMember } = await supabase
        .from("circle_members")
        .select("id, status")
        .eq("circle_id", circleId)
        .eq("teen_id", targetTeenId)
        .single()

      if (existingMember && existingMember.status === "active") {
        return NextResponse.json(
          { error: "User is already a member" },
          { status: 400 }
        )
      }

      // Check for existing pending invitation
      const { data: existingInvite } = await supabase
        .from("circle_invitations")
        .select("id")
        .eq("circle_id", circleId)
        .eq("invited_teen_id", targetTeenId)
        .eq("status", "pending")
        .single()

      if (existingInvite) {
        return NextResponse.json(
          { error: "Invitation already sent" },
          { status: 400 }
        )
      }

      // Create invitation
      const { data: invitation, error } = await supabase
        .from("circle_invitations")
        .insert({
          circle_id: circleId,
          invited_by: teenId,
          invited_teen_id: targetTeenId,
          message: message || null,
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating invitation:", error)
        return NextResponse.json(
          { error: "Failed to send invitation" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: "Invitation sent",
        invitation,
      })
    }

    if (action === "accept") {
      const { invitationId } = body

      if (!invitationId) {
        return NextResponse.json(
          { error: "invitationId is required" },
          { status: 400 }
        )
      }

      // Get invitation
      const { data: invitation } = await supabase
        .from("circle_invitations")
        .select("*, circle:circle_id (id, name)")
        .eq("id", invitationId)
        .eq("invited_teen_id", teenId)
        .eq("status", "pending")
        .single()

      if (!invitation) {
        return NextResponse.json(
          { error: "Invitation not found or expired" },
          { status: 404 }
        )
      }

      // Update invitation
      await supabase
        .from("circle_invitations")
        .update({
          status: "accepted",
          responded_at: new Date().toISOString(),
        })
        .eq("id", invitationId)

      // Create membership
      const { error: memberError } = await supabase
        .from("circle_members")
        .upsert({
          circle_id: invitation.circle_id,
          teen_id: teenId,
          role: "member",
          status: "active",
          joined_at: new Date().toISOString(),
        }, {
          onConflict: "circle_id,teen_id",
        })

      if (memberError) {
        console.error("Error creating membership:", memberError)
        return NextResponse.json(
          { error: "Failed to join circle" },
          { status: 500 }
        )
      }

      // Send system message
      await supabase.rpc("send_circle_message", {
        p_circle_id: invitation.circle_id,
        p_sender_id: teenId,
        p_content: "a rejoint le cercle",
        p_message_type: "system",
      })

      return NextResponse.json({
        success: true,
        message: "Joined circle successfully",
        circleId: invitation.circle_id,
      })
    }

    if (action === "decline") {
      const { invitationId } = body

      if (!invitationId) {
        return NextResponse.json(
          { error: "invitationId is required" },
          { status: 400 }
        )
      }

      await supabase
        .from("circle_invitations")
        .update({
          status: "declined",
          responded_at: new Date().toISOString(),
        })
        .eq("id", invitationId)
        .eq("invited_teen_id", teenId)

      return NextResponse.json({
        success: true,
        message: "Invitation declined",
      })
    }

    if (action === "cancel") {
      const { invitationId } = body

      if (!invitationId) {
        return NextResponse.json(
          { error: "invitationId is required" },
          { status: 400 }
        )
      }

      // Verify the user sent this invitation
      const { data: invitation } = await supabase
        .from("circle_invitations")
        .select("invited_by")
        .eq("id", invitationId)
        .single()

      if (!invitation || invitation.invited_by !== teenId) {
        return NextResponse.json(
          { error: "Cannot cancel this invitation" },
          { status: 403 }
        )
      }

      await supabase
        .from("circle_invitations")
        .update({ status: "cancelled" })
        .eq("id", invitationId)

      return NextResponse.json({
        success: true,
        message: "Invitation cancelled",
      })
    }

    if (action === "kick" || action === "ban") {
      const { targetTeenId } = body

      if (!circleId || !targetTeenId) {
        return NextResponse.json(
          { error: "circleId and targetTeenId are required" },
          { status: 400 }
        )
      }

      // Verify admin permissions
      const { data: membership } = await supabase
        .from("circle_members")
        .select("role")
        .eq("circle_id", circleId)
        .eq("teen_id", teenId)
        .single()

      if (!membership || !["owner", "admin", "moderator"].includes(membership.role)) {
        return NextResponse.json(
          { error: "Not authorized" },
          { status: 403 }
        )
      }

      // Get target membership
      const { data: targetMembership } = await supabase
        .from("circle_members")
        .select("role")
        .eq("circle_id", circleId)
        .eq("teen_id", targetTeenId)
        .single()

      // Can't kick/ban owner or someone with higher/equal role
      const roleHierarchy = { owner: 4, admin: 3, moderator: 2, member: 1 }
      const userLevel = roleHierarchy[membership.role as keyof typeof roleHierarchy] || 0
      const targetLevel = roleHierarchy[targetMembership?.role as keyof typeof roleHierarchy] || 0

      if (targetLevel >= userLevel) {
        return NextResponse.json(
          { error: "Cannot remove this member" },
          { status: 403 }
        )
      }

      await supabase
        .from("circle_members")
        .update({
          status: action === "ban" ? "banned" : "kicked",
          updated_at: new Date().toISOString(),
        })
        .eq("circle_id", circleId)
        .eq("teen_id", targetTeenId)

      // Send system message
      await supabase.rpc("send_circle_message", {
        p_circle_id: circleId,
        p_sender_id: teenId,
        p_content: action === "ban" ? "a ete banni du cercle" : "a ete retire du cercle",
        p_message_type: "system",
        p_metadata: { target_teen_id: targetTeenId },
      })

      return NextResponse.json({
        success: true,
        message: action === "ban" ? "Member banned" : "Member kicked",
      })
    }

    if (action === "promote" || action === "demote") {
      const { targetTeenId, newRole } = body

      if (!circleId || !targetTeenId || !newRole) {
        return NextResponse.json(
          { error: "circleId, targetTeenId, and newRole are required" },
          { status: 400 }
        )
      }

      // Only owner can promote/demote
      const { data: membership } = await supabase
        .from("circle_members")
        .select("role")
        .eq("circle_id", circleId)
        .eq("teen_id", teenId)
        .single()

      if (!membership || membership.role !== "owner") {
        return NextResponse.json(
          { error: "Only the owner can change roles" },
          { status: 403 }
        )
      }

      // Valid roles for promotion/demotion
      const validRoles = ["admin", "moderator", "member"]
      if (!validRoles.includes(newRole)) {
        return NextResponse.json(
          { error: "Invalid role" },
          { status: 400 }
        )
      }

      await supabase
        .from("circle_members")
        .update({
          role: newRole,
          updated_at: new Date().toISOString(),
        })
        .eq("circle_id", circleId)
        .eq("teen_id", targetTeenId)

      return NextResponse.json({
        success: true,
        message: `Role updated to ${newRole}`,
      })
    }

    if (action === "mute" || action === "unmute") {
      const { targetTeenId } = body

      // User can mute themselves or admins can mute others
      const isSelf = targetTeenId === teenId

      if (!isSelf && circleId) {
        const { data: membership } = await supabase
          .from("circle_members")
          .select("role")
          .eq("circle_id", circleId)
          .eq("teen_id", teenId)
          .single()

        if (!membership || !["owner", "admin", "moderator"].includes(membership.role)) {
          return NextResponse.json(
            { error: "Not authorized" },
            { status: 403 }
          )
        }
      }

      await supabase
        .from("circle_members")
        .update({
          status: action === "mute" ? "muted" : "active",
          updated_at: new Date().toISOString(),
        })
        .eq("circle_id", circleId)
        .eq("teen_id", targetTeenId || teenId)

      return NextResponse.json({
        success: true,
        message: action === "mute" ? "Notifications muted" : "Notifications enabled",
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
