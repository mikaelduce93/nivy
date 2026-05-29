import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NextRequest, NextResponse } from "next/server"
import { withSecurity } from "@/lib/security/api-middleware"

export const POST = withSecurity(async (request: NextRequest) => {
  try {
    const { bookingTicketId, eventId } = await request.json()

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

    // #36 — real schema; admin/staff isn't the owner → service-role for data ops.
    const sr = createServiceRoleClient()

    const { data: ticket } = await sr
      .from("booking_tickets")
      .select("id, booking_id, child_id, ticket_type, checked_in")
      .eq("id", bookingTicketId)
      .maybeSingle()

    if (!ticket) {
      return NextResponse.json({ error: "Billet non trouvé" }, { status: 404 })
    }

    if (!ticket.checked_in) {
      return NextResponse.json(
        { error: "Ce billet n'a pas été scanné à l'entrée" },
        { status: 400 }
      )
    }

    const { data: teen } = await sr
      .from("teens")
      .select("first_name, last_name, date_of_birth, parent_id")
      .eq("id", ticket.child_id)
      .maybeSingle()

    // authorizations exists now (migration 109): pickup authorization for exit.
    const { data: authorization } = await sr
      .from("authorizations")
      .select("authorized_person_name, is_valid")
      .eq("child_id", ticket.child_id)
      .eq("event_id", eventId)
      .eq("is_valid", true)
      .maybeSingle()

    // Close the open check-in for this teen at this event.
    await sr
      .from("event_check_ins")
      .update({ checked_out_at: new Date().toISOString() })
      .eq("teen_id", ticket.child_id)
      .eq("event_id", eventId)
      .is("checked_out_at", null)

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
