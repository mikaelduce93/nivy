import { createClient } from "@/lib/supabase/server"
import { redirect } from 'next/navigation'
import { Calendar, MapPin, ArrowRight, Share2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { QRCodeSVG } from 'qrcode.react'
import { TicketActions } from "@/components/ticket-actions"
import { PaymentCartClearOnMount } from "@/components/payment-cart-clear-on-mount"
import { getPublicAppConfig } from "@/lib/config/app-config"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatHero, DarkSurface, NivCelebration } from "@/components/brand"
import { CheckRound } from "@/components/ui/check-round"

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

  // bookings owner column is user_id (not parent_id), and there is no children
  // table — booking_tickets stores child_id only, so holder names are resolved
  // from teens separately rather than via a (non-existent) children embed.
  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      *,
      events (*),
      booking_tickets (*)
    `)
    .eq("id", bookingId)
    .eq("user_id", user.id)
    .single()

  if (!booking) {
    redirect("/agenda")
  }

  if (booking.payment_status !== "paid") {
    redirect(`/reservation/paiement?booking=${bookingId}`)
  }

  // Resolve ticket-holder names from teens via child_id (no children table).
  const childIds: string[] = (booking.booking_tickets ?? [])
    .map((t: any) => t.child_id)
    .filter(Boolean)
  const holderNames: Record<string, string> = {}
  if (childIds.length > 0) {
    const { data: holders } = await supabase
      .from("teens")
      .select("id, first_name, last_name, pseudo")
      .in("id", childIds)
    for (const h of holders ?? []) {
      holderNames[h.id as string] =
        [h.first_name, h.last_name].filter(Boolean).join(" ") || (h.pseudo as string) || ""
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      {/* Clear any stashed cart from /reservation/paiement now that payment is confirmed. */}
      <PaymentCartClearOnMount />

      <div className="container mx-auto px-6 py-32">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Moment de pic — célébration Niv + confetti */}
          <NivCelebration
            tone="lime"
            palette="reward"
            title="Réservation confirmée"
            caption={
              <>
                Tes billets ont été envoyés par email à{" "}
                <span className="font-semibold text-paper">{user.email}</span>
              </>
            }
          />

          {/* Billet électronique — surface sombre ponctuelle */}
          <DarkSurface tone="pink" shadow className="p-8 text-center">
            <p className="eyebrow tracking-[0.16em] text-paper/60">Ton billet</p>
            <p className="mt-2 mb-6 font-display text-xl font-extrabold text-paper">Billet électronique</p>
            <div className="inline-block p-6 bg-white rounded-2xl border-2 border-ink">
              <QRCodeSVG
                value={booking.booking_reference}
                size={200}
                level="H"
                includeMargin
              />
            </div>
            <p className="text-sm text-paper/70 mt-4">
              Présentez ce code QR à l'entrée
            </p>
            <p className="text-xs text-paper/60 mt-2 font-mono">
              {booking.booking_reference}
            </p>
          </DarkSurface>

          <TicketActions booking={booking} />

          {/* Total payé — surface sombre ponctuelle */}
          <StatHero
            eyebrow="Total payé"
            value={booking.total_amount}
            unit="DH"
            tone="lime"
            meta={
              <span className="font-mono tabular-nums">Réf. {booking.booking_reference}</span>
            }
          />

          {/* Booking Summary Card */}
          <StickerCard className="p-8">
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-extrabold mb-4 text-ink">{booking.events?.title}</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-ink bg-pink/15 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-pink" />
                    </div>
                    <div>
                      <p className="text-sm text-mute">Date</p>
                      <p className="font-semibold text-ink">
                        {new Date(booking.events?.event_date).toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-ink bg-pink/15 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-pink" />
                    </div>
                    <div>
                      <p className="text-sm text-mute">Lieu</p>
                      <p className="font-semibold text-ink">{booking.events?.city}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t-2 border-ink">
                <p className="text-sm font-semibold mb-3 text-ink">Billets ({booking.booking_tickets?.length || 1})</p>
                <div className="space-y-2">
                  {booking.booking_tickets?.map((ticket: any) => (
                    <div key={ticket.id} className="flex items-center justify-between p-3 rounded-xl border-2 border-line bg-paper-2">
                      <span className="font-medium text-ink">
                        {holderNames[ticket.child_id] || "Billet"}
                      </span>
                      <span className="text-sm text-mute capitalize">{ticket.ticket_type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </StickerCard>

          <StickerCard className="p-8">
            <p className="eyebrow tracking-[0.16em] text-mute">Avant l'événement</p>
            <h3 className="mt-2 mb-4 font-display text-lg font-extrabold text-ink">Consignes pour l'événement</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckRound checked disabled aria-hidden />
                <span className="text-sm text-ink-2">Arrive 15 minutes avant le début pour le check-in</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckRound checked disabled aria-hidden />
                <span className="text-sm text-ink-2">Apporte une pièce d'identité pour vérification</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckRound checked disabled aria-hidden />
                <span className="text-sm text-ink-2">Dress code : {booking.events?.dress_code || 'Tenue de soirée'}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckRound checked disabled aria-hidden />
                <span className="text-sm text-ink-2">Événement 100% sans alcool / Contrôle à l'entrée</span>
              </li>
            </ul>
          </StickerCard>

          <DarkSurface tone="pink" shadow className="p-8">
            <div className="flex items-start gap-6">
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl border-2 border-paper/30">
                <Share2 className="w-8 h-8 text-paper" />
              </span>
              <div className="flex-1">
                <p className="eyebrow tracking-[0.16em] text-paper/60">Programme ambassadeur</p>
                <h3 className="mt-1 font-display text-xl font-extrabold text-paper mb-2">Deviens ambassadeur Nivy</h3>
                <p className="text-sm text-paper/70 mb-4">
                  Gagne jusqu'à 50 DH par billet vendu ! Partage ta passion et aide tes amis à découvrir les events Nivy.
                </p>
                <Button asChild variant="pink">
                  <Link href="/devenir-ambassadeur">
                    Rejoindre le programme
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </DarkSurface>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild variant="pink" className="flex-1">
              <Link href={`/agenda/${booking.event_id}`}>
                Voir l'événement
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>

          <p className="text-center text-sm text-mute">
            Des questions ? Contacte-nous à{" "}
            <a href={`mailto:${contactEmail}`} className="text-pink hover:underline">
              {contactEmail}
            </a>
            {" "}ou via WhatsApp au{" "}
            <a href={`https://wa.me/${whatsappPhone}`} className="text-pink hover:underline">
              {supportPhone}
            </a>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  )
}
