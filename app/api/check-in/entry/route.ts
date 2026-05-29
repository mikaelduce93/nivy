import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
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

    // #36 — read against the real schema. The admin/staff is not the booking
    // owner, so booking_tickets RLS (owner-scoped) would block the user client;
    // use the service-role client for the (authz-gated) data operations.
    const sr = createServiceRoleClient()

    // #43 — the scanned value may be a booking_tickets.id (uuid) OR the
    // booking_reference (TP… text) that the confirmation page / PDF QR encode.
    // Resolve both, robustly (an already-printed QR can't be re-issued).
    const TICKET_COLS = "id, booking_id, child_id, ticket_type, checked_in"
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      String(bookingTicketId)
    )
    let ticket: any = null
    if (isUuid) {
      ;({ data: ticket } = await sr.from("booking_tickets").select(TICKET_COLS).eq("id", bookingTicketId).maybeSingle())
    }
    if (!ticket) {
      const { data: refBooking } = await sr
        .from("bookings")
        .select("id")
        .eq("booking_reference", bookingTicketId)
        .maybeSingle()
      if (refBooking) {
        ;({ data: ticket } = await sr.from("booking_tickets").select(TICKET_COLS).eq("booking_id", refBooking.id).limit(1).maybeSingle())
      }
    }

    if (!ticket) {
      return NextResponse.json({ error: "Billet non trouvé" }, { status: 404 })
    }

    // Idempotency: a ticket can only be scanned in once.
    if (ticket.checked_in) {
      return NextResponse.json(
        { error: "Ce billet a déjà été scanné" },
        { status: 400 }
      )
    }

    // Resolve the teen from the real `teens` table (no `children` table;
    // columns are first_name/last_name/date_of_birth).
    const { data: teen } = await sr
      .from("teens")
      .select("first_name, last_name, date_of_birth, parent_id")
      .eq("id", ticket.child_id)
      .maybeSingle()

    const { error: updateError } = await sr
      .from("booking_tickets")
      .update({
        checked_in: true,
        checked_in_at: new Date().toISOString(),
      })
      .eq("id", bookingTicketId)

    if (updateError) {
      throw updateError
    }

    // event_check_ins: real columns + booking_id/checked_in_by (migration 109).
    // #36 — check_in_method has a CHECK (manual|qr_code|nfc|geolocation|
    // staff_verified); clamp the client value to a valid one.
    const allowedMethods = new Set(["manual", "qr_code", "nfc", "geolocation", "staff_verified"])
    const method = allowedMethods.has(checkInMethod) ? checkInMethod : "qr_code"
    await sr.from("event_check_ins").insert({
      event_id: eventId,
      booking_id: ticket.booking_id,
      teen_id: ticket.child_id,
      checked_in_by: adminId,
      checked_in_at: new Date().toISOString(),
      check_in_method: method,
    })

    // Parent name via teens.parent_id (profiles has no phone column).
    let parentName: string | null = null
    if (teen?.parent_id) {
      const { data: parent } = await sr
        .from("profiles")
        .select("full_name")
        .eq("id", teen.parent_id)
        .maybeSingle()
      parentName = parent?.full_name ?? null
    }

    const age = teen?.date_of_birth
      ? Math.floor(
          (Date.now() - new Date(teen.date_of_birth).getTime()) /
            (1000 * 60 * 60 * 24 * 365)
        )
      : null

    return NextResponse.json({
      success: true,
      childName: teen ? `${teen.first_name ?? ""} ${teen.last_name ?? ""}`.trim() : "Teen",
      age,
      ticketType: ticket.ticket_type,
      parentName,
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
