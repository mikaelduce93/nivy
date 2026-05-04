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

    // Fetch coin transaction with related data
    const { data: transaction, error: txError } = await supabase
      .from("coin_transactions")
      .select(`
        *,
        parent:profiles!coin_transactions_parent_id_fkey(
          id,
          full_name,
          email,
          phone
        ),
        teen:profiles!coin_transactions_teen_id_fkey(
          id,
          full_name,
          pseudo
        )
      `)
      .eq("id", id)
      .eq("type", "topup")
      .single()

    if (txError || !transaction) {
      return NextResponse.json(
        { error: "Transaction non trouvee" },
        { status: 404 }
      )
    }

    // Verify user has access
    const isOwner = transaction.parent_id === user.id || transaction.teen_id === user.id

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const isAdmin = userProfile?.role === "admin"

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Acces refuse" },
        { status: 403 }
      )
    }

    // Build invoice data
    const invoiceDate = new Date(transaction.created_at)
    const invoiceNumber = generateInvoiceNumber("TPM-RC", transaction.id, invoiceDate)

    // Parse amount - assuming coins have a fixed rate
    const COIN_RATE = 1 // 1 coin = 1 DH (adjust as needed)
    const coinsAmount = transaction.amount || 0
    const bonusCoins = transaction.bonus_amount || 0
    const totalCoins = coinsAmount + bonusCoins
    const totalPrice = transaction.paid_amount || (coinsAmount * COIN_RATE)

    const items = [
      {
        description: `Recharge de ${coinsAmount} coins${bonusCoins > 0 ? ` (+${bonusCoins} bonus)` : ""}`,
        quantity: 1,
        unitPrice: totalPrice,
        total: totalPrice
      }
    ]

    const invoiceData: InvoiceData = {
      invoiceNumber,
      invoiceDate: invoiceDate.toISOString(),

      customerName: transaction.parent?.full_name || "Client",
      customerEmail: transaction.parent?.email || user.email || "",
      customerPhone: transaction.parent?.phone,

      items,
      subtotal: totalPrice,
      total: totalPrice,

      paymentMethod: "Carte bancaire (Stripe)",
      paymentStatus: "paid",
      paidAt: transaction.created_at,
      transactionId: transaction.stripe_session_id
        ? `STR-${transaction.stripe_session_id.slice(-12)}`
        : undefined,

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
