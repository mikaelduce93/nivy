import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get("reference")
    const eventId = searchParams.get("eventId")

    if (!reference) {
      return NextResponse.json(
        { error: "Référence de réservation requise" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { data: adminRole } = await supabase
      .from("admin_roles")
      .select("*")
      .eq("profile_id", user.id)
      .single()

    if (!adminRole) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    let query = supabase
      .from("bookings")
      .select(`
        *,
        profiles:parent_id (full_name, phone),
        teens:teen_id (first_name, last_name, date_of_birth, photo_url),
        events (title, event_date)
      `)
      .eq("qr_code", reference)

    if (eventId) {
      query = query.eq("event_id", eventId)
    }

    const { data: booking, error: bookingError } = await query.single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Réservation non trouvée" },
        { status: 404 }
      )
    }

    const age = Math.floor(
      (new Date().getTime() - new Date(booking.teens.date_of_birth).getTime()) /
        (1000 * 60 * 60 * 24 * 365)
    )

    const photoConsent = !booking.no_photo_consent

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      childName: `${booking.teens.first_name} ${booking.teens.last_name}`,
      childPhoto: booking.teens.photo_url,
      age,
      ticketType: booking.ticket_type || "standard",
      parentName: booking.profiles?.full_name,
      parentPhone: booking.profiles?.phone,
      photoConsent,
      eventTitle: booking.events?.title,
      eventDate: booking.events?.event_date,
      checkedIn: !!booking.checked_in_at,
      checkedInAt: booking.checked_in_at,
      checkedOut: !!booking.checked_out_at,
      checkedOutAt: booking.checked_out_at,
    })
  } catch (error) {
    console.error("[v0] Manual search error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la recherche" },
      { status: 500 }
    )
  }
}
