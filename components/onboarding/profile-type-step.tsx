"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Users, User, Shield, Heart, Calendar, Trophy,
  ArrowRight, ArrowLeft, Check, ChevronLeft, ChevronRight
} from 'lucide-react'

interface ProfileTypeStepProps {
  selectedType: 'parent' | 'teen' | null
  onSelect: (type: 'parent' | 'teen') => void
  onNext: () => void
  onBack: () => void
}

export function ProfileTypeStep({ selectedType, onSelect, onNext, onBack }: ProfileTypeStepProps) {
  const prefersReducedMotion = useReducedMotion()

  const fadeUp = (delay: number) => prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay } }
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay } }
  const profiles = [
    {
      type: 'parent' as const,
      icon: Users,
      title: "Je suis Parent",
      subtitle: "J'inscris mon/mes enfant(s)",
      color: "from-blue-500 to-cyan-500",
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
      title: "Je suis Ado",
      subtitle: "J'ai 11-17 ans",
      color: "from-purple-500 to-pink-500",
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
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-3xl sm:text-4xl font-black mb-3">C'est parti !</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Choisissez votre type de compte pour personnaliser votre expérience
        </p>
      </motion.div>

      {/* Profile Type Cards */}
      <div className="grid md:grid-cols-2 gap-6" role="radiogroup" aria-label="Type de compte">
        {profiles.map((profile, index) => {
          const Icon = profile.icon
          const isSelected = selectedType === profile.type

          return (
            <motion.div
              key={profile.type}
              {...fadeUp(0.2 + index * 0.1)}
            >
              <Card
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
                className={`relative overflow-hidden cursor-pointer transition-shadow duration-200 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none ${
                  isSelected
                    ? 'ring-4 ring-primary shadow-2xl border-primary'
                    : 'hover:border-primary/50 hover:shadow-lg'
                }`}
              >
                {/* Selection Indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-primary flex items-center justify-center z-10"
                  >
                    <Check className="w-5 h-5 text-white" />
                  </motion.div>
                )}

                {/* Header with Gradient */}
                <div className={`h-32 bg-gradient-to-br ${profile.color} flex items-center justify-center relative`} aria-hidden="true">
                  <motion.div
                    whileHover={prefersReducedMotion ? {} : { scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Icon className="w-16 h-16 text-white" />
                  </motion.div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-2xl font-black mb-1">{profile.title}</h3>
                  <p className="text-sm text-muted-foreground mb-6">{profile.subtitle}</p>

                  {/* Quick Features */}
                  <div className="space-y-3 mb-6">
                    {profile.features.map((feature, idx) => {
                      const FeatureIcon = feature.icon
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${profile.color} flex items-center justify-center flex-shrink-0`}>
                            <FeatureIcon className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-medium">{feature.text}</span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Benefits List */}
                  <div className="space-y-2 pt-4 border-t">
                    {profile.benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hover Effect */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${profile.color} opacity-0 pointer-events-none`}
                  whileHover={{ opacity: 0.05 }}
                  transition={{ duration: 0.3 }}
                />
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg"
      >
        <p className="text-sm text-blue-600 dark:text-blue-400">
          {selectedType === 'parent' ? (
            <>
              <Shield className="w-4 h-4 inline-block mr-2" />
              Vos enfants pourront avoir leur propre espace personnalisé après l'inscription
            </>
          ) : selectedType === 'teen' ? (
            <>
              <Heart className="w-4 h-4 inline-block mr-2" />
              Tes parents devront valider ton inscription pour ta sécurité
            </>
          ) : (
            <>Sélectionnez votre type de compte pour continuer</>
          )}
        </p>
      </motion.div>

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
          onClick={onNext}
          disabled={!selectedType}
          className="gap-2 bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 text-white disabled:opacity-50"
        >
          Continuer
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
