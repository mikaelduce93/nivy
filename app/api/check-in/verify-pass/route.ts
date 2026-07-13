import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { resolvePartnerByEmail } from "@/lib/auth/resolve-partner"
import { NextRequest, NextResponse } from "next/server"

/**
 * Verify VIP Pass / event ticket QR (issue #36).
 *
 * Rewritten onto the real schema:
 *  - partner resolved via partners.email == user.email (company_name);
 *  - VIP pass mapped to the real `vip_cards` table (#27) by card_number;
 *  - event ticket resolved from bookings (+ booking_tickets for the teen,
 *    events.venue_id), check-in state derived from event_check_ins.
 */
const ageFrom = (dob?: string | null): number | null =>
  dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365)) : null

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Authz: admin OR partner (partners keyed by email, label company_name).
    const { data: adminRole } = await supabase
      .from("admin_roles")
      .select("role")
      .eq("profile_id", user.id)
      .maybeSingle()
    // #37 — partner identity = partners.email == profiles.email (no user_id).
    const partnerRole = await resolvePartnerByEmail(supabase, user.email)

    if (!adminRole && !partnerRole) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    const { qrData, eventId } = await request.json()
    if (!qrData) {
      return NextResponse.json({ error: "QR data requis" }, { status: 400 })
    }

    // Authz passed; cross-user reads use the service-role client.
    const sr = createServiceRoleClient()

    let passType: "vip_pass" | "event_ticket" | "unknown" = "unknown"
    let identifier: string = qrData
    if (qrData.startsWith("VIPPASS:")) {
      passType = "vip_pass"
      identifier = qrData.split(":")[1] // card number
    } else if (qrData.startsWith("TEENSPARTY:")) {
      passType = "event_ticket"
      identifier = qrData.split(":")[2] // booking id
    } else {
      // Unknown format → try resolving as a booking_reference.
      const { data: byRef } = await sr
        .from("bookings")
        .select("id")
        .eq("booking_reference", identifier)
        .maybeSingle()
      if (byRef) {
        passType = "event_ticket"
        identifier = byRef.id
      }
    }

    if (passType === "vip_pass") {
      // #36/#27 — VIP pass lives in vip_cards (card_type/expiry_date/status).
      const { data: card } = await sr
        .from("vip_cards")
        .select("id, card_number, card_type, status, expiry_date, discount_percentage, benefits, profile_id")
        .eq("card_number", identifier)
        .maybeSingle()

      if (!card) {
        return NextResponse.json({ error: "Pass VIP non trouvé" }, { status: 404 })
      }

      const isActive = card.status === "active" && new Date(card.expiry_date) > new Date()
      if (!isActive) {
        return NextResponse.json({
          success: false,
          error: "Pass expiré ou inactif",
          pass: { cardNumber: card.card_number, status: card.status, endDate: card.expiry_date },
        })
      }

      const { data: teen } = await sr
        .from("teens")
        .select("id, first_name, last_name, pseudo, avatar_url, date_of_birth")
        .eq("id", card.profile_id)
        .maybeSingle()

      const discountPercentage = Number(card.discount_percentage) || 0
      return NextResponse.json({
        success: true,
        type: "vip_pass",
        pass: {
          id: card.id,
          cardNumber: card.card_number,
          tier: card.card_type,
          discountPercentage,
          benefits: card.benefits ?? [],
          status: card.status,
          endDate: card.expiry_date,
        },
        holder: {
          id: teen?.id ?? card.profile_id,
          name: teen ? `${teen.first_name ?? ""} ${teen.last_name ?? ""}`.trim() : undefined,
          pseudo: teen?.pseudo,
          avatar: teen?.avatar_url,
          age: ageFrom(teen?.date_of_birth),
        },
        applicableDiscount: discountPercentage,
        message: `Pass ${card.card_type} valide - ${discountPercentage}% de réduction`,
      })
    }

    if (passType === "event_ticket") {
      const { data: booking } = await sr
        .from("bookings")
        .select("id, booking_reference, status, payment_status, event_id, events(title, event_date, venue_id)")
        .eq("id", identifier)
        .maybeSingle()

      if (!booking) {
        return NextResponse.json({ error: "Réservation non trouvée" }, { status: 404 })
      }

      const event = Array.isArray(booking.events) ? booking.events[0] : booking.events

      if (eventId && booking.event_id !== eventId) {
        return NextResponse.json({
          success: false,
          error: "Ce billet n'est pas pour cet événement",
          booking: { eventTitle: event?.title, eventDate: event?.event_date },
        })
      }

      // Resolve the teen via the first ticket of this booking (booking_tickets.child_id).
      const { data: ticket } = await sr
        .from("booking_tickets")
        .select("child_id, ticket_type")
        .eq("booking_id", booking.id)
        .limit(1)
        .maybeSingle()

      const { data: teen } = ticket?.child_id
        ? await sr
            .from("teens")
            .select("id, first_name, last_name, pseudo, avatar_url, date_of_birth")
            .eq("id", ticket.child_id)
            .maybeSingle()
        : { data: null }

      // Check-in state from event_check_ins (no checked_in_at on bookings).
      let checkedIn = false
      let checkedOut = false
      if (ticket?.child_id && booking.event_id) {
        const { data: ci } = await sr
          .from("event_check_ins")
          .select("checked_in_at, checked_out_at")
          .eq("event_id", booking.event_id)
          .eq("teen_id", ticket.child_id)
          .order("checked_in_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        checkedIn = !!ci?.checked_in_at
        checkedOut = !!ci?.checked_out_at
      }

      return NextResponse.json({
        success: true,
        type: "event_ticket",
        booking: {
          id: booking.id,
          reference: booking.booking_reference,
          ticketType: ticket?.ticket_type ?? null,
          status: booking.status,
          paymentStatus: booking.payment_status,
          checkedIn,
          checkedOut,
        },
        event: {
          id: booking.event_id,
          title: event?.title,
          date: event?.event_date,
          venue: event?.venue_id,
        },
        holder: {
          id: teen?.id,
          name: teen ? `${teen.first_name ?? ""} ${teen.last_name ?? ""}`.trim() : undefined,
          pseudo: teen?.pseudo,
          avatar: teen?.avatar_url,
          age: ageFrom(teen?.date_of_birth),
        },
        message: checkedIn ? "Participant déjà enregistré" : "Billet valide - Prêt pour check-in",
      })
    }

    return NextResponse.json({ error: "Format de QR code non reconnu" }, { status: 400 })
  } catch (error) {
    console.error("[Verify Pass] Error:", error)
    return NextResponse.json({ error: "Erreur lors de la vérification" }, { status: 500 })
  }
}
