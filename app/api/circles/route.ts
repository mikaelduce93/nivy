/**
 * Circles (Community) API
 * =======================
 * Community messaging with auto-moderation and reporting
 *
 * GET /api/circles - Get available circles and messages
 * POST /api/circles - Create a new message
 * DELETE /api/circles - Delete a message (moderation)
 */

import { createClient } from "@/lib/supabase/server"
import { NextRequest } from "next/server"
import { withSecurity, errorResponse, jsonResponse } from "@/lib/security/api-middleware"
import { z } from "zod"

// Validation schemas
const createMessageSchema = z.object({
  circleId: z.string().uuid("ID de cercle invalide"),
  content: z.string().min(1, "Message requis").max(2000, "Message trop long (max 2000 caractères)"),
  replyToId: z.string().uuid().optional(),
})

const deleteMessageSchema = z.object({
  messageId: z.string().uuid("ID de message invalide"),
  reason: z.string().max(500).optional(),
})

// Schema for reporting messages (currently unused but may be used in future)
// const reportMessageSchema = z.object({
//   messageId: z.string().uuid("ID de message invalide"),
//   reason: z.enum([
//     "inappropriate",
//     "spam",
//     "harassment",
//     "hate_speech",
//     "other",
//   ]),
//   details: z.string().max(500).optional(),
// })

// List of forbidden words (would be in database in production)
const FORBIDDEN_WORDS = [
  // Add inappropriate words here - keeping minimal for demo
  "insulte1",
  "insulte2",
  "motinterdit",
]

// List of words to warn about
const WARNING_WORDS: string[] = [
  // Words that might need attention
]

/**
 * Moderate message content
 * @param content - Message content to moderate
 * @returns Moderated content and flags
 */
function moderateContent(content: string): {
  moderatedContent: string
  flagged: boolean
  warnings: string[]
} {
  let moderatedContent = content
  let flagged = false
  const warnings: string[] = []

  // Check for forbidden words (case insensitive)
  FORBIDDEN_WORDS.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi")
    if (regex.test(moderatedContent)) {
      flagged = true
      moderatedContent = moderatedContent.replace(regex, "***")
    }
  })

  // Check for warning words
  WARNING_WORDS.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi")
    if (regex.test(content)) {
      warnings.push(`Message contient le mot "${word}"`)
    }
  })

  // Check for excessive caps (shouting)
  const capsRatio =
    (content.match(/[A-Z]/g) || []).length / content.length
  if (capsRatio > 0.7 && content.length > 10) {
    moderatedContent = moderatedContent.toLowerCase()
    warnings.push("Majuscules excessives détectées")
  }

  // Check for repeated characters
  const repeatedChars = /(.)\1{4,}/g
  if (repeatedChars.test(moderatedContent)) {
    moderatedContent = moderatedContent.replace(repeatedChars, "$1$1$1")
    warnings.push("Caractères répétés détectés")
  }

  // Check for links (basic URL detection)
  const urlRegex = /(https?:\/\/[^\s]+)/gi
  if (urlRegex.test(content)) {
    warnings.push("Lien détecté - sera vérifié manuellement")
  }

  return { moderatedContent, flagged, warnings }
}

