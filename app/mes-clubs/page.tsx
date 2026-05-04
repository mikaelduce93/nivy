import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Calendar, MapPin, Clock, Users, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default async function MyClubsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: enrollments } = await supabase
    .from("club_enrollments")
    .select(`
      *,
      clubs (
        name,
        slug,
        description,
        schedule,
        day_of_week,
        start_time,
        end_time,
        venue_name,
        city,
        monthly_price,
        image_url,
        category
      ),
      children (
        prenom,
        nom,
        date_naissance
      )
    `)
    .eq("parent_id", user.id)
    .order("created_at", { ascending: false })

  const activeEnrollments = enrollments?.filter((e) => e.status === "active")
  const inactiveEnrollments = enrollments?.filter((e) => e.status !== "active")

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-zinc-950">
        <div className="container mx-auto px-6 py-32">
          <div className="mb-12">
            <h1 className="text-4xl md:text-6xl font-black text-white mb-4">Mes Clubs</h1>
            <p className="text-zinc-400 text-lg">Gère toutes tes inscriptions aux clubs et activités</p>
          </div>

          {enrollments && enrollments.length > 0 ? (
            <div className="space-y-12">
              {activeEnrollments && activeEnrollments.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Inscriptions actives</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {activeEnrollments.map((enrollment) => {
                      const age = Math.floor(
                        (new Date().getTime() - new Date(enrollment.children?.date_naissance).getTime()) /
                          (1000 * 60 * 60 * 24 * 365),
                      )

                      return (
                        <Card
                          key={enrollment.id}
                          className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 overflow-hidden"
                        >
                          <div className="relative h-48">
                            <img
                              src={enrollment.clubs?.image_url || "/placeholder.svg?height=200&width=400&query=club"}
                              alt={enrollment.clubs?.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-4 right-4">
                              <div className="bg-green-500 text-white font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                ACTIF
                              </div>
                            </div>
                            <div className="absolute top-4 left-4 bg-cyan-500 text-white font-bold text-xs px-3 py-1 rounded-lg">
                              {enrollment.clubs?.category?.toUpperCase()}
                            </div>
                          </div>

                          <CardContent className="p-6">
                            <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{enrollment.clubs?.name}</h3>
                            <p className="text-cyan-400 text-sm font-semibold mb-4">
                              {enrollment.children?.prenom} {enrollment.children?.nom} ({age} ans)
                            </p>

                            <div className="space-y-2 mb-6">
                              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                <Calendar className="w-4 h-4 text-cyan-400" />
                                <span>{enrollment.clubs?.schedule}</span>
                              </div>
                              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                <Clock className="w-4 h-4 text-cyan-400" />
                                <span>
                                  {enrollment.clubs?.day_of_week} • {enrollment.clubs?.start_time} -{" "}
                                  {enrollment.clubs?.end_time}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                <MapPin className="w-4 h-4 text-cyan-400" />
                                <span>{enrollment.clubs?.city}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800">
                              <div>
                                <p className="text-zinc-400 text-xs">Tarif mensuel</p>
                                <p className="text-xl font-black text-cyan-400">{enrollment.clubs?.monthly_price} DH</p>
                              </div>
                              <div className="text-right">
                                <p className="text-zinc-400 text-xs">Statut paiement</p>
                                <p
                                  className={`text-xs font-bold ${
                                    enrollment.monthly_payment_status === "paid"
                                      ? "text-green-400"
                                      : enrollment.monthly_payment_status === "pending"
                                        ? "text-yellow-400"
                                        : "text-red-400"
                                  }`}
                                >
                                  {enrollment.monthly_payment_status === "paid"
                                    ? "Payé"
                                    : enrollment.monthly_payment_status === "pending"
                                      ? "En attente"
                                      : "En retard"}
                                </p>
                              </div>
                            </div>

                            <Button
                              asChild
                              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0"
                            >
                              <Link href={`/clubs/${enrollment.clubs?.slug}`}>Voir les détails</Link>
                            </Button>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}

              {inactiveEnrollments && inactiveEnrollments.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Historique</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 opacity-60">
                    {inactiveEnrollments.map((enrollment) => (
                      <Card key={enrollment.id} className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <h3 className="text-lg font-bold text-white line-clamp-2">{enrollment.clubs?.name}</h3>
                            <div
                              className={`px-2 py-1 rounded-full text-xs font-bold ${
                                enrollment.status === "paused"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {enrollment.status === "paused" ? "PAUSE" : "ANNULÉ"}
                            </div>
                          </div>
                          <p className="text-zinc-400 text-sm">
                            {enrollment.children?.prenom} {enrollment.children?.nom}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20">
              <Users className="w-20 h-20 text-zinc-700 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">Aucune inscription</h3>
              <p className="text-zinc-400 mb-8">Découvrez nos clubs et inscrivez-vous à des activités régulières</p>
              <Button
                asChild
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0"
              >
                <Link href="/clubs">Découvrir les clubs</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}
