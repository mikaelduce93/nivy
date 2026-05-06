import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { cmiGateway } from "@/lib/payments/cmi"
import { logger } from "@/lib/monitoring/logger"

/**
 * CMI Server-to-Server Webhook
 * This endpoint receives asynchronous notifications from CMI
 * about payment status changes
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Parse form data from CMI
    const formData = await request.formData()
    const params: Record<string, string> = {}
    formData.forEach((value, key) => {
      params[key] = value.toString()
    })

    logger.info("CMI webhook received", { params })

    // Parse and verify the callback
    const result = cmiGateway.parseCallback(params)

    if (!result.orderId) {
      console.error("[CMI Webhook] Missing order ID")
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 })
    }

    // Find booking by reference
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("booking_reference", result.orderId)
      .single()

    if (bookingError || !booking) {
      console.error("[CMI Webhook] Booking not found:", result.orderId)
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Log the webhook event
    await supabase.from("webhook_events").insert({
      provider: "cmi",
      event_type: result.success ? "payment.success" : "payment.failed",
      payload: params,
      booking_id: booking.id,
      processed: false,
    })

    // Process based on payment status
    if (result.success) {
      // Only update if not already paid (idempotency)
      if (booking.payment_status !== "paid") {
        logger.info("CMI webhook processing success", { orderId: result.orderId })

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

        // Record payment transaction if not exists
        const { data: existingTransaction } = await supabase
          .from("payment_transactions")
          .select("id")
          .eq("booking_id", booking.id)
          .eq("provider_transaction_id", result.transactionId)
          .single()

        if (!existingTransaction) {
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
              source: "webhook",
            },
          })
        }
      }

      // Mark webhook as processed
      await supabase
        .from("webhook_events")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("booking_id", booking.id)
        .eq("provider", "cmi")
        .eq("processed", false)

      return NextResponse.json({ status: "OK" })
    } else {
      // Payment failed
      logger.warn("CMI webhook payment failed", { orderId: result.orderId, responseCode: result.responseCode })

      if (booking.payment_status !== "paid") {
        await supabase
          .from("bookings")
          .update({
            payment_status: "failed",
            payment_error: result.message,
          })
          .eq("id", booking.id)
      }

      // Mark webhook as processed
      await supabase
        .from("webhook_events")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("booking_id", booking.id)
        .eq("provider", "cmi")
        .eq("processed", false)

      return NextResponse.json({ status: "OK" })
    }
  } catch (error) {
    console.error("[CMI Webhook] Error processing webhook:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// CMI may also send GET requests for verification
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: "CMI Webhook endpoint active" })
}
