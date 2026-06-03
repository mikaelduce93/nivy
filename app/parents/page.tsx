import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  ShieldCheck,
  Moon,
  Eye,
  SlidersHorizontal,
  CheckCheck,
  Users,
  Wallet,
  RotateCcw,
  ScrollText,
  Scale,
  ArrowLeft,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { PricingSticker, PricingGrid } from "@/components/sticker/pricing-sticker"
import { Niv, DarkSurface } from "@/components/brand"
import { getEscrowConfig } from "@/lib/config/app-config"

export const metadata: Metadata = {
  title: "Parents — vous gardez la main",
  description:
    "Plafonds, validation en un geste, multi-parent, escrow agréé BAM, remboursement en DH : tout le contrôle parental Nivy, gratuit à vie. Sécurité des 13–17 ans et conformité CNDP 09-08.",
}

// #286 — page parent dédiée (vouvoiement strict). La home renvoie ici ; les
// tarifs « famille » migrent depuis la home, recadrés « niveau de contrôle ».
const ESCROW = getEscrowConfig()

const SAFETY = [
  {
    icon: ShieldCheck,
    title: "Réservé aux 13–17 ans",
    desc: "Contrôle d'âge à l'inscription. Aucun adulte tiers, aucun inconnu : un espace pensé pour les mineurs.",
  },
  {
    icon: Moon,
    title: "Heures calmes",
    desc: "Aucune notification entre 22 h et 7 h, ni pour vous ni pour votre ado. Le sommeil avant les écrans.",
  },
  {
    icon: Eye,
    title: "Tout est tracé",
    desc: "Vous voyez chaque dépense et chaque activité, catégorisées. Contenus et échanges modérés.",
  },
]

const CONTROL = [
  {
    icon: SlidersHorizontal,
    title: "Plafonds par enfant",
    desc: "Fixez une limite par transaction, par jour et par mois. Vous ajustez à tout moment.",
  },
  {
    icon: CheckCheck,
    title: "Validation en un geste",
    desc: "Au-delà du plafond, vous recevez une notification : un appui pour approuver, un pour refuser.",
  },
  {
    icon: Users,
    title: "Multi-parent",
    desc: "Vous êtes deux à veiller ? Le premier qui répond valide. Personne ne reste bloqué.",
  },
]

const LEGAL = [
  {
    icon: ScrollText,
    title: "Données protégées — CNDP loi 09-08",
    desc: "Pièce d'identité chiffrée, liens d'image signés et temporaires, droit à l'effacement à tout moment.",
  },
  {
    icon: Scale,
    title: "Pas de crypto, pas de jeu d'argent",
    desc: "Les coins sont une simple monnaie prépayée en dirhams. Comptabilité conservée 7 ans, comme l'exige la loi marocaine.",
  },
]

// Tarifs migrés depuis la home, recadrés « niveau de contrôle ». Free est mis
// en avant : tout le contrôle parental, gratuit à vie.
const PLANS = [
  {
    name: "Free",
    price: "0 DH",
    plan: "free",
    popular: true,
    features: [
      "1 enfant lié",
      "Plafonds & validation en un geste",
      "Historique 90 jours",
      "Tout le contrôle parental — gratuit à vie",
    ],
  },
  {
    name: "Silver",
    price: "29 DH",
    plan: "silver",
    popular: false,
    features: [
      "Jusqu'à 3 enfants",
      "Notifications prioritaires",
      "Historique 1 an",
      "Co-parent inclus",
    ],
  },
  {
    name: "Gold",
    price: "79 DH",
    plan: "gold",
    popular: false,
    features: [
      "Jusqu'à 5 enfants",
      "Aide scolaire incluse",
      "Rapports d'activité détaillés",
      "Mode autonome avancé",
    ],
  },
  {
    name: "Platinum",
    price: "149 DH",
    plan: "platinum",
    popular: false,
    features: [
      "Enfants illimités",
      "Mentor & coach dédié",
      "Conciergerie WhatsApp",
      "Support prioritaire",
    ],
  },
] as const

