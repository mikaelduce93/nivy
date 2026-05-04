import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { CalendarIcon, MapPin, Clock, Users, CreditCard, Pause, X, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { ClubCalendar } from "@/components/club-calendar"

export default async function ClubEnrollmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: enrollment } = await supabase
    .from("club_enrollments")
    .select(`
      *,
      clubs (*),
      children (*)
    `)
    .eq("id", id)
    .eq("parent_id", user.id)
    .single()

  if (!enrollment) {
    notFound()
  }

  const age = Math.floor(
    (new Date().getTime() - new Date(enrollment.children.date_naissance).getTime()) / (1000 * 60 * 60 * 24 * 365),
  )

  const isActive = enrollment.status === "active"
  const isPaused = enrollment.status === "paused"

  const { data: sessions } = await supabase
    .from("club_sessions")
    .select(`
      *,
      club_attendance!left(
        id,
        attended,
        child_id
      )
    `)
    .eq("club_id", enrollment.club_id)
    .gte("session_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
    .lte("session_date", new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
    .order("session_date")

  const sessionsWithAttendance =
    sessions?.map((session) => ({
      ...session,
      attended: session.club_attendance?.some((att: any) => att.child_id === enrollment.child_id && att.attended),
    })) || []

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        <Button asChild variant="ghost" className="text-zinc-400 hover:text-white mb-8">
          <Link href="/mes-clubs">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à mes clubs
          </Link>
        </Button>

        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-4xl md:text-6xl font-black text-white mb-4">{enrollment.clubs.name}</h1>
              <div className="flex items-center gap-3">
                <div
                  className={`px-4 py-2 rounded-full text-sm font-bold ${
                    isActive
                      ? "bg-green-500/20 text-green-400"
                      : isPaused
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {isActive ? "ACTIF" : isPaused ? "EN PAUSE" : "ANNULÉ"}
                </div>
                <div className="px-4 py-2 rounded-full bg-cyan-500/20 text-cyan-400 text-sm font-bold">
                  {enrollment.clubs.category.toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Club Details */}
            <div className="space-y-6">
              <Card className="p-8">
                <h2 className="text-2xl font-bold mb-6">Informations du club</h2>

                <div className="relative h-48 rounded-xl overflow-hidden mb-6">
                  <img
                    src={enrollment.clubs.image_url || "/placeholder.svg?height=200&width=400&query=club"}
                    alt={enrollment.clubs.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CalendarIcon className="w-5 h-5 text-cyan-400 mt-1" />
                    <div>
                      <p className="text-sm text-zinc-400">Planning</p>
                      <p className="font-semibold">{enrollment.clubs.schedule}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-cyan-400 mt-1" />
                    <div>
                      <p className="text-sm text-zinc-400">Horaires</p>
                      <p className="font-semibold">
                        {enrollment.clubs.day_of_week} • {enrollment.clubs.start_time} - {enrollment.clubs.end_time}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-cyan-400 mt-1" />
                    <div>
                      <p className="text-sm text-zinc-400">Lieu</p>
                      <p className="font-semibold">{enrollment.clubs.venue_name}</p>
                      <p className="text-sm text-zinc-400">{enrollment.clubs.city}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-cyan-400 mt-1" />
                    <div>
                      <p className="text-sm text-zinc-400">Participant</p>
                      <p className="font-semibold">
                        {enrollment.children.prenom} {enrollment.children.nom} ({age} ans)
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Calendar Component */}
              {sessionsWithAttendance.length > 0 && (
                <ClubCalendar
                  sessions={sessionsWithAttendance}
                  clubName={enrollment.clubs.name}
                  venueName={enrollment.clubs.venue_name}
                  city={enrollment.clubs.city}
                />
              )}

              {/* Actions */}
              {isActive && (
                <Card className="p-8">
                  <h2 className="text-2xl font-bold mb-6">Actions</h2>
                  <div className="space-y-3">
                    <form action="/api/clubs/pause" method="POST">
                      <input type="hidden" name="enrollmentId" value={enrollment.id} />
                      <Button
                        type="submit"
                        variant="outline"
                        className="w-full justify-start bg-transparent border-zinc-700"
                      >
                        <Pause className="w-4 h-4 mr-2" />
                        Mettre en pause
                      </Button>
                    </form>

                    <form action="/api/clubs/cancel" method="POST">
                      <input type="hidden" name="enrollmentId" value={enrollment.id} />
                      <Button
                        type="submit"
                        variant="outline"
                        className="w-full justify-start bg-transparent border-red-700 text-red-500 hover:bg-red-500/10"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Annuler l'inscription
                      </Button>
                    </form>
                  </div>
                  <p className="text-xs text-zinc-500 mt-4">
                    Vous pouvez annuler votre inscription à tout moment. Le paiement du mois en cours reste dû.
                  </p>
                </Card>
              )}

              {isPaused && (
                <Card className="p-8">
                  <h2 className="text-2xl font-bold mb-6">Réactiver</h2>
                  <form action="/api/clubs/resume" method="POST">
                    <input type="hidden" name="enrollmentId" value={enrollment.id} />
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                    >
                      Réactiver l'inscription
                    </Button>
                  </form>
                </Card>
              )}
            </div>

            {/* Payment Info */}
            <div className="space-y-6">
              <Card className="p-8">
                <h2 className="text-2xl font-bold mb-6">Paiement</h2>

                <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl p-6 border border-cyan-500/30 mb-6">
                  <p className="text-sm text-zinc-400 mb-2">Tarif mensuel</p>
                  <p className="text-4xl font-black text-white mb-1">
                    {enrollment.clubs.monthly_price}
                    <span className="text-xl text-cyan-400"> DH</span>
                  </p>
                  <p className="text-xs text-zinc-500">Paiement mensuel automatique</p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Date d'inscription</span>
                    <span className="font-semibold">
                      {new Date(enrollment.enrollment_date).toLocaleDateString("fr-FR")}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Statut paiement</span>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        enrollment.monthly_payment_status === "paid"
                          ? "bg-green-500/20 text-green-400"
                          : enrollment.monthly_payment_status === "pending"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {enrollment.monthly_payment_status === "paid"
                        ? "Payé"
                        : enrollment.monthly_payment_status === "pending"
                          ? "En attente"
                          : "En retard"}
                    </div>
                  </div>

                  {enrollment.last_payment_date && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-400">Dernier paiement</span>
                      <span className="font-semibold">
                        {new Date(enrollment.last_payment_date).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  )}

                  {enrollment.next_payment_due && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-400">Prochain paiement</span>
                      <span className="font-semibold">
                        {new Date(enrollment.next_payment_due).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  )}
                </div>

                {enrollment.monthly_payment_status !== "paid" && isActive && (
                  <Button className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Payer maintenant
                  </Button>
                )}
              </Card>

              <Card className="p-8 bg-zinc-900/50 border-zinc-800">
                <h3 className="font-semibold mb-4">Informations importantes</h3>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li>• Paiement mensuel prélevé le 1er de chaque mois</li>
                  <li>• Pas d'engagement de durée minimale</li>
                  <li>• Résiliation possible à tout moment</li>
                  <li>• Remboursement au prorata en cas d'annulation</li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
