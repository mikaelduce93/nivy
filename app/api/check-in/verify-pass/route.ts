import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

/**
 * Verify VIP Pass QR Code
 * Returns pass holder info and applicable benefits
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Verify admin/partner role
    const { data: adminRole } = await supabase
      .from("admin_roles")
      .select("role")
      .eq("profile_id", user.id)
      .single()

    const { data: partnerRole } = await supabase
      .from("partners")
      .select("id, business_name")
      .eq("user_id", user.id)
      .single()

    if (!adminRole && !partnerRole) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    const { qrData, eventId, partnerId } = await request.json()

    if (!qrData) {
      return NextResponse.json({ error: "QR data requis" }, { status: 400 })
    }

    // Parse QR code - could be:
    // - VIP Pass: VIPPASS:cardNumber:teenId
    // - Event Booking: TEENSPARTY:eventId:bookingId
    // - Legacy format: just the ID

    let passType: "vip_pass" | "event_ticket" | "unknown" = "unknown"
    let identifier = qrData

    if (qrData.startsWith("VIPPASS:")) {
      passType = "vip_pass"
      identifier = qrData.split(":")[1] // Card number
    } else if (qrData.startsWith("TEENSPARTY:")) {
      passType = "event_ticket"
      identifier = qrData.split(":")[2] // Booking ID
    }

    if (passType === "vip_pass") {
      // Verify VIP Pass
      const { data: pass, error: passError } = await supabase
        .from("pass_subscriptions")
        .select(`
          *,
          teen:teen_id (id, first_name, last_name, pseudo, avatar_url, birth_date),
          pass_tier:tier_id (name, discount_percentage, benefits)
        `)
        .eq("card_number", identifier)
        .single()

      if (passError || !pass) {
        return NextResponse.json(
          { error: "Pass VIP non trouvé" },
          { status: 404 }
        )
      }

      // Check if pass is active
      const isActive = pass.status === "active" && new Date(pass.end_date) > new Date()

      if (!isActive) {
        return NextResponse.json({
          success: false,
          error: "Pass expiré ou inactif",
          pass: {
            cardNumber: pass.card_number,
            status: pass.status,
            endDate: pass.end_date,
          },
        })
      }

      // Calculate age
      const birthDate = new Date(pass.teen?.birth_date)
      const age = Math.floor(
        (Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
      )

      // Get applicable benefits for partner/event
      const benefits = pass.pass_tier?.benefits || []
      const discountPercentage = pass.pass_tier?.discount_percentage || 0

      return NextResponse.json({
        success: true,
        type: "vip_pass",
        pass: {
          id: pass.id,
          cardNumber: pass.card_number,
          tier: pass.pass_tier?.name,
          discountPercentage,
          benefits,
          status: pass.status,
          endDate: pass.end_date,
        },
        holder: {
          id: pass.teen?.id,
          name: `${pass.teen?.first_name} ${pass.teen?.last_name}`,
          pseudo: pass.teen?.pseudo,
          avatar: pass.teen?.avatar_url,
          age,
        },
        applicableDiscount: discountPercentage,
        message: `Pass ${pass.pass_tier?.name} valide - ${discountPercentage}% de réduction`,
      })
    }

    if (passType === "event_ticket") {
      // Verify event ticket
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select(`
          *,
          teen:teen_id (id, first_name, last_name, pseudo, avatar_url, birth_date),
          events (title, event_date, venue_name)
        `)
        .eq("id", identifier)
        .single()

      if (bookingError || !booking) {
        return NextResponse.json(
          { error: "Réservation non trouvée" },
          { status: 404 }
        )
      }

      // Check event match if specified
      if (eventId && booking.event_id !== eventId) {
        return NextResponse.json({
          success: false,
          error: "Ce billet n'est pas pour cet événement",
          booking: {
            eventTitle: booking.events?.title,
            eventDate: booking.events?.event_date,
          },
        })
      }

      // Calculate age
      const birthDate = new Date(booking.teen?.birth_date)
      const age = Math.floor(
        (Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
      )

      return NextResponse.json({
        success: true,
        type: "event_ticket",
        booking: {
          id: booking.id,
          reference: booking.booking_reference,
          ticketType: booking.ticket_type,
          status: booking.status,
          paymentStatus: booking.payment_status,
          checkedIn: !!booking.checked_in_at,
          checkedOut: !!booking.checked_out_at,
        },
        event: {
          id: booking.event_id,
          title: booking.events?.title,
          date: booking.events?.event_date,
          venue: booking.events?.venue_name,
        },
        holder: {
          id: booking.teen?.id,
          name: `${booking.teen?.first_name} ${booking.teen?.last_name}`,
          pseudo: booking.teen?.pseudo,
          avatar: booking.teen?.avatar_url,
          age,
        },
        message: booking.checkedIn
          ? "Participant déjà enregistré"
          : "Billet valide - Prêt pour check-in",
      })
    }

    // Unknown format - try to find by reference
    const { data: bookingByRef } = await supabase
      .from("bookings")
      .select("id, booking_reference")
      .eq("booking_reference", identifier)
      .single()

    if (bookingByRef) {
      // Recursively call with proper format
      return POST(
        new NextRequest(request.url, {
          method: "POST",
          body: JSON.stringify({
            qrData: `TEENSPARTY:_:${bookingByRef.id}`,
            eventId,
            partnerId,
          }),
        })
      )
    }

    return NextResponse.json(
      { error: "Format de QR code non reconnu" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[Verify Pass] Error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la vérification" },
      { status: 500 }
    )
  }
}
