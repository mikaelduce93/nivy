/**
 * Circle Message Report API
 * =========================
 * Report inappropriate messages for moderation review
 *
 * POST /api/circles/report - Report a message
 */

import { createClient } from "@/lib/supabase/server"
import { NextRequest } from "next/server"
import { withSecurity, errorResponse, jsonResponse } from "@/lib/security/api-middleware"
import { z } from "zod"

// Validation schema for report
const reportSchema = z.object({
  messageId: z.string().uuid("ID de message invalide"),
  reason: z.enum(
    ["inappropriate", "spam", "harassment", "hate_speech", "personal_info", "other"],
    { errorMap: () => ({ message: "Raison de signalement invalide" }) }
  ),
  details: z.string().max(500, "Détails trop longs (max 500 caractères)").optional(),
})

// Reason labels in French
const REASON_LABELS: Record<string, string> = {
  inappropriate: "Contenu inapproprié",
  spam: "Spam ou publicité",
  harassment: "Harcèlement",
  hate_speech: "Discours haineux",
  personal_info: "Informations personnelles",
  other: "Autre",
}

/**
 * POST /api/circles/report
 * Report a message for moderation
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

      // Parse and validate request body
      const body = await request.json()
      const validation = reportSchema.safeParse(body)

      if (!validation.success) {
        return errorResponse(
          validation.error.errors[0]?.message || "Données invalides",
          400
        )
      }

      const { messageId, reason, details } = validation.data

      // Get message
      const { data: message, error: messageError } = await supabase
        .from("circle_messages")
        .select(`
          id,
          user_id,
          circle_id,
          content,
          circles (name)
        `)
        .eq("id", messageId)
        .eq("is_deleted", false)
        .single()

      if (messageError || !message) {
        return errorResponse("Message introuvable", 404)
      }

      // Can't report your own message
      if (message.user_id === user.id) {
        return errorResponse("Vous ne pouvez pas signaler votre propre message", 400)
      }

      // Check for existing report from this user
      const { data: existingReport } = await supabase
        .from("moderation_reports")
        .select("id")
        .eq("message_id", messageId)
        .eq("reporter_id", user.id)
        .single()

      if (existingReport) {
        return errorResponse("Vous avez déjà signalé ce message", 400)
      }

      // Create report
      const { data: report, error: reportError } = await supabase
        .from("moderation_reports")
        .insert({
          message_id: messageId,
          reporter_id: user.id,
          reported_user_id: message.user_id,
          circle_id: message.circle_id,
          reason,
          details,
          message_content: message.content,
          status: "pending",
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (reportError) {
        console.error("[Report API] Error creating report:", reportError)
        return errorResponse("Erreur lors du signalement", 500)
      }

      // Count reports for this message
      const { count: reportCount } = await supabase
        .from("moderation_reports")
        .select("id", { count: "exact" })
        .eq("message_id", messageId)
        .eq("status", "pending")

      // If message has 3+ reports, auto-hide it
      if (reportCount && reportCount >= 3) {
        await supabase
          .from("circle_messages")
          .update({
            is_hidden: true,
            hidden_reason: "multiple_reports",
            hidden_at: new Date().toISOString(),
          })
          .eq("id", messageId)
      }

      // Notify admins/moderators
      const { data: moderators } = await supabase
        .from("profiles")
        .select("id")
        .in("role", ["admin", "moderator"])

      if (moderators && moderators.length > 0) {
        const notifications = moderators.map((mod) => ({
          user_id: mod.id,
          type: "moderation_report",
          title: "Nouveau signalement",
          message: `Un message dans ${(message as unknown as { circles?: { name?: string } | null }).circles?.name || "un cercle"} a été signalé: ${REASON_LABELS[reason]}`,
          read: false,
          resource_type: "moderation_report",
          resource_id: report.id,
          created_at: new Date().toISOString(),
        }))

        await supabase.from("notifications").insert(notifications)
      }

      // Log the action
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "report_message",
        resource_type: "circle_message",
        resource_id: messageId,
        details: {
          reason,
          details,
          circle_id: message.circle_id,
        },
        created_at: new Date().toISOString(),
      })

      return jsonResponse({
        success: true,
        reportId: report.id,
        message: "Merci pour votre signalement. Notre équipe va examiner ce message.",
      })
    } catch (error) {
      console.error("[Report API] Error:", error)
      return errorResponse("Erreur serveur", 500)
    }
  },
  { rateLimit: "api" }
)
