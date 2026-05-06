import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { TeenCheckoutClient } from "./checkout-client"

export const dynamic = "force-dynamic"

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string }>
}) {
  const { booking: bookingId } = await searchParams

  if (!bookingId) {
    // No booking context — bounce back to the shop. The teen reservation flow
    // is expected to create a booking and redirect with `?booking=<uuid>`.
    redirect("/teen/shop?error=missing_booking")
  }

  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  const teenId = userInfo.teenData?.id
  if (!teenId) {
    redirect("/teen?error=no_teen_profile")
  }

  const supabase = await createClient()

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(`
      id,
      booking_reference,
      total_amount,
      payment_status,
      status,
      events ( id, title, image_url )
    `)
    .eq("id", bookingId)
    .single()

  if (bookingError || !booking) {
    redirect("/teen/shop?error=booking_not_found")
  }

  if (booking.payment_status === "paid") {
    redirect(`/mes-reservations/${bookingId}?payment=already_paid`)
  }

  // Teen XP balance — used to render the slider correctly.
  const { data: userXP } = await supabase
    .from("user_xp")
    .select("total_xp")
    .eq("teen_id", teenId)
    .single()

  const availableXP = userXP?.total_xp ?? 0

  const eventTitle = Array.isArray(booking.events)
    ? booking.events[0]?.title
    : (booking.events as { title?: string } | null)?.title

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-black text-foreground mb-2">Checkout</h1>
          <p className="text-muted-foreground">Finalise ta commande pour</p>
          <p className="text-primary font-bold text-lg">
            {eventTitle || `Réservation ${booking.booking_reference}`}
          </p>
        </div>

        <TeenCheckoutClient
          bookingId={booking.id}
          teenId={teenId}
          totalAmount={Number(booking.total_amount)}
          availableXP={availableXP}
        />
      </div>
    </div>
  )
}
