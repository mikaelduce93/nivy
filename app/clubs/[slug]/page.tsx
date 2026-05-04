import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Image from "next/image"
import { MapPin, Clock, Users, ArrowLeft, CheckCircle2, User, CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import ClubEnrollmentForm from "@/components/club-enrollment-form"
import { VIPPricingBadge } from "@/components/features/events/vip-pricing-badge"

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: club } = await supabase.from("clubs").select("*").eq("slug", slug).single()

  if (!club) {
    notFound()
  }

  let existingEnrollments = null
  if (user) {
    const { data } = await supabase
      .from("club_enrollments")
      .select(`
        *,
        children (prenom, nom, date_naissance)
      `)
      .eq("club_id", club.id)
      .eq("parent_id", user.id)
      .eq("status", "active")

    existingEnrollments = data
  }

  const { data: upcomingSessions } = await supabase
    .from("club_sessions")
    .select("*")
    .eq("club_id", club.id)
    .gte("session_date", new Date().toISOString().split("T")[0])
    .eq("status", "scheduled")
    .order("session_date")
    .limit(5)

  const spotsLeft = club.capacity - club.enrolled_count
  const isFull = club.status === "full"

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        <Button asChild variant="ghost" className="text-zinc-400 hover:text-white mb-8">
          <Link href="/clubs">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux clubs
          </Link>
        </Button>

        <div className="grid lg:grid-cols-2 gap-12 max-w-7xl mx-auto">
          <div>
            <div className="relative rounded-3xl overflow-hidden mb-8 aspect-[4/3]">
              <Image
                src={club.image_url || "/teens-party-event.jpg"}
                alt={club.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
              {isFull && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-5xl font-black text-white mb-2">COMPLET</p>
                    <p className="text-zinc-300">Ce club affiche complet</p>
                  </div>
                </div>
              )}
              <div className="absolute top-6 left-6">
                <div className="bg-cyan-500 text-white font-bold text-sm px-4 py-2 rounded-full">{club.category}</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl p-8 border border-zinc-800 mb-8">
              <h3 className="text-2xl font-bold text-white mb-6">Informations pratiques</h3>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">Lieu</p>
                    <p className="text-white font-semibold">{club.venue_name}</p>
                    <p className="text-zinc-400 text-sm">{club.venue_address}</p>
                    <p className="text-cyan-400 text-sm">{club.city}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">Horaires</p>
                    <p className="text-white font-semibold">{club.schedule}</p>
                    <p className="text-cyan-400 text-sm">
                      {club.day_of_week} • {club.start_time} - {club.end_time}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">Participants</p>
                    <p className="text-white font-semibold">
                      {club.age_min} à {club.age_max} ans
                    </p>
                    <p className="text-zinc-400 text-sm">Capacité: {club.capacity} places</p>
                    <p className="text-cyan-400 text-sm font-semibold">{spotsLeft} places restantes</p>
                  </div>
                </div>

                {club.instructor_name && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-zinc-400 text-sm">Instructeur</p>
                      <p className="text-white font-semibold">{club.instructor_name}</p>
                      {club.instructor_bio && <p className="text-zinc-400 text-sm">{club.instructor_bio}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {upcomingSessions && upcomingSessions.length > 0 && (
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl p-8 border border-zinc-800 mb-8">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <CalendarIcon className="w-6 h-6 text-cyan-400" />
                  Prochaines sessions
                </h3>
                <div className="space-y-3">
                  {upcomingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800"
                    >
                      <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-xs text-white/80">
                          {new Date(session.session_date).toLocaleDateString("fr-FR", { month: "short" }).toUpperCase()}
                        </span>
                        <span className="text-xl font-black text-white">
                          {new Date(session.session_date).getDate()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-semibold">
                          {new Date(session.session_date).toLocaleDateString("fr-FR", { weekday: "long" })}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-zinc-400 mt-1">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {session.start_time} - {session.end_time}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl p-8 border border-zinc-800">
              <h3 className="text-2xl font-bold text-white mb-6">Description</h3>
              <p className="text-zinc-400 leading-relaxed whitespace-pre-line">{club.description}</p>
            </div>
          </div>

          <div className="lg:sticky lg:top-32 lg:self-start">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-3xl blur-xl opacity-75" />
              <div className="relative bg-zinc-950 rounded-3xl p-8 border border-zinc-800">
                <h2 className="text-3xl font-black text-white mb-6">{club.name}</h2>

                <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-2xl p-6 border border-cyan-500/30 mb-6">
                  <div className="text-center mb-4">
                    <p className="text-sm text-zinc-400 mb-2">Tarif mensuel</p>
                    <p className="text-5xl font-black text-white mb-2">
                      {club.monthly_price}
                      <span className="text-2xl text-cyan-400"> DH</span>
                    </p>
                    <p className="text-xs text-zinc-500">Engagement mensuel</p>
                  </div>

                  {/* VIP Pricing */}
                  <div className="pt-4 border-t border-cyan-500/20">
                    <VIPPricingBadge
                      standardPrice={club.monthly_price}
                      variant="full"
                      showVIPLink={true}
                    />
                  </div>
                </div>

                {existingEnrollments && existingEnrollments.length > 0 && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
                    <p className="text-green-400 font-semibold mb-2">Inscriptions actives:</p>
                    <ul className="space-y-1">
                      {existingEnrollments.map((enrollment: any) => (
                        <li key={enrollment.id} className="text-sm text-green-300 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          {enrollment.children?.prenom} {enrollment.children?.nom}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {isFull ? (
                  <div className="text-center py-8">
                    <p className="text-2xl font-black text-red-500 mb-4">Club Complet</p>
                    <p className="text-zinc-400">
                      Ce club a atteint sa capacité maximale. Inscrivez-vous à notre newsletter pour être informé des
                      prochaines ouvertures.
                    </p>
                  </div>
                ) : (
                  <ClubEnrollmentForm
                    clubId={club.id}
                    clubName={club.name}
                    monthlyPrice={club.monthly_price}
                    clubSlug={club.slug}
                    isLoggedIn={!!user}
                  />
                )}

                <div className="mt-6 pt-6 border-t border-zinc-800">
                  <h4 className="text-white font-semibold mb-3">Ce qui est inclus:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span className="text-zinc-400 text-sm">Accès à toutes les séances du mois</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span className="text-zinc-400 text-sm">Encadrement par des professionnels</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span className="text-zinc-400 text-sm">Matériel fourni</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span className="text-zinc-400 text-sm">Assurance incluse</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
