import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { cmiGateway } from "@/lib/payments/cmi"
import { getFeatureFlag } from "@/lib/features/flags"

export async function GET(request: NextRequest) {
  try {
    // Vérifier que le feature flag CMI est activé
    const cmiEnabled = await getFeatureFlag('cmi_payment')
    if (!cmiEnabled) {
      return NextResponse.redirect(
        new URL("/mes-reservations?error=cmi_not_available", request.url)
      )
    }

    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams

    // Get parameters
    const bookingId = searchParams.get("booking")
    const amount = searchParams.get("amount")
    const xpUsed = searchParams.get("xp")

    if (!bookingId || !amount) {
      return NextResponse.redirect(
        new URL("/mes-reservations?error=missing_params", request.url)
      )
    }

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(
        new URL("/auth/login", request.url)
      )
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        profiles:parent_id (full_name, email, phone)
      `)
      .eq("id", bookingId)
      .eq("parent_id", user.id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.redirect(
        new URL("/mes-reservations?error=booking_not_found", request.url)
      )
    }

    // Check booking status
    if (booking.payment_status === "paid") {
      return NextResponse.redirect(
        new URL(`/reservation/confirmation?booking=${bookingId}`, request.url)
      )
    }

    // Create CMI payment
    const paymentResult = await cmiGateway.createPayment({
      amount: parseFloat(amount),
      orderId: booking.booking_reference,
      customerEmail: booking.profiles?.email || user.email || "",
      customerPhone: booking.profiles?.phone,
      description: `Réservation ${booking.booking_reference}`,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/cmi/callback`,
      bookingId,
      xpUsed: xpUsed ? parseInt(xpUsed) : undefined,
    })

    if (!paymentResult.success || !paymentResult.formHtml) {
      return NextResponse.redirect(
        new URL(`/reservation/paiement?booking=${bookingId}&error=cmi_init_failed`, request.url)
      )
    }

    // Store CMI order reference in booking for later verification
    await supabase
      .from("bookings")
      .update({
        payment_method: "cmi",
        payment_reference: booking.booking_reference,
      })
      .eq("id", bookingId)

    // Return the auto-submit form HTML
    return new NextResponse(paymentResult.formHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    })
  } catch (error) {
    console.error("CMI initiate error:", error)
    return NextResponse.redirect(
      new URL("/mes-reservations?error=payment_error", request.url)
    )
  }
}
