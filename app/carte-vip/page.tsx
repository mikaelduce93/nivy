'use client'

/**
 * ⚠️ #66 — This is the PAID marketing "Carte VIP / Pass" (silver/gold/platinum
 * with DH prices), DISTINCT from the XP-earned VIP status in the `vip_tiers`
 * table (7 tiers standard..legendary, surfaced at /teen/vip-card). Do not
 * confuse the two nomenclatures.
 */

import { useState } from 'react'
import Link from 'next/link'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Users, Ticket, ShoppingBag, Star, Calculator, ArrowRight } from 'lucide-react'

import { StickerCard } from '@/components/ui/sticker-card'
import { PricingSticker, PricingGrid } from '@/components/sticker/pricing-sticker'
import { Niv, DarkSurface } from '@/components/brand'
import { MeshBackground } from '@/components/ui/effects/mesh-background'

export default function CarteVIPPage() {
  const [eventsPerMonth, setEventsPerMonth] = useState(2)
  const [clubsPerMonth, setClubsPerMonth] = useState(1)

  const calculateSavings = () => {
    const eventPrice = 150
    const clubPrice = 200

    const monthlySpending = (eventsPerMonth * eventPrice) + (clubsPerMonth * clubPrice)

    const savings = {
      silver: monthlySpending * 0.1,
      gold: monthlySpending * 0.2 + 50,
      platinum: monthlySpending * 0.3 + 150
    }

    const yearlySpending = monthlySpending * 12
    const yearlySavings = {
      silver: yearlySpending * 0.1,
      gold: (yearlySpending * 0.2 + 600) - 299,
      platinum: (yearlySpending * 0.3 + 1800) - 599
    }

    return { monthly: savings, yearly: yearlySavings }
  }

  const savings = calculateSavings()

  const tiers = [
    {
      id: 'silver' as const, name: 'Silver', icon: '🥉', priceAmount: 0,
      benefits: ['1 point par 10dh dépensés', '-10% sur anniversaires', 'Accès préventes 24h avant', 'Badge profil Silver', 'Newsletter exclusive']
    },
    {
      id: 'gold' as const, name: 'Gold', icon: '🥇', priceAmount: 299, popular: true,
      benefits: ['2 points par 10dh dépensés', '-20% sur tous événements', '-15% sur clubs', '-10% chez partenaires', '1 invité gratuit par mois', 'Accès préventes 48h avant', 'Badge profil Gold', "Cadeaux d'anniversaire"]
    },
    {
      id: 'platinum' as const, name: 'Platinum', icon: '💎', priceAmount: 599,
      benefits: ['3 points par 10dh dépensés', '-30% sur tous événements', '-25% sur clubs', '-20% chez partenaires', 'Accès VIP systématique', '5 invités offerts anniversaire', 'Conciergerie dédiée 24/7', 'Accès préventes 72h avant', 'Badge profil Platinum', 'Expériences VIP exclusives', 'Meet & Greet artistes', 'Merch exclusif']
    }
  ]

  const pointsRewards = [
    { points: 50, reward: '1 invité offert', icon: Users },
    { points: 100, reward: '1 entrée gratuite', icon: Ticket },
    { points: 200, reward: 'Merch exclusif', icon: ShoppingBag },
    { points: 500, reward: 'Expérience VIP', icon: Star }
  ]

  const partners = [
    { name: 'Pizza Hut', discount: '15%', category: 'Restaurant' },
    { name: 'KFC', discount: '10%', category: 'Restaurant' },
    { name: 'Megarama', discount: '20%', category: 'Cinéma' },
    { name: 'Tamaris Aquaparc', discount: '25%', category: 'Loisirs' },
    { name: 'Decathlon', discount: '10%', category: 'Sport' },
    { name: 'Zara', discount: '15%', category: 'Mode' }
  ]

  return (
    <div className="min-h-screen bg-paper pt-20">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-14">
        <MeshBackground />
        <div className="relative z-10 container mx-auto text-center">
          <Niv mood="hype" size={100} float className="mx-auto" />
          <p className="mt-4 eyebrow tracking-[0.16em]">Programme fidélité</p>
          <h1 className="mt-2 font-display text-5xl font-extrabold tracking-tight">
            Carte <em className="font-semibold italic text-pink">VIP</em>
          </h1>
          <p className="mx-auto mb-8 mt-4 max-w-2xl text-xl text-ink-2">
            Réductions exclusives, points à chaque événement et avantages incroyables.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" variant="pink" asChild>
              <Link href="/carte-vip/souscrire">Devenir membre VIP<ArrowRight className="ml-2 size-4" aria-hidden="true" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="border-y-2 border-ink bg-paper-2 px-4 py-16">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-extrabold tracking-tight">Choisis ton niveau VIP</h2>
            <p className="mx-auto mt-2 max-w-2xl text-mute">Trois niveaux d'adhésion pour s'adapter à ton rythme de sorties.</p>
          </div>

          <div className="mx-auto max-w-6xl">
            <PricingGrid>
              {tiers.map((tier) => (
                <PricingSticker
                  key={tier.id}
                  name={`${tier.icon} ${tier.name}`}
                  price={tier.priceAmount > 0 ? String(tier.priceAmount) : "Gratuit"}
                  per={tier.priceAmount > 0 ? "DH/an" : undefined}
                  features={tier.benefits}
                  popular={'popular' in tier && !!tier.popular}
                  featured="ink"
                  niv={'popular' in tier && tier.popular ? "proud" : undefined}
                  cta={{ label: `Choisir ${tier.name}`, href: "/carte-vip/souscrire" }}
                />
              ))}
            </PricingGrid>
          </div>
        </div>
      </section>

      {/* Savings Calculator */}
      <section className="px-4 py-16">
        <div className="container mx-auto max-w-4xl">
          <StickerCard className="gap-6 p-8">
            <div>
              <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold">
                <Calculator className="size-6 text-pink" aria-hidden="true" />
                Calculateur d'économies
              </h2>
              <p className="mt-1 text-mute">Découvre combien tu peux économiser avec la carte VIP.</p>
            </div>

            <div className="space-y-4">
              <div>
                <span className="eyebrow tracking-[0.16em]">Événements par mois : {eventsPerMonth}</span>
                <Slider value={[eventsPerMonth]} onValueChange={(v) => setEventsPerMonth(v[0])} min={0} max={10} step={1} className="mt-2" />
              </div>
              <div>
                <span className="eyebrow tracking-[0.16em]">Séances clubs par mois : {clubsPerMonth}</span>
                <Slider value={[clubsPerMonth]} onValueChange={(v) => setClubsPerMonth(v[0])} min={0} max={8} step={1} className="mt-2" />
              </div>
            </div>

            <div className="grid gap-4 border-t-2 border-dashed border-line pt-6 md:grid-cols-3">
              {tiers.map((tier) => (
                <StickerCard key={tier.id} className="gap-1 p-4 text-center">
                  <p className="eyebrow">{tier.name}</p>
                  <p className="font-display text-2xl font-extrabold tabular-nums text-lime">
                    +{Math.round(savings.yearly[tier.id as keyof typeof savings.yearly])}dh
                  </p>
                  <p className="font-mono text-xs text-mute">économisés par an</p>
                </StickerCard>
              ))}
            </div>
          </StickerCard>
        </div>
      </section>

      {/* Points System */}
      <section className="bg-paper-2 px-4 py-16">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-extrabold tracking-tight">Système de points fidélité</h2>
            <p className="mt-2 text-mute">Accumule des points à chaque dépense et échange-les contre des récompenses.</p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {pointsRewards.map((reward, idx) => (
              <StickerCard key={idx} variant="hover" className="items-center gap-2 p-6 text-center">
                <span className="grid size-16 place-items-center rounded-full border-2 border-ink bg-paper-2">
                  <reward.icon className="size-8 text-pink" aria-hidden="true" />
                </span>
                <div className="font-display text-3xl font-extrabold tabular-nums text-pink">{reward.points}</div>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-mute">points</p>
                <p className="font-display font-bold">{reward.reward}</p>
              </StickerCard>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="px-4 py-16">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-extrabold tracking-tight">Partenaires exclusifs</h2>
            <p className="mt-2 text-mute">Profite de réductions chez nos partenaires avec ta carte VIP.</p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {partners.map((partner, idx) => (
              <StickerCard key={idx} variant="hover" className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold">{partner.name}</h3>
                  <span className="rounded-full border-2 border-ink bg-pink px-2.5 py-0.5 font-mono text-[11px] font-bold text-ink">{partner.discount}</span>
                </div>
                <p className="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-mute">{partner.category}</p>
              </StickerCard>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button variant="outline" asChild>
              <Link href="/devenir-partenaire">Voir tous les partenaires<ArrowRight className="ml-2 size-4" aria-hidden="true" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16">
        <div className="container mx-auto max-w-4xl">
          <DarkSurface tone="pink" shadow className="p-10 text-center sm:p-12">
            <h2 className="font-display text-3xl font-extrabold text-paper">Prêt à devenir VIP ?</h2>
            <p className="mx-auto mb-8 mt-3 max-w-2xl text-xl text-paper/80">
              Rejoins le programme fidélité Nivy et profite d'avantages exclusifs dès maintenant.
            </p>
            <Button size="lg" variant="pink" asChild>
              <Link href="/carte-vip/souscrire">Souscrire maintenant<ArrowRight className="ml-2 size-4" aria-hidden="true" /></Link>
            </Button>
          </DarkSurface>
        </div>
      </section>
    </div>
  )
}
