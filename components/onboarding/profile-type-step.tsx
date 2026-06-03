"use client"

import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { cn } from "@/lib/utils"
import { TEEN_AGE_RANGE_LABEL } from "@/lib/constants/age"
import {
  Users, User, Shield, Heart, Calendar, Trophy,
  Check, ChevronLeft, ChevronRight
} from 'lucide-react'

interface ProfileTypeStepProps {
  selectedType: 'parent' | 'teen' | null
  onSelect: (type: 'parent' | 'teen') => void
  onNext: () => void
  onBack: () => void
}

export function ProfileTypeStep({ selectedType, onSelect, onNext, onBack }: ProfileTypeStepProps) {
  const profiles = [
    {
      type: 'parent' as const,
      icon: Users,
      eyebrow: "Compte parent",
      title: "Je suis parent",
      subtitle: "J'inscris mon/mes enfant(s)",
      accent: "text-teal",
      features: [
        {
          icon: Shield,
          text: "Suivi et sécurité de vos enfants"
        },
        {
          icon: Calendar,
          text: "Réservations et paiements simplifiés"
        },
        {
          icon: Heart,
          text: "Dashboard parental complet"
        }
      ],
      benefits: [
        "Gérez plusieurs profils enfants",
        "Recevez des notifications en temps réel",
        "Accès aux photos et rapports d'activités",
        "Support client prioritaire"
      ]
    },
    {
      type: 'teen' as const,
      icon: User,
      eyebrow: "Compte ado",
      title: "Je suis ado",
      subtitle: `J'ai ${TEEN_AGE_RANGE_LABEL}`,
      accent: "text-pink",
      features: [
        {
          icon: Trophy,
          text: "Badges et défis quotidiens"
        },
        {
          icon: Users,
          text: "Retrouve tes amis"
        },
        {
          icon: Calendar,
          text: "Découvre des events cool"
        }
      ],
      benefits: [
        "Crée ton profil unique avec avatar",
        "Rejoins des clubs et events",
        "Gagne des XP et monte en niveau",
        "Accède à du contenu exclusif"
      ]
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <p className="eyebrow tracking-[0.18em] text-mute mb-3">Type de compte</p>
        <h2 className="text-3xl sm:text-4xl font-display font-extrabold mb-3 text-ink">C&apos;est <em className="font-semibold italic text-pink">parti</em> !</h2>
        <p className="text-mute max-w-2xl mx-auto">
          Choisissez votre type de compte pour personnaliser votre expérience
        </p>
      </div>

      {/* Profile Type Cards */}
      <div className="grid md:grid-cols-2 gap-6" role="radiogroup" aria-label="Type de compte">
        {profiles.map((profile) => {
          const Icon = profile.icon
          const isSelected = selectedType === profile.type

          return (
            <StickerCard
              key={profile.type}
              variant="hover"
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onSelect(profile.type)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(profile.type)
                }
              }}
              className={cn(
                "relative p-6",
                isSelected &&
                  "bg-ink text-paper -translate-x-0.5 -translate-y-0.5 shadow-stkr-pink",
              )}
            >
              {/* Selection Indicator — rond lime ✓ */}
              {isSelected && (
                <span
                  aria-hidden="true"
                  className="absolute top-4 right-4 grid size-7 place-items-center rounded-full border-2 border-ink bg-lime text-ink z-10"
                >
                  <Check className="w-4 h-4" strokeWidth={4} />
                </span>
              )}

              {/* Icon on pastel pilier */}
              <div
                className={cn(
                  "w-16 h-16 rounded-2xl border-2 border-ink flex items-center justify-center mb-4",
                  isSelected ? "bg-paper" : "bg-paper",
                )}
                aria-hidden="true"
              >
                <Icon className={cn("w-8 h-8", profile.accent)} />
              </div>

              <p
                className={cn(
                  "eyebrow tracking-[0.16em] mb-1",
                  isSelected ? "text-paper/60" : "text-mute",
                )}
              >
                {profile.eyebrow}
              </p>
              <h3 className="text-2xl font-display font-extrabold mb-1">{profile.title}</h3>
              <p className={cn("text-sm mb-6", isSelected ? "text-paper/70" : "text-mute")}>
                {profile.subtitle}
              </p>

              {/* Quick Features */}
              <div className="space-y-3 mb-6">
                {profile.features.map((feature, idx) => {
                  const FeatureIcon = feature.icon
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg border-2 border-ink flex items-center justify-center flex-shrink-0",
                          isSelected ? "bg-paper" : "bg-paper",
                        )}
                      >
                        <FeatureIcon className={cn("w-4 h-4", profile.accent)} />
                      </div>
                      <span className="text-sm font-medium">{feature.text}</span>
                    </div>
                  )
                })}
              </div>

              {/* Benefits List */}
              <div
                className={cn(
                  "space-y-2 pt-4 border-t-2",
                  isSelected ? "border-paper/20" : "border-ink/10",
                )}
              >
                {profile.benefits.map((benefit, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-start gap-2 text-sm",
                      isSelected ? "text-paper/70" : "text-mute",
                    )}
                  >
                    <Check className="w-4 h-4 text-lime flex-shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </StickerCard>
          )
        })}
      </div>

      {/* Info Box */}
      <StickerCard variant="panel" className="text-center p-4 bg-paper">
        <p className="text-sm text-ink">
          {selectedType === 'parent' ? (
            <>
              <Shield className="w-4 h-4 inline-block mr-2 text-teal" />
              Vos enfants pourront avoir leur propre espace personnalisé après l'inscription
            </>
          ) : selectedType === 'teen' ? (
            <>
              <Heart className="w-4 h-4 inline-block mr-2 text-pink" />
              Tes parents devront valider ton inscription pour ta sécurité
            </>
          ) : (
            <>Sélectionnez votre type de compte pour continuer</>
          )}
        </p>
      </StickerCard>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour
        </Button>

        <Button
          variant="pink"
          onClick={onNext}
          disabled={!selectedType}
          className="gap-2"
        >
          Continuer
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
