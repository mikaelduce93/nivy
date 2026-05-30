import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  ArrowLeft,
  MapPin,
  Clock,
  Ticket,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"
import { NivEmpty } from "@/components/brand"
import { Marquee } from "@/components/kit/marquee"

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

  const getStatusBadge = (status: string): { text: string; variant: StatusVariant } => {
    switch (status) {
      case "confirmed":
        return { text: "Confirmé", variant: "success" }
      case "pending":
        return { text: "En attente", variant: "warning" }
      case "cancelled":
        return { text: "Annulé", variant: "danger" }
      default:
        return { text: status.replace(/_/g, " "), variant: "neutral" }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-10">
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header éditorial */}
        <div className="mb-8">
          <p className="eyebrow text-pink">SORTIES · EVENTS</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Les sorties de <em className="font-semibold italic text-pink">ton crew</em>
          </h1>
          <p className="mt-2 text-sm text-mute">Suis les événements réservés par tes teens.</p>
        </div>

        {/* Récap en stickers (hiérarchie : à venir dominant) */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StickerCard className="p-4">
            <p className="eyebrow text-mute">À venir</p>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-ink">{upcoming.length}</p>
          </StickerCard>
          <StickerCard className="p-4">
            <p className="eyebrow text-mute">Confirmés</p>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-lime">
              {upcoming.filter((b: any) => b.status === "confirmed").length}
            </p>
          </StickerCard>
          <StickerCard className="p-4">
            <p className="eyebrow text-mute">Passés</p>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-teal">{past.length}</p>
          </StickerCard>
        </div>

        {/* Réservations à venir */}
        <section className="mb-10 space-y-4">
          <h2 className="eyebrow text-mute">Réservations à venir</h2>
          {upcoming.length > 0 ? (
            <div className="space-y-4">
              {upcoming.map((booking: any) => {
                const status = getStatusBadge(booking.status)
                return (
                  <StickerCard key={booking.id} variant="hover" className="p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                      <div className="relative h-24 w-full overflow-hidden rounded-xl border-2 border-ink bg-paper md:w-32">
                        {booking.event?.image_url ? (
                          <Image
                            src={booking.event.image_url}
                            alt={booking.event?.title || "Évènement"}
                            fill
                            sizes="(max-width: 768px) 100vw, 128px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="grid h-full place-items-center">
                            <Calendar className="h-10 w-10 text-mute" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-display text-lg font-bold text-ink">
                              {booking.event?.title || "Événement"}
                            </h3>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-mute">
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
                          <StatusBadge variant={status.variant} label={status.text} size="sm" />
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t-2 border-ink/10 pt-4">
                          <span className="text-sm text-ink-2">{booking.teen?.full_name || "Teen"}</span>
                          <div className="text-right">
                            <p className="font-mono text-base font-bold tabular-nums text-ink">
                              {booking.total_price || 0} DH
                            </p>
                            <p className="font-mono text-xs text-mute">Code : {booking.ticket_code}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </StickerCard>
                )
              })}
            </div>
          ) : (
            <NivEmpty
              title="Aucune réservation à venir"
              description="Tes teens n'ont pas encore de sortie réservée 🎟️"
            />
          )}
        </section>

        {/* Événements disponibles */}
        {upcomingEvents.length > 0 && (
          <Marquee
            items={upcomingEvents.map((e: any) => e.title)}
            speed="slow"
            className="mb-6 rounded-2xl"
          />
        )}
        <section className="mb-10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="eyebrow text-mute">Événements disponibles</h2>
            <Button asChild variant="ghost" size="sm" className="text-pink hover:text-pink">
              <Link href="/agenda">Voir tout</Link>
            </Button>
          </div>
          {upcomingEvents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((event: any) => (
                <StickerCard key={event.id} variant="hover" className="p-4">
                  <div className="relative mb-3 h-32 overflow-hidden rounded-xl border-2 border-ink bg-paper">
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
                      <div className="grid h-full place-items-center">
                        <Calendar className="h-12 w-12 text-mute" />
                      </div>
                    )}
                  </div>
                  <h4 className="font-display font-bold text-ink">{event.title}</h4>
                  <div className="mt-1 flex items-center gap-2 text-xs text-mute">
                    <Calendar className="h-3 w-3" />
                    {formatDate(event.event_date)}
                    <span>·</span>
                    <MapPin className="h-3 w-3" />
                    {event.city}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-mono text-sm font-bold tabular-nums text-ink">{event.price} DH</span>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/events/${event.id}`}>Voir</Link>
                    </Button>
                  </div>
                </StickerCard>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-mute">Aucun événement disponible</p>
          )}
        </section>

        {/* Historique */}
        {past.length > 0 && (
          <section className="space-y-3">
            <h2 className="eyebrow text-mute">Historique</h2>
            <div className="space-y-3">
              {past.slice(0, 5).map((booking: any) => (
                <StickerCard key={booking.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl border-2 border-ink bg-paper">
                        <Ticket className="h-5 w-5 text-mute" />
                      </div>
                      <div>
                        <p className="font-medium text-ink-2">
                          {booking.event?.title || "Événement"}
                        </p>
                        <p className="font-mono text-xs text-mute">
                          {formatDate(booking.event?.event_date)} · {booking.teen?.full_name}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-sm font-semibold tabular-nums text-ink">
                      {booking.total_price} DH
                    </span>
                  </div>
                </StickerCard>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
