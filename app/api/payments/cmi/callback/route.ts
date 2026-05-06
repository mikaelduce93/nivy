import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { cmiGateway } from "@/lib/payments/cmi"
import { getServerAppConfig } from "@/lib/config/app-config"

export async function GET(request: NextRequest) {
  return handleCallback(request)
}

export async function POST(request: NextRequest) {
  return handleCallback(request)
}

async function handleCallback(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get parameters from either GET or POST
    let params: Record<string, string> = {}

    if (request.method === "POST") {
      const formData = await request.formData()
      formData.forEach((value, key) => {
        params[key] = value.toString()
      })
    } else {
      request.nextUrl.searchParams.forEach((value, key) => {
        params[key] = value
      })
    }

    console.log("[CMI Callback] Received params:", JSON.stringify(params, null, 2))

    // Parse CMI response
    const result = cmiGateway.parseCallback(params)

    if (!result.orderId) {
      console.error("[CMI Callback] Missing order ID")
      return NextResponse.redirect(
        new URL("/mes-reservations?error=invalid_callback", request.url)
      )
    }

    // Find booking by reference
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("booking_reference", result.orderId)
      .single()

    if (bookingError || !booking) {
      console.error("[CMI Callback] Booking not found:", result.orderId)
      return NextResponse.redirect(
        new URL("/mes-reservations?error=booking_not_found", request.url)
      )
    }

    if (result.success) {
      // Payment successful
      console.log("[CMI Callback] Payment successful:", result)

      // Update booking
      await supabase
        .from("bookings")
        .update({
          payment_status: "paid",
          status: "confirmed",
          paid_at: new Date().toISOString(),
          payment_method: "cmi",
          cmi_transaction_id: result.transactionId,
          cmi_auth_code: result.authCode,
        })
        .eq("id", booking.id)

      // Record payment in payment_transactions
      await supabase.from("payment_transactions").insert({
        booking_id: booking.id,
        amount: result.amount || booking.total_amount,
        currency: "MAD",
        status: "completed",
        provider: "cmi",
        provider_transaction_id: result.transactionId,
        metadata: {
          authCode: result.authCode,
          responseCode: result.responseCode,
          params,
        },
      })

      // Send confirmation email
      sendPaymentConfirmation(booking, result).catch(console.error)

      return NextResponse.redirect(
        new URL(`/reservation/confirmation?booking=${booking.id}`, request.url)
      )
    } else {
      // Payment failed
      console.log("[CMI Callback] Payment failed:", result)

      // Update booking status
      await supabase
        .from("bookings")
        .update({
          payment_status: "failed",
          payment_error: result.message,
        })
        .eq("id", booking.id)

      // Record failed payment
      await supabase.from("payment_transactions").insert({
        booking_id: booking.id,
        amount: booking.total_amount,
        currency: "MAD",
        status: "failed",
        provider: "cmi",
        error_message: result.message,
        metadata: {
          responseCode: result.responseCode,
          params,
        },
      })

      return NextResponse.redirect(
        new URL(
          `/reservation/paiement?booking=${booking.id}&error=${encodeURIComponent(result.message)}`,
          request.url
        )
      )
    }
  } catch (error) {
    console.error("[CMI Callback] Error:", error)
    return NextResponse.redirect(
      new URL("/mes-reservations?error=callback_error", request.url)
    )
  }
}

async function sendPaymentConfirmation(booking: any, paymentResult: any) {
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()

    // Get full booking details
    const { data: fullBooking } = await supabase
      .from("bookings")
      .select(`
        *,
        events (*),
        profiles:parent_id (full_name, email)
      `)
      .eq("id", booking.id)
      .single()

    if (!fullBooking?.profiles?.email) return

    // Vérifier si Resend est configuré
    if (!process.env.RESEND_API_KEY) {
      console.warn("[Resend] Not configured - payment confirmation email not sent")
      return
    }

    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: getServerAppConfig().emailFrom,
      to: fullBooking.profiles.email,
      subject: `Paiement confirmé - ${fullBooking.booking_reference}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #09090b; color: #fff; padding: 40px 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #18181b; border-radius: 16px; padding: 40px; }
            h1 { color: #22c55e; margin: 0 0 20px; font-size: 24px; }
            p { color: #a1a1aa; line-height: 1.6; margin: 0 0 16px; }
            .highlight { color: #fff; font-weight: bold; }
            .success-badge { display: inline-flex; align-items: center; gap: 8px; background: #22c55e; color: #000; padding: 12px 24px; border-radius: 9999px; font-weight: bold; margin: 20px 0; }
            .details { background: #27272a; border-radius: 12px; padding: 20px; margin: 24px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #3f3f46; }
            .detail-row:last-child { border-bottom: none; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #3f3f46; color: #71717a; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Paiement confirmé!</h1>
            <p>Bonjour <span class="highlight">${fullBooking.profiles.full_name}</span>,</p>
            <p>Votre paiement CMI a été accepté avec succès.</p>

            <div style="text-align: center;">
              <span class="success-badge">
                ✓ Paiement accepté
              </span>
            </div>

            <div class="details">
              <div class="detail-row">
                <span>Événement</span>
                <span class="highlight">${fullBooking.events?.title || "Événement"}</span>
              </div>
              <div class="detail-row">
                <span>Référence</span>
                <span class="highlight">${fullBooking.booking_reference}</span>
              </div>
              <div class="detail-row">
                <span>Montant payé</span>
                <span class="highlight">${fullBooking.total_amount} DH</span>
              </div>
              <div class="detail-row">
                <span>Mode de paiement</span>
                <span>CMI</span>
              </div>
              ${paymentResult.transactionId ? `
              <div class="detail-row">
                <span>Transaction ID</span>
                <span class="highlight">${paymentResult.transactionId}</span>
              </div>
              ` : ''}
            </div>

            <p style="text-align: center; color: #22c55e; font-weight: bold;">
              Votre billet électronique est disponible dans votre espace "Mes Réservations"
            </p>

            <div class="footer">
              <p>Teens Party Morocco</p>
              <p>À bientôt!</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })
  } catch (error) {
    console.error("Failed to send CMI payment confirmation:", error)
  }
}
