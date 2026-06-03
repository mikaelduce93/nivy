"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
  MapPin,
  ArrowRight,
  Plus,
  Wallet,
  Ban,
  RotateCcw,
  Dumbbell,
  GraduationCap,
  Palette,
  PartyPopper,
  CreditCard,
  Zap,
  QrCode,
  Users,
  Trophy,
  MessagesSquare,
  Split,
  SlidersHorizontal,
  CheckCheck,
  ShieldCheck,
  Lock,
  ScrollText,
  Moon,
  Brain,
  Home,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { StickerCard } from "@/components/ui/sticker-card"
import { Marquee } from "@/components/kit/marquee"
import { PhoneMockup, PhoneScreen } from "@/components/kit/phone-mockup"
import { Niv, DarkSurface, NivEmpty } from "@/components/brand"
import { NivCoach } from "@/components/brand/niv-usage"
import { Button } from "@/components/ui/button"
import { getEscrowConfig } from "@/lib/config/app-config"

// #289 — affirmation d'escrow centralisée (conditionnelle tant que le tiers
// e-money agréé BAM n'est pas contractualisé).
const ESCROW = getEscrowConfig()

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  // Track event-fetch lifecycle so the section can render a skeleton (instead of
  // a blank flash) and a non-blocking error banner on failure.
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
      {/* ═══════════════ HERO (ado-first + écran produit réel) ═══════════════ */}
      <section className="px-6 pb-12 pt-14" aria-label="Accueil">
        <div className="container mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
          {/* Colonne éditoriale */}
          <div className="text-center lg:text-left">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-ink px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-paper">
              <span className="size-1.5 rounded-full bg-lime motion-safe:animate-pulse" aria-hidden="true" />
              <span>Le hub des 13–17 ans</span>
            </span>

            <h1 className="font-display text-[clamp(2.5rem,7vw,5rem)] font-extrabold leading-[0.92] tracking-[-0.03em] text-balance">
              Ton argent, tes sorties,{" "}
              <span className="relative inline-block">
                ton crew
                <svg
                  viewBox="0 0 100 8"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  className="absolute -bottom-1.5 left-[-4%] h-[18px] w-[108%] text-pink"
                >
                  <path d="M2 5 Q 25 1, 50 5 T 98 5" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                </svg>
              </span>
              .{" "}
              <em className="font-semibold italic text-pink">Sans quémander.</em>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-2 sm:text-lg lg:mx-0">
              Gagne des <b className="font-bold text-ink">XP</b> par l'effort — quiz, sport, défis — puis dépense tes{" "}
              <b className="font-bold text-ink">coins</b> chez les vrais spots, avec ton crew. Ton coach Niv suit le mouvement.
            </p>

            <div className="mt-7 flex justify-center lg:justify-start">
              <Button asChild variant="pink" size="lg">
                <Link href="/onboarding" prefetch={true}>
                  Rejoindre Nivy <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Écran produit réel (Niv + XP/coins + quêtes) — visible mobile ET desktop */}
          <div className="flex justify-center">
            <PhoneMockup width={280}>
              <PhoneScreen>
                <div className="h-full overflow-hidden px-[18px] pb-[18px] pt-[50px]">
                  <AdoScreen />
                </div>
              </PhoneScreen>
            </PhoneMockup>
          </div>
        </div>
      </section>

      {/* ═══════════════ BARRE DE GARANTIE PARENT (vouvoyée) ═══════════════ */}
      <section className="border-y-2 border-ink bg-paper-2" aria-label="Garanties parents">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-6 py-4 sm:grid-cols-3">
          {[
            { icon: Wallet, title: "Vos coins = vos dirhams", sub: ESCROW.short },
            { icon: Ban, title: "L'XP ne devient jamais de l'argent", sub: "Aucun jeu d'argent, aucune crypto" },
            { icon: RotateCcw, title: "Remboursé sous 30 jours", sub: "En DH, si vous arrêtez" },
          ].map(({ icon: Icon, title, sub }) => (
            <div key={title} className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg border-2 border-ink bg-white text-ink" aria-hidden="true">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{title}</p>
                <p className="text-xs text-mute">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════ MARQUEE CATÉGORIES (honnête, pas d'enseignes inventées) ═══════════════ */}
      <Marquee items={MARQUEE_CATEGORIES} aria-label="Catégories de partenaires, bientôt près de toi" />

      {/* ═══════════════ AGENDA LIVE (remonté) ═══════════════ */}
      <section className="px-6 py-20" aria-labelledby="events-heading">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col items-end justify-between gap-4 md:flex-row">
            <div>
              <p className="eyebrow">Agenda live</p>
              <h2 id="events-heading" className="mt-3 font-display text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold tracking-[-0.04em] text-balance">
                Ce qui t'attend cette semaine
              </h2>
              <p className="mt-1.5 text-mute">Les vraies prochaines dates près de chez toi</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/agenda">
                Tout voir <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          {eventsError && (
            <div role="alert" className="mb-6 rounded-2xl border-2 border-ink bg-coral/15 px-4 py-3 text-sm font-medium text-ink">
              {eventsError}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-3">
            {eventsLoading ? (
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

      {/* ═══════════════ CE QUE TU FAIS DANS L'APP (piliers + expériences fusionnés) ═══════════════ */}
      <section className="border-y-2 border-ink bg-paper-2 px-6 py-24" aria-labelledby="do-heading">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-12 max-w-2xl">
            <p className="eyebrow">Ce que tu fais dans l'app</p>
            <h2 id="do-heading" className="mt-3 font-display text-[clamp(2.25rem,5vw,3.625rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-balance">
              Tu n'entres pas par un menu, <em className="italic font-semibold text-pink">tu entres par une envie.</em>
            </h2>
            <p className="mt-4 max-w-xl text-base text-ink-2 sm:text-lg">
              Chaque action devient une quête. Chaque effort rapporte des XP. Chaque sortie passe par tes coins.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {DO_THINGS.map((p) => (
              <StickerCard
                key={p.title}
                variant="hover"
                style={{ background: `color-mix(in oklch, var(--${p.tint}) 22%, var(--paper))` }}
                className="relative justify-between gap-4 overflow-hidden border-2 p-6"
              >
                <div className="relative">
                  <span className="grid size-[46px] place-items-center rounded-[13px] border-2 border-ink bg-ink text-paper" aria-hidden="true">
                    <p.icon className="size-5" />
                  </span>
                  <p className="mt-3.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-2">{p.tag}</p>
                  <h3 className="mt-1 font-display text-[26px] font-extrabold leading-none tracking-[-0.04em]">{p.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-snug text-ink-2">{p.desc}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.examples.map((ex) => (
                      <span key={ex} className="rounded-full bg-ink/10 px-2.5 py-1 font-mono text-[11px] font-semibold">{ex}</span>
                    ))}
                  </div>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link href={p.href} prefetch={true}>
                    {p.cta} <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </StickerCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ NIV, TON COACH ═══════════════ */}
      <section className="px-6 py-24" aria-labelledby="niv-heading">
        <div className="container mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-[.85fr_1.15fr]">
            <div>
              <p className="eyebrow">Ton coach</p>
              <h2 id="niv-heading" className="mt-3 font-display text-[clamp(2.25rem,5vw,3.625rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-balance">
                Niv te connaît, <em className="italic font-semibold text-pink">et te pousse.</em>
              </h2>
              <p className="mt-4 max-w-md text-base text-ink-2 sm:text-lg">
                Ce n'est pas un menu de plus. C'est un panda à 5 humeurs qui te lance le quiz du jour,
                te rappelle ton défi, célèbre tes level-up et t'aide quand tu bloques.
              </p>
              <div className="mt-7 flex justify-center lg:justify-start">
                <Niv mood="hype" float size={132} />
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              {NIV_USES.map((u) => (
                <NivCoach key={u.label} mood={u.mood} tone={u.tone} message={
                  <>
                    <b className="mb-0.5 block font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-pink">{u.label}</b>
                    {u.message}
                  </>
                } />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ TON CREW ═══════════════ */}
      <section className="border-y-2 border-ink bg-paper-2 px-6 py-24" aria-labelledby="crew-heading">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-12 max-w-2xl">
            <p className="eyebrow">Jamais seul</p>
            <h2 id="crew-heading" className="mt-3 font-display text-[clamp(2.25rem,5vw,3.625rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-balance">
              Ton <em className="italic font-semibold text-pink">crew.</em> Ton quartier dans l'app.
            </h2>
            <p className="mt-4 max-w-xl text-base text-ink-2 sm:text-lg">
              Rejoins ou crée ton crew, suis le feed, défie les autres cercles, grimpe les classements.
              L'app a plus de saveur à plusieurs.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {CREW_FEATURES.map((c) => (
              <StickerCard key={c.title} variant="hover" className="gap-3 p-6">
                <span className="grid size-[46px] place-items-center rounded-[13px] border-2 border-ink bg-pink text-white" aria-hidden="true">
                  <c.icon className="size-5" />
                </span>
                <h3 className="font-display text-xl font-extrabold leading-tight tracking-[-0.03em]">{c.title}</h3>
                <p className="text-[13.5px] leading-relaxed text-ink-2">{c.desc}</p>
              </StickerCard>
            ))}
          </div>

          <DarkSurface tone="coral" shadow className="mt-5 flex flex-col items-start gap-5 p-7 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl border-2 border-ink bg-night-2 text-coral" aria-hidden="true">
                <Split className="size-6" />
              </span>
              <div>
                <h3 className="font-display text-xl font-extrabold tracking-[-0.02em] text-paper">Une sortie groupée ? Chacun paie sa part.</h3>
                <p className="mt-1 max-w-xl text-sm text-paper/70">
                  Organise un plan avec ton crew : chacun met sa part, ça se débloque quand vous êtes assez.
                  Pas un truc de paiement — un moment ensemble.
                </p>
              </div>
            </div>
            <Button asChild variant="pink">
              <Link href="/teen/circles" prefetch={true}>
                Rejoindre un crew <ArrowRight className="size-4" />
              </Link>
            </Button>
          </DarkSurface>
        </div>
      </section>

      {/* ═══════════════ COMMENT ÇA MARCHE + DEUX MONNAIES ═══════════════ */}
      <section className="px-6 py-24" aria-labelledby="how-heading">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-12 max-w-2xl">
            <p className="eyebrow">Comment ça marche</p>
            <h2 id="how-heading" className="mt-3 font-display text-[clamp(2.25rem,5vw,3.625rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-balance">
              Trois mouvements. Une seule <em className="italic font-semibold text-pink">boucle.</em>
            </h2>
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
                <span className={`grid size-[46px] place-items-center rounded-[13px] text-white ${s.iconBg}`} aria-hidden="true">
                  <s.icon className="size-5" />
                </span>
                <h3 className="font-display text-2xl font-extrabold leading-tight tracking-[-0.03em]">{s.title}</h3>
                <p className="text-[14.5px] leading-relaxed text-ink-2">{s.desc}</p>
                <p className="flex flex-wrap items-center gap-2 rounded-xl bg-paper-2 px-3.5 py-2.5 font-mono text-xs font-semibold text-ink">
                  {s.demo}
                </p>
              </StickerCard>
            ))}
          </div>

          {/* Deux monnaies — surface sombre (rupture visuelle, dé-jargonnée) */}
          <div className="mt-12 rounded-3xl border-2 border-ink bg-ink p-6 text-paper sm:p-10">
            <div className="mb-8 max-w-2xl">
              <p className="eyebrow text-paper/50">Le cœur du système</p>
              <h3 className="mt-3 font-display text-[clamp(1.875rem,4vw,3rem)] font-extrabold leading-[0.97] tracking-[-0.03em] text-balance">
                Deux monnaies. Aucune <em className="italic font-semibold text-pink">conversion.</em>
              </h3>
              <p className="mt-3 max-w-xl text-paper/70">
                L'XP, c'est ce que tu gagnes par l'effort. Les coins, c'est ce que tu dépenses. Les deux ne se mélangent jamais.
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
                    Se gagne par les quiz, les défis sport, les anniversaires, les tâches maison et les notes.
                    Débloque skins, statuts et events exclusifs.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 font-mono text-[11.5px] font-semibold">
                  {["Quiz", "Défis", "Notes", "Anniv", "Cashback"].map((g) => (
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
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-coral">Coins · ton pouvoir d'achat</p>
                  <p className="mt-2 font-display text-[clamp(2.25rem,9vw,54px)] font-extrabold leading-none tracking-[-0.05em] tabular-nums">
                    12 500 <span className="ml-1 text-lg font-medium text-paper/60">≈ 125 DH</span>
                  </p>
                  <p className="mt-3 text-sm text-paper/75">
                    Tes vrais dirhams, gardés en sécurité. Se dépensent uniquement chez les spots partenaires marocains.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 font-mono text-[11.5px] font-semibold">
                  {["Boutiques", "Lieux", "Sport", "Cours"].map((g) => (
                    <span key={g} className="rounded-full border border-paper/15 bg-paper/5 px-3 py-1.5">{g}</span>
                  ))}
                </div>
              </div>
            </div>

            <p className="mt-8 flex items-center gap-3.5 rounded-2xl border border-dashed border-pink/50 bg-pink/10 px-5 py-4 font-mono text-[13px] leading-relaxed text-pink-soft">
              <b className="shrink-0 font-bold text-pink">RÈGLE D'OR ·</b>
              L'XP ne se convertit jamais en argent. Pas de jeu d'argent, pas de crypto.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════ PARENTS, VOUS GARDEZ LA MAIN (vouvoyé) ═══════════════ */}
      <section className="border-y-2 border-ink bg-paper-2 px-6 py-24" aria-labelledby="parents-heading">
        <div className="container mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="eyebrow">Pour les parents</p>
              <h2 id="parents-heading" className="mt-3 font-display text-[clamp(2.25rem,5vw,3.625rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-balance">
                Vous gardez <em className="italic font-semibold text-pink">la main.</em>
              </h2>
              <p className="mt-4 max-w-xl text-base text-ink-2 sm:text-lg">
                Vous rechargez en dirhams, vous fixez les plafonds, vous validez — ou vous laissez faire.
                Vous voyez tout, vous choisissez tout.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {PARENT_CONTROLS.map((f) => (
                  <StickerCard key={f.title} variant="panel" className="gap-1.5 p-4">
                    <span className="grid size-[34px] place-items-center rounded-[9px] border-2 border-ink bg-pink text-white" aria-hidden="true">
                      <f.icon className="size-4" />
                    </span>
                    <h4 className="text-[14.5px] font-bold leading-tight tracking-[-0.01em]">{f.title}</h4>
                    <p className="text-[12.5px] leading-snug text-mute">{f.desc}</p>
                  </StickerCard>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {PARENT_COMPLIANCE.map((c) => (
                  <span key={c.label} className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-white px-3 py-1.5 font-mono text-[11.5px] font-semibold">
                    <c.icon className="size-3.5 text-ink-2" aria-hidden="true" />
                    {c.label}
                  </span>
                ))}
              </div>

              <div className="mt-7">
                <Button asChild variant="pink" size="lg">
                  <Link href="/parents" prefetch={true}>
                    Tout savoir pour les parents <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* ParentScreen — preuve produit réelle */}
            <div className="flex justify-center">
              <PhoneMockup width={300}>
                <PhoneScreen>
                  <div className="h-full overflow-hidden px-[18px] pb-[18px] pt-[50px]">
                    <ParentScreen />
                  </div>
                </PhoneScreen>
              </PhoneMockup>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ FAQ (4 questions) ═══════════════ */}
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
                  {open && <p className="px-5 pb-5 text-[15px] leading-relaxed text-ink-2">{item.a}</p>}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════ BÊTA (encart sobre, sans chiffre non vérifiable) ═══════════════ */}
      <section className="px-6" aria-label="Bêta">
        <div className="container mx-auto max-w-3xl text-center">
          <p className="eyebrow">Bêta en cours</p>
          <p className="mt-2 font-display text-xl font-bold tracking-[-0.02em] text-ink-2">
            On démarre à Casablanca &amp; Rabat. Les premiers crews y construisent déjà leur quartier.
          </p>
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
                Gagne tes premiers XP en 60 secondes. C'est gratuit, et c'est à toi.
              </p>
              <div className="mt-8 flex justify-center">
                <Button asChild variant="pink" size="lg">
                  <Link href="/onboarding" prefetch={true}>
                    Rejoindre Nivy <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
              <p className="mt-6 text-sm text-paper/70">
                T'as un parent ?{" "}
                <Link href="/parents" prefetch={true} className="font-semibold text-paper underline underline-offset-4 hover:text-pink">
                  Tout est là pour le rassurer
                </Link>
                .
              </p>
              <p className="mt-4 font-mono text-[12.5px] uppercase tracking-[0.1em] text-paper/50">
                Inscription unique · parent ou ado · bientôt sur l'App Store
              </p>
            </div>
          </DarkSurface>
        </div>
      </section>
    </div>
  )
}

/* ════════════════════════ DONNÉES VITRINE (statiques) ════════════════════════ */

// Catégories honnêtes (pas de noms d'enseignes inventées). La primitive Marquee
// est conservée pour réintroduire de VRAIS partenaires signés.
const MARQUEE_CATEGORIES = [
  "Padel",
  "Cafés",
  "Soutien scolaire",
  "Events",
  "Danse",
  "Marketplace",
  "Ciné",
  "Anniversaires",
]

// « Ce que tu fais » — fusion des anciens « 4 Piliers » et « Expériences ».
const DO_THINGS = [
  {
    icon: Dumbbell,
    tint: "gold",
    tag: "Glow Up",
    title: "Sport & clubs",
    desc: "Padel, danse, yoga, salle, scout. Tes coachs certifient tes séances et te filent des XP en vrai.",
    examples: ["Padel", "Danse", "Salle", "Scout"],
    cta: "Explorer les clubs",
    href: "/clubs",
  },
  {
    icon: GraduationCap,
    tint: "lime",
    tag: "Big Brain",
    title: "Études & quiz",
    desc: "Quiz du jour adapté à ton bac et à ta langue. Soutien, langues et mentor inclus.",
    examples: ["Quiz", "Soutien", "Langues", "Mentor"],
    cta: "Voir les quiz",
    href: "/teen/quiz",
  },
  {
    icon: Palette,
    tint: "pink",
    tag: "Self-Express",
    title: "Création & style",
    desc: "Marketplace C2C, mode & beauté, musique, photo, design. Tu vends, tu shoppes, tu crées.",
    examples: ["Marketplace", "Mode", "Musique", "Photo"],
    cta: "Voir la marketplace",
    href: "/marketplace",
  },
  {
    icon: PartyPopper,
    tint: "coral",
    tag: "Main Character",
    title: "Sorties & crew",
    desc: "Cafés, escape games, ciné, anniversaires, events partenaires. Avec ton crew, jamais seul.",
    examples: ["Cafés", "Ciné", "Escape", "Events"],
    cta: "Voir l'agenda",
    href: "/agenda",
  },
] as const

// « Niv, ton coach » — bulles de conversation réelles (≥3 usages, ≥2 humeurs).
const NIV_USES = [
  { label: "Quiz du jour", mood: "happy", tone: "dark", message: "Quiz d'histoire en 4 questions ce matin — t'es chaud ?" },
  { label: "Ton défi", mood: "hype", tone: "paper", message: "Plus qu'une séance de padel pour boucler ton défi de la semaine. On y va ?" },
  { label: "Level up", mood: "proud", tone: "paper", message: "Niveau 8 débloqué. Tu gères, vrai de vrai." },
  { label: "Coup de main", mood: "calm", tone: "dark", message: "Bloqué sur tes maths ce soir ? Je te trouve un mentor en deux taps." },
] as const

// « Ton crew » — appartenance (distinct du collectif logistique).
const CREW_FEATURES = [
  { icon: Users, title: "Ton crew", desc: "Rejoins un cercle ou crée le tien. Tes potes, ton vibe, ton quartier dans l'app." },
  { icon: MessagesSquare, title: "Feed & messages", desc: "Ce que fait ton crew en direct. On se chambre, on se motive, on s'organise." },
  { icon: Trophy, title: "Défis entre cercles", desc: "Affronte d'autres crews, grimpe les classements, gagne du statut ensemble." },
  { icon: PartyPopper, title: "Anniv = +500 XP", desc: "Le jour J, tes potes t'envoient leurs vœux et ça compte vraiment." },
] as const

const HOW_STEPS = [
  {
    icon: CreditCard,
    iconBg: "bg-teal",
    title: "Tu reçois des coins",
    desc: "Tes parents rechargent en dirhams quand ils veulent. 1 DH = 100 coins, prêts à dépenser.",
    demo: <>+50 DH <b className="font-extrabold">→</b> 5 000 ⊙</>,
  },
  {
    icon: Zap,
    iconBg: "bg-pink",
    title: "Tu gagnes, tu joues",
    desc: "Quiz à ton école, défis sport, tâches maison validées. Niv suit, te pousse et célèbre.",
    demo: <>Quiz du jour <b className="font-extrabold text-gold">+50 XP</b> <span className="text-mute">· niv. 7</span></>,
  },
  {
    icon: QrCode,
    iconBg: "bg-coral",
    title: "Tu dépenses chez les vrais spots",
    desc: "Padel, café, ciné, boutique. Tu scannes, tu profites — et tu récupères du cashback en XP.",
    demo: <>−120 ⊙ <b className="font-extrabold text-gold">+12 XP cashback</b></>,
  },
] as const

// Contrôle parental (vouvoyé).
const PARENT_CONTROLS = [
  { icon: SlidersHorizontal, title: "Plafonds par enfant", desc: "Par transaction · jour · mois" },
  { icon: CheckCheck, title: "Validation en un geste", desc: "Une notif, un tap pour approuver" },
  { icon: Users, title: "Multi-parent", desc: "Le premier qui valide gagne" },
  { icon: ScrollText, title: "Historique tracé", desc: "Chaque dépense, catégorisée" },
] as const

// Conformité (fusion de l'ancienne section Confiance).
const PARENT_COMPLIANCE = [
  { icon: ShieldCheck, label: "BAM-conforme" },
  { icon: Lock, label: "CNDP loi 09-08" },
  { icon: ScrollText, label: "Audit 7 ans" },
  { icon: Moon, label: "Heures calmes 22 h–7 h" },
] as const

const FAQ = [
  {
    q: "Mon ado peut-il convertir des XP en argent ?",
    a: "Non, jamais. Les XP récompensent l'effort et débloquent du statut, des skins et des événements. Les coins, eux, sont adossés au dirham et se dépensent uniquement chez nos partenaires. Les deux ne se mélangent jamais — c'est volontaire.",
  },
  {
    q: "Mon ado peut-il dépenser sans mon accord ?",
    a: "Vous choisissez. Mode autonome avec plafonds (par transaction, jour et mois) ou validation systématique. Au-dessus du plafond, vous recevez une notification : un appui pour approuver. Si vous êtes deux parents, le premier qui répond valide.",
  },
  {
    q: "Que se passe-t-il si je supprime le compte ?",
    a: "Les coins non dépensés sont remboursés en DH sur votre moyen de paiement initial sous 30 jours. Les données personnelles sont anonymisées (CNDP loi 09-08, droit à l'oubli). Les écritures comptables sont conservées 7 ans, comme l'exige la loi marocaine.",
  },
  {
    q: "C'est légal au Maroc ?",
    a: `Oui. ${ESCROW.statement} Pas de crypto (illégale au Maroc), pas de jeu d'argent. Protection des données conforme à la loi 09-08 (CNDP) et comptabilité auditée sur 7 ans.`,
  },
] as const

/* ════════════════════════ ÉCRANS TÉLÉPHONE (preuve produit) ════════════════════════ */

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
        <p className="text-[11px] text-paper/75">28 500 coins · prépayés en DH</p>
      </div>
      <ScreenKid avBg="bg-pink" initial="A" name="Amine, 15 ans" meta="Niv. 7 · 2 480 XP" bal="12 500 ⊙" sub="autonome" />
      <ScreenKid avBg="bg-coral" initial="Y" name="Yasmine, 13 ans" meta="Niv. 4 · 950 XP" bal="16 000 ⊙" sub="validation" />
      <div className="mt-2.5 rounded-2xl border-2 border-gold bg-gold/20 p-3">
        <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ink-2">
          <span>● Demande</span><span>il y a 2 min</span>
        </div>
        <p className="mb-2 text-[13px] font-semibold leading-snug">Yasmine veut acheter un livre à <b>45 DH</b></p>
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
      <ScreenQuest icon={<Brain className="size-4 text-ink" />} title="Quiz d'histoire 1ère bac" meta="Quotidien · expire à 23h59" reward="+50 XP" rewardColor="text-gold" />
      <ScreenQuest icon={<Dumbbell className="size-4 text-ink" />} title="Padel avec ton crew" meta="Hebdo · 2/3 séances" reward="+250 XP" rewardColor="text-gold" />
      <ScreenQuest icon={<Home className="size-4 text-ink" />} title="Vaisselle 5 jours" meta="Maman · 3/5 jours" reward="+100 DH" rewardColor="text-lime" />
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

function ScreenQuest({ icon, title, meta, reward, rewardColor }: { icon: React.ReactNode; title: string; meta: string; reward: string; rewardColor: string }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2.5 rounded-xl border border-line bg-white p-2.5">
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-paper-2" aria-hidden="true">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold leading-tight">{title}</p>
        <p className="mt-0.5 text-[10px] text-mute">{meta}</p>
      </div>
      <span className={`whitespace-nowrap font-mono text-[10px] font-bold ${rewardColor}`}>{reward}</span>
    </div>
  )
}
