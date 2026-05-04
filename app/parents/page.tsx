import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { TrustBanner } from "@/components/trust-banner"
import { Shield, Heart, Phone, CheckCircle, Users, Camera, Clock, MapPin } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ParentsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-coral-500/10 to-purple-500/10" />
          
          <div className="max-w-7xl mx-auto relative z-10">
            <TrustBanner />
            
            <div className="text-center space-y-6 mt-12">
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-emerald-600 via-coral-500 to-purple-600 bg-clip-text text-transparent">
                Guide Parents
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Tout ce que vous devez savoir pour offrir à vos ados des expériences sûres, encadrées et inoubliables
              </p>
            </div>
          </div>
        </section>

        {/* Notre Engagement */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Notre Engagement envers Vous</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Shield,
                  title: "Sécurité Maximale",
                  description: "Encadrement professionnel, ratios stricts, protocoles vérifiés"
                },
                {
                  icon: Heart,
                  title: "Bien-être Prioritaire",
                  description: "Environnement bienveillant, écoute active, respect de chacun"
                },
                {
                  icon: Phone,
                  title: "Communication 24/7",
                  description: "Joignables à tout moment, mises à jour en temps réel"
                }
              ].map((item, idx) => (
                <Card key={idx}>
                  <CardContent className="p-6 text-center">
                    <item.icon className="w-12 h-12 mx-auto mb-4 text-emerald-600" />
                    <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Comment ça marche */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Comment ça marche ?</h2>
            
            <div className="space-y-8">
              {[
                {
                  step: "1",
                  title: "Inscription & Profil",
                  description: "Créez votre compte parent, ajoutez les profils de vos enfants avec leurs informations médicales et contacts d'urgence",
                  icon: Users
                },
                {
                  step: "2",
                  title: "Réservation & Autorisation",
                  description: "Choisissez un événement, réservez en ligne et signez électroniquement l'autorisation parentale",
                  icon: CheckCircle
                },
                {
                  step: "3",
                  title: "Check-in Sécurisé",
                  description: "À l'arrivée, votre ado scanne son QR code. Vous recevez une notification instantanée",
                  icon: Camera
                },
                {
                  step: "4",
                  title: "Suivi en Temps Réel",
                  description: "Consultez le statut de l'événement en direct depuis votre espace parent",
                  icon: Clock
                }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-emerald-600 to-coral-600 flex items-center justify-center text-white text-2xl font-bold">
                      {item.step}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      <item.icon className="w-6 h-6 text-emerald-600 mt-1" />
                      <h3 className="text-xl font-bold">{item.title}</h3>
                    </div>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Parents */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Questions Fréquentes</h2>
            
            <div className="space-y-6">
              {[
                {
                  q: "Mon enfant sera-t-il en sécurité ?",
                  a: "Absolument. Nous appliquons des protocoles de sécurité stricts: 1 encadrant pour 10 ados, vérification d'identité au check-in, aucune sortie non autorisée, et surveillance continue."
                },
                {
                  q: "Puis-je contacter mon enfant pendant l'événement ?",
                  a: "Oui. Votre enfant garde son téléphone. En cas d'urgence, notre équipe est joignable 24/7 au +212 661 234 567."
                },
                {
                  q: "Que se passe-t-il en cas d'allergie ou problème médical ?",
                  a: "Lors de l'inscription, vous indiquez toutes les informations médicales. Notre équipe est formée aux premiers secours et nous avons des partenariats avec des cliniques locales."
                },
                {
                  q: "Puis-je annuler une réservation ?",
                  a: "Oui, jusqu'à 48h avant l'événement pour un remboursement complet ou crédit sur votre compte."
                }
              ].map((item, idx) => (
                <Card key={idx}>
                  <CardContent className="p-6">
                    <h3 className="font-bold mb-2 text-lg">{item.q}</h3>
                    <p className="text-muted-foreground">{item.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link href="/faq">
                <Button size="lg">Voir toutes les questions</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Une question ? Nous sommes là</h2>
            <p className="text-muted-foreground mb-8">
              Notre équipe est disponible pour répondre à toutes vos préoccupations
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/support">
                <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-coral-600">
                  <Phone className="mr-2 h-5 w-5" />
                  Nous Contacter
                </Button>
              </Link>
              <Link href="https://wa.me/212661234567">
                <Button size="lg" variant="outline">
                  WhatsApp
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
