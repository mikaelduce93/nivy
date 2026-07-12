import { createClient } from "@/lib/supabase/server"
import { redirect } from 'next/navigation'
import { Users, Calendar, Ticket, Coins } from 'lucide-react'
import { AnalyticsChart } from "@/components/analytics-chart-lazy"
import BackButton from "@/components/admin/BackButton"
import { RealtimeKPIs } from "@/components/admin/realtime-kpis"
import { StatCard } from "@/components/admin/stat-card"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatHero, Niv } from "@/components/brand"
import { SegmentedProgress } from "@/components/ui/progress"

export default async function AdminAnalyticsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/admin/analytics")
  }

  // Audit fix (V4 P0): .maybeSingle() avoids a 500 when the user has no
  // admin_roles row (vs .single() which throws PGRST116 / 406).
  const { data: adminRole } = await supabase
    .from("admin_roles")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle()

  if (!adminRole) {
    redirect("/")
  }

  // Fetch all bookings with related data
  const { data: allBookings } = await supabase
    .from("bookings")
    .select("*, events (event_date, category, city)")
    .order("created_at", { ascending: true })

  // Fetch all events
  const { data: allEvents } = await supabase.from("events").select("*")

  // Fetch all users
  const { data: allUsers } = await supabase
    .from("profiles")
    .select("created_at")
    .order("created_at", { ascending: true })

  // Calculate revenue over time (last 12 months)
  const revenueByMonth =
    allBookings
      ?.filter((b) => b.payment_status === "paid")
      .reduce<{ name: string; revenue: number; bookings: number }[]>(
        (acc, booking) => {
          const month = new Date(booking.created_at ?? "").toLocaleDateString("fr-FR", {
            month: "short",
            year: "numeric",
          })
          const existing = acc.find((item) => item.name === month)
          if (existing) {
            existing.revenue += booking.total_amount || 0
            existing.bookings += 1
          } else {
            acc.push({
              name: month,
              revenue: booking.total_amount || 0,
              bookings: 1,
            })
          }
          return acc
        },
        [],
      )
      .slice(-12) || []

  // Bookings by event category
  const bookingsByCategory =
    allBookings?.reduce<{ name: string; value: number }[]>(
      (acc, booking) => {
        const category = booking.events?.category || "Autre"
        const existing = acc.find((item) => item.name === category)
        if (existing) {
          existing.value += 1
        } else {
          acc.push({ name: category, value: 1 })
        }
        return acc
      },
      [],
    ) || []

  // Bookings by city
  const bookingsByCity =
    allBookings
      ?.reduce<{ name: string; value: number }[]>(
        (acc, booking) => {
          const city = booking.events?.city || "Autre"
          const existing = acc.find((item) => item.name === city)
          if (existing) {
            existing.value += 1
          } else {
            acc.push({ name: city, value: 1 })
          }
          return acc
        },
        [],
      )
      .sort((a, b) => b.value - a.value)
      .slice(0, 6) || []

  // User growth over time (chart data)
  const userGrowthChart =
    allUsers
      ?.reduce<{ name: string; users: number }[]>(
        (acc, user) => {
          const month = new Date(user.created_at ?? "").toLocaleDateString("fr-FR", {
            month: "short",
            year: "numeric",
          })
          const existing = acc.find((item) => item.name === month)
          if (existing) {
            existing.users += 1
          } else {
            acc.push({ name: month, users: 1 })
          }
          return acc
        },
        [],
      )
      .slice(-12) || []

  // Calculate totals
  const totalRevenue =
    allBookings?.filter((b) => b.payment_status === "paid").reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0
  const totalBookings = allBookings?.length || 0
  const confirmedBookings = allBookings?.filter((b) => b.payment_status === "paid").length || 0
  const averageBookingValue = confirmedBookings > 0 ? totalRevenue / confirmedBookings : 0

  // Events statistics
  const upcomingEvents = allEvents?.filter((e) => new Date(e.event_date ?? "") >= new Date()).length || 0
  const pastEvents = allEvents?.filter((e) => new Date(e.event_date ?? "") < new Date()).length || 0

  // KPIs for realtime component
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const todayUsers = allUsers?.filter(u => new Date(u.created_at ?? "") >= today).length || 0
  const monthlyUsers = allUsers?.filter(u => new Date(u.created_at ?? "") >= startOfMonth).length || 0
  const lastMonthUsers = allUsers?.filter(u => {
    const date = new Date(u.created_at ?? "")
    return date >= startOfLastMonth && date < startOfMonth
  }).length || 0

  const { count: totalTeens } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "teen")

  // Canonical audit_log (activity_logs was dropped in Wave 1C) — the old query always failed.
  const { data: activeUsersData } = await supabase
    .from("audit_log")
    .select("actor_id")
    .gte("created_at", today.toISOString())

  const uniqueActiveUsers = new Set(activeUsersData?.map(a => a.actor_id).filter((id): id is string => id !== null) || [])

  const monthlyRevenue = allBookings
    ?.filter(b => b.payment_status === "paid" && new Date(b.created_at ?? "") >= startOfMonth)
    .reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0

  const lastMonthRevenue = allBookings
    ?.filter(b => {
      const date = new Date(b.created_at ?? "")
      return b.payment_status === "paid" && date >= startOfLastMonth && date < startOfMonth
    })
    .reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0

  const userGrowth = lastMonthUsers > 0 ? Math.round((monthlyUsers - lastMonthUsers) / lastMonthUsers * 100) : 0
  const revenueGrowth = lastMonthRevenue > 0 ? Math.round((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0

  const kpisData = {
    users: {
      total: allUsers?.length || 0,
      today: todayUsers,
      monthly: monthlyUsers,
      growth: userGrowth
    },
    teens: {
      total: totalTeens || 0,
      active: uniqueActiveUsers.size
    },
    revenue: {
      monthly: monthlyRevenue,
      lastMonth: lastMonthRevenue,
      growth: revenueGrowth
    },
    events: {
      total: allEvents?.length || 0,
      upcoming: upcomingEvents
    }
  }

  // Fetch top events by bookings
  const topEvents = await Promise.all(
    allEvents?.slice(0, 5).map(async (event) => {
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id)
      return { ...event, bookings: count || 0 }
    }) || []
  )

  const maxTopBookings = Math.max(1, ...topEvents.map((e) => e.bookings))

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-16">
        <BackButton href="/admin" label="Retour au dashboard" />

        {/* Hero éditorial */}
        <header className="mb-10 mt-4">
          <p className="eyebrow tracking-[0.16em] text-pink">Admin · Pulse</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl font-extrabold tracking-tight text-ink">
            Vue d'ensemble en <em className="font-semibold italic text-pink">temps réel</em>
          </h1>
          <p className="mt-3 text-mute">Les performances de la plateforme, d'un coup d'œil.</p>
        </header>

        {/* Revenus du mois — chiffre hero sur surface sombre */}
        <div className="mb-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <StatHero
            eyebrow="Revenus ce mois"
            value={monthlyRevenue.toLocaleString("fr-FR")}
            unit="DH"
            tone="lime"
            size="lg"
            meta={
              <span className={revenueGrowth >= 0 ? "text-lime" : "text-coral"}>
                {revenueGrowth >= 0 ? "+" : ""}
                {revenueGrowth}% vs mois dernier · {totalRevenue.toLocaleString("fr-FR")} DH au total
              </span>
            }
          />
          <StickerCard className="items-center justify-center gap-3 p-6 text-center">
            <Niv mood="proud" size={88} />
            <p className="text-sm text-mute">
              {averageBookingValue.toFixed(0)} DH de panier moyen par réservation
            </p>
          </StickerCard>
        </div>

        {/* Realtime KPIs — rail KPI unique */}
        <RealtimeKPIs initialData={kpisData} />

        {/* Totaux plateforme */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard
            label="Réservations totales"
            value={totalBookings}
            tone="teal"
            icon={<Ticket className="h-5 w-5" />}
            hint={`${confirmedBookings} confirmées`}
          />
          <StatCard
            label="Événements créés"
            value={allEvents?.length || 0}
            tone="gold"
            icon={<Calendar className="h-5 w-5" />}
            hint={`${upcomingEvents} à venir · ${pastEvents} passés`}
          />
          <StatCard
            label="Utilisateurs inscrits"
            value={allUsers?.length || 0}
            tone="coral"
            icon={<Users className="h-5 w-5" />}
            hint="Base utilisateurs totale"
          />
          <StatCard
            label="Revenus totaux"
            value={totalRevenue.toFixed(0)}
            tone="lime"
            mono
            icon={<Coins className="h-5 w-5" />}
            hint={`${averageBookingValue.toFixed(0)} DH / résa en moyenne`}
          />
        </div>

        {/* Revenue and Bookings Chart */}
        {revenueByMonth.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            <AnalyticsChart
              data={revenueByMonth}
              type="area"
              dataKey="revenue"
              xAxisKey="name"
              title="Évolution des revenus"
              description="Revenus mensuels sur les 12 derniers mois"
              color="#7dac3e"
            />

            <AnalyticsChart
              data={revenueByMonth}
              type="bar"
              dataKey="bookings"
              xAxisKey="name"
              title="Réservations par mois"
              description="Nombre de réservations mensuelles"
              color="#0f8a8a"
            />
          </div>
        )}

        {/* Category and City Distribution */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {bookingsByCategory.length > 0 && (
            <AnalyticsChart
              data={bookingsByCategory}
              type="pie"
              dataKey="value"
              title="Réservations par catégorie"
              description="Distribution des événements par type"
            />
          )}

          {bookingsByCity.length > 0 && (
            <AnalyticsChart
              data={bookingsByCity}
              type="bar"
              dataKey="value"
              xAxisKey="name"
              title="Réservations par ville"
              description="Top 6 des villes les plus actives"
              color="#ff3d80"
            />
          )}
        </div>

        {/* User Growth */}
        {userGrowthChart.length > 0 && (
          <div className="mb-8">
            <AnalyticsChart
              data={userGrowthChart}
              type="line"
              dataKey="users"
              xAxisKey="name"
              title="Croissance des utilisateurs"
              description="Nouvelles inscriptions mensuelles"
              color="#e0a82e"
            />
          </div>
        )}

        {/* Top événements */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <Niv mood="proud" size={48} />
            <div>
              <p className="eyebrow tracking-[0.16em] text-mute">Classement</p>
              <h3 className="font-display text-xl font-extrabold tracking-tight text-ink">
                Top événements par réservations
              </h3>
            </div>
          </div>
          <div className="grid gap-4">
            {topEvents.map((event, index) => (
              <StickerCard key={event.id} className="gap-3 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="font-mono text-sm font-bold text-mute">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="truncate font-display text-lg font-extrabold tracking-tight text-ink">
                      {event.title}
                    </p>
                  </div>
                  <p className="shrink-0 font-mono text-sm font-semibold text-teal">
                    {event.bookings} résas
                  </p>
                </div>
                <SegmentedProgress
                  steps={10}
                  current={Math.round((event.bookings / maxTopBookings) * 10)}
                  size="md"
                />
              </StickerCard>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
