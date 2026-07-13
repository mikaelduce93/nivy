/**
 * Parent Live Dashboard API (issue #35)
 * =====================================
 * Real-time presence tracking for a parent's teens, on the canonical schema:
 * parent_teen_links + teens + event_check_ins + events. Early-checkout
 * requests notify staff via user_notifications and are logged in audit_log
 * (no early_checkout_requests / notifications / audit_logs tables exist).
 *
 * GET  /api/parent/live  — real-time status of the parent's teens
 * POST /api/parent/live  — request early checkout
 */

import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NextRequest } from "next/server"
import { withSecurity, errorResponse, jsonResponse } from "@/lib/security/api-middleware"
import { parentSignedLocationConsent, allowedTeenIdsForLocation } from "@/lib/teens/location-consent"
import { z } from "zod"

const earlyCheckoutSchema = z.object({
  bookingId: z.string().uuid("ID de réservation invalide"),
  reason: z.string().min(5, "Raison requise (min 5 caractères)").max(500),
  requestedTime: z.string().datetime().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return errorResponse("Non authentifié", 401)

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    if (profile?.role !== "parent") return errorResponse("Accès réservé aux parents", 403)

    // Geolocation consent gate (loi 09-08/CNDP): the parent must have SIGNED
    // the parental authorization WITH explicit location consent to see ANY
    // teen's presence/location. Without the baseline, expose nothing — return
    // a flag so the UI can prompt the parent to enable it in their authorization.
    if (!(await parentSignedLocationConsent(supabase, user.id))) {
      return jsonResponse({
        teens: [],
        recentActivity: [],
        locationConsentRequired: true,
        timestamp: new Date().toISOString(),
      })
    }

    const { searchParams } = new URL(request.url)
    const teenIdParam = searchParams.get("teenId")

    // Cross-teen reads scoped to this parent's linked teens → service-role.
    const sr = createServiceRoleClient()

    // #35 — parent→teen link lives in parent_teen_links (not profiles.parent_id).
    const { data: links } = await sr
      .from("parent_teen_links")
      .select("teen_id")
      .eq("parent_id", user.id)
      .eq("status", "active")

    const linkedIds = (links ?? []).map((l) => l.teen_id as string)
    const requested = teenIdParam ? linkedIds.filter((id) => id === teenIdParam) : linkedIds
    // Per-teen revocation: only show location for teens the parent hasn't revoked.
    const allowedIds = await allowedTeenIdsForLocation(sr, user.id, requested)
    const teenIds = requested.filter((id) => allowedIds.has(id))

    if (teenIds.length === 0) {
      return jsonResponse({ teens: [], recentActivity: [], timestamp: new Date().toISOString() })
    }

    const { data: teens } = await sr
      .from("teens")
      .select("id, first_name, last_name, pseudo, avatar_url, date_of_birth")
      .in("id", teenIds)

    // Presence + timeline from event_check_ins (canonical), with the event.
    const { data: checkIns } = await sr
      .from("event_check_ins")
      .select(
        "id, teen_id, event_id, checked_in_at, checked_out_at, events(id, title, event_date, address, city, image_url)"
      )
      .in("teen_id", teenIds)
      .order("checked_in_at", { ascending: false })
      .limit(50)

    const teenStatus = (teens ?? []).map((teen) => {
      const ci = (checkIns ?? []).filter((c) => c.teen_id === teen.id)
      const open = ci.find((c) => c.checked_in_at && !c.checked_out_at)
      let status: "home" | "checked_in" | "checked_out" = "home"
      let currentEvent: unknown = null
      if (open) {
        status = "checked_in"
        currentEvent = open.events
      } else if (ci[0]?.checked_out_at) {
        status = "checked_out"
      }
      return {
        id: teen.id,
        name: `${teen.first_name ?? ""} ${teen.last_name ?? ""}`.trim(),
        pseudo: teen.pseudo,
        avatar_url: teen.avatar_url,
        date_of_birth: teen.date_of_birth,
        status,
        currentEvent,
        lastActivity: ci[0] ?? null,
        activeCheckIn: open
          ? { id: open.id, eventId: open.event_id, checkedInAt: open.checked_in_at }
          : null,
      }
    })

    return jsonResponse({
      teens: teenStatus,
      recentActivity: checkIns ?? [],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Live Dashboard] Error:", error)
    return errorResponse("Erreur serveur", 500)
  }
}

export const POST = withSecurity(
  async (request: NextRequest) => {
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return errorResponse("Non authentifié", 401)

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single()
      if (profile?.role !== "parent") return errorResponse("Accès réservé aux parents", 403)

      const body = await request.json()
      const validation = earlyCheckoutSchema.safeParse(body)
      if (!validation.success) {
        return errorResponse(validation.error.errors[0]?.message || "Données invalides", 400)
      }
      const { bookingId, reason, requestedTime } = validation.data

      const sr = createServiceRoleClient()

      // Resolve the booking → event + the teen (via booking_tickets, #25).
      const { data: booking } = await sr
        .from("bookings")
        .select("id, event_id, booking_reference, events(title)")
        .eq("id", bookingId)
        .maybeSingle()
      if (!booking) return errorResponse("Réservation introuvable", 404)
      // event_id is nullable in the schema; without an event there is no
      // check-in to end, so the early-checkout request has no target.
      const eventId = booking.event_id
      if (!eventId) return errorResponse("Réservation sans événement associé", 400)

      const { data: ticket } = await sr
        .from("booking_tickets")
        .select("child_id")
        .eq("booking_id", bookingId)
        .limit(1)
        .maybeSingle()
      const teenId = ticket?.child_id as string | undefined
      if (!teenId) return errorResponse("Billet introuvable pour cette réservation", 404)

      // The parent must be linked to this teen.
      const { data: link } = await sr
        .from("parent_teen_links")
        .select("id")
        .eq("parent_id", user.id)
        .eq("teen_id", teenId)
        .eq("status", "active")
        .maybeSingle()
      if (!link) return errorResponse("Vous n'êtes pas autorisé pour cette réservation", 403)

      // Presence: the teen must be currently checked in (event_check_ins).
      const { data: openCheckIn } = await sr
        .from("event_check_ins")
        .select("id")
        .eq("teen_id", teenId)
        .eq("event_id", eventId)
        .not("checked_in_at", "is", null)
        .is("checked_out_at", null)
        .maybeSingle()
      if (!openCheckIn) {
        return errorResponse("L'enfant n'est pas actuellement présent à l'événement", 400)
      }

      const event = Array.isArray(booking.events) ? booking.events[0] : booking.events
      const eventTitle = event?.title ?? "l'événement"

      // Notify staff (admins) via user_notifications (real columns).
      const { data: staffUsers } = await sr
        .from("profiles")
        .select("id")
        .eq("role", "admin")

      if (staffUsers && staffUsers.length > 0) {
        const rows = staffUsers.map((staff) => ({
          user_id: staff.id,
          title: "Demande de sortie anticipée",
          body: `${profile?.full_name ?? "Un parent"} demande une sortie anticipée pour ${eventTitle}. Raison : ${reason}`,
          priority: "high",
          action_url: "/admin/check-in",
          data: {
            kind: "early_checkout_request",
            booking_id: bookingId,
            teen_id: teenId,
            event_id: eventId,
            requested_time: requestedTime ?? new Date().toISOString(),
          },
        }))
        await sr.from("user_notifications").insert(rows)
      }

      // Audit (canonical audit_log columns).
      await sr.from("audit_log").insert({
        actor_id: user.id,
        actor_role: "parent",
        action: "early_checkout_request",
        resource_type: "booking",
        resource_id: bookingId,
        target_user_id: teenId,
        description: `Sortie anticipée demandée pour ${eventTitle}`,
        metadata: { reason, requested_time: requestedTime ?? null, event_id: eventId },
        created_at: new Date().toISOString(),
      })

      return jsonResponse({
        success: true,
        message:
          "Demande de sortie anticipée envoyée. Le staff sera notifié pour autoriser la sortie.",
      })
    } catch (error) {
      console.error("[Live Dashboard] Error:", error)
      return errorResponse("Erreur serveur", 500)
    }
  },
  { rateLimit: "api" }
)
