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

    // Fetch booking with related data
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        event:events(
          id,
          title,
          start_date,
          location
        ),
        parent:profiles!bookings_parent_id_fkey(
          id,
          full_name,
          email,
          phone
        ),
        teen:profiles!bookings_teen_id_fkey(
          id,
          full_name,
          pseudo
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

    const isOwner = booking.parent_id === user.id || booking.teen_id === user.id
    const isAdmin = userProfile.data?.role === "admin"

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Acces refuse" },
        { status: 403 }
      )
    }

    // Build invoice data
    const invoiceDate = new Date(booking.paid_at || booking.created_at)
    const invoiceNumber = generateInvoiceNumber("TPM", booking.id, invoiceDate)

    // Calculate items and totals
    const ticketQuantity = booking.quantity || 1
    const unitPrice = booking.unit_price || (booking.total_price / ticketQuantity)
    const subtotal = unitPrice * ticketQuantity

    const items = [
      {
        description: `Billet - ${booking.event?.title || "Evenement"}${booking.teen ? ` (${booking.teen.pseudo || booking.teen.full_name})` : ""}`,
        quantity: ticketQuantity,
        unitPrice: unitPrice,
        total: subtotal
      }
    ]

    // Add any extras if present
    if (booking.extras && Array.isArray(booking.extras)) {
      for (const extra of booking.extras) {
        items.push({
          description: extra.name || "Option supplementaire",
          quantity: extra.quantity || 1,
          unitPrice: extra.price || 0,
          total: (extra.price || 0) * (extra.quantity || 1)
        })
      }
    }

    const discount = booking.discount_amount || 0
    const discountLabel = booking.discount_code
      ? `Reduction (${booking.discount_code})`
      : undefined

    const invoiceData: InvoiceData = {
      invoiceNumber,
      invoiceDate: invoiceDate.toISOString(),

      customerName: booking.parent?.full_name || "Client",
      customerEmail: booking.parent?.email || user.email || "",
      customerPhone: booking.parent?.phone,

      items,
      subtotal,
      discount: discount > 0 ? discount : undefined,
      discountLabel,
      total: booking.total_price,

      paymentMethod: getPaymentMethodLabel(booking.payment_method),
      paymentStatus: booking.payment_status as "paid" | "pending" | "failed",
      paidAt: booking.paid_at,
      transactionId: booking.stripe_payment_intent
        ? `STR-${booking.stripe_payment_intent.slice(-12)}`
        : undefined,

      eventTitle: booking.event?.title,
      eventDate: booking.event?.start_date,
      eventLocation: booking.event?.location,

      bookingReference: booking.reference || booking.id.slice(0, 8).toUpperCase()
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
