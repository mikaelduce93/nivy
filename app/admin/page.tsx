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
import { Button } from "@/components/ui/button"
import Link from "next/link"

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-ink mb-4">Panneau d'Administration</h1>
          <p className="text-mute">
            Role: <span className="text-lime font-semibold capitalize">{adminRole.role}</span>
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-gradient-to-br from-lime/20 to-teal/20 rounded-2xl p-6 border border-lime/30">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-lime" />
              <span className="text-3xl font-black text-ink">{usersCount || 0}</span>
            </div>
            <p className="text-ink font-semibold">Utilisateurs</p>
            <p className="text-lime text-sm">Total inscrits</p>
          </div>

          <div className="bg-gradient-to-br from-teal/20 to-pink/20 rounded-2xl p-6 border border-teal/30">
            <div className="flex items-center justify-between mb-4">
              <Calendar className="w-8 h-8 text-teal" />
              <span className="text-3xl font-black text-ink">{eventsCount || 0}</span>
            </div>
            <p className="text-ink font-semibold">Événements</p>
            <p className="text-teal text-sm">Total créés</p>
          </div>

          <div className="bg-gradient-to-br from-pink/20 to-pink/20 rounded-2xl p-6 border border-pink/30">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 text-pink" />
              <span className="text-3xl font-black text-ink">{revenue.toFixed(0)}</span>
            </div>
            <p className="text-ink font-semibold">Revenus</p>
            <p className="text-pink text-sm">Total DH</p>
          </div>

          <div className="bg-gradient-to-br from-pink/20 to-destructive/20 rounded-2xl p-6 border border-pink/30">
            <div className="flex items-center justify-between mb-4">
              <Award className="w-8 h-8 text-pink" />
              <span className="text-3xl font-black text-ink">{pendingCount || 0}</span>
            </div>
            <p className="text-ink font-semibold">Candidatures</p>
            <p className="text-pink text-sm">En attente</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6 mb-8">
          <Button
            asChild
            className="bg-gradient-to-r from-lime to-teal hover:from-lime hover:to-teal text-ink border-0 h-auto py-6"
          >
            <Link href="/admin/evenements">
              <div className="text-center w-full">
                <Calendar className="w-8 h-8 mx-auto mb-2" />
                <p className="font-bold">Événements</p>
              </div>
            </Link>
          </Button>

          <Button
            asChild
            className="bg-gradient-to-r from-teal to-pink hover:from-teal hover:to-pink text-ink border-0 h-auto py-6"
          >
            <Link href="/admin/reservations">
              <div className="text-center w-full">
                <Ticket className="w-8 h-8 mx-auto mb-2" />
                <p className="font-bold">Réservations</p>
              </div>
            </Link>
          </Button>

          <Button
            asChild
            className="bg-gradient-to-r from-pink to-pink hover:from-pink hover:to-pink text-ink border-0 h-auto py-6"
          >
            <Link href="/admin/clubs">
              <div className="text-center w-full">
                <Award className="w-8 h-8 mx-auto mb-2" />
                <p className="font-bold">Clubs</p>
              </div>
            </Link>
          </Button>

          <Button
            asChild
            className="bg-gradient-to-r from-pink to-destructive hover:from-pink hover:to-destructive text-ink border-0 h-auto py-6"
          >
            <Link href="/admin/ambassadeurs">
              <div className="text-center w-full">
                <Award className="w-8 h-8 mx-auto mb-2" />
                <p className="font-bold">Ambassadeurs</p>
              </div>
            </Link>
          </Button>

          <Button
            asChild
            className="bg-gradient-to-r from-destructive to-coral hover:from-destructive hover:to-coral text-ink border-0 h-auto py-6"
          >
            <Link href="/admin/utilisateurs">
              <div className="text-center w-full">
                <Shield className="w-8 h-8 mx-auto mb-2" />
                <p className="font-bold">Utilisateurs</p>
              </div>
            </Link>
          </Button>
        </div>

        <div className="mb-8">
          <Button
            asChild
            size="lg"
            className="w-full bg-gradient-to-r from-pink to-pink hover:from-pink hover:to-pink text-ink border-0 h-16"
          >
            <Link href="/admin/analytics">
              <TrendingUp className="w-6 h-6 mr-3" />
              <span className="text-lg font-bold">Voir les Analytics Détaillées</span>
            </Link>
          </Button>
        </div>

        {/* Modération & Opérations — secondary admin grid (FRONTEND_REDO §6) */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-ink mb-4">Modération & opérations</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { href: "/admin/partners", label: "Partenaires KYC", icon: Building2 },
              { href: "/admin/proofs", label: "Preuves défis", icon: CheckSquare },
              { href: "/admin/moderation", label: "Modération contenu", icon: ImageIcon },
              { href: "/admin/marketplace", label: "Marketplace", icon: ShoppingBag },
              { href: "/admin/creator-moderation", label: "Créateurs", icon: ImageIcon },
              { href: "/admin/check-in", label: "Check-in events", icon: QrCode },
              { href: "/admin/anniversaires", label: "Anniversaires", icon: Cake },
              { href: "/admin/clubs", label: "Clubs", icon: Award },
              { href: "/admin/mentors", label: "Mentors", icon: GraduationCap },
              { href: "/admin/internships", label: "Stages", icon: Briefcase },
              { href: "/admin/drivers", label: "Chauffeurs", icon: Car },
              { href: "/admin/permissions", label: "Permissions", icon: Shield },
              { href: "/admin/logs", label: "Audit log", icon: ScrollText },
              { href: "/admin/gamification/scorecard", label: "Live pulse", icon: Activity },
              { href: "/admin/gamification-setup", label: "Gamif setup", icon: Award },
            ].map((item) => (
              <Button
                key={item.href}
                asChild
                variant="outline"
                className="h-auto py-4 bg-card border-ink hover:border-lime/40 hover:bg-card text-ink"
              >
                <Link href={item.href}>
                  <div className="flex flex-col items-center gap-2 w-full">
                    <item.icon className="w-5 h-5 text-lime" />
                    <span className="text-xs font-semibold">{item.label}</span>
                  </div>
                </Link>
              </Button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <Button
            asChild
            size="lg"
            className="w-full bg-gradient-to-r from-lime to-teal hover:from-lime hover:to-teal text-ink border-0 h-16"
          >
            <Link href="/admin/scripts-sql">
              <Database className="w-6 h-6 mr-3" />
              <span className="text-lg font-bold">Exécuter les Scripts SQL (super_admin uniquement)</span>
            </Link>
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-gradient-to-br from-paper-2 to-card rounded-2xl p-8 border border-ink">
            <h2 className="text-2xl font-bold text-ink mb-6">Prochains événements</h2>

            {eventsWithStats && eventsWithStats.length > 0 ? (
              <div className="space-y-4">
                {eventsWithStats.map((event) => (
                  <div key={event.id} className="p-4 bg-card rounded-xl border border-ink">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-ink font-semibold mb-1">{event.title}</h3>
                        <p className="text-mute text-sm">
                          {new Date(event.event_date).toLocaleDateString("fr-FR")} - {event.city}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lime font-bold text-lg">{event.bookings_count}</p>
                        <p className="text-mute text-xs">réservations</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-mute py-8">Aucun événement à venir</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-paper-2 to-card rounded-2xl p-8 border border-ink">
            <h2 className="text-2xl font-bold text-ink mb-6">Réservations récentes</h2>

            {recentBookings && recentBookings.length > 0 ? (
              <div className="space-y-4">
                {recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 bg-card rounded-xl border border-ink"
                  >
                    <div>
                      <p className="text-ink font-semibold">{booking.profiles?.full_name}</p>
                      <p className="text-mute text-sm">{booking.events?.title}</p>
                      <p className="text-mute text-xs">
                        {new Date(booking.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lime font-bold">{booking.total_price} DH</p>
                      <div
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          booking.status === "confirmed"
                            ? "bg-lime/20 text-lime"
                            : booking.status === "pending"
                              ? "bg-gold/20 text-gold"
                              : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {booking.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-mute py-8">Aucune réservation récente</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
