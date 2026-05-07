import { createClient } from "@/lib/supabase/server"
import { Star, Users, TrendingUp, Instagram, Award, ArrowRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function AmbassadeursPage() {
  const supabase = await createClient()

  const { data: ambassadors } = await supabase
    .from("ambassadors")
    .select(`
      *,
      profiles (
        full_name,
        email
      )
    `)
    .eq("status", "active")
    .order("total_referrals", { ascending: false })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userAmbassador = null
  if (user) {
    const { data } = await supabase.from("ambassadors").select("*").eq("profile_id", user.id).single()

    userAmbassador = data
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6">Programme Ambassadeurs</h1>
          <p className="text-xl text-cyan-400 mb-4">Rejoins notre équipe et gagne de l'argent</p>
          <p className="text-zinc-400 max-w-3xl mx-auto leading-relaxed">
            Deviens ambassadeur Nivy et partage ta passion tout en gagnant des commissions sur chaque réservation
            avec ton code promo personnel.
          </p>
        </div>

        {!userAmbassador && (
          <div className="max-w-4xl mx-auto mb-20">
            <div className="mb-16">
              <h2 className="text-3xl font-black text-white text-center mb-12">Comment devenir ambassadeur?</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-50" />
                  <div className="relative bg-zinc-900 rounded-2xl p-8 border border-zinc-800 text-center">
                    <div className="w-16 h-16 rounded-full bg-cyan-500 text-white flex items-center justify-center text-2xl font-black mx-auto mb-4">
                      1
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">Postule</h3>
                    <p className="text-zinc-400 text-sm">
                      Remplis le formulaire de candidature en 2 minutes et parle-nous de toi
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-50" />
                  <div className="relative bg-zinc-900 rounded-2xl p-8 border border-zinc-800 text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-black mx-auto mb-4">
                      2
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">Entretien</h3>
                    <p className="text-zinc-400 text-sm">
                      Notre équipe te contacte sous 48h pour un entretien rapide
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-50" />
                  <div className="relative bg-zinc-900 rounded-2xl p-8 border border-zinc-800 text-center">
                    <div className="w-16 h-16 rounded-full bg-purple-500 text-white flex items-center justify-center text-2xl font-black mx-auto mb-4">
                      3
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">Lance-toi!</h3>
                    <p className="text-zinc-400 text-sm">
                      Reçois ton code promo unique et commence à gagner de l'argent
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-3xl blur-xl opacity-75" />
              <div className="relative bg-zinc-950 rounded-3xl p-8 md:p-12 border border-zinc-800">
                <div className="text-center mb-8">
                  <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Pourquoi devenir ambassadeur?</h2>
                </div>

                <div className="grid md:grid-cols-3 gap-8 mb-10">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Gagne de l'argent</h3>
                    <p className="text-zinc-400 text-sm">10% de commission sur chaque réservation avec ton code</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-4">
                      <Star className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Accès VIP</h3>
                    <p className="text-zinc-400 text-sm">Entrées gratuites et accès privilégié aux événements</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                      <Award className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Visibilité</h3>
                    <p className="text-zinc-400 text-sm">Mis en avant sur nos réseaux et dans nos événements</p>
                  </div>
                </div>

                <div className="text-center">
                  <Button
                    asChild
                    size="lg"
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0 text-lg px-10"
                  >
                    <Link href="/devenir-ambassadeur/candidature">
                      Postuler maintenant
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>
                  {!user && <p className="text-sm text-zinc-500 mt-4">Connexion requise pour postuler</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {userAmbassador && (
          <div className="max-w-4xl mx-auto mb-20">
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl p-8 border border-zinc-800">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Ton espace ambassadeur</h2>
                <div
                  className={`px-4 py-2 rounded-full text-sm font-bold ${
                    userAmbassador.status === "active"
                      ? "bg-green-500/20 text-green-400"
                      : userAmbassador.status === "pending"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {userAmbassador.status === "active"
                    ? "Actif"
                    : userAmbassador.status === "pending"
                      ? "En attente"
                      : "Inactif"}
                </div>
              </div>

              {userAmbassador.status === "pending" && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
                  <p className="text-yellow-400 text-sm">
                    Ta candidature est en cours d'examen. Nous te contacterons bientôt!
                  </p>
                </div>
              )}

              {userAmbassador.status === "active" && (
                <>
                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                      <p className="text-zinc-400 text-sm mb-2">Total référés</p>
                      <p className="text-4xl font-black text-cyan-400">{userAmbassador.total_referrals}</p>
                    </div>

                    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                      <p className="text-zinc-400 text-sm mb-2">Gains totaux</p>
                      <p className="text-4xl font-black text-green-400">{userAmbassador.total_earnings} DH</p>
                    </div>

                    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                      <p className="text-zinc-400 text-sm mb-2">Commission</p>
                      <p className="text-4xl font-black text-purple-400">{userAmbassador.commission_rate}%</p>
                    </div>
                  </div>

                  <Button
                    asChild
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0"
                  >
                    <Link href="/dashboard/ambassadeur">
                      Voir mes statistiques
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto mb-20">
          <h2 className="text-3xl font-black text-white text-center mb-12">Questions fréquentes</h2>
          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
              <h3 className="text-white font-bold mb-2">Combien puis-je gagner?</h3>
              <p className="text-zinc-400 text-sm">
                Tu gagnes 10% de commission sur chaque réservation effectuée avec ton code. Par exemple, sur une
                réservation de 300 DH, tu gagnes 30 DH. Plus tu partages, plus tu gagnes!
              </p>
            </div>

            <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
              <h3 className="text-white font-bold mb-2">Comment je reçois mes paiements?</h3>
              <p className="text-zinc-400 text-sm">
                Dès que tu atteins 500 DH de gains, tu peux demander un virement sur ton compte bancaire ou via Mobile
                Money (Orange Money, inwi Money, Maroc Telecom Cash).
              </p>
            </div>

            <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
              <h3 className="text-white font-bold mb-2">Quels sont les avantages en plus?</h3>
              <p className="text-zinc-400 text-sm">
                Entrées gratuites à tous nos événements, accès VIP, visibilité sur nos réseaux sociaux, invitations aux
                avant-premières, et goodies exclusifs Nivy.
              </p>
            </div>

            <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
              <h3 className="text-white font-bold mb-2">Qui peut devenir ambassadeur?</h3>
              <p className="text-zinc-400 text-sm">
                Toute personne motivée entre 16 et 25 ans, active sur les réseaux sociaux, qui aime l'animation et qui
                partage les valeurs de Nivy (sécurité, respect, fun!).
              </p>
            </div>

            <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
              <h3 className="text-white font-bold mb-2">Y a-t-il un quota à atteindre?</h3>
              <p className="text-zinc-400 text-sm">
                Non, aucun quota obligatoire! Tu partages à ton rythme. Cependant, les ambassadeurs les plus actifs
                bénéficient de bonus et récompenses supplémentaires chaque mois.
              </p>
            </div>
          </div>
        </div>

        {ambassadors && ambassadors.length > 0 && (
          <div>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Nos ambassadeurs</h2>
              <p className="text-zinc-400">Ils font la promotion de Nivy</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {ambassadors.map((ambassador) => (
                <div key={ambassador.id} className="group relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-3xl blur-xl opacity-0 group-hover:opacity-75 transition duration-1000" />
                  <div className="relative bg-zinc-900 rounded-3xl p-6 border border-zinc-800 text-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-12 h-12 text-white" />
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">
                      {ambassador.stage_name || ambassador.profiles?.full_name}
                    </h3>

                    {ambassador.specialties && ambassador.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center mb-4">
                        {ambassador.specialties.map((specialty: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-semibold"
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>
                    )}

                    {ambassador.bio && <p className="text-zinc-400 text-sm mb-4 line-clamp-3">{ambassador.bio}</p>}

                    <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm">
                      <Users className="w-4 h-4" />
                      <span>{ambassador.total_referrals} référés</span>
                    </div>

                    {ambassador.social_media && (
                      <div className="flex gap-3 justify-center mt-4">
                        {ambassador.social_media.instagram && (
                          <a
                            href={`https://instagram.com/${ambassador.social_media.instagram.replace("@", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-400 hover:text-cyan-400 transition-colors"
                          >
                            <Instagram className="w-5 h-5" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
