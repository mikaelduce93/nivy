import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { toDataURL } from "qrcode"
import { randomBytes } from "node:crypto"
import { validateCSRFToken } from "@/lib/security/csrf"
import { rateLimit, RATE_LIMITS } from "@/lib/security/rate-limiter"
import { checkTeenBudget } from "@/lib/budget/check-budget"
import { withSupabaseTimeout } from "@/lib/supabase/wrapper"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.booking)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: "Trop de requêtes",
          message: "Vous effectuez trop de requêtes en peu de temps. Veuillez patienter quelques instants avant de réessayer.",
          suggestion: "Attendez 30 secondes puis réessayez. Cela nous aide à protéger le service.",
        },
        { status: 429 }
      )
    }

    // CSRF validation
    const isValidCSRF = await validateCSRFToken(request)
    if (!isValidCSRF) {
      return NextResponse.json(
        { 
          error: "Sécurité",
          message: "Votre session de sécurité a expiré. C'est normal après quelques minutes d'inactivité.",
          suggestion: "Rafraîchissez la page pour obtenir un nouveau token de sécurité.",
        },
        { status: 403 }
      )
    }
    const supabase = await createClient()
    const formData = await request.formData()

    const {
      data: { user },
    } = await withSupabaseTimeout(supabase.auth.getUser(), 'auth.getUser', 10000)

    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }

    const eventId = formData.get("eventId") as string
    const childId = formData.get("childId") as string
    const ticketType = formData.get("ticketType") as string
    const price = Number.parseFloat(formData.get("price") as string)

    // Check budget limits for the teen
    const budgetCheck = await checkTeenBudget(childId, user.id, price)

    if (!budgetCheck.allowed) {
      if (budgetCheck.requiresApproval) {
        // Create pending approval request instead of booking
        const { data: approvalRequest, error: approvalError } = await supabase
          .from("booking_approval_requests")
          .insert({
            parent_id: user.id,
            teen_id: childId,
            event_id: eventId,
            ticket_type: ticketType,
            price: price,
            status: "pending",
            reason: budgetCheck.reason,
            created_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (approvalError) {
          console.error("Approval request error:", approvalError)
          return NextResponse.redirect(
            new URL("/agenda?error=approval_failed", request.url)
          )
        }

        // Notify parent (send notification)
        await supabase.from("notifications").insert({
          user_id: user.id,
          type: "approval_required",
          title: "Approbation requise",
          message: `Une réservation de ${price} DH nécessite votre approbation.`,
          read: false,
          metadata: { approval_request_id: approvalRequest.id },
          created_at: new Date().toISOString(),
        })

        return NextResponse.redirect(
          new URL(`/reservation/approbation?request=${approvalRequest.id}`, request.url)
        )
      }

      // Budget exceeded and no approval possible
      return NextResponse.redirect(
        new URL(
          `/agenda?error=budget_exceeded&message=${encodeURIComponent(budgetCheck.reason || "Budget dépassé")}`,
          request.url
        )
      )
    }

    // Generate booking reference using a cryptographically strong suffix.
    // 4 random bytes encoded in base36 collapses to ~6 chars, kept short for readability.
    const bookingSuffix = randomBytes(4).toString("hex").toUpperCase()
    const bookingReference = `TP${Date.now().toString(36).toUpperCase()}${bookingSuffix}`

    // Generate QR code for booking
    const bookingQrData = JSON.stringify({
      booking_ref: bookingReference,
      event_id: eventId,
      parent_id: user.id,
      timestamp: new Date().toISOString(),
    })
    const bookingQrCode = await toDataURL(bookingQrData)

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        event_id: eventId,
        parent_id: user.id,
        booking_reference: bookingReference,
        qr_code: bookingQrCode,
        total_amount: price,
        payment_status: "pending", // Changed from "paid" to "pending"
        status: "pending_payment", // Changed from "confirmed"
      })
      .select()
      .single()

    if (bookingError) throw bookingError

    // Generate QR code for individual ticket
    const ticketQrData = JSON.stringify({
      booking_ref: bookingReference,
      ticket_id: `${booking.id}-${childId}`,
      event_id: eventId,
      child_id: childId,
      ticket_type: ticketType,
      timestamp: new Date().toISOString(),
    })
    const ticketQrCode = await toDataURL(ticketQrData)

    // Create booking ticket
    const { error: ticketError } = await supabase.from("booking_tickets").insert({
      booking_id: booking.id,
      child_id: childId,
      ticket_type: ticketType,
      price: price,
      qr_code: ticketQrCode,
    })

    if (ticketError) throw ticketError

    return NextResponse.redirect(new URL(`/reservation/paiement?booking=${booking.id}`, request.url))
  } catch (error) {
    console.error("[v0] Booking creation error:", error)
    return NextResponse.redirect(new URL("/agenda?error=booking_failed", request.url))
  }
}
