import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Star, Users, Gift, TrendingUp, Award, Heart, Sparkles, Check } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AmbassadeursProgrammePage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        <div className="relative overflow-hidden py-32">
          <div className="absolute inset-0 bg-gradient-to-b from-pink/10 via-transparent to-transparent" />
          <div className="container mx-auto px-6 relative">
            <div className="text-center mb-16">
              <div className="inline-block mb-6">
                <div className="absolute -inset-2 bg-gradient-to-r from-pink via-pink to-teal rounded-2xl blur-2xl opacity-30" />
                <h1 className="relative text-4xl sm:text-5xl md:text-7xl font-black text-ink">
                  Programme Ambassadeurs
                </h1>
              </div>
              <p className="text-xl text-pink mb-4">Deviens ambassadeur et gagne des récompenses</p>
              <p className="text-mute max-w-3xl mx-auto leading-relaxed">
                Partage ta passion pour Teen Party avec tes amis et profite d'avantages exclusifs à chaque parrainage réussi
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-16 max-w-5xl mx-auto">
              <div className="bg-gradient-to-br from-paper-2 to-card rounded-2xl p-8 border border-ink">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink to-pink flex items-center justify-center mb-6">
                  <Users className="w-8 h-8 text-ink" />
                </div>
                <h3 className="text-2xl font-bold text-ink mb-4">Partage ton code</h3>
                <p className="text-mute leading-relaxed">
                  Obtiens ton code de parrainage unique et partage-le avec tes amis sur les réseaux sociaux
                </p>
              </div>

              <div className="bg-gradient-to-br from-paper-2 to-card rounded-2xl p-8 border border-ink">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal to-teal flex items-center justify-center mb-6">
                  <Gift className="w-8 h-8 text-ink" />
                </div>
                <h3 className="text-2xl font-bold text-ink mb-4">Récompenses immédiates</h3>
                <p className="text-mute leading-relaxed">
                  À chaque ami inscrit, gagne des points et des réductions sur tes prochaines réservations
                </p>
              </div>

              <div className="bg-gradient-to-br from-paper-2 to-card rounded-2xl p-8 border border-ink">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold to-coral flex items-center justify-center mb-6">
                  <Award className="w-8 h-8 text-ink" />
                </div>
                <h3 className="text-2xl font-bold text-ink mb-4">Deviens VIP</h3>
                <p className="text-mute leading-relaxed">
                  Les meilleurs ambassadeurs accèdent au statut VIP Gold ou Platinum gratuitement
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-paper-2 to-card rounded-2xl p-12 border border-ink mb-16 max-w-5xl mx-auto">
              <h2 className="text-3xl font-black text-ink mb-8 text-center">
                Tes récompenses par palier
              </h2>
              <div className="space-y-6">
                {[
                  { palier: "1-5 parrainages", reward: "50 points + -10% sur tes réservations", icon: Star, color: "from-paper-2 to-card" },
                  { palier: "6-10 parrainages", reward: "150 points + -20% + 1 événement gratuit", icon: Sparkles, color: "from-pink to-pink" },
                  { palier: "11-20 parrainages", reward: "300 points + -30% + Carte VIP Gold offerte", icon: Award, color: "from-gold to-coral" },
                  { palier: "21+ parrainages", reward: "500 points + -50% + Carte VIP Platinum offerte", icon: TrendingUp, color: "from-teal to-teal" },
                ].map((item, idx) => {
                  const Icon = item.icon
                  return (
                    <div key={idx} className="flex items-center gap-6 p-6 bg-card rounded-2xl border border-ink">
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-8 h-8 text-ink" />
                      </div>
                      <div className="flex-1">
                        <p className="text-ink font-bold text-lg mb-1">{item.palier}</p>
                        <p className="text-teal font-semibold">{item.reward}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="text-center">
              <div className="inline-block">
                <div className="absolute -inset-2 bg-gradient-to-r from-pink to-teal rounded-2xl blur-xl opacity-75" />
                <Button asChild size="lg" className="relative bg-gradient-to-r from-pink to-teal hover:from-pink hover:to-teal text-ink text-lg px-12 py-6">
                  <Link href="/devenir-ambassadeur/candidature">
                    Devenir ambassadeur maintenant
                  </Link>
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
