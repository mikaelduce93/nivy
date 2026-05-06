import { createClient } from "@/lib/supabase/server"
import { redirect } from 'next/navigation'
import { CheckCircle2, Calendar, MapPin, Download, ArrowRight, Wallet, Navigation, Share2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { QRCodeSVG } from 'qrcode.react'
import { TicketActions } from "@/components/ticket-actions"
import { PaymentCartClearOnMount } from "@/components/payment-cart-clear-on-mount"
import { getPublicAppConfig } from "@/lib/config/app-config"

export default async function ReservationConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ booking: string }>
}) {
  const { booking: bookingId } = await searchParams
  const supabase = await createClient()
  const { contactEmail, whatsappPhone, supportPhone } = getPublicAppConfig()

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
      events (*),
      booking_tickets (
        *,
        children (*)
      )
    `)
    .eq("id", bookingId)
    .eq("parent_id", user.id)
    .single()

  if (!booking) {
    redirect("/mes-reservations")
  }

  if (booking.payment_status !== "paid") {
    redirect(`/reservation/paiement?booking=${bookingId}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Clear any stashed cart from /reservation/paiement now that payment is confirmed. */}
      <PaymentCartClearOnMount />

      <div className="container mx-auto px-6 py-32">
        <div className="max-w-3xl mx-auto">
          {/* Success Animation */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-500/10 border-4 border-green-500/50 mb-6 animate-scale-in">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-4xl md:text-6xl font-black mb-4">Réservation confirmée !</h1>
            <p className="text-xl text-muted-foreground">
              Vos billets ont été envoyés par email à{" "}
              <span className="font-semibold text-foreground">{user.email}</span>
            </p>
          </div>

          <Card className="p-8 mb-8 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
            <div className="text-center">
              <p className="font-bold text-lg mb-4">Votre billet électronique</p>
              <div className="inline-block p-6 bg-white rounded-2xl">
                <QRCodeSVG 
                  value={booking.booking_reference}
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Présentez ce code QR à l'entrée
              </p>
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                {booking.booking_reference}
              </p>
            </div>
          </Card>

          <TicketActions booking={booking} />

          <div className="grid grid-cols-3 gap-4 mb-8">
            <Button variant="outline" className="flex flex-col h-auto py-4 gap-2">
              <Wallet className="w-5 h-5" />
              <span className="text-xs">Ajouter à Wallet</span>
            </Button>
            <Button variant="outline" className="flex flex-col h-auto py-4 gap-2">
              <Calendar className="w-5 h-5" />
              <span className="text-xs">Calendrier</span>
            </Button>
            <Button variant="outline" className="flex flex-col h-auto py-4 gap-2">
              <Navigation className="w-5 h-5" />
              <span className="text-xs">Itinéraire</span>
            </Button>
          </div>

          {/* Booking Summary Card */}
          <Card className="p-8 mb-8">
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-border">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Référence de réservation</p>
                <p className="text-2xl font-black font-mono">{booking.booking_reference}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Total</p>
                <p className="text-3xl font-black text-primary">{booking.total_amount} DH</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-4">{booking.events?.title}</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-semibold">
                        {new Date(booking.events?.event_date).toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Lieu</p>
                      <p className="font-semibold">{booking.events?.city}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border">
                <p className="text-sm font-semibold mb-3">Billets ({booking.booking_tickets?.length || 1})</p>
                <div className="space-y-2">
                  {booking.booking_tickets?.map((ticket: any) => (
                    <div key={ticket.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">
                        {ticket.children?.prenom} {ticket.children?.nom}
                      </span>
                      <span className="text-sm text-muted-foreground capitalize">{ticket.ticket_type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-8 mb-8 bg-primary/5 border-primary/20">
            <h3 className="font-bold text-lg mb-4">Consignes pour l'événement</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Arrivez 15 minutes avant le début pour le check-in</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Apportez une pièce d'identité pour vérification</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Dress code: {booking.events?.dress_code || 'Tenue de soirée'}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Événement 100% sans alcool / Contrôle à l'entrée</span>
              </li>
            </ul>
          </Card>

          <Card className="p-8 mb-8 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-cyan-500/30">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <Share2 className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl mb-2">Deviens ambassadeur Teens Party</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Gagne jusqu'à 50 DH par billet vendu ! Partage ta passion et aide tes amis à découvrir nos événements.
                </p>
                <Button asChild>
                  <Link href="/devenir-ambassadeur">
                    Rejoindre le programme
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild className="flex-1 bg-primary hover:bg-primary/90">
              <Link href={`/mes-reservations/${bookingId}`}>
                Voir mes billets
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 bg-transparent">
              <Link href="/">
                <Download className="w-4 h-4 mr-2" />
                Télécharger PDF
              </Link>
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Des questions ? Contactez-nous à{" "}
            <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">
              {contactEmail}
            </a>
            {" "}ou via WhatsApp au{" "}
            <a href={`https://wa.me/${whatsappPhone}`} className="text-primary hover:underline">
              {supportPhone}
            </a>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  )
}
