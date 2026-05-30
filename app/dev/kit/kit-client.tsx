"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { SegmentedProgress } from "@/components/ui/progress"
import { FieldInput } from "@/components/ui/field-input"
import { OtpCells } from "@/components/ui/otp-cells"
import { CheckRound } from "@/components/ui/check-round"
import {
  SelectSticker,
  SelectStickerItem,
} from "@/components/ui/select-sticker"
import { MeshBackground } from "@/components/ui/effects/mesh-background"
import { Confetti } from "@/components/ui/effects/confetti"
import { Marquee } from "@/components/kit/marquee"
import { PhoneMockup, PhoneScreen } from "@/components/kit/phone-mockup"
import { PricingSticker } from "@/components/sticker/pricing-sticker"
import { StickerTabs, SegmentedSwitcher } from "@/components/brand/sticker-tab"
import {
  Niv,
  DarkSurface,
  StatHero,
  OrbitingTokens,
  NivCoach,
  NivEmpty,
  NivCelebration,
} from "@/components/brand"

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <h2 className="eyebrow tracking-[0.16em]">
        {id} — {title}
      </h2>
      {children}
    </section>
  )
}

export function KitGallery() {
  const [tab, setTab] = React.useState("xp")
  const [celebrate, setCelebrate] = React.useState(false)

  return (
    <div className="min-h-screen bg-paper px-4 py-10 text-ink sm:px-8">
      <div className="mx-auto max-w-5xl space-y-12">
        <header className="space-y-2">
          <p className="eyebrow tracking-[0.16em]">Kit · Dev only</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Kit de <em className="text-pink">primitives</em>
          </h1>
          <p className="max-w-xl text-sm text-mute">
            Galerie du design system handoff — bordure 2px ink + ombre sticker,
            surface sombre conforme, mascotte Niv, zéro glass/blur. Page non
            linkée, bloquée en production.
          </p>
        </header>

        {/* F1 — StickerCard */}
        <Section id="F1" title="StickerCard">
          <div className="grid gap-4 sm:grid-cols-3">
            <StickerCard className="p-5">
              <p className="eyebrow">Default</p>
              <p className="mt-1 font-display text-lg font-bold">Carte sticker</p>
              <p className="mt-1 text-sm text-mute">Bordure 2px ink + ombre dure.</p>
            </StickerCard>
            <StickerCard variant="hover" className="p-5">
              <p className="eyebrow">Hover</p>
              <p className="mt-1 font-display text-lg font-bold">Hover-lift</p>
              <p className="mt-1 text-sm text-mute">Survole : translate + ombre rose.</p>
            </StickerCard>
            <StickerCard variant="panel" className="p-5">
              <p className="eyebrow">Panel</p>
              <p className="mt-1 font-display text-lg font-bold">Conteneur</p>
              <p className="mt-1 text-sm text-mute">Ombre allégée.</p>
            </StickerCard>
          </div>
        </Section>

        {/* F2 — StatHero / DarkSurface */}
        <Section id="F2" title="StatHero / DarkSurface">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatHero eyebrow="Solde" value="1 250" unit="coins" tone="coral" meta="≈ 12,50 DH" />
            <StatHero eyebrow="XP" value="2 480" tone="gold" size="sm" meta="Vers niveau 8" />
            <StatHero eyebrow="Niveau" value="7" tone="teal" size="sm" meta="Top 12 % du crew" />
          </div>
        </Section>

        {/* F3 — OrbitingTokens */}
        <Section id="F3" title="OrbitingTokens">
          <div className="flex justify-center rounded-2xl border-2 border-ink bg-white p-6 shadow-stkr-sm">
            <OrbitingTokens xp="2 480" coins="1 250" level="7" streak="12 j" />
          </div>
        </Section>

        {/* F4 — NivCoach / NivEmpty / NivCelebration */}
        <Section id="F4" title="NivCoach / NivEmpty / NivCelebration">
          <div className="grid gap-4 lg:grid-cols-2">
            <NivCoach message="Salam ! Prêt à attaquer ta première quête du jour ? Yallah, on y va." />
            <NivEmpty
              title="Rien par ici… pour l'instant"
              description="Tes défis terminés s'afficheront ici. Lance-toi pour les voir arriver."
              action={<Button variant="pink">Voir les défis</Button>}
            />
          </div>
          <div className="mt-4">
            <NivCelebration
              title="Level up"
              value="8"
              caption="T'as débloqué le niveau 8. Continue comme ça, champion !"
              trigger={false}
            />
          </div>
        </Section>

        {/* F5 — SegmentedProgress */}
        <Section id="F5" title="SegmentedProgress">
          <div className="max-w-md space-y-4">
            <SegmentedProgress steps={5} current={2} showLabel />
            <SegmentedProgress steps={12} current={6} size="md" />
          </div>
        </Section>

        {/* F6 — StickerTab / SegmentedSwitcher */}
        <Section id="F6" title="StickerTab / SegmentedSwitcher">
          <div className="space-y-4">
            <StickerTabs
              ariaLabel="Démo onglets"
              value={tab}
              onValueChange={setTab}
              tabs={[
                { value: "xp", label: "XP", badge: 3 },
                { value: "coins", label: "Coins" },
                { value: "niveau", label: "Niveau" },
              ]}
            />
            <SegmentedSwitcher
              ariaLabel="Démo switcher"
              defaultValue="solo"
              tabs={[
                { value: "solo", label: "Solo" },
                { value: "duo", label: "Duo" },
              ]}
            />
          </div>
        </Section>

        {/* F7 — Kit inputs */}
        <Section id="F7" title="Kit d'inputs charte">
          <div className="grid max-w-xl gap-4 sm:grid-cols-2">
            <FieldInput label="Prénom" placeholder="Yassine" />
            <FieldInput
              label="Téléphone"
              prefix="🇲🇦 +212"
              placeholder="6 12 34 56 78"
              inputMode="numeric"
            />
            <div className="sm:col-span-2">
              <p className="eyebrow tracking-[0.16em]">Code SMS</p>
              <div className="mt-1.5">
                <OtpCells length={6} />
              </div>
            </div>
            <SelectSticker label="Ville" placeholder="Choisis ta ville">
              <SelectStickerItem value="casa">Casablanca</SelectStickerItem>
              <SelectStickerItem value="rabat">Rabat</SelectStickerItem>
              <SelectStickerItem value="marrakech">Marrakech</SelectStickerItem>
            </SelectSticker>
            <div className="flex items-end">
              <CheckRound label="J'accepte les conditions d'utilisation." />
            </div>
          </div>
        </Section>

        {/* F8 — Marquee */}
        <Section id="F8" title="Marquee">
          <Marquee
            items={["Decathlon", "Burger Spot", "Cinéma Megarama", "Studio Dance", "Café Niv"]}
          />
        </Section>

        {/* F9 — PhoneMockup / PhoneScreen */}
        <Section id="F9" title="PhoneMockup / PhoneScreen">
          <div className="flex justify-center py-6">
            <PhoneMockup width={260}>
              <PhoneScreen>
                <div className="flex h-full flex-col gap-3 px-4 pt-14">
                  <p className="eyebrow">Aujourd'hui</p>
                  <StickerCard className="p-3">
                    <p className="font-display text-base font-bold">Bois 8 verres d'eau</p>
                    <p className="text-xs text-mute">+50 XP · +10 coins</p>
                  </StickerCard>
                </div>
              </PhoneScreen>
            </PhoneMockup>
          </div>
        </Section>

        {/* F10 — PricingSticker */}
        <Section id="F10" title="PricingSticker">
          <div className="grid gap-4 pt-4 md:grid-cols-3">
            <PricingSticker
              name="Free"
              price="0"
              per="DH"
              features={["1 ado", "Plafonds de base"]}
              cta={{ label: "Choisir", href: "#" }}
            />
            <PricingSticker
              name="Family"
              price="49"
              per="DH/mois"
              features={["Jusqu'à 4 ados", "Multi-parent", "Support prioritaire"]}
              popular
              featured="ink"
              niv="proud"
              cta={{ label: "Choisir", href: "#" }}
            />
            <PricingSticker
              name="Family+"
              price="89"
              per="DH/mois"
              features={["Ados illimités", "Rapports mensuels"]}
              cta={{ label: "Choisir", href: "#" }}
            />
          </div>
        </Section>

        {/* F11 — MeshBackground + Confetti */}
        <Section id="F11" title="MeshBackground + Confetti">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative h-40 overflow-hidden rounded-2xl border-2 border-ink">
              <MeshBackground />
              <p className="relative p-4 eyebrow">Mesh · paper</p>
            </div>
            <DarkSurface className="relative h-40">
              <MeshBackground variant="dark" />
              <p className="relative p-4 eyebrow text-paper/60">Mesh · dark</p>
            </DarkSurface>
          </div>
          <div className="mt-4">
            <Button variant="pink" onClick={() => setCelebrate((c) => !c)}>
              Lancer les confettis
            </Button>
            <Confetti trigger={celebrate} palette="reward" />
          </div>
        </Section>

        {/* Mascotte — poses de référence */}
        <Section id="Niv" title="Mascotte (moods)">
          <div className="flex flex-wrap items-end gap-4">
            {(["happy", "wink", "hype", "calm", "proud"] as const).map((m) => (
              <div key={m} className="flex flex-col items-center gap-1">
                <Niv mood={m} size={72} />
                <span className="eyebrow">{m}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}
