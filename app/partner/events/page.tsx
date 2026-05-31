import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { DarkSurface, NivCoach, NivEmpty } from "@/components/brand"
import { MapPin, Users, Clock, ExternalLink } from "lucide-react"
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
      <div className="space-y-6 pt-6">
        <header className="space-y-2">
          <p className="eyebrow">Events Teen Club</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
            Events <em className="font-semibold italic text-pink">Teen Club</em>
          </h1>
          <p className="text-mute">Profil partenaire introuvable.</p>
        </header>
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
    <div className="space-y-6 pt-6">
      {/* Header éditorial */}
      <header className="space-y-2">
        <p className="eyebrow">Events Teen Club</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
          Events <em className="font-semibold italic text-pink">Teen Club</em>
        </h1>
        <p className="text-mute max-w-md">
          Tiens ton stand aux events, scanne les cartes des membres et fais grimper ta visibilité.
        </p>
      </header>

      {/* Stand partenaire — surface sombre + coach Niv */}
      <NivCoach
        mood="hype"
        tone="dark"
        message="Avec ton stand partenaire, tu fais découvrir tes offres en vrai et tu scannes les cartes des membres présents. C'est le boost de visibilité parfait."
      />

      {columnMissing && (
        <StickerCard variant="panel" className="border-gold p-4">
          <p className="text-sm text-gold">
            Module Events partenaire en cours de déploiement — tes événements liés s'afficheront automatiquement dès la mise à jour.
          </p>
        </StickerCard>
      )}

      {/* Événements à venir */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
          Événements à venir
        </h2>
        {upcomingWithStats.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Pas encore d'event à venir"
            description="Dès qu'un event Teen Club est programmé avec ton stand, il s'affiche ici."
          />
        ) : (
          <div className="space-y-4">
            {upcomingWithStats.map(({ event, attendees }) => {
              const start = getEventStart(event)
              const dayLabel = start ? String(start.getDate()) : "—"
              const monthLabel = start ? MONTH_SHORT[start.getMonth()].toUpperCase() : ""
              const fullDate = start ? DATE_FMT.format(start) : "Date à confirmer"
              const location = event.city || event.address || "Lieu à confirmer"
              const capacity = event.capacity ?? null
              const isFull = capacity !== null && attendees >= capacity

              return (
                <StickerCard key={event.id} variant="hover" className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="min-w-[60px] rounded-xl border-2 border-ink bg-ink p-3 text-center text-paper">
                        <p className="font-mono text-xs uppercase tracking-wider text-paper/70">{monthLabel}</p>
                        <p className="font-display text-2xl font-extrabold tabular-nums">{dayLabel}</p>
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-bold text-ink">
                          {event.title || "Événement sans titre"}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-mute">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {timeRange(event) || fullDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {location}
                          </span>
                          <span className="flex items-center gap-1 font-mono tabular-nums">
                            <Users className="h-4 w-4" />
                            {attendees}
                            {capacity !== null ? `/${capacity}` : ""} inscrits
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {!isFull ? (
                        <Button asChild variant="pink">
                          <Link href={event.id ? `/agenda/${event.id}` : "#"}>
                            Voir l'event
                          </Link>
                        </Button>
                      ) : (
                        <span className="rounded-full border-2 border-ink bg-lime px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wide text-on-bright">
                          Complet
                        </span>
                      )}
                      <Button variant="ghost" size="sm" className="text-mute hover:text-ink" asChild>
                        <Link href={event.id ? `/agenda/${event.id}` : "#"}>
                          Détails <ExternalLink className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </StickerCard>
              )
            })}
          </div>
        )}
      </section>

      {/* Participations passées */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
          Tes participations passées
        </h2>
        {pastWithStats.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Aucune participation passée"
            description="Tes events passés et le CA généré sur ton stand s'afficheront ici."
          />
        ) : (
          <div className="space-y-3">
            {pastWithStats.map(({ event, scans, revenue }) => {
              const start = getEventStart(event)
              const fullDate = start ? DATE_FMT.format(start) : ""
              return (
                <StickerCard key={event.id} variant="default" className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-display font-bold text-ink">
                        {event.title || "Événement sans titre"}
                      </p>
                      <p className="text-sm text-mute">{fullDate}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 rounded-full border-2 border-ink bg-lime/15 px-3 py-1 font-mono text-sm font-semibold tabular-nums text-ink">
                        {scans} ✓
                      </span>
                      <div className="rounded-xl border-2 border-ink bg-ink px-4 py-2 text-right text-paper">
                        <p className="font-display text-xl font-extrabold tabular-nums text-gold">
                          {Math.round(revenue).toLocaleString()} <span className="font-mono text-sm">DH</span>
                        </p>
                        <p className="font-mono text-[11px] uppercase tracking-wide text-paper/60">CA généré</p>
                      </div>
                    </div>
                  </div>
                </StickerCard>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
