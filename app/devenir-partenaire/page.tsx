import Link from "next/link"
import { Store, Building2, Dumbbell, GraduationCap, ArrowRight, CheckCircle2, Users, TrendingUp, Shield, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

const PARTNER_TYPES = [
  {
    type: 'retail',
    title: 'Commerce & Retail',
    description: 'Magasins, boutiques, et commerces de détail',
    Icon: Store,
    benefits: ['Accès à notre base de jeunes clients VIP', 'Système de réductions automatisé', 'Tableau de bord analytique'],
    examples: ['Vêtements', 'Électronique', 'Cosmétiques', 'Sport'],
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    gradient: 'from-blue-600 to-blue-500'
  },
  {
    type: 'venue',
    title: 'Restaurants & Lieux',
    description: 'Restaurants, cafés, espaces événementiels',
    Icon: Building2,
    benefits: ['Système de réservation intégré', 'Packages événements personnalisés', 'Visibilité maximale'],
    examples: ['Restaurants', 'Cafés', 'Salles de fête', 'Lounges'],
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    gradient: 'from-purple-600 to-purple-500'
  },
  {
    type: 'club',
    title: 'Clubs & Fitness',
    description: 'Clubs sportifs, fitness, et activités',
    Icon: Dumbbell,
    benefits: ["Gestion d'adhésions automatisée", 'Calendrier de cours intégré', 'Paiements récurrents'],
    examples: ['Fitness', 'Danse', 'Arts martiaux', 'Yoga'],
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    gradient: 'from-green-600 to-green-500'
  },
  {
    type: 'education',
    title: 'Éducation & Formation',
    description: 'Centres de formation et cours',
    Icon: GraduationCap,
    benefits: ['Gestion de cours et sessions', 'Inscriptions en ligne', 'Certificats automatiques'],
    examples: ['Langues', 'Musique', 'Arts', 'Soutien scolaire'],
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    gradient: 'from-yellow-600 to-yellow-500'
  }
]

const STATS = [
  { value: '13–17', label: 'Cible ados Maroc', Icon: Users },
  { value: 'XP réel', label: 'Récompenses gamifiées', Icon: TrendingUp },
  { value: '100%', label: 'Paiements sécurisés', Icon: Shield },
  { value: '48h', label: 'Validation rapide', Icon: Zap },
]

export default function DevenirPartenairePage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10" />
        <div className="container mx-auto px-6 py-24 relative">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6">
              Devenez{" "}
              <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Partenaire
              </span>
            </h1>
            <p className="text-xl text-zinc-400 mb-8 leading-relaxed">
              Rejoignez Nivy, l'écosystème lifestyle des 13–17 ans au Maroc. Accédez à une communauté gamifiée,
              proposez des offres en coins (cashback XP automatique) et boostez votre visibilité auprès des familles.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:opacity-90 text-lg px-8">
                <Link href="/devenir-partenaire/inscription">
                  Commencer maintenant
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-zinc-700 text-white hover:bg-zinc-800 text-lg px-8">
                <Link href="/devenir-partenaire">
                  Voir nos partenaires
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="border-y border-zinc-800 bg-zinc-900/50">
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <div key={i} className="text-center">
                <stat.Icon className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
                <div className="text-3xl md:text-4xl font-black text-white mb-1">{stat.value}</div>
                <div className="text-zinc-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Partner Types Section */}
      <div className="container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Choisissez votre type de partenariat
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Nous avons des solutions adaptées à chaque secteur d'activité
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {PARTNER_TYPES.map((partnerType) => (
            <Link
              key={partnerType.type}
              href="/devenir-partenaire/inscription"
              className="group"
            >
              <div className={`relative bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-all h-full ${partnerType.bgColor} hover:scale-[1.02]`}>
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className={`p-4 rounded-xl ${partnerType.bgColor} border ${partnerType.borderColor}`}>
                      <partnerType.Icon className={`w-10 h-10 ${partnerType.color}`} />
                    </div>
                    <ArrowRight className={`w-6 h-6 ${partnerType.color} group-hover:translate-x-2 transition-transform`} />
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-2">{partnerType.title}</h3>
                  <p className="text-zinc-400 mb-6">{partnerType.description}</p>

                  {/* Benefits */}
                  <div className="space-y-2 mb-6">
                    {partnerType.benefits.map((benefit, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                        <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${partnerType.color}`} />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>

                  {/* Examples */}
                  <div className="flex flex-wrap gap-2">
                    {partnerType.examples.map((example, i) => (
                      <span
                        key={i}
                        className={`px-3 py-1 rounded-full text-xs ${partnerType.bgColor} border ${partnerType.borderColor} ${partnerType.color}`}
                      >
                        {example}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={`p-4 bg-gradient-to-r ${partnerType.gradient} text-white font-semibold text-center`}>
                  Commencer l'inscription
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 border-y border-zinc-800">
        <div className="container mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Prêt à rejoindre Nivy ?
          </h2>
          <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
            Notre équipe valide votre demande en moins de 48h. Commencez à attirer de nouveaux clients dès aujourd'hui.
          </p>
          <Button asChild size="lg" className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:opacity-90 text-lg px-8">
            <Link href="/devenir-partenaire/inscription">
              Devenir partenaire maintenant
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
