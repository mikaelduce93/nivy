import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateInvoiceHTML, generateInvoiceNumber, type InvoiceData } from "@/lib/pdf-invoice"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Non autorise" },
        { status: 401 }
      )
    }

    // Fetch booking with related event (bookings has only an event FK live)
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        event:events(
          id,
          title,
          event_date,
          address,
          city
        )
      `)
      .eq("id", id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Reservation non trouvee" },
        { status: 404 }
      )
    }

    // Verify user has access to this booking
    const userProfile = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single()

    const isOwner = booking.user_id === user.id
    const isAdmin = userProfile.data?.role === "admin"

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Acces refuse" },
        { status: 403 }
      )
    }

    // Fetch the customer profile (booking owner); no FK relation exists live
    const { data: customer } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", booking.user_id ?? "")
      .maybeSingle()

    // Build invoice data
    const invoiceDate = new Date(booking.paid_at || booking.created_at || Date.now())
    const invoiceNumber = generateInvoiceNumber("TPM", booking.id, invoiceDate)

    // Calculate items and totals (no quantity/unit_price columns live: single line)
    const total = booking.total_amount ?? 0
    const ticketQuantity = 1
    const unitPrice = total
    const subtotal = total

    const items = [
      {
        description: `Billet - ${booking.event?.title || "Evenement"}`,
        quantity: ticketQuantity,
        unitPrice: unitPrice,
        total: subtotal
      }
    ]

    const invoiceData: InvoiceData = {
      invoiceNumber,
      invoiceDate: invoiceDate.toISOString(),

      customerName: customer?.full_name || "Client",
      customerEmail: customer?.email || user.email || "",

      items,
      subtotal,
      total,

      paymentMethod: getPaymentMethodLabel(booking.payment_method),
      paymentStatus: (booking.payment_status ?? "pending") as "paid" | "pending" | "failed",
      paidAt: booking.paid_at ?? undefined,

      eventTitle: booking.event?.title,
      eventDate: booking.event?.event_date ?? undefined,
      eventLocation: booking.event?.address ?? booking.event?.city ?? undefined,

      bookingReference: booking.booking_reference || booking.id.slice(0, 8).toUpperCase()
    }

    // Generate HTML invoice
    const html = generateInvoiceHTML(invoiceData)

    // Check if PDF format requested
    const url = new URL(request.url)
    const format = url.searchParams.get("format")

    if (format === "html") {
      // Return HTML for preview
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8"
        }
      })
    }

    // Default: Return HTML that auto-triggers print dialog
    const printableHtml = `
      ${html}
      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    `

    return new NextResponse(printableHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="facture-${invoiceNumber}.html"`
      }
    })
  } catch (error: any) {
    console.error("[Invoice API] Error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la generation de la facture" },
      { status: 500 }
    )
  }
}

function getPaymentMethodLabel(method: string | null): string {
  switch (method) {
    case "stripe":
      return "Carte bancaire (Stripe)"
    case "cmi":
      return "Carte bancaire (CMI)"
    case "cash":
      return "Especes"
    case "coins":
      return "Coins TeensParty"
    default:
      return "Paiement en ligne"
  }
}
