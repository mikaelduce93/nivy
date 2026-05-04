import { createClient } from "@/lib/supabase/server"
import { NextResponse, NextRequest } from "next/server"
import { withSecurity } from "@/lib/security/api-middleware"
import { withSupabaseTimeout } from "@/lib/supabase/wrapper"

export const POST = withSecurity(async (request: NextRequest) => {
  try {
    const supabase = await createClient()
    const formData = await request.formData()

    const {
      data: { user },
    } = await withSupabaseTimeout(supabase.auth.getUser(), 'auth.getUser', 10000)

    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }

    const bookingId = formData.get("bookingId") as string
    const paymentMethod = formData.get("paymentMethod") as string

    // Get booking details
    const { data: booking } = await withSupabaseTimeout(
      supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .eq("parent_id", user.id)
        .single(),
      `from('bookings').select()`,
      10000
    )

    if (!booking) {
      throw new Error("Booking not found")
    }

    let paymentStatus = "pending"
    const paymentReference = `PAY${Date.now().toString(36).toUpperCase()}`

    // For demo purposes, we'll mark card payments as paid immediately
    // In production, integrate with actual payment gateway (CMI, Stripe, etc.)
    if (paymentMethod === "card") {
      paymentStatus = "paid"

      // TODO: Integrate with real payment gateway
      // const cardNumber = formData.get("cardNumber")
      // const paymentResult = await processCardPayment(cardNumber, booking.total_amount)
      // paymentStatus = paymentResult.status
      // paymentReference = paymentResult.reference
    } else if (paymentMethod === "mobile_money") {
      // For mobile money, mark as pending and send instructions
      paymentStatus = "pending"
    } else if (paymentMethod === "bank_transfer") {
      // For bank transfer, mark as pending
      paymentStatus = "pending"
    } else if (paymentMethod === "ambassador") {
      // For ambassador payment, mark as pending
      paymentStatus = "pending"
    }

    // Update booking with payment info
    const { error: updateError } = await withSupabaseTimeout(
      supabase
        .from("bookings")
        .update({
          payment_status: paymentStatus,
          payment_method: paymentMethod,
          payment_reference: paymentReference,
          status: paymentStatus === "paid" ? "confirmed" : "pending_payment",
        })
        .eq("id", bookingId),
      `from('bookings').update()`,
      10000
    )

    if (updateError) throw updateError

    // If paid, send confirmation email (to be implemented)
    if (paymentStatus === "paid") {
      // TODO: Send confirmation email with QR code tickets
      console.log("[v0] Payment successful, should send confirmation email")
    }

    return NextResponse.redirect(
      new URL(
        paymentStatus === "paid"
          ? `/mes-reservations/${bookingId}?payment=success`
          : `/mes-reservations/${bookingId}?payment=pending`,
        request.url,
      ),
    )
  } catch (error) {
    console.error("[v0] Payment processing error:", error)
    return NextResponse.redirect(
      new URL(
        `/mes-reservations?error=payment_failed&message=${encodeURIComponent("Votre paiement n'a pas pu être traité. Vérifiez vos informations ou essayez une autre méthode.")}`,
        request.url
      )
    )
  }
}, { rateLimit: 'api' })
