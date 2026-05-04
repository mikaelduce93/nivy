import { createClient } from "@/lib/supabase/server"
import { redirect } from 'next/navigation'
import { TrendingUp, DollarSign, Users, Calendar, Ticket } from 'lucide-react'
import { Card } from "@/components/ui/card"
import { AnalyticsChart } from "@/components/analytics-chart-lazy"
import BackButton from "@/components/admin/BackButton"
import { RealtimeKPIs } from "@/components/admin/realtime-kpis"

export default async function AdminAnalyticsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/admin/analytics")
  }

  const { data: adminRole } = await supabase.from("admin_roles").select("*").eq("profile_id", user.id).single()

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
          const month = new Date(booking.created_at).toLocaleDateString("fr-FR", {
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
          const month = new Date(user.created_at).toLocaleDateString("fr-FR", {
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
  const upcomingEvents = allEvents?.filter((e) => new Date(e.event_date) >= new Date()).length || 0
  const pastEvents = allEvents?.filter((e) => new Date(e.event_date) < new Date()).length || 0

  // KPIs for realtime component
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const todayUsers = allUsers?.filter(u => new Date(u.created_at) >= today).length || 0
  const monthlyUsers = allUsers?.filter(u => new Date(u.created_at) >= startOfMonth).length || 0
  const lastMonthUsers = allUsers?.filter(u => {
    const date = new Date(u.created_at)
    return date >= startOfLastMonth && date < startOfMonth
  }).length || 0

  const { count: totalTeens } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "teen")

  const { data: activeUsersData } = await supabase
    .from("activity_logs")
    .select("user_id")
    .gte("created_at", today.toISOString())

  const uniqueActiveUsers = new Set(activeUsersData?.map(a => a.user_id) || [])

  const monthlyRevenue = allBookings
    ?.filter(b => b.payment_status === "paid" && new Date(b.created_at) >= startOfMonth)
    .reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0

  const lastMonthRevenue = allBookings
    ?.filter(b => {
      const date = new Date(b.created_at)
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

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        <BackButton href="/admin" label="Retour au dashboard" />
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">Analytics & Statistiques</h1>
          <p className="text-zinc-400">Vue d'ensemble des performances de la plateforme</p>
        </div>

        {/* Realtime KPIs */}
        <RealtimeKPIs initialData={kpisData} />

        {/* Key Metrics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 text-green-400" />
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-3xl font-black text-white mb-1">{totalRevenue.toFixed(0)} DH</p>
            <p className="text-green-400 font-semibold">Revenus totaux</p>
            <p className="text-zinc-400 text-xs mt-2">Moyenne: {averageBookingValue.toFixed(0)} DH/résa</p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
            <div className="flex items-center justify-between mb-4">
              <Ticket className="w-8 h-8 text-blue-400" />
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-3xl font-black text-white mb-1">{totalBookings}</p>
            <p className="text-blue-400 font-semibold">Réservations totales</p>
            <p className="text-zinc-400 text-xs mt-2">{confirmedBookings} confirmées</p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
            <div className="flex items-center justify-between mb-4">
              <Calendar className="w-8 h-8 text-purple-400" />
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-3xl font-black text-white mb-1">{allEvents?.length || 0}</p>
            <p className="text-purple-400 font-semibold">Événements créés</p>
            <p className="text-zinc-400 text-xs mt-2">
              {upcomingEvents} à venir • {pastEvents} passés
            </p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-orange-400" />
              <TrendingUp className="w-5 h-5 text-orange-400" />
            </div>
            <p className="text-3xl font-black text-white mb-1">{allUsers?.length || 0}</p>
            <p className="text-orange-400 font-semibold">Utilisateurs inscrits</p>
            <p className="text-zinc-400 text-xs mt-2">Base utilisateurs totale</p>
          </Card>
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
              color="#10b981"
            />

            <AnalyticsChart
              data={revenueByMonth}
              type="bar"
              dataKey="bookings"
              xAxisKey="name"
              title="Réservations par mois"
              description="Nombre de réservations mensuelles"
              color="#3b82f6"
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
              color="#a855f7"
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
              color="#f59e0b"
            />
          </div>
        )}

        {/* Top Events */}
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h3 className="text-xl font-bold text-white mb-4">Top événements par réservations</h3>
          <div className="space-y-3">
            {topEvents.map((event) => (
              <div key={event.id} className="flex justify-between items-center">
                <p className="text-white">{event.name}</p>
                <p className="text-zinc-400 text-xs">{event.bookings} réservations</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
