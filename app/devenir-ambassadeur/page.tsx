import { createClient } from "@/lib/supabase/server"
import { Star, Users, TrendingUp, Award, ArrowRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function AmbassadeursPage() {
  const supabase = await createClient()

  // #67 — real ambassadors schema: keyed on user_id; commission_pct (not
  // commission_rate); no total_referrals/total_earnings/profile_id/stage_name/
  // specialties/bio/social_media columns. Names are resolved separately (no FK
  // ambassadors→profiles to embed).
  const { data: ambassadorRows } = await supabase
    .from("ambassadors")
    .select("id, user_id, code, status, tier, track, commission_pct, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(12)

  const ambUserIds = [...new Set((ambassadorRows || []).map((a) => a.user_id).filter(Boolean))]
  const nameById = new Map<string, string>()
  if (ambUserIds.length > 0) {
    const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ambUserIds)
    for (const p of profs || []) nameById.set(p.id, p.full_name || "Ambassadeur")
  }
  const ambassadors = (ambassadorRows || []).map((a) => ({
    ...a,
    displayName: nameById.get(a.user_id) || "Ambassadeur",
  }))

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userAmbassador: { id: string; code: string; status: string; commission_pct: number | null } | null = null
  let userStats = { totalReferrals: 0, totalEarnings: 0 }
  if (user) {
    const { data } = await supabase
      .from("ambassadors")
      .select("id, code, status, commission_pct")
      .eq("user_id", user.id)
      .maybeSingle()
    userAmbassador = data

    // Counts aggregated from the canonical attribution / commission tables (#29/#33).
    if (data?.id) {
      const [{ count }, { data: comms }] = await Promise.all([
        supabase
          .from("referral_attribution")
          .select("*", { count: "exact", head: true })
          .eq("ambassador_id", data.id),
        supabase.from("ambassador_commissions").select("amount_dh").eq("ambassador_id", data.id),
      ])
      userStats = {
        totalReferrals: count || 0,
        totalEarnings: (comms || []).reduce((s, c) => s + (Number(c.amount_dh) || 0), 0),
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-ink mb-6">Programme Ambassadeurs</h1>
          <p className="text-xl text-teal mb-4">Rejoins notre équipe et gagne de l'argent</p>
          <p className="text-mute max-w-3xl mx-auto leading-relaxed">
            Deviens ambassadeur Nivy et partage ta passion tout en gagnant des commissions sur chaque réservation
            avec ton code promo personnel.
          </p>
        </div>

        {!userAmbassador && (
          <div className="max-w-4xl mx-auto mb-20">
            <div className="mb-16">
              <h2 className="text-3xl font-black text-ink text-center mb-12">Comment devenir ambassadeur?</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-teal to-teal rounded-2xl blur opacity-50" />
                  <div className="relative bg-card rounded-2xl p-8 border border-ink text-center">
                    <div className="w-16 h-16 rounded-full bg-teal text-ink flex items-center justify-center text-2xl font-black mx-auto mb-4">
                      1
                    </div>
                    <h3 className="text-xl font-bold text-ink mb-3">Postule</h3>
                    <p className="text-mute text-sm">
                      Remplis le formulaire de candidature en 2 minutes et parle-nous de toi
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-teal to-pink rounded-2xl blur opacity-50" />
                  <div className="relative bg-card rounded-2xl p-8 border border-ink text-center">
                    <div className="w-16 h-16 rounded-full bg-teal text-ink flex items-center justify-center text-2xl font-black mx-auto mb-4">
                      2
                    </div>
                    <h3 className="text-xl font-bold text-ink mb-3">Entretien</h3>
                    <p className="text-mute text-sm">
                      Notre équipe te contacte sous 48h pour un entretien rapide
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-pink to-pink rounded-2xl blur opacity-50" />
                  <div className="relative bg-card rounded-2xl p-8 border border-ink text-center">
                    <div className="w-16 h-16 rounded-full bg-pink text-ink flex items-center justify-center text-2xl font-black mx-auto mb-4">
                      3
                    </div>
                    <h3 className="text-xl font-bold text-ink mb-3">Lance-toi!</h3>
                    <p className="text-mute text-sm">
                      Reçois ton code promo unique et commence à gagner de l'argent
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-teal via-teal to-pink rounded-2xl blur-xl opacity-75" />
              <div className="relative bg-background rounded-2xl p-8 md:p-12 border border-ink">
                <div className="text-center mb-8">
                  <h2 className="text-3xl md:text-4xl font-black text-ink mb-4">Pourquoi devenir ambassadeur?</h2>
                </div>

                <div className="grid md:grid-cols-3 gap-8 mb-10">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal to-teal flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="w-8 h-8 text-ink" />
                    </div>
                    <h3 className="text-xl font-bold text-ink mb-2">Gagne de l'argent</h3>
                    <p className="text-mute text-sm">10% de commission sur chaque réservation avec ton code</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal to-pink flex items-center justify-center mx-auto mb-4">
                      <Star className="w-8 h-8 text-ink" />
                    </div>
                    <h3 className="text-xl font-bold text-ink mb-2">Accès VIP</h3>
                    <p className="text-mute text-sm">Entrées gratuites et accès privilégié aux événements</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink to-pink flex items-center justify-center mx-auto mb-4">
                      <Award className="w-8 h-8 text-ink" />
                    </div>
                    <h3 className="text-xl font-bold text-ink mb-2">Visibilité</h3>
                    <p className="text-mute text-sm">Mis en avant sur nos réseaux et dans nos événements</p>
                  </div>
                </div>

                <div className="text-center">
                  <Button
                    asChild
                    size="lg"
                    className="bg-gradient-to-r from-teal to-teal hover:from-teal hover:to-teal text-ink border-0 text-lg px-10"
                  >
                    <Link href="/devenir-ambassadeur/candidature">
                      Postuler maintenant
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>
                  {!user && <p className="text-sm text-mute mt-4">Connexion requise pour postuler</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {userAmbassador && (
          <div className="max-w-4xl mx-auto mb-20">
            <div className="bg-gradient-to-br from-paper-2 to-card rounded-2xl p-8 border border-ink">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-ink">Ton espace ambassadeur</h2>
                <div
                  className={`px-4 py-2 rounded-full text-sm font-bold ${
                    userAmbassador.status === "active"
                      ? "bg-lime/20 text-lime"
                      : userAmbassador.status === "pending"
                        ? "bg-gold/20 text-gold"
                        : "bg-destructive/20 text-destructive"
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
                <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 mb-6">
                  <p className="text-gold text-sm">
                    Ta candidature est en cours d'examen. Nous te contacterons bientôt!
                  </p>
                </div>
              )}

              {userAmbassador.status === "active" && (
                <>
                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-card rounded-2xl p-6 border border-ink">
                      <p className="text-mute text-sm mb-2">Total référés</p>
                      <p className="text-4xl font-black text-teal">{userStats.totalReferrals}</p>
                    </div>

                    <div className="bg-card rounded-2xl p-6 border border-ink">
                      <p className="text-mute text-sm mb-2">Gains totaux</p>
                      <p className="text-4xl font-black text-lime">{userStats.totalEarnings} DH</p>
                    </div>

                    <div className="bg-card rounded-2xl p-6 border border-ink">
                      <p className="text-mute text-sm mb-2">Commission</p>
                      <p className="text-4xl font-black text-pink">{userAmbassador.commission_pct ?? 10}%</p>
                    </div>
                  </div>

                  <Button
                    asChild
                    className="w-full bg-gradient-to-r from-teal to-teal hover:from-teal hover:to-teal text-ink border-0"
                  >
                    <Link href="/ambassador">
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
          <h2 className="text-3xl font-black text-ink text-center mb-12">Questions fréquentes</h2>
          <div className="space-y-4">
            <div className="bg-card rounded-2xl p-6 border border-ink">
              <h3 className="text-ink font-bold mb-2">Combien puis-je gagner?</h3>
              <p className="text-mute text-sm">
                Tu gagnes 10% de commission sur chaque réservation effectuée avec ton code. Par exemple, sur une
                réservation de 300 DH, tu gagnes 30 DH. Plus tu partages, plus tu gagnes!
              </p>
            </div>

            <div className="bg-card rounded-2xl p-6 border border-ink">
              <h3 className="text-ink font-bold mb-2">Comment je reçois mes paiements?</h3>
              <p className="text-mute text-sm">
                Dès que tu atteins 500 DH de gains, tu peux demander un virement sur ton compte bancaire ou via Mobile
                Money (Orange Money, inwi Money, Maroc Telecom Cash).
              </p>
            </div>

            <div className="bg-card rounded-2xl p-6 border border-ink">
              <h3 className="text-ink font-bold mb-2">Quels sont les avantages en plus?</h3>
              <p className="text-mute text-sm">
                Entrées gratuites à tous nos événements, accès VIP, visibilité sur nos réseaux sociaux, invitations aux
                avant-premières, et goodies exclusifs Nivy.
              </p>
            </div>

            <div className="bg-card rounded-2xl p-6 border border-ink">
              <h3 className="text-ink font-bold mb-2">Qui peut devenir ambassadeur?</h3>
              <p className="text-mute text-sm">
                Toute personne motivée entre 16 et 25 ans, active sur les réseaux sociaux, qui aime l'animation et qui
                partage les valeurs de Nivy (sécurité, respect, fun!).
              </p>
            </div>

            <div className="bg-card rounded-2xl p-6 border border-ink">
              <h3 className="text-ink font-bold mb-2">Y a-t-il un quota à atteindre?</h3>
              <p className="text-mute text-sm">
                Non, aucun quota obligatoire! Tu partages à ton rythme. Cependant, les ambassadeurs les plus actifs
                bénéficient de bonus et récompenses supplémentaires chaque mois.
              </p>
            </div>
          </div>
        </div>

        {ambassadors && ambassadors.length > 0 && (
          <div>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-ink mb-4">Nos ambassadeurs</h2>
              <p className="text-mute">Ils font la promotion de Nivy</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {ambassadors.map((ambassador) => (
                <div key={ambassador.id} className="group relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-teal via-teal to-pink rounded-2xl blur-xl opacity-0 group-hover:opacity-75 transition duration-1000" />
                  <div className="relative bg-card rounded-2xl p-6 border border-ink text-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal to-teal flex items-center justify-center mx-auto mb-4">
                      <Users className="w-12 h-12 text-ink" />
                    </div>

                    <h3 className="text-xl font-bold text-ink mb-2">
                      {ambassador.displayName}
                    </h3>

                    {/* #67 — ambassadors has no stage_name/specialties/bio/
                        social_media columns; show the real tier instead. */}
                    {ambassador.tier && (
                      <div className="flex flex-wrap gap-2 justify-center mb-4">
                        <span className="px-3 py-1 rounded-full bg-teal/20 text-teal text-xs font-semibold capitalize">
                          {ambassador.tier}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-2 text-mute text-sm">
                      <Award className="w-4 h-4" />
                      <span>Ambassadeur Nivy</span>
                    </div>
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
