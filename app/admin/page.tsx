import { createClient } from "@/lib/supabase/server"
import { redirect } from 'next/navigation'
import {
  Users,
  Calendar,
  DollarSign,
  Award,
  Ticket,
  Shield,
  TrendingUp,
  Database,
  CheckSquare,
  GraduationCap,
  Briefcase,
  Car,
  ShoppingBag,
  Activity,
  Image as ImageIcon,
  ScrollText,
  Building2,
  Cake,
  QrCode,
} from 'lucide-react'
import Link from "next/link"
import { Niv, DarkSurface, NivEmpty } from "@/components/brand"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatCard } from "@/components/admin/stat-card"

const NAV_GROUPS = [
  {
    title: "Opérations",
    items: [
      { href: "/admin/evenements", label: "Événements", icon: Calendar },
      { href: "/admin/reservations", label: "Réservations", icon: Ticket },
      { href: "/admin/anniversaires", label: "Anniversaires", icon: Cake },
      { href: "/admin/check-in", label: "Check-in events", icon: QrCode },
      { href: "/admin/marketplace", label: "Marketplace", icon: ShoppingBag },
      { href: "/admin/drivers", label: "Chauffeurs", icon: Car },
    ],
  },
  {
    title: "Modération",
    items: [
      { href: "/admin/partners", label: "Partenaires KYC", icon: Building2 },
      { href: "/admin/proofs", label: "Preuves défis", icon: CheckSquare },
      { href: "/admin/moderation", label: "Modération contenu", icon: ImageIcon },
      { href: "/admin/creator-moderation", label: "Créateurs", icon: ImageIcon },
      { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Shield },
      { href: "/admin/permissions", label: "Permissions", icon: Shield },
    ],
  },
  {
    title: "Croissance",
    items: [
      { href: "/admin/ambassadeurs", label: "Ambassadeurs", icon: Award },
      { href: "/admin/clubs", label: "Clubs", icon: Award },
      { href: "/admin/mentors", label: "Mentors", icon: GraduationCap },
      { href: "/admin/internships", label: "Stages", icon: Briefcase },
      { href: "/admin/analytics", label: "Analytics", icon: TrendingUp },
      { href: "/admin/gamification/scorecard", label: "Live pulse", icon: Activity },
      { href: "/admin/gamification-setup", label: "Gamif setup", icon: Award },
      { href: "/admin/logs", label: "Audit log", icon: ScrollText },
    ],
  },
] as const

const BOOKING_STATUS: Record<string, { label: string; className: string }> = {
  confirmed: { label: "Confirmé", className: "text-lime" },
  pending: { label: "En attente", className: "text-gold" },
}

