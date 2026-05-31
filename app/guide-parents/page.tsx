import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { TrustBanner } from "@/components/trust-banner"
import { Shield, Heart, Phone, CheckCircle, Users, Camera, Clock } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { Niv } from "@/components/brand"
import { MeshBackground } from "@/components/ui/effects/mesh-background"
import { getPublicAppConfig } from "@/lib/config/app-config"

const { whatsappPhone: WHATSAPP_PHONE, supportPhone: SUPPORT_PHONE } = getPublicAppConfig()

const ENGAGEMENTS = [
  { icon: Shield, bg: "bg-lime", title: "Sécurité maximale", description: "Encadrement professionnel, ratios stricts, protocoles vérifiés." },
  { icon: Heart, bg: "bg-pink", title: "Bien-être prioritaire", description: "Environnement bienveillant, écoute active, respect de chacun." },
  { icon: Phone, bg: "bg-teal", title: "Communication 24/7", description: "Joignables à tout moment, mises à jour en temps réel." },
]

const STEPS = [
  { step: "1", title: "Inscription & profil", description: "Créez votre compte parent, ajoutez les profils de vos enfants avec leurs informations médicales et contacts d'urgence.", icon: Users },
  { step: "2", title: "Réservation & autorisation", description: "Choisissez un événement, réservez en ligne et signez électroniquement l'autorisation parentale.", icon: CheckCircle },
  { step: "3", title: "Check-in sécurisé", description: "À l'arrivée, votre ado scanne son QR code. Vous recevez une notification instantanée.", icon: Camera },
  { step: "4", title: "Suivi en temps réel", description: "Consultez le statut de l'événement en direct depuis votre espace parent.", icon: Clock },
]

const FAQ = [
  { q: "Mon enfant sera-t-il en sécurité ?", a: "Absolument. Nous appliquons des protocoles de sécurité stricts : 1 encadrant pour 10 ados, vérification d'identité au check-in, aucune sortie non autorisée, et surveillance continue." },
  { q: "Puis-je contacter mon enfant pendant l'événement ?", a: `Oui. Votre enfant garde son téléphone. En cas d'urgence, notre équipe est joignable 24/7 au ${SUPPORT_PHONE}.` },
  { q: "Que se passe-t-il en cas d'allergie ou problème médical ?", a: "Lors de l'inscription, vous indiquez toutes les informations médicales. Notre équipe est formée aux premiers secours et nous avons des partenariats avec des cliniques locales." },
  { q: "Puis-je annuler une réservation ?", a: "Oui, jusqu'à 48h avant l'événement pour un remboursement complet ou crédit sur votre compte." },
]

export default function ParentsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-paper">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-16 pt-32">
          <MeshBackground />
          <div className="relative z-10 mx-auto max-w-7xl">
            <TrustBanner />
            <div className="mt-10 flex flex-col items-center gap-5 text-center">
              <Niv mood="calm" size={104} float />
              <p className="eyebrow tracking-[0.16em]">Guide parents</p>
              <h1 className="font-display text-5xl font-extrabold leading-[1.04] tracking-tight md:text-6xl">
                Guide <em className="font-semibold italic text-pink">parents</em>
              </h1>
              <p className="max-w-3xl text-xl text-ink-2">
                Tout ce qu'il faut savoir pour offrir à vos ados des expériences sûres, encadrées et
                inoubliables.
              </p>
            </div>
          </div>
        </section>

        {/* Notre Engagement */}
        <section className="bg-paper-2 px-4 py-16">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-10 text-center font-display text-3xl font-extrabold tracking-tight">
              Notre engagement envers <em className="font-semibold italic text-pink">vous</em>
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {ENGAGEMENTS.map((item) => (
                <StickerCard key={item.title} variant="hover" className="items-center gap-3 p-6 text-center">
                  <span className={`grid size-14 place-items-center rounded-xl border-2 border-ink ${item.bg}`}>
                    <item.icon className="size-7 text-ink" aria-hidden="true" />
                  </span>
                  <h3 className="font-display text-xl font-extrabold">{item.title}</h3>
                  <p className="text-mute">{item.description}</p>
                </StickerCard>
              ))}
            </div>
          </div>
        </section>

        {/* Comment ça marche */}
        <section className="px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-10 text-center font-display text-3xl font-extrabold tracking-tight">
              Comment ça <em className="font-semibold italic text-pink">marche</em> ?
            </h2>
            <div className="space-y-6">
              {STEPS.map((item) => (
                <StickerCard key={item.step} className="p-6">
                  <div className="flex items-start gap-5">
                    <span className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-ink bg-ink font-display text-2xl font-extrabold text-paper">
                      {item.step}
                    </span>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <item.icon className="size-5 text-teal" aria-hidden="true" />
                        <h3 className="font-display text-xl font-bold">{item.title}</h3>
                      </div>
                      <p className="text-mute">{item.description}</p>
                    </div>
                  </div>
                </StickerCard>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Parents */}
        <section className="bg-paper-2 px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-10 text-center font-display text-3xl font-extrabold tracking-tight">
              Questions <em className="font-semibold italic text-pink">fréquentes</em>
            </h2>
            <div className="space-y-4">
              {FAQ.map((item) => (
                <StickerCard key={item.q} className="gap-2 p-6">
                  <h3 className="font-display text-lg font-bold">{item.q}</h3>
                  <p className="text-mute">{item.a}</p>
                </StickerCard>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Button asChild size="lg" variant="outline">
                <Link href="/aide/faq">Voir toutes les questions</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="px-4 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-3 font-display text-3xl font-extrabold tracking-tight">
              Une question ? On est là
            </h2>
            <p className="mb-8 text-mute">Notre équipe répond à toutes vos préoccupations.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" variant="pink">
                <Link href="/aide">
                  <Phone className="mr-2 size-5" aria-hidden="true" />
                  Nous contacter
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={`https://wa.me/${WHATSAPP_PHONE}`}>WhatsApp</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
