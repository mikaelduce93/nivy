"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { TrustBanner } from "@/components/trust-banner"
import {
  Calendar,
  MapPin,
  ArrowRight,
  Eye,
  Flame,
  Zap,
  Plus,
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"
import { useT } from "@/lib/i18n"
import { StickerCard } from "@/components/ui/sticker-card"
import { StickerTabs } from "@/components/brand/sticker-tab"
import { Marquee } from "@/components/kit/marquee"
import { PhoneMockup, PhoneScreen } from "@/components/kit/phone-mockup"
import { PricingSticker, PricingGrid } from "@/components/sticker/pricing-sticker"
import { Niv, DarkSurface, OrbitingTokens, NivEmpty } from "@/components/brand"
import { Button } from "@/components/ui/button"

// Partenaires affichés dans la barre marquee (vitrine — noms illustratifs du handoff).
const PARTNERS = [
  "Padel Sqala",
  "Librairie Carrefour",
  "BookResto",
  "Sup'Cours",
  "Anfa Place",
  "Danse Fusion",
  "Café 7",
  "Skate Club Casa",
]

// Switcher 3 publics : contenu éditorial + écran téléphone correspondant.
const AUDIENCES = ["parent", "ado", "partenaire"] as const
type Audience = (typeof AUDIENCES)[number]

export default function HomePage() {
  const t = useT()
  const [audience, setAudience] = useState<Audience>("parent")
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  // Polish-F: track event-fetch lifecycle so the section can render a skeleton
  // (instead of a blank flash) and a non-blocking error banner on failure.
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventsError, setEventsError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function loadHomeData() {
      try {
        const supabase = createClient()
        const { data: events, error } = await supabase
          .from("events")
          .select("*")
          .gte("event_date", new Date().toISOString())
          .order("event_date")
          .limit(3)
        if (!active) return
        if (error) {
          // Polish-F: surface the failure instead of silently rendering an
          // empty grid (the original code masked RLS / network errors as a
          // permanently-empty "Aucun événement" state).
          console.error("[home] events fetch failed:", error)
          setEventsError("Impossible de charger les événements pour le moment.")
        } else if (events) {
          setUpcomingEvents(events)
        }
      } catch (err) {
        if (!active) return
        console.error("[home] events fetch threw:", err)
        setEventsError("Impossible de charger les événements pour le moment.")
      } finally {
        if (active) setEventsLoading(false)
      }
    }
    loadHomeData()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="min-h-screen bg-paper text-ink">
      <TrustBanner />

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="px-6 pb-20 pt-16" aria-label="Accueil">
        <div className="container mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
          {/* Colonne éditoriale */}
          <div className="text-center lg:text-left">
            {/* Pill statique charte (point lime + libellé mono UPPERCASE) */}
            <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-ink px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-paper">
              <span className="size-1.5 rounded-full bg-lime motion-safe:animate-pulse" aria-hidden="true" />
              <span>Le hub lifestyle des 13–17 ans</span>
            </span>

            <h1 className="font-display text-[clamp(2.75rem,7.4vw,5.375rem)] font-extrabold leading-[0.92] tracking-[-0.03em] text-balance">
              Le hub{" "}
              <span className="relative inline-block">
                lifestyle
                <svg
                  viewBox="0 0 100 8"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  className="absolute -bottom-1.5 left-[-4%] h-[18px] w-[108%] text-pink"
                >
                  <path
                    d="M2 5 Q 25 1, 50 5 T 98 5"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </span>{" "}
              des <em className="font-semibold italic text-pink">13&nbsp;–&nbsp;17&nbsp;ans.</em>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-2 sm:text-lg lg:mx-0">
              Sorties, sport, études, créativité, social, shopping.{" "}
              <b className="font-bold text-ink">Les ados gagnent en autonomie</b>, les parents gardent l'œil,
              les partenaires créent les expériences.
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Button asChild variant="pink" size="lg">
                <Link href="/onboarding" prefetch={true}>
                  {t("hero.ctaPrimary")} <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/agenda" prefetch={true}>
                  <Calendar className="size-4" /> {t("nav.agenda")}
                </Link>
              </Button>
            </div>

            <ul className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 font-mono text-[12.5px] tracking-[0.02em] text-mute lg:justify-start">
              {["13–17 ans uniquement", "Contrôle parental", "BAM-conforme", "CNDP 09-08"].map((claim) => (
                <li key={claim} className="inline-flex items-center gap-1.5">
                  <span className="grid size-3.5 place-items-center rounded-full bg-lime text-[9px] font-extrabold text-white" aria-hidden="true">
                    ✓
                  </span>
                  {claim}
                </li>
              ))}
            </ul>
          </div>

          {/* Niv + tokens orbitants (signature hero) */}
          <div className="hidden justify-center lg:flex">
            <OrbitingTokens
              nivMood="hype"
              size={420}
              xp="+ 2 480"
              coins="12 500"
              level="Lvl 7"
              streak="21 j"
            />
          </div>
        </div>
      </section>

      {/* ═══════════════ MARQUEE PARTENAIRES ═══════════════ */}
      <Marquee items={PARTNERS} aria-label="Nos partenaires" />

      {/* ═══════════════ 4 PILIERS ═══════════════ */}
      <section className="px-6 py-24" aria-labelledby="pillars-heading">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-12 max-w-2xl">
            <p className="eyebrow">L'écosystème lifestyle</p>
            <h2 id="pillars-heading" className="mt-3 font-display text-[clamp(2.25rem,5vw,3.625rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-balance">
              Tout ce qui fait <em className="italic font-semibold text-pink">une vie d'ado</em>. Au même endroit.
            </h2>
            <p className="mt-4 max-w-xl text-base text-ink-2 sm:text-lg">
              Chaque action devient une quête. Chaque effort rapporte des XP. Chaque sortie passe par tes coins.
              C'est ça, vivre dans l'app.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p, i) => (
              <StickerCard
                key={p.tag}
                variant="hover"
                style={{ background: `color-mix(in oklch, var(--${p.tint}) 22%, var(--paper))` }}
                className="relative min-h-[280px] justify-between overflow-hidden border-2 p-6"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-4 top-3 font-display text-[88px] font-extrabold leading-none tracking-[-0.1em] text-ink/10"
                >
                  {p.num}
                </span>
                <div className="relative">
                  <p className="mb-3 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-2">{p.tag}</p>
                  <h3 className="font-display text-[30px] font-extrabold leading-none tracking-[-0.04em]">{p.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-snug text-ink-2">{p.desc}</p>
                </div>
                <div className="relative flex flex-wrap gap-1.5">
                  {p.examples.map((ex) => (
                    <span key={ex} className="rounded-full bg-ink/10 px-2.5 py-1 font-mono text-[11px] font-semibold">{ex}</span>
                  ))}
                </div>
              </StickerCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ EXPÉRIENCES ═══════════════ */}
      <section className="px-6 py-24" aria-labelledby="experiences-heading">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-12 max-w-2xl">
            <p className="eyebrow">Ce qui t'attend</p>
            <h2 id="experiences-heading" className="mt-3 font-display text-[clamp(2.25rem,5vw,3.625rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-balance">
              Passe à <em className="italic font-semibold text-pink">l'action.</em>
            </h2>
            <p className="mt-4 max-w-xl text-base text-ink-2 sm:text-lg">
              Tu n'entres pas par un menu, tu entres par une envie. Choisis ton truc, ton crew suit.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {EXPERIENCES.map((xp) => (
              <StickerCard key={xp.title} variant="hover" className="justify-between gap-4 p-6">
                <div>
                  <span className="grid size-[46px] place-items-center rounded-[13px] bg-ink text-[22px] text-paper" aria-hidden="true">
                    {xp.icon}
                  </span>
                  <h3 className="mt-3.5 font-display text-2xl font-extrabold leading-tight tracking-[-0.03em]">{xp.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{xp.desc}</p>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link href={xp.href} prefetch={true}>
                    {xp.cta} <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </StickerCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ COMMENT ÇA TOURNE ═══════════════ */}
      <section className="border-y-2 border-ink bg-paper-2 px-6 py-24" aria-labelledby="how-heading">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-12 max-w-2xl">
            <p className="eyebrow">Comment ça tourne</p>
            <h2 id="how-heading" className="mt-3 font-display text-[clamp(2.25rem,5vw,3.625rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-balance">
              Trois mouvements. Une seule <em className="italic font-semibold text-pink">économie.</em>
            </h2>
            <p className="mt-4 max-w-xl text-base text-ink-2 sm:text-lg">
              Le parent finance, l'ado gagne et dépense, le partenaire encaisse — et 10 % du paiement revient en XP.
              La boucle de fidélité tourne toute seule.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {HOW_STEPS.map((s, i) => (
              <StickerCard key={s.title} className="relative gap-3.5 p-7">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-6 top-5 font-display text-[54px] font-extrabold leading-none tracking-[-0.05em] text-paper-2"
                >
                  0{i + 1}
                </span>
                <span className={`grid size-[46px] place-items-center rounded-[13px] text-[22px] text-white ${s.iconBg}`} aria-hidden="true">
                  {s.icon}
                </span>
                <h3 className="font-display text-2xl font-extrabold leading-tight tracking-[-0.03em]">{s.title}</h3>
                <p className="text-[14.5px] leading-relaxed text-ink-2">{s.desc}</p>
                <p className="flex flex-wrap items-center gap-2 rounded-xl bg-paper px-3.5 py-2.5 font-mono text-xs font-semibold text-ink">
                  {s.demo}
                </p>
              </StickerCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ DEUX MONNAIES (surface sombre) ═══════════════ */}
      <section className="px-6 py-24 bg-ink text-paper" aria-labelledby="curr-heading">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-12 max-w-2xl">
            <p className="eyebrow text-paper/50">Le cœur du système</p>
            <h2 id="curr-heading" className="mt-3 font-display text-[clamp(2.25rem,5vw,3.625rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-balance">
              Deux monnaies. Aucune <em className="italic font-semibold text-pink">conversion.</em>
            </h2>
            <p className="mt-4 max-w-xl text-base text-paper/70 sm:text-lg">
              L'XP récompense l'effort. Les coins paient les achats. Les deux ne se mélangent jamais —
              c'est ce qui empêche que tout devienne un casino.
            </p>
          </div>

          <div className="grid items-stretch gap-5 lg:grid-cols-[1fr_auto_1fr]">
            <div className="flex flex-col justify-between gap-4 rounded-2xl border-2 border-ink bg-night-2 p-8">
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-gold">XP · l'effort</p>
                <p className="mt-2 font-display text-[clamp(2.25rem,9vw,54px)] font-extrabold leading-none tracking-[-0.05em] tabular-nums">
                  2 480 <span className="ml-1 text-lg font-medium text-paper/60">niv. 7</span>
                </p>
                <p className="mt-3 text-sm text-paper/75">
                  Se gagne par les quiz, défis sport, anniversaires, tâches maison, notes scolaires.
                  Débloque skins, statuts, événements exclusifs.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 font-mono text-[11.5px] font-semibold">
                {["🧠 Quiz", "💪 Défis", "🎓 Notes", "🎂 Anniv", "⊙ Cashback"].map((g) => (
                  <span key={g} className="rounded-full border border-paper/15 bg-paper/5 px-3 py-1.5">{g}</span>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 text-center font-mono text-[11px] font-semibold tracking-[0.04em] text-paper/70">
              <ArrowRight className="size-9 rotate-90 text-lime lg:rotate-0" aria-hidden="true" />
              <span><b className="text-lime">Cashback 10 %</b><br />la seule passerelle</span>
            </div>

            <div className="flex flex-col justify-between gap-4 rounded-2xl border-2 border-ink bg-night-2 p-8">
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-coral">Coins · le pouvoir d'achat</p>
                <p className="mt-2 font-display text-[clamp(2.25rem,9vw,54px)] font-extrabold leading-none tracking-[-0.05em] tabular-nums">
                  12 500 <span className="ml-1 text-lg font-medium text-paper/60">≈ 125 DH</span>
                </p>
                <p className="mt-3 text-sm text-paper/75">
                  Adossés au dirham, gardés en escrow chez un partenaire e-money agréé BAM.
                  Se dépensent uniquement chez nos partenaires marocains.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 font-mono text-[11.5px] font-semibold">
                {["🛍 Boutiques", "🎟 Lieux", "⚽ Sport", "📚 Cours"].map((g) => (
                  <span key={g} className="rounded-full border border-paper/15 bg-paper/5 px-3 py-1.5">{g}</span>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-9 flex items-center gap-3.5 rounded-2xl border border-dashed border-pink/50 bg-pink/10 px-5 py-4 font-mono text-[13px] leading-relaxed text-pink-soft">
            <b className="shrink-0 font-bold text-pink">RÈGLE D'OR ·</b>
            Les XP ne se convertissent jamais en argent. Pas de jeu d'argent, pas de crypto.
            Conformité BAM &amp; CNDP loi 09-08.
          </p>
        </div>
      </section>

      {/* ═══════════════ SÉCURITÉ / CONFIANCE ═══════════════ */}
      <section className="border-y-2 border-ink bg-paper-2 px-6 py-24" aria-labelledby="trust-heading">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-12 max-w-2xl">
            <p className="eyebrow">Construit au Maroc</p>
            <h2 id="trust-heading" className="mt-3 font-display text-[clamp(2.25rem,5vw,3.625rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-balance">
              Vos données. Notre <em className="italic font-semibold text-pink">obsession.</em>
            </h2>
            <p className="mt-4 max-w-xl text-base text-ink-2 sm:text-lg">
              Nivy n'est pas une crypto, ni un jeu d'argent. C'est un produit financier marocain,
              conçu avec les bonnes lois en tête.
            </p>
          </div>

          <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-4">
            {TRUST_CARDS.map((c) => (
              <StickerCard key={c.title} variant="panel" className="gap-0 p-6">
                <span className="mb-3.5 grid size-[38px] place-items-center rounded-[11px] bg-ink text-lg text-paper" aria-hidden="true">
                  {c.icon}
                </span>
                <h4 className="font-display text-lg font-extrabold tracking-[-0.02em]">{c.title}</h4>
                <p className="mt-1.5 text-[13px] leading-snug text-mute">{c.desc}</p>
              </StickerCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ SWITCHER 3 PUBLICS ═══════════════ */}
      <section className="px-6 py-24" aria-labelledby="audience-heading">
        <div className="container mx-auto max-w-7xl">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="eyebrow">Trois personnes, une seule app</p>
            <h2 id="audience-heading" className="mt-3 font-display text-[clamp(2.25rem,5vw,3.625rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-balance">
              Choisis ton <em className="italic font-semibold text-pink">angle.</em>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-ink-2 sm:text-lg">
              Le produit reste le même. Ce que tu vois, ce que tu fais, change selon qui tu es.
            </p>
          </div>

          <div className="mb-9 flex justify-center">
            <StickerTabs
              ariaLabel="Choisir un public"
              value={audience}
              onValueChange={(v) => setAudience(v as Audience)}
              tabs={[
                { value: "parent", label: "Parent", icon: <Eye /> },
                { value: "ado", label: "Ado · 13-17", icon: <Flame /> },
                { value: "partenaire", label: "Partenaire", icon: <Zap /> },
              ]}
            />
          </div>

          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Colonne info */}
            <div>
              {audience === "parent" && (
                <AudienceInfo
                  title={<>L'autonomie de ton ado, <em className="italic font-semibold text-pink">sans le stress</em>.</>}
                  lead="Recharge en DH, fixe les plafonds, valide ou laisse faire. Tu vois tout, tu choisis tout — et tu n'es plus le DAB de la maison."
                  features={[
                    { icon: "🎚", title: "Plafonds par enfant", desc: "Par transaction · jour · mois" },
                    { icon: "🏠", title: "Tâches maison", desc: "« Vaisselle 5 jours = 100 DH »" },
                    { icon: "📊", title: "Historique tracé", desc: "Audit 7 ans · catégorisé" },
                    { icon: "👥", title: "Multi-parent", desc: "Le 1er qui valide gagne" },
                  ]}
                  primary={{ label: "Créer un compte parent", href: "/auth/sign-up" }}
                  secondary={{ label: "Voir le guide parents", href: "/guide-parents" }}
                />
              )}
              {audience === "ado" && (
                <AudienceInfo
                  title={<>Ton argent. Tes choix. <em className="italic font-semibold text-pink">Tes preuves.</em></>}
                  lead="Plus besoin de quémander 50 DH. Tu as ton solde, ton coach Niv qui te connaît, des défis qui paient, un crew, un statut. Chaque effort compte — même IRL."
                  features={[
                    { icon: "🐼", title: "Niv, ton coach", desc: "5 humeurs · adapté à ton rythme" },
                    { icon: "🧠", title: "Quiz à ton bac", desc: "Public · mission FR · British · IB" },
                    { icon: "🤝", title: "Amis · Cercles · Crews", desc: "Joue en équipe, défie d'autres" },
                    { icon: "🎂", title: "Anniv = +500 XP", desc: "Tes potes peuvent t'envoyer des vœux" },
                  ]}
                  primary={{ label: "Rejoindre Nivy", href: "/onboarding" }}
                  secondary={{ label: "Voir l'agenda", href: "/agenda" }}
                />
              )}
              {audience === "partenaire" && (
                <AudienceInfo
                  title={<>Une clientèle ado <em className="italic font-semibold text-pink">fidèle</em>. Qu'on t'amène.</>}
                  lead="Quatre formules selon ton activité. Tu paies une commission par vente, jamais d'abonnement. Le cashback fait revenir tes clients — c'est tout l'intérêt."
                  features={[
                    { icon: "🛍", title: "Retail · 8 %", desc: "Mode, beauté, e-shops" },
                    { icon: "🎟", title: "Venue · 10 %", desc: "Cafés, ciné, escape games" },
                    { icon: "⚽", title: "Club · 12 %", desc: "Padel, danse, musique, scout" },
                    { icon: "📚", title: "Éducation · 15 %", desc: "Soutien, tutorat, langues" },
                  ]}
                  primary={{ label: "Devenir partenaire", href: "/devenir-partenaire" }}
                  secondary={{ label: "Calculer mon ROI", href: "/devenir-partenaire" }}
                />
              )}
            </div>

            {/* Écran téléphone */}
            <div className="flex justify-center overflow-hidden">
              <PhoneMockup>
                <PhoneScreen>
                  <div className="h-full overflow-hidden px-[18px] pb-[18px] pt-[50px]">
                    {audience === "parent" && <ParentScreen />}
                    {audience === "ado" && <AdoScreen />}
                    {audience === "partenaire" && <PartnerScreen />}
                  </div>
                </PhoneScreen>
              </PhoneMockup>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ TARIFS ═══════════════ */}
      <section className="px-6 py-24" aria-labelledby="pricing-heading">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-12 max-w-2xl">
            <p className="eyebrow">Tarifs famille</p>
            <h2 id="pricing-heading" className="mt-3 font-display text-[clamp(2.25rem,5vw,3.625rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-balance">
              Plus tu donnes, plus tu <em className="italic font-semibold text-pink">économises.</em>
            </h2>
            <p className="mt-4 max-w-xl text-base text-ink-2 sm:text-lg">
              Quatre paliers, des remises sur chaque recharge, zéro engagement. Free reste gratuit pour toujours.
            </p>
          </div>

          <PricingGrid className="lg:grid-cols-4">
            {PRICING_PLANS.map((plan) => (
              <PricingSticker
                key={plan.name}
                name={plan.name}
                price={plan.price}
                per="/mois"
                features={[...plan.features]}
                popular={plan.popular}
                niv={plan.popular ? "proud" : undefined}
                cta={{ label: plan.cta, href: "/auth/sign-up" }}
              />
            ))}
          </PricingGrid>
        </div>
      </section>

      {/* ═══════════════ TÉMOIGNAGES (bêta) ═══════════════ */}
      <section className="px-6 py-24" aria-labelledby="testi-heading">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-12 max-w-2xl">
            <p className="eyebrow">Bêta · 200 familles · Casa &amp; Rabat</p>
            <h2 id="testi-heading" className="mt-3 font-display text-[clamp(2.25rem,5vw,3.625rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-balance">
              Ce qu'ils <em className="italic font-semibold text-pink">en disent</em>.
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((tst, i) => (
              <StickerCard
                key={tst.name}
                className={`relative gap-4 p-6 ${TESTI_TILT[i]}`}
              >
                <span className="absolute right-5 top-5 text-sm tracking-[1px] text-gold" aria-hidden="true">★★★★★</span>
                <p className="flex-1 font-display text-lg font-semibold leading-snug tracking-[-0.01em] text-balance">
                  {tst.quote}
                </p>
                <div className="flex items-center gap-3 border-t border-dashed border-line pt-3.5">
                  <span className={`grid size-[42px] place-items-center rounded-full border-2 border-ink text-sm font-extrabold text-white ${tst.avBg}`} aria-hidden="true">
                    {tst.initial}
                  </span>
                  <div className="text-[12.5px] leading-tight">
                    <b className="block font-bold">{tst.name}</b>
                    <span className="text-[11.5px] text-mute">{tst.role}</span>
                  </div>
                </div>
              </StickerCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ FAQ ═══════════════ */}
      <section className="px-6 py-24" aria-labelledby="faq-heading">
        <div className="container mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="eyebrow">Questions fréquentes</p>
            <h2 id="faq-heading" className="mt-3 font-display text-[clamp(2.25rem,5vw,3.625rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-balance">
              On vous <em className="italic font-semibold text-pink">répond.</em>
            </h2>
          </div>

          <div className="mx-auto max-w-3xl">
            {FAQ.map((item, i) => {
              const open = openFaq === i
              return (
                <div key={item.q} className="mb-2.5 overflow-hidden rounded-2xl border-2 border-ink bg-white shadow-stkr-sm">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left font-display text-lg font-bold leading-snug tracking-[-0.02em]"
                  >
                    {item.q}
                    <span
                      className={`grid size-[30px] shrink-0 place-items-center rounded-full border-2 border-ink text-lg font-bold transition-all ${open ? "rotate-45 bg-ink text-paper" : "text-ink"}`}
                      aria-hidden="true"
                    >
                      <Plus className="size-4" />
                    </span>
                  </button>
                  {open && (
                    <p className="px-5 pb-5 text-[15px] leading-relaxed text-ink-2">{item.a}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════ EVENTS ═══════════════ */}
      <section className="border-y-2 border-ink bg-paper-2 px-6 py-20" aria-labelledby="events-heading">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-12 flex flex-col items-end justify-between gap-4 md:flex-row">
            <div>
              <p className="eyebrow">Agenda</p>
              <h2 id="events-heading" className="mt-3 font-display text-4xl font-extrabold tracking-[-0.04em] text-balance">
                Events à venir
              </h2>
              <p className="mt-1.5 text-mute">Ne rate pas les prochaines dates</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/agenda">
                Tout voir <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          {eventsError && (
            <div
              role="alert"
              className="mb-6 rounded-2xl border-2 border-ink bg-coral/15 px-4 py-3 text-sm font-medium text-ink"
            >
              {eventsError}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-3">
            {eventsLoading ? (
              // Polish-F: skeleton placeholders while the client fetch resolves.
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={`evt-skel-${i}`}
                  aria-hidden="true"
                  className="h-72 rounded-2xl border-2 border-ink bg-white shadow-stkr-sm motion-safe:animate-pulse"
                />
              ))
            ) : upcomingEvents.length > 0 ? (
              upcomingEvents.slice(0, 3).map((event) => (
                <StickerCard key={event.id} variant="hover" className="h-full overflow-hidden">
                  <div className="relative h-56">
                    <Image
                      src={event.image_url || "/nightclub-confetti-celebration-crowd.jpg"}
                      alt={event.title}
                      fill
                      className="object-cover"
                    />
                    <span className="absolute right-3 top-3 rounded-lg border-2 border-ink bg-pink px-2.5 py-1 font-mono text-[11px] font-bold text-ink">
                      J-{Math.max(0, Math.floor((new Date(event.event_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-lg font-extrabold leading-tight tracking-[-0.02em]">{event.title}</h3>
                    <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[12px] text-mute">
                      <MapPin className="size-3.5 text-pink" />
                      {event.city || "Casablanca"}
                    </div>
                    <Button asChild variant="pink" className="mt-4 w-full">
                      <Link href={`/agenda/${event.id}`} prefetch={true}>Réserver</Link>
                    </Button>
                  </div>
                </StickerCard>
              ))
            ) : (
              <div className="md:col-span-3">
                <NivEmpty
                  title="Aucun événement programmé"
                  description="Reviens vite : les prochaines dates arrivent. En attendant, explore l'agenda complet."
                  action={
                    <Button asChild variant="pink">
                      <Link href="/agenda">Voir l'agenda</Link>
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════ CTA FINAL (surface sombre) ═══════════════ */}
      <section className="px-6 py-24" aria-labelledby="cta-heading">
        <div className="container mx-auto max-w-5xl">
          <DarkSurface tone="pink" shadow className="px-6 py-16 text-center sm:px-12">
            <div className="mx-auto max-w-2xl">
              <Niv mood="proud" float size={120} className="mb-2" />
              <h2 id="cta-heading" className="font-display text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[0.95] tracking-[-0.05em] text-balance">
                Prêt·e à <em className="italic font-semibold text-pink">level up</em> ?
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-base text-paper/75 sm:text-lg">
                Une famille, deux monnaies, zéro galère. Inscris-toi en 60 secondes — l'app est gratuite,
                et tu restes maître de tout.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild variant="pink" size="lg">
                  <Link href="/auth/sign-up" prefetch={true}>
                    Créer mon profil <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-paper text-paper hover:shadow-stkr-pink">
                  <Link href="/a-propos" prefetch={true}>En savoir plus</Link>
                </Button>
              </div>
              <p className="mt-6 font-mono text-[12.5px] uppercase tracking-[0.1em] text-paper/50">
                Parent ou ado · même inscription · bientôt sur l'App Store
              </p>
            </div>
          </DarkSurface>
        </div>
      </section>
    </div>
  )
}

/* ════════════════════════ DONNÉES VITRINE (statiques) ════════════════════════ */

const PILLARS = [
  {
    num: "01",
    tag: "Glow Up",
    title: "Sport & bien-être",
    desc: "Padel, danse, yoga, salle, scout. Tes coachs certifient tes séances et te filent des XP en vrai.",
    examples: ["Padel", "Danse", "Yoga", "Salle", "Scout"],
    tint: "gold",
  },
  {
    num: "02",
    tag: "Big Brain",
    title: "Études & quiz",
    desc: "Public, mission FR, British, IB. Quiz du jour adapté à ton bac et à ta langue. Soutien et CPGE inclus.",
    examples: ["Quiz", "Soutien", "CPGE", "Langues", "Mentor"],
    tint: "lime",
  },
  {
    num: "03",
    tag: "Self-Express",
    title: "Création & style",
    desc: "Marketplace C2C, mode & beauté, ateliers musique, photo, design. Tu vends, tu shoppes, tu crées.",
    examples: ["Marketplace", "Mode", "Musique", "Photo", "Design"],
    tint: "pink",
  },
  {
    num: "04",
    tag: "Main Character",
    title: "Sorties & crew",
    desc: "Cafés, escape games, ciné, anniversaires, événements partenaires. Avec ton crew, jamais seul.",
    examples: ["Cafés", "Ciné", "Escape", "Anniv", "Events"],
    tint: "coral",
  },
] as const

const EXPERIENCES = [
  {
    icon: "🎟",
    title: "Sorties & agenda",
    desc: "Les prochaines dates près de chez toi. Cafés, ciné, events partenaires — tu repères, tu réserves.",
    cta: "Voir l'agenda",
    href: "/agenda",
  },
  {
    icon: "⚽",
    title: "Sport & clubs",
    desc: "Padel, danse, salle, scout. Trouve ton club, certifie tes séances, gagne des XP en vrai.",
    cta: "Explorer les clubs",
    href: "/clubs",
  },
  {
    icon: "🤝",
    title: "Le collectif",
    desc: "Commandes groupées avec ton crew : chacun paie sa part, ça se débloque quand vous êtes assez.",
    cta: "Lancer un plan",
    href: "/agenda",
  },
] as const

const HOW_STEPS = [
  {
    icon: "💳",
    iconBg: "bg-teal",
    title: "Le parent recharge en DH",
    desc: "Cash Plus, M2T, Wafacash ou carte bancaire. 1 DH = 100 coins, gardés en escrow chez un partenaire e-money agréé BAM.",
    demo: <>+50 DH <b className="font-extrabold">→</b> 5 000 ⊙ <span className="text-mute">· escrow</span></>,
  },
  {
    icon: "⚡",
    iconBg: "bg-pink",
    title: "L'ado joue, gagne, dépense",
    desc: "Quiz adapté à son école, défis sport, tâches maison validées par les parents. Niv suit, conseille, célèbre.",
    demo: <>Quiz du jour ✓ <b className="font-extrabold text-gold">+50 XP</b> <span className="text-mute">· niv. 7</span></>,
  },
  {
    icon: "🎯",
    iconBg: "bg-coral",
    title: "Le partenaire encaisse",
    desc: "QR scanné, transaction validée, payout sous 7 jours. Le client repart avec du cashback en XP — et il revient.",
    demo: <>−120 ⊙ <b className="font-extrabold text-gold">+12 XP cashback</b></>,
  },
] as const

const PRICING_PLANS = [
  { name: "Free", price: "0 DH", popular: false, cta: "Commencer", features: ["1 enfant lié", "Plafonds & validation", "Historique 90 jours", "Notifications standard"] },
  { name: "Silver", price: "29 DH", popular: false, cta: "Choisir Silver", features: ["3 enfants", "Push prioritaires", "Historique 1 an", "Co-parent inclus"] },
  { name: "Gold", price: "79 DH", popular: true, cta: "Choisir Gold", features: ["5 enfants", "Aide scolaire incluse", "Skins exclusifs Niv", "Mode autonome avancé"] },
  { name: "Platinum", price: "149 DH", popular: false, cta: "Choisir Platinum", features: ["Enfants illimités", "Mentor & coach dédié", "Anniversaires premium", "Conciergerie WhatsApp"] },
] as const

const TRUST_CARDS = [
  { icon: "🏦", title: "BAM-conforme", desc: "Coins en escrow chez un partenaire e-money agréé. Aucune crypto." },
  { icon: "🛡", title: "CNDP loi 09-08", desc: "CIN privée, signed URLs 5 min, droit d'effacement." },
  { icon: "📒", title: "Audit 7 ans", desc: "Comptabilité marocaine. Toute action admin tracée." },
  { icon: "🌙", title: "Quiet hours", desc: "Aucune notif entre 22 h et 7 h. Ni à toi, ni à ton ado." },
] as const

const TESTIMONIALS = [
  { quote: "« On ne se dispute plus pour 50 DH. Je vois où ça part, il a sa liberté. C'est exactement ce qu'il manquait. »", name: "Khadija B.", role: "Maman de 2 ados · Casa", initial: "K", avBg: "bg-teal" },
  { quote: "« J'ai gagné 1 200 XP en deux semaines juste avec les quiz. Et avec mes coins j'ai pris ma première heure de padel sans demander. »", name: "Amine M.", role: "15 ans · 1ère bac · Rabat", initial: "A", avBg: "bg-pink" },
  { quote: "« 35 nouveaux clients ados en 6 semaines, et la moitié sont revenus. Le QR scanner m'a pris 3 minutes à comprendre. »", name: "Yousra K.", role: "Librairie Carrefour · Casa", initial: "Y", avBg: "bg-coral" },
] as const

const TESTI_TILT = ["-rotate-1", "rotate-1", "-rotate-[0.5deg]"] as const

const FAQ = [
  {
    q: "Mon ado peut-il convertir des XP en argent ?",
    a: "Non, jamais. Les XP récompensent l'effort et débloquent du statut, des skins, des événements. Les coins, eux, sont adossés au dirham en escrow et se dépensent uniquement chez nos partenaires. Les deux ne se mélangent jamais — c'est volontaire.",
  },
  {
    q: "Que se passe-t-il si je supprime le compte ?",
    a: "Les coins non dépensés sont remboursés en DH sur votre moyen de paiement initial sous 30 jours. Les données personnelles sont anonymisées (CNDP loi 09-08, droit à l'oubli). Les écritures comptables sont conservées 7 ans, comme l'exige la loi marocaine.",
  },
  {
    q: "Combien ça coûte vraiment ?",
    a: "Free à vie : 0 DH. Silver 29, Gold 79, Platinum 149 DH/mois — chacun avec −2 / −5 / −8 % sur vos recharges. Aucun frais caché sur les transactions. Les partenaires paient une commission, pas vous.",
  },
  {
    q: "Mon ado peut-il dépenser sans mon accord ?",
    a: "Vous choisissez. Mode autonome avec plafonds (par transaction · jour · mois) ou validation systématique. Au-dessus du plafond, vous recevez une push : 1 tap pour approuver. Si vous êtes deux parents, le premier qui répond valide.",
  },
  {
    q: "C'est légal au Maroc ?",
    a: "Oui. Les coins sont une balance comptable adossée à des dirhams gardés en escrow chez un partenaire e-money agréé BAM (Cash Plus / Wafacash / M2T). Pas de crypto (illégale au Maroc). CNDP loi 09-08 sur les données. Audit comptable 7 ans.",
  },
  {
    q: "Comment devient-on partenaire ?",
    a: "Inscription en ligne, KYC sous 48h, premier QR scanner activé sous 7 jours. Quatre formules selon l'activité (retail 8 %, venue 10 %, club 12 %, éducation 15 %). Aucun abonnement, juste une commission par vente.",
  },
] as const

/* ════════════════════════ SOUS-COMPOSANTS PRÉSENTATIONNELS ════════════════════════ */

interface AudienceFeature {
  icon: string
  title: string
  desc: string
}
interface AudienceCta {
  label: string
  href: string
}

function AudienceInfo({
  title,
  lead,
  features,
  primary,
  secondary,
}: {
  title: React.ReactNode
  lead: string
  features: AudienceFeature[]
  primary: AudienceCta
  secondary: AudienceCta
}) {
  return (
    <div>
      <h3 className="font-display text-[clamp(1.875rem,4vw,2.875rem)] font-extrabold leading-none tracking-[-0.04em] text-balance">
        {title}
      </h3>
      <p className="mt-4 max-w-xl text-base text-ink-2 sm:text-lg">{lead}</p>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {features.map((f) => (
          <StickerCard key={f.title} variant="hover" className="gap-1.5 p-4">
            <span className="grid size-[34px] place-items-center rounded-[9px] bg-ink text-base text-white" aria-hidden="true">
              {f.icon}
            </span>
            <h4 className="font-bold leading-tight tracking-[-0.01em] text-[14.5px]">{f.title}</h4>
            <p className="text-[12.5px] leading-snug text-mute">{f.desc}</p>
          </StickerCard>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="pink">
          <Link href={primary.href}>{primary.label}</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href={secondary.href}>
            {secondary.label} <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

/* ── Écrans téléphone (UI vitrine illustrative, valeurs statiques du handoff) ── */

function ParentScreen() {
  return (
    <>
      <div className="mb-3.5 flex items-center justify-between">
        <div className="font-display text-[22px] font-bold leading-none tracking-[-0.02em]">
          <small className="mb-0.5 block font-sans text-[11px] font-medium text-mute">Bonjour</small>
          Khadija
        </div>
        <span className="grid size-[38px] place-items-center rounded-full bg-teal text-sm font-bold text-white" aria-hidden="true">K</span>
      </div>
      <div className="mb-2.5 rounded-2xl bg-ink p-4 text-paper">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-paper/65">Solde famille</p>
        <p className="my-1 font-display text-[34px] font-extrabold leading-none tracking-[-0.04em]">
          285 <span className="text-sm font-medium text-paper/75">DH</span>
        </p>
        <p className="text-[11px] text-paper/75">28 500 coins · escrow Cash Plus</p>
      </div>
      <ScreenKid avBg="bg-pink" initial="A" name="Amine, 15 ans" meta="Niv. 7 · 2 480 XP" bal="12 500 ⊙" sub="autonome" />
      <ScreenKid avBg="bg-coral" initial="Y" name="Yasmine, 13 ans" meta="Niv. 4 · 950 XP" bal="16 000 ⊙" sub="validation" />
      <div className="mt-2.5 rounded-2xl border-2 border-gold bg-gold/20 p-3">
        <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ink-2">
          <span>● Demande</span><span>il y a 2 min</span>
        </div>
        <p className="mb-2 text-[13px] font-semibold leading-snug">Yasmine veut acheter un livre à <b>45 DH</b> chez Librairie Carrefour</p>
        <div className="flex gap-1.5">
          <span className="flex-1 rounded-lg bg-ink py-2 text-center text-[11.5px] font-bold text-paper">Approuver</span>
          <span className="flex-1 rounded-lg border-2 border-ink-2 py-2 text-center text-[11.5px] font-bold text-ink-2">Refuser</span>
        </div>
      </div>
    </>
  )
}

function AdoScreen() {
  return (
    <>
      <div className="mb-3.5 flex items-center justify-between">
        <div className="font-display text-[22px] font-bold leading-none tracking-[-0.02em]">
          <small className="mb-0.5 block font-sans text-[11px] font-medium text-mute">Salam</small>
          Amine
        </div>
        <span className="grid size-[38px] place-items-center rounded-full bg-pink text-sm font-bold text-white" aria-hidden="true">A</span>
      </div>
      <div className="mb-2.5 flex items-center gap-2.5 rounded-2xl bg-night-2 p-3.5 text-paper">
        <Niv mood="happy" size={42} className="shrink-0" />
        <p className="text-[12px] leading-snug">
          <b className="mb-0.5 block text-[11px] font-bold text-gold">Niv · 8h42</b>
          Quiz d'histoire en 4 questions ce matin — t'es chaud ?
        </p>
      </div>
      <div className="mb-2.5 grid grid-cols-2 gap-1.5">
        <ScreenStat label="XP · Niv 7" value="2 480" valueColor="text-gold" barColor="bg-gold" barW="w-[62%]" />
        <ScreenStat label="Coins" value="12 500" valueColor="text-coral" barColor="bg-coral" barW="w-[38%]" />
      </div>
      <ScreenQuest emoji="🧠" title="Quiz d'histoire 1ère bac" meta="Quotidien · expire à 23h59" reward="+50 XP" rewardColor="text-gold" />
      <ScreenQuest emoji="💪" title="Padel avec ton crew" meta="Hebdo · 2/3 séances" reward="+250 XP" rewardColor="text-gold" />
      <ScreenQuest emoji="🏠" title="Vaisselle 5 jours" meta="Maman · 3/5 jours" reward="+100 DH" rewardColor="text-lime" />
    </>
  )
}

function PartnerScreen() {
  return (
    <>
      <div className="mb-3.5 flex items-center justify-between">
        <div className="font-display text-[22px] font-bold leading-none tracking-[-0.02em]">
          <small className="mb-0.5 block font-sans text-[11px] font-medium text-mute">Padel</small>
          Sqala
        </div>
        <span className="grid size-[38px] place-items-center rounded-full bg-coral text-sm font-bold text-white" aria-hidden="true">P</span>
      </div>
      <div className="mb-2.5 rounded-2xl bg-ink p-4 text-center text-paper">
        <span className="mx-auto mb-2.5 block size-[110px] rounded-xl border-4 border-white bg-[repeating-conic-gradient(#fff_0_25%,#000_0_50%)] bg-[length:18px_18px]" aria-hidden="true" />
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-paper/75">Scanner ouvert</p>
        <p className="my-1 font-display text-2xl font-extrabold tracking-[-0.03em]">−120 ⊙</p>
        <p className="text-[11px] text-paper/75">Amine M. · Pack 1h padel</p>
      </div>
      <div className="mb-2.5 rounded-2xl border-2 border-ink bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-mute">Aujourd'hui</span>
          <span className="font-display text-xl font-extrabold tracking-[-0.02em] text-lime">847 DH</span>
        </div>
        {[
          ["14:20 · Amine M.", "120 ⊙"],
          ["13:45 · Sara B.", "200 ⊙"],
          ["12:10 · Crew Anfa", "450 ⊙"],
          ["11:30 · Mehdi K.", "77 ⊙"],
        ].map(([who, vv]) => (
          <div key={who} className="flex justify-between border-b border-dashed border-line py-1 text-[11.5px] last:border-0">
            <span className="text-ink-2">{who}</span>
            <span className="font-mono font-bold">{vv}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl border-2 border-lime bg-lime/15 px-3 py-2.5 font-mono text-[11.5px] font-semibold text-ink">
        <b>+12 % nouveaux clients</b> ce mois · payout vendredi
      </div>
    </>
  )
}

function ScreenKid({ avBg, initial, name, meta, bal, sub }: { avBg: string; initial: string; name: string; meta: string; bal: string; sub: string }) {
  return (
    <div className="mb-1.5 flex items-center gap-2.5 rounded-xl border border-line bg-white p-2.5">
      <span className={`grid size-8 place-items-center rounded-full text-xs font-bold text-white ${avBg}`} aria-hidden="true">{initial}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold leading-tight">{name}</p>
        <p className="mt-0.5 text-[10.5px] text-mute">{meta}</p>
      </div>
      <div className="text-right font-mono text-[11.5px] font-bold leading-tight">
        {bal}<small className="block font-medium text-[9px] text-mute">{sub}</small>
      </div>
    </div>
  )
}

function ScreenStat({ label, value, valueColor, barColor, barW }: { label: string; value: string; valueColor: string; barColor: string; barW: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-2.5">
      <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-mute">{label}</p>
      <p className={`mt-1 font-display text-xl font-extrabold leading-none tracking-[-0.02em] ${valueColor}`}>{value}</p>
      <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-paper-2" aria-hidden="true">
        <span className={`block h-full rounded-full ${barColor} ${barW}`} />
      </span>
    </div>
  )
}

function ScreenQuest({ emoji, title, meta, reward, rewardColor }: { emoji: string; title: string; meta: string; reward: string; rewardColor: string }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2.5 rounded-xl border border-line bg-white p-2.5">
      <span className="text-lg" aria-hidden="true">{emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold leading-tight">{title}</p>
        <p className="mt-0.5 text-[10px] text-mute">{meta}</p>
      </div>
      <span className={`whitespace-nowrap font-mono text-[10px] font-bold ${rewardColor}`}>{reward}</span>
    </div>
  )
}
