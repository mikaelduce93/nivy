import { createClient } from "@/lib/supabase/server"
import { redirect } from 'next/navigation'
import { Calendar, Users, Trophy, Ticket, Award, Bell } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AnalyticsChart } from "@/components/analytics-chart-lazy"
import { NotificationBellWrapper } from "@/components/notifications/notification-bell-wrapper"
import Image from "next/image"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Mon Dashboard | Teens Party Morocco",
  description: "Gérez vos réservations, clubs et points fidélité sur votre dashboard Teens Party Morocco",
  robots: { index: false, follow: false },
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/dashboard")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  const { data: children } = await supabase.from("children").select("*").eq("parent_id", user.id)

  const { data: upcomingBookings } = await supabase
    .from("bookings")
    .select(`
      *,
      events (
        title,
        event_date,
        city,
        venue_name
      )
    `)
    .eq("parent_id", user.id)
    .gte("events.event_date", new Date().toISOString().split("T")[0])
    .order("events.event_date", { ascending: true })
    .limit(5)

  const { data: allBookings } = await supabase
    .from("bookings")
    .select(`
      *,
      events (event_date, total_price)
    `)
    .eq("parent_id", user.id)
    .order("created_at", { ascending: false })

  const { data: clubEnrollments } = await supabase
    .from("club_enrollments")
    .select(`
      *,
      clubs (
        name,
        schedule,
        category
      ),
      children (
        prenom,
        nom
      )
    `)
    .eq("parent_id", user.id)
    .eq("status", "active")

  const { data: loyaltyPoints } = await supabase.from("loyalty_points").select("*").eq("parent_id", user.id).single()

  const { data: pointsTransactions } = await supabase
    .from("loyalty_transactions")
    .select("*")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10)

  const currentPoints = loyaltyPoints?.points || 0
  const currentLevel = loyaltyPoints?.level || "Bronze"

  // Prepare chart data for bookings over last 6 months
  const bookingsByMonth =
    allBookings
      ?.reduce(
        (acc, booking) => {
          const month = new Date(booking.created_at).toLocaleDateString("fr-FR", {
            month: "short",
            year: "numeric",
          })
          const existing = acc.find((item) => item.name === month)
          if (existing) {
            existing.reservations += 1
          } else {
            acc.push({ name: month, reservations: 1 })
          }
          return acc
        },
        [] as { name: string; reservations: number }[],
      )
      .slice(-6) || []

  // Prepare chart data for clubs by category
  const clubsByCategory =
    clubEnrollments?.reduce(
      (acc, enrollment) => {
        const category = enrollment.clubs?.category || "Autre"
        const existing = acc.find((item) => item.name === category)
        if (existing) {
          existing.value += 1
        } else {
          acc.push({ name: category, value: 1 })
        }
        return acc
      },
      [] as { name: string; value: number }[],
    ) || []

  // Prepare points activity chart
  const pointsActivity =
    pointsTransactions
      ?.slice(0, 10)
      .reverse()
      .map((transaction, index) => ({
        name: new Date(transaction.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
        points: transaction.points,
        type: transaction.transaction_type,
      })) || []

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        <header className="flex items-start justify-between mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 text-balance">Bonjour, {profile?.prenom || "Parent"}</h1>
            <p className="text-zinc-400">Bienvenue sur ton tableau de bord</p>
          </div>
          <NotificationBellWrapper userId={user.id} />
        </header>

        <section aria-label="Statistiques" className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl p-6 border border-emerald-500/30">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-emerald-400" aria-hidden="true" />
              <span className="text-3xl font-black text-white tabular-nums">{children?.length || 0}</span>
            </div>
            <p className="text-white font-semibold">Adolescents</p>
            <p className="text-emerald-400 text-sm">Inscrits</p>
          </div>

          <div className="bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-2xl p-6 border border-teal-500/30">
            <div className="flex items-center justify-between mb-4">
              <Ticket className="w-8 h-8 text-teal-400" aria-hidden="true" />
              <span className="text-3xl font-black text-white tabular-nums">{upcomingBookings?.length || 0}</span>
            </div>
            <p className="text-white font-semibold">Réservations</p>
            <p className="text-teal-400 text-sm">À venir</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-6 border border-purple-500/30">
            <div className="flex items-center justify-between mb-4">
              <Trophy className="w-8 h-8 text-purple-400" aria-hidden="true" />
              <span className="text-3xl font-black text-white tabular-nums">{currentPoints}</span>
            </div>
            <p className="text-white font-semibold">Points</p>
            <p className="text-purple-400 text-sm capitalize">{currentLevel}</p>
          </div>

          <div className="bg-gradient-to-br from-pink-500/20 to-red-500/20 rounded-2xl p-6 border border-pink-500/30">
            <div className="flex items-center justify-between mb-4">
              <Award className="w-8 h-8 text-pink-400" aria-hidden="true" />
              <span className="text-3xl font-black text-white tabular-nums">{clubEnrollments?.length || 0}</span>
            </div>
            <p className="text-white font-semibold">Clubs</p>
            <p className="text-pink-400 text-sm">Actifs</p>
          </div>
        </section>

        {/* Analytics Charts */}
        {bookingsByMonth.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            <AnalyticsChart
              data={bookingsByMonth}
              type="area"
              dataKey="reservations"
              xAxisKey="name"
              title="Activité des réservations"
              description="Nombre de réservations au cours des 6 derniers mois"
              color="#10b981"
            />

            {pointsActivity.length > 0 && (
              <AnalyticsChart
                data={pointsActivity}
                type="bar"
                dataKey="points"
                xAxisKey="name"
                title="Activité des points"
                description="Points gagnés et dépensés récemment"
                color="#a855f7"
              />
            )}
          </div>
        )}

        {clubsByCategory.length > 0 && (
          <div className="mb-8">
            <AnalyticsChart
              data={clubsByCategory}
              type="pie"
              dataKey="value"
              title="Répartition des clubs"
              description="Clubs actifs par catégorie"
            />
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl p-8 border border-zinc-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Prochains événements</h2>
              <Button asChild variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300">
                <Link href="/evenements">Voir tout</Link>
              </Button>
            </div>

            {upcomingBookings && upcomingBookings.length > 0 ? (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-start gap-4 p-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-emerald-500/50 transition-all"
                  >
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-8 h-8 text-white" />
                    </div>

                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-1">{booking.events?.title}</h3>
                      <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(booking.events?.event_date).toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </div>
                      <p className="text-zinc-500 text-xs">{booking.events?.city}</p>
                    </div>

                    <Button asChild size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white border-0">
                      <Link href={`/mes-reservations/${booking.id}`}>Détails</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-zinc-700 mx-auto mb-4" aria-hidden="true" />
                <p className="text-zinc-500">Aucune réservation à venir</p>
                <Button asChild size="sm" className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white border-0 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900">
                  <Link href="/evenements">Découvrir les événements</Link>
                </Button>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl p-8 border border-zinc-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Mes adolescents</h2>
              <Button asChild variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300">
                <Link href="/profile/enfants/ajouter">Ajouter</Link>
              </Button>
            </div>

            {children && children.length > 0 ? (
              <div className="space-y-4">
                {children.map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center gap-4 p-4 bg-zinc-900 rounded-xl border border-zinc-800"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                      {child.photo_url ? (
                        <Image
                          src={child.photo_url || "/placeholder.svg"}
                          alt={child.prenom}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <span className="text-white font-bold text-lg">{child.prenom.charAt(0)}</span>
                      )}
                    </div>

                    <div className="flex-1">
                      <h3 className="text-white font-semibold">
                        {child.prenom} {child.nom}
                      </h3>
                      <p className="text-zinc-400 text-sm">
                        {Math.floor(
                          (new Date().getTime() - new Date(child.date_naissance).getTime()) /
                            (1000 * 60 * 60 * 24 * 365),
                        )}{" "}
                        ans
                      </p>
                    </div>

                    <Button asChild size="sm" variant="ghost" className="text-emerald-400 hover:text-emerald-300">
                      <Link href={`/profile/enfants/${child.id}/modifier`}>Modifier</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-zinc-700 mx-auto mb-4" aria-hidden="true" />
                <p className="text-zinc-500 mb-4">Aucun adolescent ajouté</p>
                <Button asChild size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900">
                  <Link href="/profile/enfants/ajouter">Ajouter un adolescent</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl p-8 border border-zinc-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Clubs actifs</h2>
              <Button asChild variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300">
                <Link href="/clubs">Découvrir</Link>
              </Button>
            </div>

            {clubEnrollments && clubEnrollments.length > 0 ? (
              <div className="space-y-4">
                {clubEnrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800"
                  >
                    <div>
                      <h3 className="text-white font-semibold mb-1">{enrollment.clubs?.name}</h3>
                      <p className="text-zinc-400 text-sm">
                        {enrollment.children?.prenom} {enrollment.children?.nom}
                      </p>
                      <p className="text-zinc-500 text-xs">{enrollment.clubs?.schedule}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Award className="w-16 h-16 text-zinc-700 mx-auto mb-4" aria-hidden="true" />
                <p className="text-zinc-500 mb-4">Aucun club actif</p>
                <Button asChild size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900">
                  <Link href="/clubs">Découvrir les clubs</Link>
                </Button>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl p-8 border border-zinc-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Points fidélité</h2>
              <Button asChild variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300">
                <Link href="/fidelite">Voir tout</Link>
              </Button>
            </div>

            <div className="text-center mb-6">
              <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 mb-2 tabular-nums">
                {currentPoints}
              </p>
              <p className="text-zinc-400 mb-4">points disponibles</p>
              <div
                className={`inline-block px-6 py-2 rounded-full text-lg font-black ${
                  currentLevel === "Gold"
                    ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                    : currentLevel === "Silver"
                      ? "bg-gradient-to-r from-gray-400 to-gray-500"
                      : currentLevel === "Bronze"
                        ? "bg-gradient-to-r from-orange-700 to-orange-800"
                        : "bg-gradient-to-r from-zinc-700 to-zinc-800"
                } text-white`}
              >
                {currentLevel}
              </div>
            </div>

            {pointsTransactions && pointsTransactions.length > 0 && (
              <div className="space-y-3">
                <p className="text-white font-semibold text-sm mb-3">Activité récente</p>
                {pointsTransactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400 truncate flex-1 mr-4">
                      {transaction.reason || transaction.transaction_type}
                    </span>
                    <span
                      className={`font-bold flex-shrink-0 ${
                        transaction.transaction_type === "earned" || transaction.transaction_type === "bonus"
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {transaction.transaction_type === "earned" || transaction.transaction_type === "bonus"
                        ? "+"
                        : "-"}
                      {transaction.points}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
