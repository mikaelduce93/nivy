import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  ArrowLeft,
  Store,
  Building2,
  Dumbbell,
  GraduationCap,
  Repeat,
  Target,
  ShieldCheck,
  CalendarClock,
  FileCheck2,
  Tag,
  QrCode,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCoach } from "@/components/brand/niv-usage"

export const metadata: Metadata = {
  title: "Partenaires — une clientèle ado fidèle",
  description:
    "Rejoignez Nivy : commission par vente, jamais d'abonnement. Quatre formules par activité (retail, lieux, clubs, éducation), KYC en 48 h, payout sous 7 jours. Le cashback fait revenir vos clients.",
}

// #287 — landing partenaire publique. Sort le B2B de la home grand public.
// La candidature reste portée par le funnel existant /devenir-partenaire.

const FORMULES = [
  {
    icon: Store,
    title: "Retail",
    rate: "8 %",
    desc: "Mode, beauté, librairies, e-shops. Vos produits dans la boutique de toute une génération.",
  },
  {
    icon: Building2,
    title: "Lieux",
    rate: "10 %",
    desc: "Cafés, ciné, escape games, espaces événementiels. Réservations et entrées payées dans l'app.",
  },
  {
    icon: Dumbbell,
    title: "Clubs",
    rate: "12 %",
    desc: "Padel, danse, musique, scout, fitness. Séances et adhésions, certifiées et rémunérées en XP.",
  },
  {
    icon: GraduationCap,
    title: "Éducation",
    rate: "15 %",
    desc: "Soutien, tutorat, langues, prépa. Des familles qui cherchent exactement ce que vous proposez.",
  },
] as const

// ROI honnête : bénéfices qualitatifs, sans chiffre inventé.
const WHY = [
  {
    icon: Repeat,
    title: "Le cashback fait revenir",
    desc: "Chaque achat reverse une part en XP au client. Il revient pour en profiter — c'est tout l'intérêt du modèle.",
  },
  {
    icon: Target,
    title: "Une cible précise",
    desc: "Vous touchez les 13–17 ans et leurs parents, là où ils décident déjà de leurs sorties et de leurs achats.",
  },
  {
    icon: ShieldCheck,
    title: "Des paiements encadrés",
    desc: "Transactions adossées au dirham, conformes au cadre BAM. Pas de crypto, pas d'impayés.",
  },
  {
    icon: CalendarClock,
    title: "Payout sous 7 jours",
    desc: "Commission par vente, jamais d'abonnement. Vous êtes réglé rapidement, sans frais cachés.",
  },
] as const

const STEPS = [
  {
    icon: FileCheck2,
    title: "Candidature en ligne",
    desc: "Vous décrivez votre activité et choisissez votre formule. Quelques minutes suffisent.",
  },
  {
    icon: ShieldCheck,
    title: "KYC sous 48 h",
    desc: "Vérification d'identité et des documents de l'établissement, transmise à notre équipe d'approbation.",
  },
  {
    icon: Tag,
    title: "Première offre",
    desc: "Vous créez votre première offre ou réservation, visible par la communauté.",
  },
  {
    icon: QrCode,
    title: "Scanner activé",
    desc: "Votre QR scanner est prêt sous 7 jours : un scan valide la vente, le client repart avec son cashback.",
  },
] as const

