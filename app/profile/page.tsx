import { createClient } from "@/lib/supabase/server"
import { redirect } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { User, Mail, Phone, MapPin, Edit, Star, Trophy, Calendar } from 'lucide-react'

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/profile")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  const { data: loyaltyData } = await supabase
    .from("loyalty_points")
    .select("points")
    .eq("user_id", user.id)
    .single()

  const { data: recentBookings } = await supabase
    .from("bookings")
    .select(`
      *,
      events:event_id (title, date, location)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5)

  const totalPoints = loyaltyData?.points || 0
  const level = Math.floor(totalPoints / 100) + 1

  return (
    <div className="min-h-screen bg-zinc-950 py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <header className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-black text-white mb-2 text-balance">Mon profil</h1>
              <p className="text-zinc-400">Gérez vos informations personnelles</p>
            </div>
            <Button asChild className="bg-cyan-500 hover:bg-cyan-600 text-white border-0 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950">
              <Link href="/profile/modifier">
                <Edit className="w-4 h-4 mr-2" aria-hidden="true" />
                Modifier
              </Link>
            </Button>
          </header>

          <div className="grid gap-6">
            <Card className="bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-zinc-900 border-yellow-500/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-8 h-8 text-yellow-400" aria-hidden="true" />
                    <div>
                      <CardTitle className="text-white">Programme Fidélité</CardTitle>
                      <CardDescription>Vos récompenses et avantages</CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-yellow-400 tabular-nums">{totalPoints}</p>
                    <p className="text-xs text-zinc-400">points</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="flex-1 bg-zinc-800 rounded-full h-3 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={totalPoints % 100}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Progression vers le niveau ${level + 1}`}
                  >
                    <div
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full transition-all duration-300"
                      style={{ width: `${(totalPoints % 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-zinc-400 font-semibold tabular-nums">Niveau {level}</span>
                </div>
                
                <div className="grid grid-cols-4 gap-3" role="list" aria-label="Badges débloqués">
                  {totalPoints >= 50 && (
                    <div className="text-center" role="listitem">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mx-auto mb-2" aria-hidden="true">
                        <Star className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-xs text-zinc-400">Membre</p>
                    </div>
                  )}
                  {totalPoints >= 100 && (
                    <div className="text-center" role="listitem">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mx-auto mb-2" aria-hidden="true">
                        <Trophy className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-xs text-zinc-400">VIP</p>
                    </div>
                  )}
                  {totalPoints >= 200 && (
                    <div className="text-center" role="listitem">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-2" aria-hidden="true">
                        <span className="text-2xl" aria-hidden="true">👑</span>
                      </div>
                      <p className="text-xs text-zinc-400">Elite</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Informations personnelles</CardTitle>
                <CardDescription>Vos données de compte parent</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <dt className="text-sm text-zinc-500 mb-1">Nom complet</dt>
                      <dd className="text-white font-semibold">
                        {profile?.prenom} {profile?.nom}
                      </dd>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <dt className="text-sm text-zinc-500 mb-1">Email</dt>
                      <dd className="text-white font-semibold">{profile?.email || user.email}</dd>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <dt className="text-sm text-zinc-500 mb-1">Téléphone</dt>
                      <dd className="text-white font-semibold">{profile?.telephone || "Non renseigné"}</dd>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <dt className="text-sm text-zinc-500 mb-1">Ville</dt>
                      <dd className="text-white font-semibold">{profile?.ville || "Non renseignée"}</dd>
                    </div>
                  </div>
                </dl>

                <div className="mt-6 pt-6 border-t border-zinc-800">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Newsletter</span>
                    <span
                      className={`font-semibold ${profile?.accept_newsletter ? "text-green-400" : "text-zinc-400"}`}
                    >
                      {profile?.accept_newsletter ? "Activée" : "Désactivée"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-3">
                    <span className="text-zinc-500">Membre depuis</span>
                    <span className="text-white font-semibold">
                      {profile?.date_inscription
                        ? new Date(profile.date_inscription).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {recentBookings && recentBookings.length > 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-cyan-400" />
                    <CardTitle className="text-white">Historique récent</CardTitle>
                  </div>
                  <CardDescription>Vos 5 dernières réservations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentBookings.map((booking: any) => (
                      <div key={booking.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                        <div className="flex-1">
                          <p className="text-white font-semibold">{booking.events?.title || 'Événement'}</p>
                          <p className="text-sm text-zinc-400">
                            {booking.events?.date ? new Date(booking.events.date).toLocaleDateString('fr-FR') : 'Date inconnue'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                            booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-zinc-700 text-zinc-400'
                          }`}>
                            {booking.status === 'confirmed' ? 'Confirmé' :
                             booking.status === 'pending' ? 'En attente' : 'Annulé'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button asChild variant="outline" className="w-full mt-4 border-cyan-500 text-cyan-400 hover:bg-cyan-500/10">
                    <Link href="/mes-reservations">Voir toutes les réservations</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Liens rapides</CardTitle>
                <CardDescription>Accédez rapidement à vos sections</CardDescription>
              </CardHeader>
              <CardContent>
                <nav className="grid md:grid-cols-2 gap-4" aria-label="Liens rapides">
                  <Button
                    asChild
                    variant="outline"
                    className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 justify-start bg-transparent focus-visible:ring-2 focus-visible:ring-cyan-500"
                  >
                    <Link href="/profile/enfants">Gérer mes enfants</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="border-blue-500 text-blue-400 hover:bg-blue-500/10 justify-start bg-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <Link href="/mes-reservations">Mes réservations</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="border-purple-500 text-purple-400 hover:bg-purple-500/10 justify-start bg-transparent focus-visible:ring-2 focus-visible:ring-purple-500"
                  >
                    <Link href="/carte-vip">Programme fidélité</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="border-pink-500 text-pink-400 hover:bg-pink-500/10 justify-start bg-transparent focus-visible:ring-2 focus-visible:ring-pink-500"
                  >
                    <Link href="/dashboard">Tableau de bord</Link>
                  </Button>
                </nav>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
