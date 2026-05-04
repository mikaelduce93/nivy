import { createClient } from "@/lib/supabase/server"
import { redirect } from 'next/navigation'
import { Calendar, MapPin, Ticket, QrCode, CheckCircle, Cake, Users, Clock } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Mes Réservations | Teens Party Morocco",
  description: "Consultez toutes vos réservations d'événements, anniversaires, billets et QR codes pour Teens Party Morocco",
  robots: { index: false, follow: false },
}

export default async function MyReservationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch event bookings
  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      *,
      events (
        title,
        event_date,
        event_time,
        venue_name,
        city,
        image_url
      ),
      booking_tickets (
        id,
        ticket_type,
        price,
        qr_code,
        checked_in,
        children (
          prenom,
          nom
        )
      )
    `)
    .eq("parent_id", user.id)
    .order("created_at", { ascending: false })

  // Fetch birthday orders
  const { data: birthdayOrders } = await supabase
    .from("anniv_orders")
    .select(`
      *,
      teen:teen_id (first_name, last_name, pseudo),
      pack:pack_id (name, pack_type, image_url)
    `)
    .eq("parent_id", user.id)
    .order("celebration_date", { ascending: false })

  const upcomingBookings = bookings?.filter((b) => b.events && new Date(b.events.event_date) >= new Date()) || []
  const pastBookings = bookings?.filter((b) => b.events && new Date(b.events.event_date) < new Date()) || []

  const upcomingBirthdays = birthdayOrders?.filter((b) => new Date(b.celebration_date) >= new Date()) || []
  const pastBirthdays = birthdayOrders?.filter((b) => new Date(b.celebration_date) < new Date()) || []

  const hasAnyReservations = (bookings && bookings.length > 0) || (birthdayOrders && birthdayOrders.length > 0)

  const getStatusBadge = (status: string, paymentStatus?: string) => {
    if (status === "confirmed" || paymentStatus === "paid") {
      return (
        <div className="bg-green-500 text-white font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          CONFIRMÉ
        </div>
      )
    }
    if (status === "cancelled") {
      return (
        <div className="bg-red-500 text-white font-bold text-xs px-3 py-1 rounded-full">
          ANNULÉ
        </div>
      )
    }
    return (
      <div className="bg-yellow-500 text-black font-bold text-xs px-3 py-1 rounded-full">
        EN ATTENTE
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        <h1 className="text-4xl md:text-6xl font-black text-white mb-8">Mes Réservations</h1>

        {hasAnyReservations ? (
          <Tabs defaultValue="events" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-zinc-900 mb-8">
              <TabsTrigger value="events" className="data-[state=active]:bg-cyan-500">
                <Ticket className="w-4 h-4 mr-2" />
                Événements ({(bookings?.length || 0)})
              </TabsTrigger>
              <TabsTrigger value="birthdays" className="data-[state=active]:bg-pink-500">
                <Cake className="w-4 h-4 mr-2" />
                Anniversaires ({(birthdayOrders?.length || 0)})
              </TabsTrigger>
            </TabsList>

            {/* Events Tab */}
            <TabsContent value="events">
              {bookings && bookings.length > 0 ? (
                <div className="space-y-12">
                  {upcomingBookings.length > 0 && (
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-6">À venir</h2>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {upcomingBookings.map((booking) => (
                          <Card
                            key={booking.id}
                            className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 overflow-hidden"
                          >
                            <div className="relative h-48">
                              <Image
                                src={booking.events?.image_url || "/placeholder.svg?height=200&width=400&query=event"}
                                alt={booking.events?.title || "Event"}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              />
                              <div className="absolute top-4 right-4">
                                {getStatusBadge(booking.status)}
                              </div>
                              <div className="absolute top-4 left-4 bg-cyan-500 text-white font-black text-sm px-3 py-1 rounded-lg">
                                {booking.booking_reference}
                              </div>
                            </div>

                            <CardContent className="p-6">
                              <h3 className="text-xl font-bold text-white mb-4 line-clamp-2">{booking.events?.title}</h3>

                              <div className="space-y-2 mb-6">
                                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                  <Calendar className="w-4 h-4 text-cyan-400" />
                                  <span>
                                    {new Date(booking.events?.event_date || "").toLocaleDateString("fr-FR", {
                                      weekday: "long",
                                      day: "numeric",
                                      month: "long",
                                    })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                  <MapPin className="w-4 h-4 text-cyan-400" />
                                  <span>{booking.events?.city}</span>
                                </div>
                                {booking.booking_tickets?.map((ticket: any) => (
                                  <div key={ticket.id} className="flex items-center gap-2 text-zinc-400 text-sm">
                                    <Ticket className="w-4 h-4 text-cyan-400" />
                                    <span>
                                      {ticket.children?.prenom} {ticket.children?.nom} -{" "}
                                      {ticket.ticket_type === "vip" ? "VIP" : "Standard"}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {booking.qr_code && (
                                <div className="bg-white p-4 rounded-lg mb-4">
                                  <Image
                                    src={booking.qr_code || "/placeholder.svg"}
                                    alt="QR Code"
                                    width={200}
                                    height={200}
                                    className="w-full h-auto"
                                  />
                                  <p className="text-center text-xs text-zinc-600 mt-2">Code de réservation</p>
                                </div>
                              )}

                              <Button
                                asChild
                                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0"
                              >
                                <Link href={`/mes-reservations/${booking.id}`}>
                                  <QrCode className="w-4 h-4 mr-2" />
                                  Voir les billets
                                </Link>
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {pastBookings.length > 0 && (
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-6">Passées</h2>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 opacity-60">
                        {pastBookings.map((booking) => (
                          <Card
                            key={booking.id}
                            className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 overflow-hidden"
                          >
                            <div className="relative h-48">
                              <Image
                                src={booking.events?.image_url || "/placeholder.svg?height=200&width=400&query=event"}
                                alt={booking.events?.title || "Événement"}
                                fill
                                className="object-cover grayscale"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              />
                            </div>

                            <CardContent className="p-6">
                              <h3 className="text-xl font-bold text-white mb-4 line-clamp-2">{booking.events?.title}</h3>

                              <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                                  <Calendar className="w-4 h-4" />
                                  <span>{new Date(booking.events?.event_date || "").toLocaleDateString("fr-FR")}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-20">
                  <Ticket className="w-20 h-20 text-zinc-700 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-white mb-4">Aucune réservation d'événement</h3>
                  <p className="text-zinc-400 mb-8">Découvrez nos prochains événements et réservez vos places</p>
                  <Button
                    asChild
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0"
                  >
                    <Link href="/evenements">Voir les événements</Link>
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Birthdays Tab */}
            <TabsContent value="birthdays">
              {birthdayOrders && birthdayOrders.length > 0 ? (
                <div className="space-y-12">
                  {upcomingBirthdays.length > 0 && (
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-6">À venir</h2>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {upcomingBirthdays.map((order) => (
                          <Card
                            key={order.id}
                            className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 overflow-hidden"
                          >
                            <div className="relative h-48 bg-gradient-to-br from-pink-500 to-purple-500">
                              {order.pack?.image_url && (
                                <Image
                                  src={order.pack.image_url}
                                  alt={order.pack?.name || "Pack anniversaire"}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                              <div className="absolute top-4 right-4">
                                {getStatusBadge(order.status, order.payment_status)}
                              </div>
                              <div className="absolute top-4 left-4 bg-pink-500 text-white font-black text-sm px-3 py-1 rounded-lg">
                                {order.booking_reference}
                              </div>
                              <div className="absolute bottom-4 left-4">
                                <Cake className="w-8 h-8 text-white" />
                              </div>
                            </div>

                            <CardContent className="p-6">
                              <h3 className="text-xl font-bold text-white mb-2">
                                {order.teen?.pseudo || order.teen?.first_name || "Anniversaire"}
                              </h3>
                              <p className="text-pink-400 font-medium mb-4">{order.pack?.name}</p>

                              <div className="space-y-2 mb-6">
                                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                  <Calendar className="w-4 h-4 text-pink-400" />
                                  <span>
                                    {new Date(order.celebration_date).toLocaleDateString("fr-FR", {
                                      weekday: "long",
                                      day: "numeric",
                                      month: "long",
                                    })}
                                  </span>
                                </div>
                                {order.celebration_time && (
                                  <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                    <Clock className="w-4 h-4 text-pink-400" />
                                    <span>{order.celebration_time}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                  <Users className="w-4 h-4 text-pink-400" />
                                  <span>{order.guest_count} invités</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between mb-4 p-3 bg-zinc-800 rounded-lg">
                                <span className="text-zinc-400">Total</span>
                                <span className="text-2xl font-black text-pink-400">{order.total_price} DH</span>
                              </div>

                              {order.qr_code && (
                                <div className="bg-white p-4 rounded-lg mb-4">
                                  <Image
                                    src={order.qr_code}
                                    alt="QR Code"
                                    width={200}
                                    height={200}
                                    className="w-full h-auto"
                                  />
                                  <p className="text-center text-xs text-zinc-600 mt-2">Présente ce code le jour J</p>
                                </div>
                              )}

                              <Button
                                asChild
                                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-0"
                              >
                                <Link href={`/mes-reservations/anniversaire/${order.id}`}>
                                  <QrCode className="w-4 h-4 mr-2" />
                                  Voir les détails
                                </Link>
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {pastBirthdays.length > 0 && (
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-6">Passées</h2>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 opacity-60">
                        {pastBirthdays.map((order) => (
                          <Card
                            key={order.id}
                            className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 overflow-hidden"
                          >
                            <div className="relative h-48 bg-gradient-to-br from-pink-500/50 to-purple-500/50">
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Cake className="w-16 h-16 text-white/50" />
                              </div>
                            </div>

                            <CardContent className="p-6">
                              <h3 className="text-xl font-bold text-white mb-2">
                                {order.teen?.pseudo || order.teen?.first_name || "Anniversaire"}
                              </h3>
                              <p className="text-zinc-500 mb-4">{order.pack?.name}</p>

                              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(order.celebration_date).toLocaleDateString("fr-FR")}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-20">
                  <Cake className="w-20 h-20 text-zinc-700 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-white mb-4">Aucune réservation d'anniversaire</h3>
                  <p className="text-zinc-400 mb-8">Organisez un anniversaire inoubliable pour votre enfant!</p>
                  <Button
                    asChild
                    className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-0"
                  >
                    <Link href="/anniversaires">Configurer un anniversaire</Link>
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-20">
            <Ticket className="w-20 h-20 text-zinc-700 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-white mb-4">Aucune réservation</h3>
            <p className="text-zinc-400 mb-8">Découvrez nos événements et réservez vos places</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0"
              >
                <Link href="/evenements">Voir les événements</Link>
              </Button>
              <Button
                asChild
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-0"
              >
                <Link href="/anniversaires">Organiser un anniversaire</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
