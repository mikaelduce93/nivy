/**
 * Circle Message Report API
 * =========================
 *
 * Wave 1C — silent-fail elimination.
 *
 * Canon: docs/canon/social-feed.locked.md §8 + admin-moderation §10 #8/#9.
 *
 * Pre-Wave-1C this route wrote to non-existent tables (`moderation_reports`,
 * `notifications`, `audit_logs`) — every report 500'd or silently dropped.
 *
 * Wave 1C scope (the full `user_reports` social-safety table is Wave 2):
 *   - Audit the report into the canonical `audit_log` with
 *     `action='content_reported'`, `resource_type='circle_message'`,
 *     `resource_id=<message_id>`, `metadata={ reason, reporter_notes, circle_id }`.
 *   - Return 200 to the reporter (their UX should not regress).
 *   - The teen-side moderation queue + admin inbox are Wave 2.
 *
 * POST /api/circles/report — Report a message
 */
import { createClient } from "@/lib/supabase/server"
import { NextRequest } from "next/server"
import { withSecurity, errorResponse, jsonResponse } from "@/lib/security/api-middleware"
import { z } from "zod"

const reportSchema = z.object({
  messageId: z.string().uuid("ID de message invalide"),
  reason: z.enum(
    ["inappropriate", "spam", "harassment", "hate_speech", "personal_info", "other"],
    { errorMap: () => ({ message: "Raison de signalement invalide" }) }
  ),
  details: z.string().max(500, "Détails trop longs (max 500 caractères)").optional(),
})

export const POST = withSecurity(
  async (request: NextRequest) => {
    try {
      const supabase = await createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return errorResponse("Non authentifié", 401)

      const body = await request.json()
      const validation = reportSchema.safeParse(body)
      if (!validation.success) {
        return errorResponse(validation.error.errors[0]?.message || "Données invalides", 400)
      }
      const { messageId, reason, details } = validation.data

      // Resolve the reported message + its circle.
      const { data: message, error: messageError } = await supabase
        .from("circle_messages")
        .select("id, user_id, circle_id, content")
        .eq("id", messageId)
        .eq("is_deleted", false)
        .maybeSingle()

      if (messageError || !message) {
        return errorResponse("Message introuvable", 404)
      }
      if (message.user_id === user.id) {
        return errorResponse("Vous ne pouvez pas signaler votre propre message", 400)
      }

      // Wave 2A: write to canonical user_reports (idempotent on UNIQUE
      // (reporter_user_id, target_type, target_id)) AND audit_log.
      const { error: reportError } = await supabase
        .from("user_reports")
        .insert({
          reporter_user_id: user.id,
          target_type: "circle_message",
          target_id: messageId,
          reason,
          details: details ?? null,
          status: "open",
        })

      if (reportError && reportError.code !== "23505") {
        // 23505 = duplicate (idempotent replay) — accepted.
        console.error("[circles/report] user_reports insert failed:", reportError)
        return errorResponse("Erreur lors du signalement", 500)
      }

      const { error: auditError } = await supabase.from("audit_log").insert({
        actor_id: user.id,
        actor_role: "teen",
        action: "content_reported",
        resource_type: "circle_message",
        resource_id: messageId,
        target_user_id: message.user_id,
        description: `Circle message reported: ${reason}`,
        metadata: {
          reason,
          reporter_notes: details ?? null,
          circle_id: message.circle_id,
        },
      })

      if (auditError) {
        console.error("[circles/report] audit_log insert failed:", auditError)
        return errorResponse("Erreur lors du signalement", 500)
      }

      return jsonResponse({
        success: true,
        message:
          "Merci pour votre signalement. Notre équipe va examiner ce message.",
      })
    } catch (error) {
      console.error("[circles/report] Error:", error)
      return errorResponse("Erreur serveur", 500)
    }
  },
  { rateLimit: "api" }
)