export default function ParentsPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* ─────────── HERO ─────────── */}
      <section className="px-6 pb-16 pt-20" aria-labelledby="parents-hero">
        <div className="container mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="eyebrow">Espace parents</p>
            <h1
              id="parents-hero"
              className="mt-3 font-display text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-balance"
            >
              Son autonomie. <em className="italic font-semibold text-pink">Votre contrôle.</em>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-2 sm:text-lg">
              Vous rechargez en dirhams, vous fixez les règles, vous validez — ou vous laissez faire.
              Votre ado gagne en autonomie ; vous gardez la main sur le budget, la sécurité et les données.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant="pink" size="lg">
                <Link href="/onboarding?role=parent">
                  Créer un compte parent <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/guide-parents">Sécurité des sorties</Link>
              </Button>
            </div>
          </div>

          <div className="flex justify-center">
            <DarkSurface tone="teal" shadow className="w-full max-w-sm p-6">
              <div className="flex items-start gap-3">
                <Niv mood="calm" size={56} className="shrink-0" />
                <div>
                  <span className="eyebrow tracking-[0.14em] text-pink">Niv</span>
                  <p className="mt-1 text-sm leading-snug text-paper/90">
                    « Yasmine veut acheter un livre à 45 DH chez son partenaire. »
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <span className="flex-1 rounded-lg bg-paper py-2 text-center text-[12px] font-bold text-ink">
                  Approuver
                </span>
                <span className="flex-1 rounded-lg border-2 border-paper/40 py-2 text-center text-[12px] font-bold text-paper/80">
                  Refuser
                </span>
              </div>
              <p className="mt-3 font-mono text-[11px] text-paper/60">
                Validation en un geste · vous décidez à chaque fois
              </p>
            </DarkSurface>
          </div>
        </div>
      </section>

      {/* ─────────── SÉCURITÉ DU MINEUR ─────────── */}
      <section className="border-y-2 border-ink bg-paper-2 px-6 py-20" aria-labelledby="parents-safety">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-10 max-w-2xl">
            <p className="eyebrow">La sécurité d'abord</p>
            <h2 id="parents-safety" className="mt-3 font-display text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[0.97] tracking-[-0.03em] text-balance">
              Un espace pensé pour <em className="italic font-semibold text-pink">les mineurs.</em>
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {SAFETY.map((c) => (
              <StickerCard key={c.title} variant="panel" className="gap-3 p-6">
                <span className="grid size-11 place-items-center rounded-xl border-2 border-ink bg-lime text-ink" aria-hidden="true">
                  <c.icon className="size-5" />
                </span>
                <h3 className="font-display text-xl font-extrabold tracking-[-0.02em]">{c.title}</h3>
                <p className="text-[14px] leading-relaxed text-ink-2">{c.desc}</p>
              </StickerCard>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── CONTRÔLE DU BUDGET ─────────── */}
      <section className="px-6 py-20" aria-labelledby="parents-control">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-10 max-w-2xl">
            <p className="eyebrow">Vous gardez la main</p>
            <h2 id="parents-control" className="mt-3 font-display text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[0.97] tracking-[-0.03em] text-balance">
              Vous fixez les règles. <em className="italic font-semibold text-pink">Sans être le DAB.</em>
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {CONTROL.map((c) => (
              <StickerCard key={c.title} variant="hover" className="gap-3 p-6">
                <span className="grid size-11 place-items-center rounded-xl border-2 border-ink bg-pink text-white" aria-hidden="true">
                  <c.icon className="size-5" />
                </span>
                <h3 className="font-display text-xl font-extrabold tracking-[-0.02em]">{c.title}</h3>
                <p className="text-[14px] leading-relaxed text-ink-2">{c.desc}</p>
              </StickerCard>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── OÙ VA L'ARGENT (surface sombre) ─────────── */}
      <section className="px-6 py-20" aria-labelledby="parents-money">
        <div className="container mx-auto max-w-5xl">
          <DarkSurface tone="gold" shadow className="px-6 py-12 sm:px-12">
            <p className="eyebrow text-paper/50">Où va votre argent</p>
            <h2 id="parents-money" className="mt-3 font-display text-[clamp(1.875rem,4vw,3rem)] font-extrabold leading-[0.97] tracking-[-0.03em] text-paper text-balance">
              Vos dirhams restent <em className="italic font-semibold text-pink">vos dirhams.</em>
            </h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              <div className="rounded-2xl border-2 border-ink bg-night-2 p-5">
                <Wallet className="size-6 text-gold" aria-hidden="true" />
                <h3 className="mt-3 font-display text-lg font-extrabold tracking-[-0.02em] text-paper">Conservés en escrow</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-paper/70">{ESCROW.statement}</p>
              </div>
              <div className="rounded-2xl border-2 border-ink bg-night-2 p-5">
                <RotateCcw className="size-6 text-lime" aria-hidden="true" />
                <h3 className="mt-3 font-display text-lg font-extrabold tracking-[-0.02em] text-paper">Remboursables en DH</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-paper/70">
                  Vous arrêtez ? Les coins non dépensés vous sont remboursés en dirhams sur votre moyen de paiement, sous 30 jours.
                </p>
              </div>
              <div className="rounded-2xl border-2 border-ink bg-night-2 p-5">
                <Scale className="size-6 text-coral" aria-hidden="true" />
                <h3 className="mt-3 font-display text-lg font-extrabold tracking-[-0.02em] text-paper">XP jamais convertibles</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-paper/70">
                  L'XP récompense l'effort et ne se transforme jamais en argent. Aucun mélange entre les deux.
                </p>
              </div>
            </div>
          </DarkSurface>
        </div>
      </section>

      {/* ─────────── LÉGALITÉ ─────────── */}
      <section className="border-y-2 border-ink bg-paper-2 px-6 py-20" aria-labelledby="parents-legal">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-10 max-w-2xl">
            <p className="eyebrow">Conçu au Maroc, dans les règles</p>
            <h2 id="parents-legal" className="mt-3 font-display text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[0.97] tracking-[-0.03em] text-balance">
              La conformité, <em className="italic font-semibold text-pink">par défaut.</em>
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {LEGAL.map((c) => (
              <StickerCard key={c.title} variant="panel" className="gap-3 p-6">
                <span className="grid size-11 place-items-center rounded-xl border-2 border-ink bg-ink text-paper" aria-hidden="true">
                  <c.icon className="size-5" />
                </span>
                <h3 className="font-display text-lg font-extrabold tracking-[-0.02em]">{c.title}</h3>
                <p className="text-[14px] leading-relaxed text-ink-2">{c.desc}</p>
              </StickerCard>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── TARIFS (migrés) ─────────── */}
      <section className="px-6 py-20" aria-labelledby="parents-pricing">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-10 max-w-2xl">
            <p className="eyebrow">Tarifs famille</p>
            <h2 id="parents-pricing" className="mt-3 font-display text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[0.97] tracking-[-0.03em] text-balance">
              Choisissez votre <em className="italic font-semibold text-pink">niveau de contrôle.</em>
            </h2>
            <p className="mt-4 max-w-xl text-base text-ink-2 sm:text-lg">
              Le contrôle parental est complet dès la formule gratuite. Les paliers payants ajoutent du confort,
              jamais de la sécurité en option. Sans engagement.
            </p>
          </div>
          <PricingGrid className="lg:grid-cols-4">
            {PLANS.map((plan) => (
              <PricingSticker
                key={plan.name}
                name={plan.name}
                price={plan.price}
                per="/mois"
                features={[...plan.features]}
                popular={plan.popular}
                niv={plan.popular ? "proud" : undefined}
                cta={{ label: plan.popular ? "Commencer gratuitement" : `Choisir ${plan.name}`, href: `/onboarding?role=parent&plan=${plan.plan}` }}
              />
            ))}
          </PricingGrid>
        </div>
      </section>

      {/* ─────────── RETOUR ─────────── */}
      <section className="px-6 pb-20">
        <div className="container mx-auto max-w-7xl">
          <Button asChild variant="ghost">
            <Link href="/">
              <ArrowLeft className="size-4" /> Retour à l'accueil
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
