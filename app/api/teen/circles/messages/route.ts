import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/teen/circles/messages
 * Fetch messages for a circle
 *
 * Query params:
 * - circleId: UUID of the circle (required)
 * - teenId: UUID of the teen (required)
 * - limit: Number of messages (default: 50)
 * - before: Message ID for pagination (optional)
 * - after: Message ID for newer messages (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const circleId = searchParams.get("circleId")
    const teenId = searchParams.get("teenId")
    const limit = parseInt(searchParams.get("limit") || "50")
    const before = searchParams.get("before")
    const after = searchParams.get("after")

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

    // Build query
    let query = supabase
      .from("circle_messages")
      .select(`
        *,
        sender:sender_id (id, first_name, avatar_url),
        reply_to:reply_to_id (
          id,
          content,
          sender:sender_id (id, first_name)
        )
      `)
      .eq("circle_id", circleId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(limit)

    // Pagination
    if (before) {
      const { data: beforeMsg } = await supabase
        .from("circle_messages")
        .select("created_at")
        .eq("id", before)
        .single()

      if (beforeMsg) {
        query = query.lt("created_at", beforeMsg.created_at)
      }
    }

    if (after) {
      const { data: afterMsg } = await supabase
        .from("circle_messages")
        .select("created_at")
        .eq("id", after)
        .single()

      if (afterMsg) {
        query = query.gt("created_at", afterMsg.created_at)
        query = query.order("created_at", { ascending: true })
      }
    }

    const { data: messages, error } = await query

    if (error) {
      console.error("Error fetching messages:", error)
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      )
    }

    // Reverse if we got newer messages (after parameter)
    const sortedMessages = after
      ? messages?.reverse()
      : messages

    // Update last read
    await supabase
      .from("circle_message_reads")
      .upsert({
        circle_id: circleId,
        teen_id: teenId,
        last_read_message_id: sortedMessages?.[0]?.id,
        last_read_at: new Date().toISOString(),
      }, {
        onConflict: "circle_id,teen_id",
      })

    // Also update member's last_read_at
    await supabase
      .from("circle_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("circle_id", circleId)
      .eq("teen_id", teenId)

    // Get pinned messages
    const { data: pinnedMessages } = await supabase
      .from("circle_messages")
      .select(`
        *,
        sender:sender_id (id, first_name, avatar_url)
      `)
      .eq("circle_id", circleId)
      .eq("is_pinned", true)
      .eq("is_deleted", false)
      .order("pinned_at", { ascending: false })
      .limit(5)

    return NextResponse.json({
      success: true,
      messages: sortedMessages,
      pinnedMessages,
      hasMore: messages?.length === limit,
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
 * POST /api/teen/circles/messages
 * Send a message or perform message actions
 *
 * Body:
 * - teenId: UUID of the teen
 * - circleId: UUID of the circle
 * - action: 'send' | 'edit' | 'delete' | 'react' | 'unreact' | 'pin' | 'unpin'
 * - For send:
 *   - content, messageType, mediaUrl, replyToId
 * - For edit:
 *   - messageId, content
 * - For delete/pin/unpin:
 *   - messageId
 * - For react/unreact:
 *   - messageId, emoji
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teenId, circleId, action } = body

    if (!teenId || !circleId || !action) {
      return NextResponse.json(
        { error: "teenId, circleId, and action are required" },
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

    if (action === "send") {
      const { content, messageType, mediaUrl, replyToId, metadata } = body

      if (!content && !mediaUrl) {
        return NextResponse.json(
          { error: "content or mediaUrl is required" },
          { status: 400 }
        )
      }

      // Use the database function to send message
      const { data: messageId, error } = await supabase.rpc("send_circle_message", {
        p_circle_id: circleId,
        p_sender_id: teenId,
        p_content: content || "",
        p_message_type: messageType || "text",
        p_media_url: mediaUrl || null,
        p_reply_to_id: replyToId || null,
        p_metadata: metadata || {},
      })

      if (error) {
        console.error("Error sending message:", error)
        return NextResponse.json(
          { error: "Failed to send message" },
          { status: 500 }
        )
      }

      // Get the created message with sender info
      const { data: message } = await supabase
        .from("circle_messages")
        .select(`
          *,
          sender:sender_id (id, first_name, avatar_url),
          reply_to:reply_to_id (
            id,
            content,
            sender:sender_id (id, first_name)
          )
        `)
        .eq("id", messageId)
        .single()

      // Award XP for messaging (small amount, capped daily)
      // This would need a daily cap check in production
      try {
        await supabase.rpc("add_xp_to_user", {
          p_teen_id: teenId,
          p_xp_amount: 1,
          p_source_type: "circle_message",
          p_source_id: messageId,
          p_description: "Message dans un cercle",
        })
      } catch {
        // Ignore if XP cap reached
      }

      return NextResponse.json({
        success: true,
        message,
      })
    }

    if (action === "edit") {
      const { messageId, content } = body

      if (!messageId || !content) {
        return NextResponse.json(
          { error: "messageId and content are required" },
          { status: 400 }
        )
      }

      // Verify ownership
      const { data: existingMessage } = await supabase
        .from("circle_messages")
        .select("sender_id")
        .eq("id", messageId)
        .single()

      if (!existingMessage || existingMessage.sender_id !== teenId) {
        return NextResponse.json(
          { error: "Cannot edit this message" },
          { status: 403 }
        )
      }

      const { data: message, error } = await supabase
        .from("circle_messages")
        .update({
          content,
          is_edited: true,
          edited_at: new Date().toISOString(),
        })
        .eq("id", messageId)
        .select(`
          *,
          sender:sender_id (id, first_name, avatar_url)
        `)
        .single()

      if (error) {
        console.error("Error editing message:", error)
        return NextResponse.json(
          { error: "Failed to edit message" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message,
      })
    }

    if (action === "delete") {
      const { messageId } = body

      if (!messageId) {
        return NextResponse.json(
          { error: "messageId is required" },
          { status: 400 }
        )
      }

      // Verify ownership or admin role
      const { data: existingMessage } = await supabase
        .from("circle_messages")
        .select("sender_id")
        .eq("id", messageId)
        .single()

      const canDelete = existingMessage?.sender_id === teenId ||
        ["owner", "admin", "moderator"].includes(membership.role)

      if (!canDelete) {
        return NextResponse.json(
          { error: "Cannot delete this message" },
          { status: 403 }
        )
      }

      await supabase
        .from("circle_messages")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq("id", messageId)

      return NextResponse.json({
        success: true,
        message: "Message deleted",
      })
    }

    if (action === "react") {
      const { messageId, emoji } = body

      if (!messageId || !emoji) {
        return NextResponse.json(
          { error: "messageId and emoji are required" },
          { status: 400 }
        )
      }

      const { data: reactions } = await supabase.rpc("add_message_reaction", {
        p_message_id: messageId,
        p_teen_id: teenId,
        p_emoji: emoji,
      })

      return NextResponse.json({
        success: true,
        reactions,
      })
    }

    if (action === "unreact") {
      const { messageId, emoji } = body

      if (!messageId || !emoji) {
        return NextResponse.json(
          { error: "messageId and emoji are required" },
          { status: 400 }
        )
      }

      const { data: reactions } = await supabase.rpc("remove_message_reaction", {
        p_message_id: messageId,
        p_teen_id: teenId,
        p_emoji: emoji,
      })

      return NextResponse.json({
        success: true,
        reactions,
      })
    }

    if (action === "pin") {
      const { messageId } = body

      if (!messageId) {
        return NextResponse.json(
          { error: "messageId is required" },
          { status: 400 }
        )
      }

      // Only admins can pin
      if (!["owner", "admin", "moderator"].includes(membership.role)) {
        return NextResponse.json(
          { error: "Not authorized to pin messages" },
          { status: 403 }
        )
      }

      await supabase
        .from("circle_messages")
        .update({
          is_pinned: true,
          pinned_by: teenId,
          pinned_at: new Date().toISOString(),
        })
        .eq("id", messageId)

      return NextResponse.json({
        success: true,
        message: "Message pinned",
      })
    }

    if (action === "unpin") {
      const { messageId } = body

      if (!messageId) {
        return NextResponse.json(
          { error: "messageId is required" },
          { status: 400 }
        )
      }

      if (!["owner", "admin", "moderator"].includes(membership.role)) {
        return NextResponse.json(
          { error: "Not authorized to unpin messages" },
          { status: 403 }
        )
      }

      await supabase
        .from("circle_messages")
        .update({
          is_pinned: false,
          pinned_by: null,
          pinned_at: null,
        })
        .eq("id", messageId)

      return NextResponse.json({
        success: true,
        message: "Message unpinned",
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
