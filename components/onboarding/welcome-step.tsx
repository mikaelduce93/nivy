"use client"

import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { OrbitingTokens } from "@/components/brand"
import {
  Calendar, Users, Trophy, Crown, ArrowRight
} from 'lucide-react'

interface WelcomeStepProps {
  onNext: () => void
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  const features = [
    {
      icon: Calendar,
      title: "Events inoubliables",
      description: "Anniversaires, clubs, sorties… Des moments magiques chaque semaine",
      accent: "text-pink",
    },
    {
      icon: Users,
      title: "Retrouve tes amis",
      description: "Retrouve tes potes et fais de nouvelles rencontres",
      accent: "text-teal",
    },
    {
      icon: Trophy,
      title: "Gagne des badges",
      description: "Complète des défis et deviens une légende",
      accent: "text-gold",
    },
    {
      icon: Crown,
      title: "Avantages VIP",
      description: "Réductions exclusives et accès prioritaire",
      accent: "text-coral",
    }
  ]

  return (
    <div className="text-center space-y-8">
      {/* Hero — Niv + tokens orbitants (aperçu illustratif de ce que Nivy suit) */}
      <div className="flex justify-center">
        <OrbitingTokens
          xp="XP"
          coins="Coins"
          level="Niveau"
          streak="Streak"
          nivMood="hype"
          size={300}
          aria-label="Niv, ta mascotte, et ce que Nivy te fait suivre"
        />
      </div>

      {/* Title */}
      <div>
        <p className="eyebrow tracking-[0.18em] text-mute mb-3">Onboarding</p>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold mb-4 leading-tight text-balance text-ink">
          Bienvenue sur
          <br />
          <em className="font-semibold italic text-pink not-italic sm:italic">Nivy</em>
        </h1>
        <p className="text-lg sm:text-xl text-mute max-w-2xl mx-auto text-balance">
          La plateforme des ados de 13-17&nbsp;ans à Casablanca
        </p>
      </div>

      {/* Features Grid */}
      <div
        className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto mt-12"
        role="list"
        aria-label="Fonctionnalités principales"
      >
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <StickerCard
              key={feature.title}
              role="listitem"
              className="p-6 text-left"
            >
              <div
                className="w-12 h-12 rounded-xl border-2 border-ink bg-paper flex items-center justify-center mb-4"
                aria-hidden="true"
              >
                <Icon className={`w-6 h-6 ${feature.accent}`} aria-hidden="true" />
              </div>
              <h3 className="font-display font-bold text-lg mb-2 text-ink">{feature.title}</h3>
              <p className="text-sm text-mute">{feature.description}</p>
            </StickerCard>
          )
        })}
      </div>

      {/* CTA Button */}
      <div className="pt-8">
        <Button
          variant="pink"
          size="lg"
          onClick={onNext}
          className="px-8 text-lg"
        >
          Commencer l'aventure
          <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
