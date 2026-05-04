/**
 * Parent Live Dashboard API
 * =========================
 * Real-time status and check-in/check-out tracking for parent's teens
 *
 * GET /api/parent/live - Get real-time status of teens
 * POST /api/parent/live - Request early checkout
 */

import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { withSecurity, errorResponse, jsonResponse } from "@/lib/security/api-middleware"
import { z } from "zod"

// Validation schema for early checkout request
const earlyCheckoutSchema = z.object({
  bookingId: z.string().uuid("ID de réservation invalide"),
  reason: z.string().min(5, "Raison requise (min 5 caractères)").max(500),
  requestedTime: z.string().datetime().optional(),
})

/**
 * GET /api/parent/live
 * Get real-time status of parent's teens
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

    // Verify user is a parent
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "parent") {
      return errorResponse("Accès réservé aux parents", 403)
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const teenId = searchParams.get("teenId")

    // Get parent's teens
    const { data: teens, error: teensError } = await supabase
      .from("profiles")
      .select(`
        id,
        pseudo,
        full_name,
        avatar_url,
        date_of_birth
      `)
      .eq("parent_id", user.id)
      .eq("role", "teen")

    if (teensError) {
      console.error("[Live Dashboard] Error fetching teens:", teensError)
      return errorResponse("Erreur lors de la récupération des enfants", 500)
    }

    if (!teens || teens.length === 0) {
      return jsonResponse({
        teens: [],
        activeBookings: [],
        recentActivity: [],
      })
    }

    const teenIds = teenId ? [teenId] : teens.map((t) => t.id)

    // Get active bookings with check-in status (today and future)
    const today = new Date().toISOString().split("T")[0]

    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        id,
        booking_reference,
        status,
        checked_in_at,
        checked_out_at,
        created_at,
        events (
          id,
          title,
          date,
          start_time,
          end_time,
          location,
          image_url
        ),
        booking_tickets (
          child_id,
          profiles:child_id (
            id,
            pseudo,
            full_name,
            avatar_url
          )
        )
      `)
      .eq("parent_id", user.id)
      .in("status", ["confirmed", "checked_in"])
      .gte("events.date", today)
      .order("events.date", { ascending: true })

    if (bookingsError) {
      console.error("[Live Dashboard] Error fetching bookings:", bookingsError)
    }

    // Get recent check-in/check-out logs
    const { data: checkInLogs, error: logsError } = await supabase
      .from("check_in_logs")
      .select(`
        id,
        action,
        timestamp,
        notes,
        booking_id,
        bookings (
          booking_reference,
          events (
            title
          )
        ),
        profiles:teen_id (
          id,
          pseudo,
          full_name,
          avatar_url
        )
      `)
      .in("teen_id", teenIds)
      .order("timestamp", { ascending: false })
      .limit(20)

    if (logsError) {
      console.error("[Live Dashboard] Error fetching logs:", logsError)
    }

    // Get pending early checkout requests
    const { data: checkoutRequests } = await supabase
      .from("early_checkout_requests")
      .select(`
        id,
        status,
        reason,
        requested_time,
        created_at,
        booking_id,
        bookings (
          booking_reference,
          events (
            title
          )
        )
      `)
      .eq("parent_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    // Calculate status for each teen
    const teenStatus = teens.map((teen) => {
      // Find active booking for this teen
      const activeBooking = bookings?.find((b) =>
        b.booking_tickets?.some((t: any) => t.child_id === teen.id)
      )

      let status: "home" | "checked_in" | "checked_out" | "unknown" = "home"
      let currentEvent = null
      let lastActivity = null

      if (activeBooking) {
        if (activeBooking.checked_in_at && !activeBooking.checked_out_at) {
          status = "checked_in"
          currentEvent = activeBooking.events
        } else if (activeBooking.checked_out_at) {
          status = "checked_out"
        }
      }

      // Get last activity for this teen
      const teenLogs = checkInLogs?.filter(
        (log: any) => log.profiles?.id === teen.id
      )
      if (teenLogs && teenLogs.length > 0) {
        lastActivity = teenLogs[0]
      }

      return {
        ...teen,
        status,
        currentEvent,
        lastActivity,
        activeBooking: activeBooking
          ? {
              id: activeBooking.id,
              reference: activeBooking.booking_reference,
              checkedInAt: activeBooking.checked_in_at,
              checkedOutAt: activeBooking.checked_out_at,
            }
          : null,
      }
    })

    // Format bookings for response
    const formattedBookings =
      bookings?.map((booking) => ({
        id: booking.id,
        reference: booking.booking_reference,
        status: booking.status,
        checkedInAt: booking.checked_in_at,
        checkedOutAt: booking.checked_out_at,
        event: booking.events,
        teens: booking.booking_tickets?.map((t: any) => t.profiles) || [],
      })) || []

    return jsonResponse({
      teens: teenStatus,
      activeBookings: formattedBookings,
      recentActivity: checkInLogs || [],
      pendingCheckoutRequests: checkoutRequests || [],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Live Dashboard] Error:", error)
    return errorResponse("Erreur serveur", 500)
  }
}

/**
 * POST /api/parent/live
 * Request early checkout for a teen
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

      // Verify user is a parent
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single()

      if (profile?.role !== "parent") {
        return errorResponse("Accès réservé aux parents", 403)
      }

      // Parse and validate request body
      const body = await request.json()
      const validation = earlyCheckoutSchema.safeParse(body)

      if (!validation.success) {
        return errorResponse(
          validation.error.errors[0]?.message || "Données invalides",
          400
        )
      }

      const { bookingId, reason, requestedTime } = validation.data

      // Verify booking belongs to parent and is currently checked in
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select(`
          *,
          events (
            id,
            title,
            date,
            end_time
          ),
          booking_tickets (
            child_id,
            profiles:child_id (
              pseudo,
              full_name
            )
          )
        `)
        .eq("id", bookingId)
        .eq("parent_id", user.id)
        .single()

      if (bookingError || !booking) {
        return errorResponse("Réservation introuvable", 404)
      }

      // Check if teen is currently checked in
      if (!booking.checked_in_at) {
        return errorResponse("L'enfant n'est pas encore arrivé à l'événement", 400)
      }

      if (booking.checked_out_at) {
        return errorResponse("L'enfant a déjà quitté l'événement", 400)
      }

      // Check for existing pending request
      const { data: existingRequest } = await supabase
        .from("early_checkout_requests")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("status", "pending")
        .single()

      if (existingRequest) {
        return errorResponse(
          "Une demande de sortie anticipée est déjà en cours pour cette réservation",
          400
        )
      }

      // Create early checkout request
      const { data: checkoutRequest, error: createError } = await supabase
        .from("early_checkout_requests")
        .insert({
          booking_id: bookingId,
          parent_id: user.id,
          reason,
          requested_time: requestedTime || new Date().toISOString(),
          status: "pending",
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (createError) {
        console.error("[Live Dashboard] Error creating checkout request:", createError)
        return errorResponse("Erreur lors de la création de la demande", 500)
      }

      // Get staff/admin users to notify
      const { data: staffUsers } = await supabase
        .from("profiles")
        .select("id")
        .in("role", ["admin", "staff"])

      // Send notifications to staff
      if (staffUsers && staffUsers.length > 0) {
        const teenNames =
          booking.booking_tickets
            ?.map((t: any) => t.profiles?.pseudo || t.profiles?.full_name)
            .join(", ") || "Enfant"

        const notifications = staffUsers.map((staff) => ({
          user_id: staff.id,
          type: "early_checkout_request",
          title: "Demande de sortie anticipée",
          message: `${profile?.full_name} demande une sortie anticipée pour ${teenNames} à ${booking.events?.title}. Raison: ${reason}`,
          read: false,
          resource_type: "early_checkout_request",
          resource_id: checkoutRequest.id,
          created_at: new Date().toISOString(),
        }))

        await supabase.from("notifications").insert(notifications)
      }

      // Log the action
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "early_checkout_request",
        resource_type: "booking",
        resource_id: bookingId,
        details: {
          reason,
          requestedTime,
          eventTitle: booking.events?.title,
        },
        created_at: new Date().toISOString(),
      })

      return jsonResponse({
        success: true,
        requestId: checkoutRequest.id,
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
