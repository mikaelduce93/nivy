import { createClient } from "@/lib/supabase/server"
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { PaymentMethodSelector } from "@/components/payment-method-selector"
import { PaymentCartPersistence } from "@/components/payment-cart-persistence"
import { PaymentExpiryRedirect } from "@/components/payment-expiry-redirect"
import { ReservationStepper } from "@/components/reservation-stepper"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatHero, NivCoach } from "@/components/brand"
import { CheckRound } from "@/components/ui/check-round"

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ booking: string }>
}) {
  const { booking: bookingId } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // #42 — bookings owner column is user_id (no parent_id).
  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      *,
      events (*)
    `)
    .eq("id", bookingId)
    .eq("user_id", user.id)
    .single()

  if (!booking) {
    redirect("/mes-reservations")
  }

  if (booking.payment_status === "paid") {
    redirect(`/reservation/confirmation?booking=${bookingId}`)
  }

  const sessionExpiry = new Date(new Date(booking.created_at).getTime() + 10 * 60 * 1000)

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />

      <div className="container mx-auto px-6 py-32">
        <div className="max-w-4xl mx-auto">
          <ReservationStepper step={1} />

          <Button asChild variant="ghost" className="text-mute hover:text-ink mb-8">
            <Link href={`/mes-reservations/${bookingId}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à ma réservation
            </Link>
          </Button>

          <PaymentExpiryRedirect
            expiresAt={sessionExpiry}
            redirectTo="/mes-reservations"
            bookingReference={booking.booking_reference}
          />

          {/* Persist cart in localStorage so the user can resume on /reservation
              if the 10min payment session expires. */}
          <PaymentCartPersistence
            bookingId={bookingId}
            reference={booking.booking_reference}
            eventTitle={booking.events?.title}
            totalAmount={booking.total_amount}
          />

          <div className="mt-6 mb-8">
            <p className="eyebrow tracking-[0.16em] text-mute">Paiement</p>
            <h1 className="mt-2 font-display text-4xl md:text-6xl font-extrabold tracking-tight text-ink">
              Paiement <em className="font-semibold italic text-pink">sécurisé</em>
            </h1>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <PaymentMethodSelector bookingId={bookingId} />

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink">SSL</span>
                <span className="rounded-full border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink">CMI</span>
                <span className="rounded-full border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink">Mobile Money</span>
              </div>

              <NivCoach
                mood="calm"
                message="Paiement sécurisé, wlah aucun souci. Tes données sont cryptées et on ne garde jamais tes infos bancaires."
              />
            </div>

            <div className="lg:sticky lg:top-32 lg:self-start space-y-6">
              <StatHero
                eyebrow="Total à payer"
                value={booking.total_amount}
                unit="DH"
                tone="teal"
              />

              <StickerCard className="p-8">
                <p className="eyebrow tracking-[0.16em] text-mute">Récapitulatif de commande</p>

                <div className="mt-4 space-y-4 mb-6 pb-6 border-b-2 border-ink">
                  <div>
                    <h3 className="font-display font-bold text-lg mb-1 text-ink">{booking.events?.title}</h3>
                    <p className="text-sm text-mute">
                      {new Date(booking.events?.event_date).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </p>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-mute">Référence</span>
                    <span className="font-mono font-semibold text-ink">{booking.booking_reference}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-mute">Nombre de billets</span>
                    <span className="font-mono font-semibold text-ink tabular-nums">1</span>
                  </div>

                  <div className="pt-4 space-y-2 border-t-2 border-ink">
                    <div className="flex justify-between text-sm">
                      <span className="text-mute">Billet {booking.ticket_type}</span>
                      <span className="font-mono text-ink tabular-nums">{booking.total_amount + (booking.discount_amount || 0)} DH</span>
                    </div>
                    {booking.discount_amount > 0 && (
                      <div className="flex justify-between text-sm text-lime">
                        <span>Réduction AEFE (-10%)</span>
                        <span className="font-mono tabular-nums">-{booking.discount_amount} DH</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm text-mute pt-2 border-t-2 border-ink">
                      <span>Frais de service</span>
                      <span className="font-mono tabular-nums">0 DH</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-ink">Total à payer</span>
                  <span className="font-mono text-2xl font-bold text-ink tabular-nums">{booking.total_amount} DH</span>
                </div>
              </StickerCard>

              <StickerCard className="p-6 gap-3">
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckRound checked disabled aria-hidden />
                    <span className="text-sm text-ink-2">Confirmation immédiate par email</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckRound checked disabled aria-hidden />
                    <span className="text-sm text-ink-2">Billets électroniques avec QR code</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckRound checked disabled aria-hidden />
                    <span className="text-sm text-ink-2">Annulation gratuite jusqu'à 48h avant</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckRound checked disabled aria-hidden />
                    <span className="text-sm text-ink-2">Support client 24/7</span>
                  </li>
                </ul>
              </StickerCard>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