/**
 * GET /api/circles
 * Get available circles and their messages
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponse("Non authentifié", 401)
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const circleId = searchParams.get("circleId")
    const limit = parseInt(searchParams.get("limit") || "50")
    const before = searchParams.get("before") // For pagination

    // Get user profile for role/permissions
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, pseudo")
      .eq("id", user.id)
      .single()

    // Get available circles
    const { data: circles, error: circlesError } = await supabase
      .from("circles")
      .select(`
        id,
        name,
        description,
        icon,
        color,
        is_private,
        min_age,
        max_age,
        member_count
      `)
      .eq("is_active", true)
      .order("name")

    if (circlesError) {
      console.error("[Circles API] Error fetching circles:", circlesError)
      return errorResponse("Erreur lors de la récupération des cercles", 500)
    }

    // If specific circle requested, get messages
    let messages: any[] = []
    if (circleId) {
      let messagesQuery = supabase
        .from("circle_messages")
        .select(`
          id,
          content,
          created_at,
          is_edited,
          edited_at,
          reply_to_id,
          author:user_id (
            id,
            pseudo,
            avatar_url,
            role
          ),
          reactions:circle_message_reactions (
            emoji,
            user_id
          ),
          reply_count:circle_messages!reply_to_id (count)
        `)
        .eq("circle_id", circleId)
        .eq("is_deleted", false)
        .is("reply_to_id", null) // Only top-level messages
        .order("created_at", { ascending: false })
        .limit(limit)

      if (before) {
        messagesQuery = messagesQuery.lt("created_at", before)
      }

      const { data: messagesData, error: messagesError } = await messagesQuery

      if (messagesError) {
        console.error("[Circles API] Error fetching messages:", messagesError)
      } else {
        messages = messagesData || []
      }
    }

    // Get user's circle memberships
    const { data: memberships } = await supabase
      .from("circle_members")
      .select("circle_id, role, joined_at")
      .eq("user_id", user.id)

    const membershipMap = new Map(
      memberships?.map((m) => [m.circle_id, m]) || []
    )

    // Format circles with membership info
    const formattedCircles = circles?.map((circle) => ({
      ...circle,
      isMember: membershipMap.has(circle.id),
      membershipRole: membershipMap.get(circle.id)?.role || null,
      joinedAt: membershipMap.get(circle.id)?.joined_at || null,
    }))

    return jsonResponse({
      circles: formattedCircles || [],
      messages,
      userRole: profile?.role,
      hasMore: messages.length === limit,
    })
  } catch (error) {
    console.error("[Circles API] Error:", error)
    return errorResponse("Erreur serveur", 500)
  }
}

/**
 * POST /api/circles
 * Create a new message in a circle
 */
