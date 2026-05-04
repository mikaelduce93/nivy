import { createClient } from "@/lib/supabase/server"
import { redirect } from 'next/navigation'
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Calendar, Trophy, CreditCard, Users, Star, Gift, TrendingUp, Clock } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function MonComptePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("parents")
    .select("*")
    .eq("user_id", user.id)
    .single()

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, events(name, event_date)")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5)

  const { data: vipCard } = await supabase
    .from("vip_cards")
    .select("*")
    .eq("parent_id", user.id)
    .eq("is_active", true)
    .single()

  const { data: loyaltyPoints } = await supabase
    .from("loyalty_points")
    .select("*")
    .eq("parent_id", user.id)
    .single()

  const totalBookings = await supabase
    .from("bookings")
    .select("id", { count: "exact" })
    .eq("parent_id", user.id)

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-zinc-950">
        <div className="container mx-auto px-6 py-32">
          <div className="mb-12">
            <h1 className="text-5xl font-black text-white mb-4">
              Bonjour {profile?.prenom} !
            </h1>
            <p className="text-zinc-400 text-lg">
              Bienvenue sur votre tableau de bord
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl p-6 border border-cyan-500/30">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-cyan-500 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-zinc-400 text-sm">Réservations</p>
                  <p className="text-3xl font-black text-white">{totalBookings.count || 0}</p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/mes-reservations">Voir tout</Link>
              </Button>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-6 border border-purple-500/30">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-zinc-400 text-sm">Points fidélité</p>
                  <p className="text-3xl font-black text-white">{loyaltyPoints?.points || 0}</p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/carte-vip">Mes points</Link>
              </Button>
            </div>

            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl p-6 border border-yellow-500/30">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-zinc-400 text-sm">Statut VIP</p>
                  <p className="text-2xl font-black text-white">{vipCard?.tier || "Silver"}</p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/carte-vip">Ma carte</Link>
              </Button>
            </div>

            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl p-6 border border-green-500/30">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-zinc-400 text-sm">Parrainages</p>
                  <p className="text-3xl font-black text-white">0</p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/ambassadeurs">Parrainer</Link>
              </Button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Clock className="w-6 h-6 text-cyan-400" />
                Réservations récentes
              </h2>
              {bookings && bookings.length > 0 ? (
                <div className="space-y-4">
                  {bookings.map((booking: any) => (
                    <div
                      key={booking.id}
                      className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700 hover:border-cyan-500/50 transition"
                    >
                      <p className="text-white font-semibold mb-1">{booking.events?.name}</p>
                      <div className="flex items-center justify-between text-sm">
                        <p className="text-zinc-400">
                          {new Date(booking.events?.event_date).toLocaleDateString("fr-FR")}
                        </p>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          booking.status === "confirmed" ? "bg-green-500/20 text-green-400" :
                          booking.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-red-500/20 text-red-400"
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/mes-reservations">Voir toutes les réservations</Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-400">Aucune réservation pour le moment</p>
                  <Button asChild className="mt-4">
                    <Link href="/agenda">Réserver un événement</Link>
                  </Button>
                </div>
              )}
            </div>

            <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Gift className="w-6 h-6 text-purple-400" />
                Récompenses disponibles
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-semibold">-10% prochain événement</p>
                    <span className="px-3 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">
                      50 pts
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm mb-3">Réduction sur votre prochaine réservation</p>
                  <Button size="sm" className="w-full bg-purple-500 hover:bg-purple-600" disabled={!loyaltyPoints || loyaltyPoints.points < 50}>
                    Échanger
                  </Button>
                </div>

                <div className="p-4 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-semibold">Entrée gratuite</p>
                    <span className="px-3 py-1 bg-cyan-500 text-white text-xs font-bold rounded-full">
                      150 pts
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm mb-3">Un événement au choix</p>
                  <Button size="sm" className="w-full bg-cyan-500 hover:bg-cyan-600" disabled={!loyaltyPoints || loyaltyPoints.points < 150}>
                    Échanger
                  </Button>
                </div>

                <Button asChild variant="outline" className="w-full">
                  <Link href="/carte-vip">Voir toutes les récompenses</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
