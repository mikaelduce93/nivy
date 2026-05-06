import { createClient } from "@/lib/supabase/server"
import { redirect } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Check, Shield, CreditCard, Smartphone } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { PaymentMethodSelector } from "@/components/payment-method-selector"
import { PaymentCartPersistence } from "@/components/payment-cart-persistence"
import { PaymentExpiryRedirect } from "@/components/payment-expiry-redirect"

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

  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      *,
      events (*)
    `)
    .eq("id", bookingId)
    .eq("parent_id", user.id)
    .single()

  if (!booking) {
    redirect("/mes-reservations")
  }

  if (booking.payment_status === "paid") {
    redirect(`/reservation/confirmation?booking=${bookingId}`)
  }

  const sessionExpiry = new Date(new Date(booking.created_at).getTime() + 10 * 60 * 1000)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-6 py-32">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <div className="flex items-center justify-center gap-4 md:gap-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="hidden md:inline font-semibold">Détails</span>
              </div>
              <div className="flex-1 h-0.5 bg-primary max-w-24" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white flex items-center justify-center font-bold shadow-lg shadow-cyan-500/50">
                  2
                </div>
                <span className="hidden md:inline font-semibold text-foreground">Paiement</span>
              </div>
              <div className="flex-1 h-0.5 bg-muted max-w-24" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold">
                  3
                </div>
                <span className="hidden md:inline text-muted-foreground">Confirmation</span>
              </div>
            </div>
          </div>

          <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground mb-8">
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

          <div className="mt-6">
            <h1 className="text-4xl md:text-6xl font-black text-white mb-8">Paiement sécurisé</h1>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <PaymentMethodSelector bookingId={bookingId} />

              <div className="grid grid-cols-3 gap-4 mt-6">
                <Card className="p-4 bg-zinc-900/50 border-zinc-800 text-center">
                  <Shield className="w-6 h-6 text-green-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold">SSL Sécurisé</p>
                </Card>
                <Card className="p-4 bg-zinc-900/50 border-zinc-800 text-center">
                  <CreditCard className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold">CMI</p>
                </Card>
                <Card className="p-4 bg-zinc-900/50 border-zinc-800 text-center">
                  <Smartphone className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold">Mobile Money</p>
                </Card>
              </div>

              <Card className="p-6 bg-zinc-900/50 border-zinc-800 mt-6">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm mb-1">Paiement 100% sécurisé</p>
                    <p className="text-xs text-zinc-400">
                      Vos données sont cryptées et sécurisées. Nous ne conservons jamais vos informations bancaires.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="lg:sticky lg:top-32 lg:self-start">
              <Card className="p-8">
                <h2 className="text-2xl font-bold mb-6">Récapitulatif de commande</h2>

                <div className="space-y-4 mb-6 pb-6 border-b border-zinc-800">
                  <div>
                    <h3 className="font-bold text-lg mb-1">{booking.events?.title}</h3>
                    <p className="text-sm text-zinc-400">
                      {new Date(booking.events?.event_date).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </p>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Référence</span>
                    <span className="font-mono font-semibold">{booking.booking_reference}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Nombre de billets</span>
                    <span className="font-semibold">1</span>
                  </div>

                  <div className="pt-4 space-y-2 border-t border-zinc-800">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Billet {booking.ticket_type}</span>
                      <span>{booking.total_amount + (booking.discount_amount || 0)} DH</span>
                    </div>
                    {booking.discount_amount > 0 && (
                      <div className="flex justify-between text-sm text-green-500">
                        <span>Réduction AEFE (-10%)</span>
                        <span>-{booking.discount_amount} DH</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm text-zinc-400 pt-2 border-t border-zinc-800">
                      <span>Frais de service</span>
                      <span>0 DH</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-8">
                  <span className="text-xl font-bold">Total à payer</span>
                  <span className="text-3xl font-black text-cyan-400">{booking.total_amount} DH</span>
                </div>

                <div className="space-y-3 text-xs text-zinc-500">
                  <p>✓ Confirmation immédiate par email</p>
                  <p>✓ Billets électroniques avec QR code</p>
                  <p>✓ Annulation gratuite jusqu'à 48h avant</p>
                  <p>✓ Support client 24/7</p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
