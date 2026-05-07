import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { withSecurity } from "@/lib/security/api-middleware"

export const POST = withSecurity(async (request: NextRequest) => {
  try {
    const { bookingTicketId, eventId, checkInMethod } = await request.json()

    const supabase = await createClient()

    // Wave-A audit: never trust a client-supplied adminId. Bind to auth.getUser().
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { data: admin } = await supabase
      .from("admin_roles")
      .select("*")
      .eq("profile_id", user.id)
      .maybeSingle()

    if (!admin) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }
    const adminId = user.id

    const { data: ticket } = await supabase
      .from("booking_tickets")
      .select(`
        *,
        booking:bookings(booking_reference, parent_id),
        child:children(prenom, nom, date_naissance)
      `)
      .eq("id", bookingTicketId)
      .single()

    if (!ticket) {
      return NextResponse.json({ error: "Billet non trouvé" }, { status: 404 })
    }

    if (ticket.checked_in) {
      return NextResponse.json(
        { error: "Ce billet a déjà été scanné" },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase
      .from("booking_tickets")
      .update({
        checked_in: true,
        checked_in_at: new Date().toISOString(),
      })
      .eq("id", bookingTicketId)

    if (updateError) {
      throw updateError
    }

    await supabase.from("event_check_ins").insert({
      event_id: eventId,
      booking_id: ticket.booking_id,
      teen_id: ticket.child_id,
      checked_in_by: adminId,
      check_in_method: checkInMethod || "qr_scan",
    })

    const { data: parent } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", ticket.booking.parent_id)
      .single()

    const age = Math.floor(
      (new Date().getTime() - new Date(ticket.child.date_naissance).getTime()) /
        (1000 * 60 * 60 * 24 * 365)
    )

    return NextResponse.json({
      success: true,
      childName: `${ticket.child.prenom} ${ticket.child.nom}`,
      age,
      ticketType: ticket.ticket_type,
      parentName: parent?.full_name,
      parentPhone: parent?.phone,
      photoConsent: true,
    })
  } catch (error) {
    console.error("[v0] Check-in error:", error)
    return NextResponse.json(
      { error: "Erreur lors du check-in" },
      { status: 500 }
    )
  }
}, { rateLimit: 'api' })