export default function PartenairesPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* ─────────── HERO ─────────── */}
      <section className="px-6 pb-16 pt-20" aria-labelledby="partners-hero">
        <div className="container mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="eyebrow">Espace partenaires</p>
            <h1
              id="partners-hero"
              className="mt-3 font-display text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-balance"
            >
              Une clientèle ado <em className="italic font-semibold text-pink">fidèle.</em> Qu'on vous amène.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-2 sm:text-lg">
              Commission par vente, jamais d'abonnement. Vous rejoignez l'écosystème lifestyle des 13–17 ans
              au Maroc et le cashback ramène vos clients tout seul.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant="pink" size="lg">
                <Link href="/devenir-partenaire">
                  Devenir partenaire <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex justify-center">
            <NivCoach
              mood="hype"
              className="w-full max-w-sm"
              message={
                <>
                  Vos offres atterrissent devant des milliers d'ados motivés — et leurs parents valident
                  les dépenses en un geste. On s'occupe du reste.
                </>
              }
            />
          </div>
        </div>
      </section>

      {/* ─────────── FORMULES ─────────── */}
      <section className="border-y-2 border-ink bg-paper-2 px-6 py-20" aria-labelledby="partners-formules">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-10 max-w-2xl">
            <p className="eyebrow">Quatre formules</p>
            <h2 id="partners-formules" className="mt-3 font-display text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[0.97] tracking-[-0.03em] text-balance">
              Une commission par <em className="italic font-semibold text-pink">activité.</em>
            </h2>
            <p className="mt-4 max-w-xl text-base text-ink-2 sm:text-lg">
              Vous ne payez que sur les ventes réalisées via Nivy. Le taux dépend de votre activité.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {FORMULES.map((f) => (
              <StickerCard key={f.title} variant="hover" className="justify-between gap-4 p-6">
                <div>
                  <span className="grid size-11 place-items-center rounded-xl border-2 border-ink bg-ink text-paper" aria-hidden="true">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="mt-3.5 font-display text-2xl font-extrabold leading-none tracking-[-0.03em]">{f.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{f.desc}</p>
                </div>
                <p className="font-mono text-[13px] font-bold text-ink">
                  <span className="text-coral">{f.rate}</span> par vente
                </p>
              </StickerCard>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── POURQUOI NIVY ─────────── */}
      <section className="px-6 py-20" aria-labelledby="partners-why">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-10 max-w-2xl">
            <p className="eyebrow">Pourquoi Nivy</p>
            <h2 id="partners-why" className="mt-3 font-display text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[0.97] tracking-[-0.03em] text-balance">
              Un modèle qui <em className="italic font-semibold text-pink">vous fait revenir des clients.</em>
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {WHY.map((c) => (
              <StickerCard key={c.title} variant="panel" className="gap-3 p-6">
                <span className="grid size-11 place-items-center rounded-xl border-2 border-ink bg-lime text-ink" aria-hidden="true">
                  <c.icon className="size-5" />
                </span>
                <h3 className="font-display text-lg font-extrabold tracking-[-0.02em]">{c.title}</h3>
                <p className="text-[13.5px] leading-relaxed text-ink-2">{c.desc}</p>
              </StickerCard>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── PROCESSUS KYC ─────────── */}
      <section className="border-y-2 border-ink bg-paper-2 px-6 py-20" aria-labelledby="partners-steps">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-10 max-w-2xl">
            <p className="eyebrow">Comment ça démarre</p>
            <h2 id="partners-steps" className="mt-3 font-display text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[0.97] tracking-[-0.03em] text-balance">
              De la candidature au <em className="italic font-semibold text-pink">premier scan.</em>
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <StickerCard key={s.title} className="relative gap-3 p-6">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-5 top-4 font-display text-[48px] font-extrabold leading-none tracking-[-0.05em] text-paper-2"
                >
                  0{i + 1}
                </span>
                <span className="grid size-11 place-items-center rounded-xl border-2 border-ink bg-pink text-white" aria-hidden="true">
                  <s.icon className="size-5" />
                </span>
                <h3 className="font-display text-lg font-extrabold tracking-[-0.02em]">{s.title}</h3>
                <p className="text-[13.5px] leading-relaxed text-ink-2">{s.desc}</p>
              </StickerCard>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── CTA ─────────── */}
      <section className="px-6 py-20" aria-labelledby="partners-cta">
        <div className="container mx-auto flex max-w-5xl flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="partners-cta" className="font-display text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold leading-[0.97] tracking-[-0.03em] text-balance">
              Prêt à accueillir leur génération ?
            </h2>
            <p className="mt-2 text-base text-ink-2">Candidature en ligne, sans engagement. Vous gardez le contrôle de vos offres.</p>
          </div>
          <Button asChild variant="pink" size="lg">
            <Link href="/devenir-partenaire">
              Déposer ma candidature <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ─────────── RETOUR ─────────── */}
      <section className="px-6 pb-20">
        <div className="container mx-auto max-w-5xl">
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
