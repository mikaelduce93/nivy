import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Heart, Users, Target, Award, MapPin, Mail, Phone } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AProposPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative pt-32 pb-20 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-coral-500/10 to-purple-500/10" />
          
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center space-y-6">
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-emerald-600 via-coral-500 to-purple-600 bg-clip-text text-transparent">
                À Propos de Teens Party Morocco
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                La première plateforme marocaine dédiée aux événements et activités pour adolescents, alliant divertissement, sécurité et éducation
              </p>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Heart,
                  title: "Notre Mission",
                  description: "Offrir aux adolescents marocains des espaces sûrs pour s'épanouir, socialiser et créer des souvenirs inoubliables"
                },
                {
                  icon: Target,
                  title: "Notre Vision",
                  description: "Devenir la référence nationale pour les loisirs adolescents, en combinant innovation, sécurité et qualité"
                },
                {
                  icon: Award,
                  title: "Nos Valeurs",
                  description: "Sécurité, Respect, Inclusion, Excellence, Transparence et Engagement communautaire"
                }
              ].map((item, idx) => (
                <Card key={idx}>
                  <CardContent className="p-6 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-emerald-600 to-coral-600 mb-4">
                      <item.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Notre Histoire</h2>
            <div className="space-y-6 text-muted-foreground">
              <p>
                Teens Party Morocco est né en 2024 d'un constat simple : les adolescents marocains méritent des espaces de loisirs adaptés à leur âge, sécurisés et de qualité.
              </p>
              <p>
                Fondée par une équipe passionnée d'éducateurs, d'organisateurs d'événements et de parents, notre plateforme s'est rapidement imposée comme la référence pour les familles à travers le Maroc.
              </p>
              <p>
                Aujourd'hui, nous organisons plus de 50 événements par mois dans 8 villes marocaines, avec plus de 10,000 adolescents inscrits et des centaines de familles qui nous font confiance.
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 px-4 bg-gradient-to-r from-emerald-600 via-coral-600 to-purple-600 text-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Nos Chiffres</h2>
            <div className="grid md:grid-cols-4 gap-8 text-center">
              {[
                { value: "10K+", label: "Ados Inscrits" },
                { value: "500+", label: "Événements Organisés" },
                { value: "8", label: "Villes Couvertes" },
                { value: "4.8/5", label: "Satisfaction Familles" }
              ].map((stat, idx) => (
                <div key={idx}>
                  <div className="text-5xl font-black mb-2">{stat.value}</div>
                  <div className="text-white/80">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Notre Équipe</h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Une équipe multidisciplinaire de professionnels passionnés et dévoués à la jeunesse marocaine
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { role: "Direction", count: "3 membres" },
                { role: "Coordinateurs Événements", count: "15 membres" },
                { role: "Animateurs Certifiés", count: "50+ membres" }
              ].map((team, idx) => (
                <Card key={idx}>
                  <CardContent className="p-6 text-center">
                    <Users className="w-12 h-12 mx-auto mb-4 text-emerald-600" />
                    <h3 className="font-bold mb-2">{team.role}</h3>
                    <p className="text-muted-foreground">{team.count}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Contactez-nous</h2>
            <p className="text-muted-foreground mb-8">
              Une question ? Une suggestion ? Nous sommes à votre écoute
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <MapPin className="w-8 h-8 mx-auto mb-3 text-emerald-600" />
                  <h3 className="font-bold mb-2">Adresse</h3>
                  <p className="text-sm text-muted-foreground">
                    Casablanca, Maroc
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <Mail className="w-8 h-8 mx-auto mb-3 text-emerald-600" />
                  <h3 className="font-bold mb-2">Email</h3>
                  <p className="text-sm text-muted-foreground">
                    contact@teensparty.ma
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <Phone className="w-8 h-8 mx-auto mb-3 text-emerald-600" />
                  <h3 className="font-bold mb-2">Téléphone</h3>
                  <p className="text-sm text-muted-foreground">
                    +212 XX XX XX XX
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="mt-8">
              <Link href="/support">
                <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-coral-600">
                  Nous Contacter
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
