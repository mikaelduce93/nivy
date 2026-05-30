import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Heart, Target, Award, MapPin, Mail } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { DarkSurface, Niv } from "@/components/brand"
import { MeshBackground } from "@/components/ui/effects/mesh-background"
import { getPublicAppConfig } from "@/lib/config/app-config"

const VALUES = [
  {
    icon: Heart,
    bg: "bg-pink",
    title: "Notre mission",
    description:
      "Offrir aux ados marocains des espaces sûrs pour s'épanouir, socialiser et créer des souvenirs inoubliables.",
  },
  {
    icon: Target,
    bg: "bg-teal",
    title: "Notre vision",
    description:
      "Devenir la référence nationale pour les loisirs ados, en combinant innovation, sécurité et qualité.",
  },
  {
    icon: Award,
    bg: "bg-gold",
    title: "Nos valeurs",
    description:
      "Sécurité, respect, inclusion, excellence, transparence et engagement communautaire.",
  },
]

const COVERAGE = [
  { value: "Sport & Glow Up", label: "Clubs, défis, fitness" },
  { value: "Études & Big Brain", label: "Quiz, tutorat, parcours" },
  { value: "Self-Express", label: "Arts, musique, danse" },
  { value: "Main Character", label: "Soirées, social, crews" },
]

export default function AProposPage() {
  const { contactEmail } = getPublicAppConfig()
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-paper">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-20 pt-32">
          <MeshBackground />
          <div className="relative z-10 mx-auto max-w-7xl">
            <div className="flex flex-col items-center gap-6 text-center">
              <Niv mood="proud" size={120} float />
              <p className="eyebrow tracking-[0.16em]">À propos · Nivy</p>
              <h1 className="font-display text-5xl font-extrabold leading-[1.02] tracking-tight md:text-6xl">
                À propos de <em className="font-semibold italic text-pink">Nivy</em>
              </h1>
              <p className="max-w-3xl text-xl text-ink-2">
                Le premier écosystème lifestyle gamifié pour les 13–17&nbsp;ans au Maroc — sport,
                études, créativité, soirées, transport, food. Tout dans une seule app, avec du XP
                réel à la clé.
              </p>
            </div>
          </div>
        </section>

        {/* Mission / Vision / Valeurs */}
        <section className="bg-paper-2 px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 md:grid-cols-3">
              {VALUES.map((item) => (
                <StickerCard key={item.title} variant="hover" className="gap-3 p-6 text-center">
                  <span
                    className={`mx-auto grid size-14 place-items-center rounded-xl border-2 border-ink ${item.bg}`}
                  >
                    <item.icon className="size-7 text-ink" aria-hidden="true" />
                  </span>
                  <h3 className="font-display text-xl font-extrabold">{item.title}</h3>
                  <p className="text-sm text-mute">{item.description}</p>
                </StickerCard>
              ))}
            </div>
          </div>
        </section>

        {/* Histoire */}
        <section className="px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-10 text-center font-display text-3xl font-extrabold tracking-tight">
              Notre <em className="font-semibold italic text-pink">histoire</em>
            </h2>
            <div className="space-y-6 text-ink-2">
              <p>
                Nivy est né d'un constat simple&nbsp;: les ados marocains méritent une plateforme
                pensée pour leur génération — gamifiée, sociale, sûre et utile au quotidien.
              </p>
              <p>
                Là où d'autres apps cloisonnent (l'une pour le sport, l'autre pour les soirées, une
                troisième pour les courses), Nivy unifie tout&nbsp;: sport, études, créativité,
                soirées, mobilité, food. Chaque action gagne du XP, chaque XP débloque des
                récompenses.
              </p>
              <p>
                Construit autour des parents et avec eux&nbsp;: contrôle parental natif, validations
                en un tap, transparence totale sur les dépenses et les sorties.
              </p>
            </div>
          </div>
        </section>

        {/* Ce que Nivy couvre — surface sombre ponctuelle */}
        <section className="px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <DarkSurface tone="pink" shadow className="p-8 sm:p-12">
              <h2 className="mb-10 text-center font-display text-3xl font-extrabold tracking-tight">
                Ce que Nivy <em className="font-semibold italic text-pink">couvre</em>
              </h2>
              <div className="grid gap-8 text-center md:grid-cols-4">
                {COVERAGE.map((stat) => (
                  <div key={stat.value}>
                    <div className="font-display text-2xl font-black md:text-3xl">{stat.value}</div>
                    <div className="mt-1 text-sm text-paper/70">{stat.label}</div>
                  </div>
                ))}
              </div>
              <p className="mt-8 text-center text-sm text-paper/80">
                + transport, food, marketplace, mentorat — tout unifié dans une seule app.
              </p>
            </DarkSurface>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-paper-2 px-4 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <p className="eyebrow tracking-[0.16em]">Contact</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
              Une <em className="font-semibold italic text-pink">question</em> ?
            </h2>
            <p className="mb-8 mt-2 text-mute">Une suggestion ? On est à ton écoute.</p>
            <div className="grid gap-6 sm:grid-cols-2">
              <StickerCard className="gap-2 p-6 text-center">
                <MapPin className="mx-auto size-7 text-teal" aria-hidden="true" />
                <h3 className="font-display font-bold">Adresse</h3>
                <p className="font-mono text-sm text-mute">Casablanca, Maroc</p>
              </StickerCard>
              <StickerCard className="gap-2 p-6 text-center">
                <Mail className="mx-auto size-7 text-pink" aria-hidden="true" />
                <h3 className="font-display font-bold">Email</h3>
                <p className="break-all font-mono text-sm text-mute">{contactEmail}</p>
              </StickerCard>
            </div>
            <div className="mt-8">
              <Button asChild size="lg" variant="pink">
                <Link href="/support">Nous contacter</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
