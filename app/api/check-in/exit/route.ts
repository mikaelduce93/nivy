import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { withSecurity } from "@/lib/security/api-middleware"

export const POST = withSecurity(async (request: NextRequest) => {
  try {
    const { bookingTicketId, eventId, adminId } = await request.json()

    const supabase = await createClient()

    const { data: admin } = await supabase
      .from("admin_roles")
      .select("*")
      .eq("profile_id", adminId)
      .single()

    if (!admin) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

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

    if (!ticket.checked_in) {
      return NextResponse.json(
        { error: "Ce billet n'a pas été scanné à l'entrée" },
        { status: 400 }
      )
    }

    const { data: authorization } = await supabase
      .from("authorizations")
      .select("*")
      .eq("child_id", ticket.child_id)
      .eq("event_id", eventId)
      .eq("is_valid", true)
      .single()

    await supabase
      .from("event_check_ins")
      .update({ checked_out_at: new Date().toISOString() })
      .eq("booking_id", ticket.booking_id)
      .eq("event_id", eventId)
      .is("checked_out_at", null)

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
      hasAuthorization: !!authorization,
      authorizedPerson: authorization?.authorized_person_name,
    })
  } catch (error) {
    console.error("[v0] Check-out error:", error)
    return NextResponse.json(
      { error: "Erreur lors du check-out" },
      { status: 500 }
    )
  }
}, { rateLimit: 'api' })