export const POST = withSecurity(
  async (request: NextRequest) => {
    try {
      const supabase = await createClient()

      // Verify authentication
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return errorResponse("Non authentifié", 401)
      }

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, pseudo, is_muted, muted_until")
        .eq("id", user.id)
        .single()

      // Check if user is muted
      if (profile?.is_muted) {
        if (profile.muted_until && new Date(profile.muted_until) > new Date()) {
          return errorResponse(
            `Vous êtes temporairement muet jusqu'au ${new Date(profile.muted_until).toLocaleDateString("fr-FR")}`,
            403
          )
        }
      }

      // Parse and validate request body
      const body = await request.json()
      const validation = createMessageSchema.safeParse(body)

      if (!validation.success) {
        return errorResponse(
          validation.error.errors[0]?.message || "Données invalides",
          400
        )
      }

      const { circleId, content, replyToId } = validation.data

      // Verify circle exists and user has access
      const { data: circle, error: circleError } = await supabase
        .from("circles")
        .select("id, name, is_private")
        .eq("id", circleId)
        .eq("is_active", true)
        .single()

      if (circleError || !circle) {
        return errorResponse("Cercle introuvable", 404)
      }

      // Check membership for private circles
      if (circle.is_private) {
        const { data: membership } = await supabase
          .from("circle_members")
          .select("id")
          .eq("circle_id", circleId)
          .eq("user_id", user.id)
          .single()

        if (!membership) {
          return errorResponse("Vous n'êtes pas membre de ce cercle", 403)
        }
      }

      // Verify reply target exists if replying
      if (replyToId) {
        const { data: replyTarget } = await supabase
          .from("circle_messages")
          .select("id")
          .eq("id", replyToId)
          .eq("circle_id", circleId)
          .eq("is_deleted", false)
          .single()

        if (!replyTarget) {
          return errorResponse("Message de réponse introuvable", 404)
        }
      }

      // Moderate content
      const { moderatedContent, flagged, warnings } = moderateContent(content)

      // Create message
      const { data: message, error: createError } = await supabase
        .from("circle_messages")
        .insert({
          circle_id: circleId,
          user_id: user.id,
          content: moderatedContent,
          original_content: content !== moderatedContent ? content : null,
          reply_to_id: replyToId || null,
          is_flagged: flagged,
          moderation_warnings: warnings.length > 0 ? warnings : null,
          created_at: new Date().toISOString(),
        })
        .select(`
          id,
          content,
          created_at,
          is_flagged,
          author:user_id (
            id,
            pseudo,
            avatar_url
          )
        `)
        .single()

      if (createError) {
        console.error("[Circles API] Error creating message:", createError)
        return errorResponse("Erreur lors de la création du message", 500)
      }

      // If flagged, create moderation alert
      if (flagged) {
        await supabase.from("moderation_alerts").insert({
          message_id: message.id,
          user_id: user.id,
          circle_id: circleId,
          alert_type: "auto_moderated",
          original_content: content,
          moderated_content: moderatedContent,
          created_at: new Date().toISOString(),
        })

        // Notify moderators
        const { data: moderators } = await supabase
          .from("profiles")
          .select("id")
          .in("role", ["admin", "moderator"])

        if (moderators && moderators.length > 0) {
          const notifications = moderators.map((mod) => ({
            user_id: mod.id,
            type: "moderation_alert",
            title: "Message auto-modéré",
            message: `Un message dans ${circle.name} a été automatiquement modéré.`,
            read: false,
            resource_type: "circle_message",
            resource_id: message.id,
            created_at: new Date().toISOString(),
          }))

          await supabase.from("notifications").insert(notifications)
        }
      }

      // Update circle member count and last activity
      await supabase
        .from("circles")
        .update({
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", circleId)

      // Award XP for participation (if teen)
      if (profile?.role === "teen") {
        const { data: currentXP } = await supabase
          .from("user_xp")
          .select("total_xp")
          .eq("teen_id", user.id)
          .single()

        await supabase.from("user_xp").upsert({
          teen_id: user.id,
          total_xp: (currentXP?.total_xp || 0) + 5,
          updated_at: new Date().toISOString(),
        })

        await supabase.from("xp_transactions").insert({
          teen_id: user.id,
          amount: 5,
          type: "community_participation",
          description: `Message dans ${circle.name}`,
          reference_type: "circle_message",
          reference_id: message.id,
          created_at: new Date().toISOString(),
        })
      }

      return jsonResponse({
        success: true,
        message,
        wasModerated: content !== moderatedContent,
        warnings: warnings.length > 0 ? warnings : undefined,
      })
    } catch (error) {
      console.error("[Circles API] Error:", error)
      return errorResponse("Erreur serveur", 500)
    }
  },
  { rateLimit: "api" }
)

/**
 * DELETE /api/circles
 * Delete a message (moderation)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponse("Non authentifié", 401)
    }

    // Get user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    // Parse request body
    const body = await request.json()
    const validation = deleteMessageSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
        validation.error.errors[0]?.message || "Données invalides",
        400
      )
    }

    const { messageId, reason } = validation.data

    // Get message
    const { data: message, error: messageError } = await supabase
      .from("circle_messages")
      .select("id, user_id, circle_id, content")
      .eq("id", messageId)
      .single()

    if (messageError || !message) {
      return errorResponse("Message introuvable", 404)
    }

    // Check permissions
    const isOwner = message.user_id === user.id
    const isModerator = ["admin", "moderator"].includes(profile?.role || "")

    if (!isOwner && !isModerator) {
      return errorResponse("Vous n'êtes pas autorisé à supprimer ce message", 403)
    }

    // Soft delete the message
    const { error: deleteError } = await supabase
      .from("circle_messages")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        deletion_reason: reason || (isModerator && !isOwner ? "moderation" : "user_request"),
      })
      .eq("id", messageId)

    if (deleteError) {
      console.error("[Circles API] Error deleting message:", deleteError)
      return errorResponse("Erreur lors de la suppression", 500)
    }

    // Log moderation action
    if (isModerator && !isOwner) {
      await supabase.from("moderation_logs").insert({
        moderator_id: user.id,
        action: "delete_message",
        target_user_id: message.user_id,
        resource_type: "circle_message",
        resource_id: messageId,
        reason,
        metadata: {
          circle_id: message.circle_id,
          original_content: message.content,
        },
        created_at: new Date().toISOString(),
      })

      // Notify message author
      await supabase.from("notifications").insert({
        user_id: message.user_id,
        type: "message_deleted",
        title: "Message supprimé",
        message: `Votre message a été supprimé par un modérateur.${reason ? ` Raison: ${reason}` : ""}`,
        read: false,
        created_at: new Date().toISOString(),
      })
    }

    return jsonResponse({
      success: true,
      message: "Message supprimé",
    })
  } catch (error) {
    console.error("[Circles API] Error:", error)
    return errorResponse("Erreur serveur", 500)
  }
}
