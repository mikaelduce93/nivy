"use client"

import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCelebration, StatHero } from "@/components/brand"
import { Confetti } from "@/components/ui/effects/confetti"
import {
  Trophy, Star, Heart,
  ArrowRight, Calendar, Users, Crown,
} from 'lucide-react'
import { BADGE_DISPLAY_INFO } from '@/gamification-system/features/onboarding/schema'

interface GamificationData {
  totalXP: number
  earnedBadges: string[]
  bonusCoins: number
}

interface CompletionStepProps {
  userType: 'parent' | 'teen' | null
  onNext: () => void
  gamificationData?: GamificationData
}

export function CompletionStep({ userType, onNext, gamificationData }: CompletionStepProps) {
  // Default gamification data if not provided
  const xp = gamificationData?.totalXP || 0
  const badges = gamificationData?.earnedBadges || []
  const coins = gamificationData?.bonusCoins || 0

  const parentNextSteps = [
    {
      icon: Users,
      title: "Ajouter un profil enfant",
      description: "Créez le profil de votre premier enfant",
      accent: "text-teal",
    },
    {
      icon: Calendar,
      title: "Explorer les événements",
      description: "Découvrez les activités disponibles",
      accent: "text-pink",
    },
    {
      icon: Crown,
      title: "Découvrir les Pass VIP",
      description: "Économisez avec un abonnement",
      accent: "text-gold",
    }
  ]

  const teenNextSteps = [
    {
      icon: Star,
      title: "Personnalise ton profil",
      description: "Choisis ton avatar et ton pseudo unique",
      accent: "text-pink",
    },
    {
      icon: Calendar,
      title: "Découvre les events",
      description: "Trouve des activités qui te plaisent",
      accent: "text-teal",
    },
    {
      icon: Trophy,
      title: "Relève des défis",
      description: "Gagne des badges et monte en niveau",
      accent: "text-gold",
    }
  ]

  const nextSteps = userType === 'parent' ? parentNextSteps : teenNextSteps
  const hasRewards = xp > 0 || badges.length > 0 || coins > 0

  return (
    <div className="relative space-y-8">
      {/* Confetti raisonnable (respecte prefers-reduced-motion) */}
      <Confetti trigger palette="levelup" />

      {/* Hero level-up — NivCelebration */}
      <NivCelebration
        title="Onboarding terminé"
        tone="pink"
        trigger={false}
        caption={
          userType === 'parent'
            ? "Votre compte est créé ! Vous pouvez maintenant gérer les activités de vos enfants."
            : "Dès que tes parents valideront ton compte, tu pourras commencer à t'amuser !"
        }
        className="max-w-2xl mx-auto"
      >
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold leading-tight text-paper">
          {userType === 'parent' ? (
            <>Bienvenue dans la famille <em className="not-italic text-pink">Nivy</em> !</>
          ) : (
            <>C'est parti pour <em className="not-italic text-pink">l'aventure</em> !</>
          )}
        </h1>
      </NivCelebration>

      {/* Gamification Rewards Summary — 3 tokens charte */}
      {hasRewards && (
        <div className="max-w-2xl mx-auto space-y-4">
          <h3 className="eyebrow tracking-[0.16em] text-mute text-center">
            Récompenses gagnées
          </h3>

          <div className="grid grid-cols-3 gap-4">
            <StatHero eyebrow="XP" value={xp} tone="gold" size="sm" />
            <StatHero eyebrow="Coins" value={<>⊙ {coins}</>} tone="coral" size="sm" />
            <StatHero eyebrow="Badges" value={badges.length} tone="teal" size="sm" />
          </div>

          {/* Badge names */}
          {badges.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {badges.map((badge) => {
                const info = BADGE_DISPLAY_INFO[badge]
                return (
                  <span
                    key={badge}
                    className="px-3 py-1 rounded-full border-2 border-ink bg-paper text-pink text-xs font-medium"
                  >
                    {info?.name || badge}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Next Steps */}
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-display font-extrabold text-center mb-6 text-ink">Prochaines étapes</h2>

        <div className="grid sm:grid-cols-3 gap-4">
          {nextSteps.map((step) => {
            const Icon = step.icon
            return (
              <StickerCard key={step.title} variant="hover" className="p-6 h-full">
                <div
                  className="w-12 h-12 rounded-xl border-2 border-ink bg-paper flex items-center justify-center mb-4"
                  aria-hidden="true"
                >
                  <Icon className={`w-6 h-6 ${step.accent}`} />
                </div>
                <h3 className="font-display font-bold text-lg mb-2 text-ink">{step.title}</h3>
                <p className="text-sm text-mute">{step.description}</p>
              </StickerCard>
            )
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center pt-8">
        {userType === 'parent' ? (
          <Button
            variant="pink"
            size="lg"
            onClick={onNext}
            className="px-8 text-lg"
          >
            Accéder à mon tableau de bord
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        ) : (
          <div className="space-y-4">
            <StickerCard className="p-6 max-w-2xl mx-auto">
              <div className="flex items-start gap-3">
                <Heart className="w-6 h-6 text-teal flex-shrink-0 mt-1" />
                <div className="text-left">
                  <p className="font-display font-bold text-ink mb-2">
                    Un email a été envoyé à tes parents
                  </p>
                  <p className="text-sm text-mute">
                    Ils vont recevoir un lien pour créer leur compte et valider ton inscription.
                    Tu recevras une notification dès que c'est fait !
                  </p>
                </div>
              </div>
            </StickerCard>

            <Button
              size="lg"
              variant="outline"
              onClick={onNext}
              className="gap-2"
            >
              Retour à l'accueil
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
