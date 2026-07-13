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

    // Fetch the topup transaction. Live coin_transactions has no FK to profiles
    // and no parent_id column: read the row alone, resolve people afterwards.
    // (Column rename: legacy `type` -> `transaction_type`.)
    const { data: transaction, error: txError } = await supabase
      .from("coin_transactions")
      .select("*")
      .eq("id", id)
      .eq("transaction_type", "topup")
      .single()

    if (txError || !transaction) {
      return NextResponse.json(
        { error: "Transaction non trouvee" },
        { status: 404 }
      )
    }

    // Topups are bought by a parent, but coin_transactions only stores teen_id
    // live. Resolve the linked parent(s) via parent_teens_overview.
    const { data: parentLinks } = await supabase
      .from("parent_teens_overview")
      .select("parent_id")
      .eq("teen_id", transaction.teen_id)

    const parentIds = (parentLinks ?? [])
      .map((l) => l.parent_id)
      .filter((pid): pid is string => Boolean(pid))

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const isAdmin = userProfile?.role === "admin"
    const isOwner = transaction.teen_id === user.id || parentIds.includes(user.id)

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Acces refuse" },
        { status: 403 }
      )
    }

    // Customer = the requesting parent, otherwise the first linked parent,
    // falling back to the teen. profiles has no phone column live.
    const customerId = parentIds.includes(user.id)
      ? user.id
      : (parentIds[0] ?? transaction.teen_id)
    const { data: customer } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", customerId)
      .maybeSingle()

    // Build invoice data (created_at is nullable live)
    const invoiceDate = new Date(transaction.created_at ?? Date.now())
    const invoiceNumber = generateInvoiceNumber("TPM-RC", transaction.id, invoiceDate)

    // Parse amount - assuming coins have a fixed rate. Live schema has no
    // bonus_amount/paid_amount columns: `amount` already holds the total coins
    // credited (coins + bonus), the breakdown lives only in `description`.
    const COIN_RATE = 1 // 1 coin = 1 DH (adjust as needed)
    const coinsAmount = transaction.amount || 0
    const totalPrice = coinsAmount * COIN_RATE

    const items = [
      {
        description: transaction.description || `Recharge de ${coinsAmount} coins`,
        quantity: 1,
        unitPrice: totalPrice,
        total: totalPrice
      }
    ]

    const invoiceData: InvoiceData = {
      invoiceNumber,
      invoiceDate: invoiceDate.toISOString(),

      customerName: customer?.full_name || "Client",
      customerEmail: customer?.email || user.email || "",

      items,
      subtotal: totalPrice,
      total: totalPrice,

      paymentMethod: "Carte bancaire (Stripe)",
      paymentStatus: "paid",
      paidAt: transaction.created_at ?? undefined,
      // Live coin_transactions stores no stripe_session_id (source_id is null
      // for topups), so no external payment reference is available.

      bookingReference: `RC-${transaction.id.slice(0, 8).toUpperCase()}`
    }

    // Generate HTML invoice
    const html = generateInvoiceHTML(invoiceData)

    // Check format
    const url = new URL(request.url)
    const format = url.searchParams.get("format")

    if (format === "html") {
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8"
        }
      })
    }

    // Return printable HTML
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
    console.error("[Topup Invoice API] Error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la generation de la facture" },
      { status: 500 }
    )
  }
}
