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
import Image from "next/image"
import Link from "next/link"
import { EmptyState } from "@/components/ui/states/empty-state"

async function getTeenBookings(parentId: string) {
  const supabase = await createClient()

  // parent_teens_overview is the canonical view (P2.3 inventory: replaces
  // direct queries against parent_teen_links which sometimes lack `status`).
  const { data: teens } = await supabase
    .from("parent_teens_overview")
    .select("teen_id, teen_name, full_name")
    .eq("parent_id", parentId)

  if (!teens || teens.length === 0) return { upcoming: [], past: [] }

  const teenIds = teens.map((t: any) => t.teen_id)

  // events table uses event_date (not date). venue_name (not venue).
  // event_start (not time).
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(`
      id, teen_id, status, payment_status, total_price, ticket_code, created_at,
      event:event_id (
        id, title, description, event_date, event_start,
        venue_name, city, image_url, price, category
      )
    `)
    .in("teen_id", teenIds)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching bookings:", error)
    return { upcoming: [], past: [] }
  }

  const teenNameMap = new Map<string, string>(
    teens.map((t: any) => [t.teen_id, t.full_name || t.teen_name || "Teen"])
  )

  const decorated = (bookings ?? []).map((b: any) => ({
    ...b,
    teen: { id: b.teen_id, full_name: teenNameMap.get(b.teen_id) ?? "Teen" },
  }))

  const now = new Date()
  const upcoming = decorated.filter((b: any) => {
    const eventDate = b.event?.event_date ? new Date(b.event.event_date) : null
    return eventDate && eventDate >= now && b.status !== "cancelled"
  })

  const past = decorated.filter((b: any) => {
    const eventDate = b.event?.event_date ? new Date(b.event.event_date) : null
    return (eventDate && eventDate < now) || b.status === "cancelled"
  })

  return { upcoming, past }
}

