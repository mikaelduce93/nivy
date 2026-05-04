import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, Calendar, MapPin, Download, QrCode, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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
      events (
        title,
        event_date,
        event_time,
        end_time,
        venue_name,
        venue_address,
        city,
        image_url,
        description
      ),
      booking_tickets (
        id,
        ticket_type,
        price,
        qr_code,
        checked_in,
        checked_in_at,
        children (
          prenom,
          nom,
          date_naissance
        )
      )
    `)
    .eq("id", id)
    .eq("parent_id", user.id)
    .single()

  if (!booking) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        <Button asChild variant="ghost" className="text-zinc-400 hover:text-white mb-8">
          <Link href="/mes-reservations">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux réservations
          </Link>
        </Button>

        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl overflow-hidden border border-zinc-800 mb-8">
            <div className="relative h-64">
              <img
                src={booking.events?.image_url || "/placeholder.svg?height=300&width=800&query=event"}
                alt={booking.events?.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-cyan-500 text-white font-black text-sm px-3 py-1 rounded-lg">
                    {booking.booking_reference}
                  </div>
                  <div className="bg-green-500 text-white font-bold text-xs px-3 py-1 rounded-full">
                    {booking.status === "confirmed" ? "CONFIRMÉ" : booking.status.toUpperCase()}
                  </div>
                </div>
                <h1 className="text-3xl font-black text-white">{booking.events?.title}</h1>
              </div>
            </div>

            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">Date et heure</p>
                    <p className="text-white font-semibold">
                      {new Date(booking.events?.event_date || "").toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-cyan-400 text-sm">{booking.events?.event_time}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">Lieu</p>
                    <p className="text-white font-semibold">{booking.events?.venue_name}</p>
                    <p className="text-zinc-400 text-sm">{booking.events?.venue_address}</p>
                    <p className="text-cyan-400 text-sm">{booking.events?.city}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-zinc-400">Total payé</p>
                  <p className="text-2xl font-black text-cyan-400">{booking.total_amount} DH</p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <p className="text-zinc-500">Statut du paiement</p>
                  <p className="text-green-400 font-semibold">
                    {booking.payment_status === "paid" ? "Payé" : booking.payment_status}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-6">Billets</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {booking.booking_tickets?.map((ticket: any) => {
              const age = Math.floor(
                (new Date().getTime() - new Date(ticket.children?.date_naissance).getTime()) /
                  (1000 * 60 * 60 * 24 * 365),
              )

              return (
                <Card key={ticket.id} className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-bold">
                            {ticket.children?.prenom} {ticket.children?.nom}
                          </p>
                          <p className="text-zinc-400 text-sm">{age} ans</p>
                        </div>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          ticket.ticket_type === "vip"
                            ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                            : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                        }`}
                      >
                        {ticket.ticket_type === "vip" ? "VIP" : "STANDARD"}
                      </div>
                    </div>

                    {ticket.checked_in ? (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
                        <p className="text-green-400 text-sm font-semibold">
                          Billet scanné le {new Date(ticket.checked_in_at).toLocaleString("fr-FR")}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="bg-white p-4 rounded-lg mb-4">
                          <img src={ticket.qr_code || "/placeholder.svg"} alt="QR Code" className="w-full" />
                        </div>
                        <p className="text-center text-zinc-500 text-xs mb-4">Présentez ce code QR à l'entrée</p>
                      </>
                    )}

                    <div className="flex items-center justify-between text-sm pt-4 border-t border-zinc-800">
                      <span className="text-zinc-400">Prix</span>
                      <span className="text-white font-bold">{ticket.price} DH</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="mt-8 flex gap-4">
            <Button className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0">
              <Download className="w-4 h-4 mr-2" />
              Télécharger tous les billets
            </Button>
            <Button
              variant="outline"
              className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white bg-transparent"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Partager
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