function bookingStatus(status: string | null) {
  if (status && BOOKING_STATUS[status]) return BOOKING_STATUS[status]
  return { label: "Annulé", className: "text-coral" }
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/admin")
  }

  // Audit fix (V4 P0): .single() throws Postgres error when no admin_roles row
  // exists for the user (a non-admin slipping past middleware would 500 the
  // route). .maybeSingle() returns null instead, letting the redirect handle
  // unauthorised access cleanly.
  const { data: adminRole } = await supabase
    .from("admin_roles")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle()

  if (!adminRole) {
    redirect("/")
  }

  const { data: totalUsers, count: usersCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })

  const { data: totalEvents, count: eventsCount } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })

  const { data: upcomingEvents } = await supabase
    .from("events")
    .select(`
      *,
      event_statistics (
        total_bookings,
        tickets_sold,
        total_revenue
      )
    `)
    .gte("event_date", new Date().toISOString().split("T")[0])
    .order("event_date", { ascending: true })
    .limit(5)

  const { data: recentBookings } = await supabase
    .from("bookings")
    .select(`
      *,
      profiles (full_name),
      events (title)
    `)
    .order("created_at", { ascending: false })
    .limit(10)

  const { data: pendingAmbassadors, count: pendingCount } = await supabase
    .from("ambassadors")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending")

  const { data: totalRevenue } = await supabase.from("bookings").select("total_price").eq("status", "confirmed")

  const revenue = totalRevenue?.reduce((sum, booking) => sum + (booking.total_price || 0), 0) || 0

  const eventsWithStats = await Promise.all(
    (upcomingEvents || []).map(async (event) => {
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id)
      return { ...event, bookings_count: count || 0 }
    }),
  )

  const todoCount = pendingCount || 0

  return (
    <div className="min-h-screen bg-paper">
      <div className="container mx-auto px-6 py-32">
        {/* Header éditorial */}
        <header className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow tracking-[0.16em]">Admin · ton crew</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
              Ton <em className="font-semibold italic text-pink">QG</em> Nivy
            </h1>
            <p className="mt-2 text-sm text-mute">
              Rôle : <span className="font-mono font-semibold capitalize text-ink">{adminRole.role}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Niv mood="proud" size={72} />
            <span className="max-w-[12rem] font-mono text-sm text-mute">
              {todoCount > 0
                ? `${todoCount} truc${todoCount > 1 ? "s" : ""} t'attend${todoCount > 1 ? "ent" : ""}.`
                : "Tout est à jour. Beau boulot."}
            </span>
          </div>
        </header>

        {/* À traiter aujourd'hui — surface sombre prioritaire */}
        <DarkSurface tone="pink" shadow className="mb-12 p-6 sm:p-8">
          <p className="eyebrow tracking-[0.16em] text-paper/60">À traiter aujourd'hui</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href="/admin/ambassadeurs"
              className="flex items-center gap-2 rounded-full border-2 border-paper/30 px-4 py-2 font-mono text-sm text-paper transition-colors hover:border-pink hover:text-pink"
            >
              <Award className="size-4" aria-hidden="true" />
              Candidatures ambassadeurs
              <span className="font-bold text-pink tabular-nums">{pendingCount || 0}</span>
            </Link>
          </div>
          <p className="mt-4 text-sm text-paper/60">
            La file ambassadeurs en attente. Traite-la avant de regarder les revenus.
          </p>
        </DarkSurface>

        {/* KPI — StatCard unifié, hiérarchie secondaire */}
        <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Utilisateurs"
            value={usersCount || 0}
            tone="teal"
            icon={<Users className="size-6" aria-hidden="true" />}
            hint="Total inscrits"
          />
          <StatCard
            label="Événements"
            value={eventsCount || 0}
            tone="lime"
            icon={<Calendar className="size-6" aria-hidden="true" />}
            hint="Total créés"
          />
          <StatCard
            label="Revenus"
            value={`${revenue.toFixed(0)} DH`}
            tone="gold"
            mono
            icon={<DollarSign className="size-6" aria-hidden="true" />}
            hint="Réservations confirmées"
          />
          <StatCard
            label="Candidatures"
            value={pendingCount || 0}
            tone="coral"
            icon={<Award className="size-6" aria-hidden="true" />}
            hint="Ambassadeurs en attente"
          />
        </div>

        {/* Raccourcis — une seule grille de tuiles charte, catégorisées */}
        <div className="mb-12 space-y-8">
          {NAV_GROUPS.map((group) => (
            <section key={group.title}>
              <p className="eyebrow mb-4 tracking-[0.16em]">{group.title}</p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {group.items.map((item) => {
                  const badge = item.href === "/admin/ambassadeurs" ? pendingCount || 0 : 0
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group relative flex flex-col items-center gap-2 rounded-2xl border-2 border-ink bg-white p-5 text-center text-ink shadow-stkr-md transition-all duration-200 ease-out hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-pink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40"
                    >
                      {badge > 0 && (
                        <span className="absolute right-2 top-2 grid min-w-6 place-items-center rounded-full border-2 border-ink bg-pink px-1.5 font-mono text-xs font-bold text-white tabular-nums">
                          {badge}
                        </span>
                      )}
                      <item.icon className="size-6 text-ink" aria-hidden="true" />
                      <span className="text-xs font-semibold">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}

          {/* Scripts SQL — ring-fence super_admin (iso-gate, inchangé) */}
          {adminRole.role === "super_admin" && (
            <section>
              <p className="eyebrow mb-4 tracking-[0.16em]">Système</p>
              <Link
                href="/admin/scripts-sql"
                className="group flex items-center gap-3 rounded-2xl border-2 border-ink bg-ink p-5 text-paper shadow-stkr-md transition-all duration-200 ease-out hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-pink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40"
              >
                <Database className="size-6 text-pink" aria-hidden="true" />
                <span className="font-display text-lg font-extrabold">
                  Exécuter les Scripts SQL
                </span>
                <span className="ml-auto font-mono text-xs text-paper/60">super_admin uniquement</span>
              </Link>
            </section>
          )}
        </div>

        {/* Listes — prochains événements / réservations récentes */}
        <div className="grid gap-8 lg:grid-cols-2">
          <StickerCard className="gap-6 p-8">
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">Prochains événements</h2>

            {eventsWithStats && eventsWithStats.length > 0 ? (
              <div className="space-y-4">
                {eventsWithStats.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start justify-between gap-4 rounded-xl border-2 border-line bg-white p-4"
                  >
                    <div>
                      <h3 className="font-bold text-ink">{event.title}</h3>
                      <p className="text-sm text-mute">
                        {new Date(event.event_date).toLocaleDateString("fr-FR")} — {event.city}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-lg font-bold text-lime tabular-nums">{event.bookings_count}</p>
                      <p className="text-xs text-mute">réservations</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <NivEmpty title="Aucun événement à venir" description="Les prochains événements apparaîtront ici dès qu'ils seront programmés." />
            )}
          </StickerCard>

          <StickerCard className="gap-6 p-8">
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">Réservations récentes</h2>

            {recentBookings && recentBookings.length > 0 ? (
              <div className="space-y-4">
                {recentBookings.map((booking) => {
                  const status = bookingStatus(booking.status)
                  return (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between gap-4 rounded-xl border-2 border-line bg-white p-4"
                    >
                      <div>
                        <p className="font-bold text-ink">{booking.profiles?.full_name}</p>
                        <p className="text-sm text-mute">{booking.events?.title}</p>
                        <p className="text-xs text-mute">
                          {new Date(booking.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-ink tabular-nums">{booking.total_price} DH</p>
                        <span
                          className={`mt-1 inline-block rounded-full border-2 border-ink px-2 py-0.5 font-mono text-xs font-bold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <NivEmpty title="Aucune réservation récente" description="Les dernières réservations s'afficheront ici." />
            )}
          </StickerCard>
        </div>
      </div>
    </div>
  )
}
