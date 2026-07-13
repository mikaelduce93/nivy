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

// Forbidden and warning word lists are read from FORBIDDEN_WORDS and
// WARNING_WORDS environment variables (comma-separated). When a real
// moderation pipeline is wired (database-backed), replace this loader.
const FORBIDDEN_WORDS = (process.env.FORBIDDEN_WORDS ?? "")
  .split(",")
  .map((w) => w.trim())
  .filter(Boolean)
const WARNING_WORDS = (process.env.WARNING_WORDS ?? "")
  .split(",")
  .map((w) => w.trim())
  .filter(Boolean)

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

    // Get user profile for role/permissions.
    // NOTE: profiles has no `pseudo` column (it lives on teens). Only `role`
    // is consumed downstream, so we select role alone.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    // Get available circles
    const { data: circles, error: circlesError } = await supabase
      .from("circles")
      // Live circles has `emoji`/`theme_color` (aliased to the client-facing
      // icon/color keys). is_private / min_age / max_age / member_count exist
      // in NO table — dead reads removed (the whole select 500'd at runtime).
      .select(`
        id,
        name,
        description,
        icon:emoji,
        color:theme_color
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
          author:sender_id (
            id,
            pseudo,
            first_name,
            last_name,
            avatar_url
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
        // Author embed resolves through circle_messages.sender_id -> teens.id.
        // teens.pseudo is often NULL in seed, so fall back to the teen's name
        // (canonical COALESCE(pseudo, name) pattern used by get_user_crew).
        messages = (messagesData || []).map((m: any) => ({
          ...m,
          author: m.author
            ? {
                id: m.author.id,
                pseudo:
                  m.author.pseudo ||
                  [m.author.first_name, m.author.last_name]
                    .filter(Boolean)
                    .join(" ") ||
                  "Membre",
                avatar_url: m.author.avatar_url,
              }
            : null,
        }))
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

      // Get user profile (only `role` is consumed; `pseudo` lives on teens,
      // not profiles).
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      // TODO(moderation): no per-circle mute store exists. The previous guard
      // read profiles.is_muted / profiles.muted_until — columns that exist in
      // NO table, so the guard silently always passed (moderation bypass).
      // feed_muted_users is a per-user block list (user_id blocks
      // muted_user_id) with a different scope and cannot gate posting here.
      // Wire a real circle-scoped mute store (e.g. circle_muted_members)
      // before reinstating this guard.

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
        .select("id, name")
        .eq("id", circleId)
        .eq("is_active", true)
        .single()

      if (circleError || !circle) {
        return errorResponse("Cercle introuvable", 404)
      }

      // NOTE: live circles has no privacy column (is_private exists in no
      // table), so the previous private-circle membership gate was a dead
      // read that made every POST 500. All active circles are public.

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

      // Create message.
      // The author FK is circle_messages.sender_id -> teens.id (auth uid).
      // original_content / is_flagged / moderation_warnings have no columns in
      // the live schema, so they are not persisted here (see residual TODO on
      // wiring a real moderation pipeline below).
      const { data: message, error: createError } = await supabase
        .from("circle_messages")
        .insert({
          circle_id: circleId,
          sender_id: user.id,
          content: moderatedContent,
          reply_to_id: replyToId || null,
          created_at: new Date().toISOString(),
        })
        .select(`
          id,
          content,
          created_at,
          author:sender_id (
            id,
            pseudo,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single()

      if (createError) {
        console.error("[Circles API] Error creating message:", createError)
        return errorResponse("Erreur lors de la création du message", 500)
      }

      // Resolve author pseudo via teens (NULL pseudo falls back to name),
      // matching the canonical COALESCE(pseudo, name) pattern.
      const author = (message as any).author
      if (author) {
        ;(message as any).author = {
          id: author.id,
          pseudo:
            author.pseudo ||
            [author.first_name, author.last_name].filter(Boolean).join(" ") ||
            "Membre",
          avatar_url: author.avatar_url,
        }
      }

      // V9 #271 — modération circles : tables moderation_alerts / notifications absentes
      // en base ; écritures fantômes (échec silencieux) retirées. Le contenu est déjà
      // auto-modéré (moderatedContent) à l'insertion et signalé via wasModerated (réponse).
      // TODO(moderation): persister l'alerte + notifier les modérateurs une fois la pipeline câblée.

      // Update circle member count and last activity
      await supabase
        .from("circles")
        .update({
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", circleId)

      // Award XP for participation (if teen).
      //
      // Wave 6J — canonical RPC. Direct user_xp.upsert + xp_transactions
      // insert was a phantom-XP path: it bypassed add_xp_to_user, didn't
      // honour cap / multiplier / level-up triggers, and the read-then-
      // upsert had a race window where two concurrent messages both
      // computed `currentXP + 5` then both wrote the same total
      // (lost-update). The canonical RPC is SECURITY DEFINER and writes
      // xp_transactions atomically.
      if (profile?.role === "teen") {
        const { error: xpErr } = await supabase.rpc("add_xp_to_user", {
          p_teen_id: user.id,
          p_xp_amount: 5,
          p_source_type: "circle_message",
          p_source_category: "community_participation",
          p_source_id: message.id,
          p_description: `Message dans ${circle.name}`,
        })
        if (xpErr) {
          console.error("[circles] add_xp_to_user failed:", xpErr.message)
          // Non-fatal — message already inserted. The XP grant retries
          // on the next interaction; we don't reverse the message.
        }
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
      // Author FK is sender_id (there is no user_id column on circle_messages).
      .select("id, sender_id, circle_id, content")
      .eq("id", messageId)
      .single()

    if (messageError || !message) {
      return errorResponse("Message introuvable", 404)
    }

    // Check permissions
    const isOwner = message.sender_id === user.id
    const isModerator = ["admin", "moderator"].includes(profile?.role || "")

    if (!isOwner && !isModerator) {
      return errorResponse("Vous n'êtes pas autorisé à supprimer ce message", 403)
    }

    // Soft delete the message
    const { error: deleteError } = await supabase
      .from("circle_messages")
      .update({
        // V9 #271 — deleted_by / deletion_reason n'existent pas sur circle_messages
        // (seules is_deleted / deleted_at existent). Soft-delete sur les colonnes réelles.
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", messageId)

    if (deleteError) {
      console.error("[Circles API] Error deleting message:", deleteError)
      return errorResponse("Erreur lors de la suppression", 500)
    }

    // V9 #271 — moderation_logs / notifications n'existent pas en base : écritures
    // fantômes retirées (échec silencieux). À recâbler avec une vraie pipeline de
    // modération (table moderation_logs + table notifications) si priorisé.
    // TODO(moderation): journaliser la suppression + notifier l'auteur (message.sender_id).

    return jsonResponse({
      success: true,
      message: "Message supprimé",
    })
  } catch (error) {
    console.error("[Circles API] Error:", error)
    return errorResponse("Erreur serveur", 500)
  }
}
