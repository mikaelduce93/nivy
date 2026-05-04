import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

/**
 * Export check-in data for an event
 * Returns CSV or JSON format
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = request.nextUrl

    const eventId = searchParams.get("eventId")
    const format = searchParams.get("format") || "json"

    if (!eventId) {
      return NextResponse.json({ error: "Event ID requis" }, { status: 400 })
    }

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Verify admin role
    const { data: adminRole } = await supabase
      .from("admin_roles")
      .select("role")
      .eq("profile_id", user.id)
      .single()

    if (!adminRole) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    // Get event details
    const { data: event } = await supabase
      .from("events")
      .select("id, title, event_date, venue_name")
      .eq("id", eventId)
      .single()

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 })
    }

    // Get all check-ins with details
    const { data: checkIns, error: checkInsError } = await supabase
      .from("event_check_ins")
      .select(`
        id,
        checked_in_at,
        checked_out_at,
        check_in_method,
        teen:teen_id (
          id,
          first_name,
          last_name,
          pseudo,
          birth_date
        ),
        booking:booking_id (
          booking_reference,
          ticket_type,
          parent:parent_id (
            full_name,
            phone,
            email
          )
        ),
        checked_in_by:checked_in_by (
          full_name
        )
      `)
      .eq("event_id", eventId)
      .order("checked_in_at", { ascending: true })

    if (checkInsError) {
      throw checkInsError
    }

    // Process check-ins
    const processedData = (checkIns || []).map((checkIn: any) => {
      const birthDate = new Date(checkIn.teen?.birth_date)
      const age = Math.floor(
        (Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
      )

      const duration = checkIn.checked_out_at && checkIn.checked_in_at
        ? Math.round(
            (new Date(checkIn.checked_out_at).getTime() -
              new Date(checkIn.checked_in_at).getTime()) /
              (1000 * 60)
          )
        : null

      return {
        id: checkIn.id,
        teenName: `${checkIn.teen?.first_name} ${checkIn.teen?.last_name}`,
        teenPseudo: checkIn.teen?.pseudo || "",
        teenAge: age,
        bookingReference: checkIn.booking?.booking_reference || "",
        ticketType: checkIn.booking?.ticket_type || "standard",
        parentName: checkIn.booking?.parent?.full_name || "",
        parentPhone: checkIn.booking?.parent?.phone || "",
        parentEmail: checkIn.booking?.parent?.email || "",
        checkedInAt: checkIn.checked_in_at,
        checkedOutAt: checkIn.checked_out_at || "",
        durationMinutes: duration,
        checkInMethod: checkIn.check_in_method || "qr_scan",
        checkedInBy: checkIn.checked_in_by?.full_name || "",
        status: checkIn.checked_out_at ? "Sorti" : "À l'intérieur",
      }
    })

    // Calculate summary stats
    const summary = {
      eventTitle: event.title,
      eventDate: event.event_date,
      venue: event.venue_name,
      totalCheckIns: processedData.length,
      currentlyInside: processedData.filter((c: any) => !c.checkedOutAt).length,
      checkedOut: processedData.filter((c: any) => c.checkedOutAt).length,
      averageDuration: Math.round(
        processedData
          .filter((c: any) => c.durationMinutes)
          .reduce((sum: number, c: any) => sum + c.durationMinutes, 0) /
          (processedData.filter((c: any) => c.durationMinutes).length || 1)
      ),
      exportedAt: new Date().toISOString(),
      exportedBy: user.email,
    }

    if (format === "csv") {
      // Generate CSV
      const headers = [
        "Référence",
        "Nom",
        "Pseudo",
        "Age",
        "Type Billet",
        "Parent",
        "Téléphone",
        "Email",
        "Entrée",
        "Sortie",
        "Durée (min)",
        "Méthode",
        "Enregistré par",
        "Statut",
      ]

      const rows = processedData.map((row: any) => [
        row.bookingReference,
        row.teenName,
        row.teenPseudo,
        row.teenAge,
        row.ticketType,
        row.parentName,
        row.parentPhone,
        row.parentEmail,
        row.checkedInAt ? new Date(row.checkedInAt).toLocaleString("fr-FR") : "",
        row.checkedOutAt ? new Date(row.checkedOutAt).toLocaleString("fr-FR") : "",
        row.durationMinutes || "",
        row.checkInMethod,
        row.checkedInBy,
        row.status,
      ])

      const csv = [
        `# Rapport Check-in - ${event.title}`,
        `# Date événement: ${new Date(event.event_date).toLocaleDateString("fr-FR")}`,
        `# Total entrées: ${summary.totalCheckIns}`,
        `# Actuellement présents: ${summary.currentlyInside}`,
        `# Exporté le: ${new Date().toLocaleString("fr-FR")}`,
        "",
        headers.join(","),
        ...rows.map((row: any[]) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n")

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="checkin-${event.title.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      })
    }

    // Return JSON
    return NextResponse.json({
      summary,
      checkIns: processedData,
    })
  } catch (error) {
    console.error("[Check-in Export] Error:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'export" },
      { status: 500 }
    )
  }
}
