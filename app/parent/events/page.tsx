import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  ArrowLeft,
  MapPin,
  Clock,
  Users,
  Ticket,
  CheckCircle,
  AlertCircle,
  Star,
  Filter
} from "lucide-react"
import Link from "next/link"

async function getTeenBookings(parentId: string) {
  const supabase = await createClient()

  // Get linked teens
  const { data: teens } = await supabase
    .from("parent_teen_links")
    .select("teen_id")
    .eq("parent_id", parentId)
    .eq("status", "active")

  if (!teens || teens.length === 0) return { upcoming: [], past: [] }

  const teenIds = teens.map(t => t.teen_id)

  // Get bookings with event details
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(`
      *,
      event:event_id (
        id,
        title,
        description,
        date,
        time,
        venue,
        city,
        image_url,
        price,
        category
      ),
      teen:teen_id (
        id,
        full_name
      )
    `)
    .in("teen_id", teenIds)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching bookings:", error)
    return { upcoming: [], past: [] }
  }

  const now = new Date()
  const upcoming = bookings?.filter((b: any) => {
    const eventDate = new Date(b.event?.date || b.event_date)
    return eventDate >= now && b.status !== "cancelled"
  }) || []

  const past = bookings?.filter((b: any) => {
    const eventDate = new Date(b.event?.date || b.event_date)
    return eventDate < now || b.status === "cancelled"
  }) || []

  return { upcoming, past }
}

async function getUpcomingEvents() {
  const supabase = await createClient()

  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .gte("date", new Date().toISOString())
    .order("date", { ascending: true })
    .limit(6)

  if (error) {
    console.error("Error fetching events:", error)
    return []
  }

  return events || []
}

export default async function ParentEventsPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  const { upcoming, past } = await getTeenBookings(userInfo.profileId)
  const upcomingEvents = await getUpcomingEvents()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return ""
    return timeString.substring(0, 5)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return {
          icon: CheckCircle,
          text: "Confirmé",
          class: "bg-emerald-500/20 text-emerald-400"
        }
      case "pending":
        return {
          icon: AlertCircle,
          text: "En attente",
          class: "bg-amber-500/20 text-amber-400"
        }
      case "cancelled":
        return {
          icon: AlertCircle,
          text: "Annulé",
          class: "bg-red-500/20 text-red-400"
        }
      default:
        return {
          icon: Ticket,
          text: status,
          class: "bg-zinc-500/20 text-zinc-400"
        }
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-zinc-400 hover:text-white">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">Événements</h1>
            <p className="text-zinc-400">Suivez les événements de vos teens</p>
          </div>
          <Button variant="outline" className="border-zinc-700 text-zinc-300">
            <Filter className="h-4 w-4 mr-2" />
            Filtrer
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-400 font-medium">À venir</p>
                  <p className="text-3xl font-black text-white">{upcoming.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-400 font-medium">Confirmés</p>
                  <p className="text-3xl font-black text-white">
                    {upcoming.filter((b: any) => b.status === "confirmed").length}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-400 font-medium">En attente</p>
                  <p className="text-3xl font-black text-white">
                    {upcoming.filter((b: any) => b.status === "pending").length}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-400 font-medium">Total passés</p>
                  <p className="text-3xl font-black text-white">{past.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Ticket className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Bookings */}
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-400" />
              Réservations à venir
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length > 0 ? (
              <div className="space-y-4">
                {upcoming.map((booking: any) => {
                  const status = getStatusBadge(booking.status)
                  const StatusIcon = status.icon
                  return (
                    <div
                      key={booking.id}
                      className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/30 transition-all"
                    >
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Event Image */}
                        <div className="w-full md:w-32 h-24 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center overflow-hidden">
                          {booking.event?.image_url ? (
                            <img
                              src={booking.event.image_url}
                              alt={booking.event?.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Calendar className="h-10 w-10 text-emerald-400" />
                          )}
                        </div>

                        {/* Event Info */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-bold text-white">
                                {booking.event?.title || booking.event_title || "Événement"}
                              </h3>
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-zinc-400">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {formatDate(booking.event?.date || booking.event_date)}
                                </span>
                                {(booking.event?.time || booking.event_time) && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {formatTime(booking.event?.time || booking.event_time)}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {booking.event?.city || booking.event_city}
                                </span>
                              </div>
                            </div>
                            <span className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full ${status.class}`}>
                              <StatusIcon className="h-3 w-3" />
                              {status.text}
                            </span>
                          </div>

                          {/* Teen info & Price */}
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                                {booking.teen?.full_name?.charAt(0) || "?"}
                              </div>
                              <span className="text-sm text-zinc-300">{booking.teen?.full_name || "Teen"}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-black text-emerald-400">{booking.total_price || 0} DH</p>
                              <p className="text-xs text-zinc-500">Code: {booking.ticket_code}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-zinc-700" />
                <h3 className="text-xl font-bold text-white mb-2">Aucune réservation</h3>
                <p className="text-zinc-400">Vos teens n'ont pas encore de réservations à venir</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Events */}
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-400" />
              Événements disponibles
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-emerald-400 hover:text-emerald-300">
              <Link href="/events">
                Voir tout
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingEvents.map((event: any) => (
                  <div
                    key={event.id}
                    className="p-4 rounded-xl bg-zinc-800 border border-zinc-700 hover:border-emerald-500/30 transition-all"
                  >
                    <div className="h-32 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-3 overflow-hidden">
                      {event.image_url ? (
                        <img
                          src={event.image_url}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Calendar className="h-12 w-12 text-emerald-400" />
                      )}
                    </div>
                    <h4 className="font-bold text-white mb-1">{event.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
                      <Calendar className="h-3 w-3" />
                      {formatDate(event.date)}
                      <span className="text-zinc-600">•</span>
                      <MapPin className="h-3 w-3" />
                      {event.city}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400 font-bold">{event.price} DH</span>
                      <Button size="sm" variant="outline" className="border-zinc-600 text-zinc-300 hover:border-emerald-500/50" asChild>
                        <Link href={`/events/${event.id}`}>
                          Voir
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-zinc-500 py-8">Aucun événement disponible</p>
            )}
          </CardContent>
        </Card>

        {/* Past Bookings */}
        {past.length > 0 && (
          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-zinc-400" />
                Historique
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {past.slice(0, 5).map((booking: any) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                        <Ticket className="h-5 w-5 text-zinc-500" />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-300">
                          {booking.event?.title || booking.event_title}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatDate(booking.event?.date || booking.event_date)} • {booking.teen?.full_name}
                        </p>
                      </div>
                    </div>
                    <span className="text-zinc-400">{booking.total_price} DH</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
