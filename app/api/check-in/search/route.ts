import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
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

    // Schéma réel : bookings n'a ni qr_code ni teen_id. La référence scannée est
    // booking_reference ; le titulaire vit sur booking_tickets.child_id → teens ;
    // le réservant sur bookings.user_id → profiles. Service-role pour les lectures
    // (admin déjà gardé), comme les routes check-in entry/exit.
    const sr = createServiceRoleClient()

    let bq = sr
      .from("bookings")
      .select("id, user_id, booking_reference, event_id, events (title, event_date)")
      .eq("booking_reference", reference)
    if (eventId) {
      bq = bq.eq("event_id", eventId)
    }
    const { data: booking, error: bookingError } = await bq.maybeSingle()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Réservation non trouvée" },
        { status: 404 }
      )
    }

    const { data: ticket } = await sr
      .from("booking_tickets")
      .select("child_id, ticket_type, checked_in, checked_in_at")
      .eq("booking_id", booking.id)
      .limit(1)
      .maybeSingle()

    type TeenLite = {
      first_name?: string | null
      last_name?: string | null
      avatar_url?: string | null
      date_of_birth?: string | null
    }
    let teen: TeenLite | null = null
    if (ticket?.child_id) {
      const { data: t } = await sr
        .from("teens")
        .select("first_name, last_name, avatar_url, date_of_birth")
        .eq("id", ticket.child_id)
        .maybeSingle()
      teen = (t as unknown as TeenLite | null) ?? null
    }

    // bookings.user_id est nullable dans le schéma live → ne lire le réservant que s'il existe
    let booker: { full_name: string | null } | null = null
    if (booking.user_id) {
      const res = await sr
        .from("profiles")
        .select("full_name")
        .eq("id", booking.user_id)
        .maybeSingle()
      booker = res.data
    }

    const age = teen?.date_of_birth
      ? Math.floor((Date.now() - new Date(teen.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365))
      : null
    const events = booking.events as { title?: string | null; event_date?: string | null } | null
    const childName = teen
      ? `${teen.first_name ?? ""} ${teen.last_name ?? ""}`.trim() || null
      : null

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      childName,
      childPhoto: teen?.avatar_url ?? null,
      age,
      ticketType: ticket?.ticket_type || "standard",
      parentName: booker?.full_name ?? null,
      parentPhone: null, // profiles n'a pas de colonne téléphone
      photoConsent: true, // pas de colonne de consentement par réservation dans le schéma live
      eventTitle: events?.title ?? null,
      eventDate: events?.event_date ?? null,
      checkedIn: !!ticket?.checked_in,
      checkedInAt: ticket?.checked_in_at ?? null,
      checkedOut: false, // booking_tickets ne suit pas de check-out séparé
      checkedOutAt: null,
    })
  } catch (error) {
    console.error("Manual search error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la recherche" },
      { status: 500 }
    )
  }
}