async function getUpcomingEvents() {
  const supabase = await createClient()

  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, event_date, event_start, venue_name, city, image_url, price, category")
    .eq("status", "published")
    .gte("event_date", new Date().toISOString())
    .order("event_date", { ascending: true })
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
          class: "bg-lime/20 text-lime"
        }
      case "pending":
        return {
          icon: AlertCircle,
          text: "En attente",
          class: "bg-gold/20 text-gold"
        }
      case "cancelled":
        return {
          icon: AlertCircle,
          text: "Annulé",
          class: "bg-destructive/20 text-destructive"
        }
      default:
        return {
          icon: Ticket,
          text: status,
          class: "bg-muted text-mute"
        }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-ink">Événements</h1>
            <p className="text-mute">Suivez les événements de vos teens</p>
          </div>
          <Button variant="outline" className="border-ink text-ink-2">
            <Filter className="h-4 w-4 mr-2" />
            Filtrer
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-lime/20 to-teal/20 border-lime/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-lime font-medium">À venir</p>
                  <p className="text-3xl font-black text-ink">{upcoming.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-lime/20 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-lime" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal/20 to-teal/20 border-teal/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-teal font-medium">Confirmés</p>
                  <p className="text-3xl font-black text-ink">
                    {upcoming.filter((b: any) => b.status === "confirmed").length}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-teal/20 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-teal" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gold/20 to-coral/20 border-gold/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gold font-medium">En attente</p>
                  <p className="text-3xl font-black text-ink">
                    {upcoming.filter((b: any) => b.status === "pending").length}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gold/20 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-gold" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink/20 to-pink/20 border-pink/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-pink font-medium">Total passés</p>
                  <p className="text-3xl font-black text-ink">{past.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-pink/20 flex items-center justify-center">
                  <Ticket className="h-6 w-6 text-pink" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Bookings */}
        <Card className="bg-gradient-to-br from-paper-2 to-card border-ink mb-8">
          <CardHeader>
            <CardTitle className="text-ink flex items-center gap-2">
              <Calendar className="h-5 w-5 text-lime" />
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
                      className="p-5 rounded-2xl bg-card border border-ink hover:border-lime/30 transition-all"
                    >
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Event Image */}
                        <div className="relative w-full md:w-32 h-24 rounded-xl bg-gradient-to-br from-lime/20 to-teal/20 flex items-center justify-center overflow-hidden">
                          {booking.event?.image_url ? (
                            <Image
                              src={booking.event.image_url}
                              alt={booking.event?.title || "Évènement"}
                              fill
                              sizes="(max-width: 768px) 100vw, 128px"
                              className="object-cover"
                            />
                          ) : (
                            <Calendar className="h-10 w-10 text-lime" />
                          )}
                        </div>

                        {/* Event Info */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-bold text-ink">
                                {booking.event?.title || "Événement"}
                              </h3>
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-mute">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {formatDate(booking.event?.event_date)}
                                </span>
                                {booking.event?.event_start && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {formatTime(booking.event.event_start)}
                                  </span>
                                )}
                                {(booking.event?.venue_name || booking.event?.city) && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {booking.event?.venue_name || booking.event?.city}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full ${status.class}`}>
                              <StatusIcon className="h-3 w-3" />
                              {status.text}
                            </span>
                          </div>

                          {/* Teen info & Price */}
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-ink">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-lime to-teal flex items-center justify-center text-ink font-bold text-sm">
                                {booking.teen?.full_name?.charAt(0) || "?"}
                              </div>
                              <span className="text-sm text-ink-2">{booking.teen?.full_name || "Teen"}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-black text-lime">{booking.total_price || 0} DH</p>
                              <p className="text-xs text-mute">Code: {booking.ticket_code}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                preset="tickets"
                description="Vos teens n'ont pas encore de réservations à venir"
              />
            )}
          </CardContent>
        </Card>

        {/* Available Events */}
        <Card className="bg-gradient-to-br from-paper-2 to-card border-ink mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-ink flex items-center gap-2">
              <Star className="h-5 w-5 text-gold" />
              Événements disponibles
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-lime hover:text-lime">
              <Link href="/agenda">
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
                    className="p-4 rounded-xl bg-card border border-ink hover:border-lime/30 transition-all"
                  >
                    <div className="relative h-32 rounded-lg bg-gradient-to-br from-lime/20 to-teal/20 flex items-center justify-center mb-3 overflow-hidden">
                      {event.image_url ? (
                        <Image
                          src={event.image_url}
                          alt={event.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Calendar className="h-12 w-12 text-lime" />
                      )}
                    </div>
                    <h4 className="font-bold text-ink mb-1">{event.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-mute mb-2">
                      <Calendar className="h-3 w-3" />
                      {formatDate(event.event_date)}
                      <span className="text-mute">•</span>
                      <MapPin className="h-3 w-3" />
                      {event.city}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lime font-bold">{event.price} DH</span>
                      <Button size="sm" variant="outline" className="border-ink text-ink-2 hover:border-lime/50" asChild>
                        <Link href={`/events/${event.id}`}>
                          Voir
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-mute py-8">Aucun événement disponible</p>
            )}
          </CardContent>
        </Card>

        {/* Past Bookings */}
        {past.length > 0 && (
          <Card className="bg-gradient-to-br from-paper-2 to-card border-ink">
            <CardHeader>
              <CardTitle className="text-ink flex items-center gap-2">
                <Clock className="h-5 w-5 text-mute" />
                Historique
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {past.slice(0, 5).map((booking: any) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-card border border-ink"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-card flex items-center justify-center">
                        <Ticket className="h-5 w-5 text-mute" />
                      </div>
                      <div>
                        <p className="font-medium text-ink-2">
                          {booking.event?.title || "Événement"}
                        </p>
                        <p className="text-xs text-mute">
                          {formatDate(booking.event?.event_date)} • {booking.teen?.full_name}
                        </p>
                      </div>
                    </div>
                    <span className="text-mute">{booking.total_price} DH</span>
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
