import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Users, Clock, ExternalLink } from "lucide-react"
import Link from "next/link"
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

type EventRow = {
  id: string
  title: string | null
  slug: string | null
  description: string | null
  event_date: string | null
  status: string | null
  // Optional columns that may or may not be present (mig 048).
  partner_id?: string | null
  starts_at?: string | null
  ends_at?: string | null
  city?: string | null
  address?: string | null
  capacity?: number | null
}

const MONTH_SHORT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
})

function getEventStart(e: EventRow): Date | null {
  const raw = e.starts_at || e.event_date
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

function timeRange(e: EventRow): string {
  const start = getEventStart(e)
  if (!start) return ""
  const fmt = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  if (e.ends_at) {
    const end = new Date(e.ends_at)
    if (!Number.isNaN(end.getTime())) return `${fmt(start)} - ${fmt(end)}`
  }
  return fmt(start)
}

/**
 * Try to fetch events linked to this partner. The `events.partner_id` column
 * was added in migration 048; if it isn't present yet on this environment the
 * query throws — we degrade to an empty list rather than crashing the page.
 */
async function fetchPartnerEvents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  partnerId: string,
  nowIso: string,
): Promise<{ upcoming: EventRow[]; past: EventRow[]; columnMissing: boolean }> {
  try {
    const upcoming = await supabase
      .from("events")
      .select(
        "id, title, slug, description, event_date, status, partner_id, starts_at, ends_at, city, address, capacity",
      )
      .eq("partner_id", partnerId)
      .gte("event_date", nowIso)
      .order("event_date", { ascending: true })
      .limit(10)

    const past = await supabase
      .from("events")
      .select(
        "id, title, slug, description, event_date, status, partner_id, starts_at, ends_at, city, address, capacity",
      )
      .eq("partner_id", partnerId)
      .lt("event_date", nowIso)
      .order("event_date", { ascending: false })
      .limit(5)

    if (upcoming.error || past.error) {
      // PGRST204 / 42703 = column does not exist.
      return { upcoming: [], past: [], columnMissing: true }
    }

    return {
      upcoming: (upcoming.data ?? []) as EventRow[],
      past: (past.data ?? []) as EventRow[],
      columnMissing: false,
    }
  } catch {
    return { upcoming: [], past: [], columnMissing: true }
  }
}

async function fetchCheckInCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
): Promise<number> {
  const { count } = await supabase
    .from("event_check_ins")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
  return count ?? 0
}

export default async function PartnerEventsPage() {
  const userInfo = await getUserRole()

  if (!userInfo) {
    redirect("/auth/login")
  }

  const partnerId = userInfo.role === "partner" ? userInfo.partnerData?.id : null

  if (!partnerId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black text-white">Events Teen Club</h1>
          <p className="text-zinc-400">Profil partenaire introuvable.</p>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const nowIso = new Date().toISOString()

  const { upcoming, past, columnMissing } = await fetchPartnerEvents(
    supabase,
    partnerId,
    nowIso,
  )

  // Booking & check-in totals are fetched in parallel for the past block.
  const pastWithStats = await Promise.all(
    past.map(async (event) => {
      const [bookingsRes, checkIns] = await Promise.all([
        supabase
          .from("bookings")
          .select("total_amount", { count: "exact" })
          .eq("event_id", event.id)
          .in("payment_status", ["paid", "completed", "succeeded"]),
        fetchCheckInCount(supabase, event.id),
      ])
      const bookings = (bookingsRes.data ?? []) as { total_amount: number | null }[]
      const revenue = bookings.reduce((s, b) => s + Number(b.total_amount || 0), 0)
      return { event, scans: checkIns, revenue }
    }),
  )

  const upcomingWithStats = await Promise.all(
    upcoming.map(async (event) => {
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id)
        .in("status", ["confirmed", "paid", "completed"])
      return { event, attendees: count ?? 0 }
    }),
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white">Events Teen Club</h1>
        <p className="text-zinc-400">Participez aux événements et rencontrez vos clients</p>
      </div>

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border-emerald-500/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-white mb-1">Participez aux events Teen Club !</h3>
              <p className="text-zinc-300 text-sm">
                En tant que partenaire, vous pouvez avoir un stand lors de nos événements pour promouvoir vos offres
                et scanner les cartes des membres présents. C'est l'occasion idéale pour augmenter votre visibilité !
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {columnMissing && (
        <Card className="bg-zinc-900 border-amber-500/30">
          <CardContent className="p-4">
            <p className="text-sm text-amber-300">
              Module Events partenaire en cours de déploiement — vos événements liés s'afficheront automatiquement dès la mise à jour.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Events */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Événements à venir</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {upcomingWithStats.length === 0 ? (
            <p className="text-sm text-zinc-500 py-6 text-center">
              Pas encore d'événement à venir.
            </p>
          ) : (
            upcomingWithStats.map(({ event, attendees }) => {
              const start = getEventStart(event)
              const dayLabel = start ? String(start.getDate()) : "—"
              const monthLabel = start ? MONTH_SHORT[start.getMonth()].toUpperCase() : ""
              const fullDate = start ? DATE_FMT.format(start) : "Date à confirmer"
              const location = event.city || event.address || "Lieu à confirmer"
              const capacity = event.capacity ?? null
              const isFull = capacity !== null && attendees >= capacity

              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-5 rounded-xl bg-zinc-800 border border-zinc-700 hover:border-emerald-500/30 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-center min-w-[60px] p-3 rounded-xl bg-zinc-900">
                      <p className="text-xs text-zinc-500 uppercase">{monthLabel}</p>
                      <p className="text-2xl font-black text-white">{dayLabel}</p>
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">
                        {event.title || "Événement sans titre"}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {timeRange(event) || fullDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {attendees}
                          {capacity !== null ? `/${capacity}` : ""} inscrits
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {!isFull ? (
                      <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                        Voir l'event
                      </Button>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-zinc-700 text-zinc-400 text-sm">
                        Complet
                      </span>
                    )}
                    <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" asChild>
                      <Link href={event.slug ? `/events/${event.slug}` : "#"}>
                        Détails <ExternalLink className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Past Participations */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Vos participations passées</CardTitle>
        </CardHeader>
        <CardContent>
          {pastWithStats.length === 0 ? (
            <p className="text-sm text-zinc-500 py-6 text-center">
              Aucune participation passée.
            </p>
          ) : (
            <div className="space-y-3">
              {pastWithStats.map(({ event, scans, revenue }) => {
                const start = getEventStart(event)
                const fullDate = start ? DATE_FMT.format(start) : ""
                return (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-zinc-800 border border-zinc-700"
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {event.title || "Événement sans titre"}
                      </p>
                      <p className="text-sm text-zinc-400">{fullDate}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-xl font-black text-emerald-400">{scans}</p>
                        <p className="text-xs text-zinc-500">check-ins</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-black text-white">
                          {Math.round(revenue).toLocaleString()} DH
                        </p>
                        <p className="text-xs text-zinc-500">CA généré</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
