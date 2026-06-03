"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { SegmentedProgress } from "@/components/ui/progress"
import {
  Trophy, Calendar, Crown, Users,
  Zap, Star, ChevronLeft, ChevronRight,
  CheckCircle2, Shield, Heart
} from 'lucide-react'
import { GamificationIntro } from './gamification/gamification-intro'

interface FeaturesStepProps {
  userType: 'parent' | 'teen' | null
  onNext: () => void
  onBack: () => void
}

export function FeaturesStep({ userType, onNext, onBack }: FeaturesStepProps) {
  const [currentFeature, setCurrentFeature] = useState(0)
  const [showGamificationTutorial, setShowGamificationTutorial] = useState(false)

  const parentFeatures = [
    {
      icon: Shield,
      title: "Dashboard parental",
      description: "Gérez tous les profils de vos enfants depuis un seul endroit",
      accent: "text-teal",
      details: [
        "Vue d'ensemble des activités",
        "Suivi en temps réel",
        "Historique complet",
        "Notifications instantanées"
      ],
      image: "📊"
    },
    {
      icon: Calendar,
      title: "Réservations faciles",
      description: "Réservez et payez en quelques clics",
      accent: "text-lime",
      details: [
        "Calendrier interactif",
        "Paiement sécurisé",
        "Gestion des places",
        "Rappels automatiques"
      ],
      image: "📅"
    },
    {
      icon: Crown,
      title: "Pass VIP",
      description: "Économisez avec les abonnements mensuels",
      accent: "text-gold",
      details: [
        "Jusqu'à 30% de réduction",
        "Events inclus",
        "Accès prioritaire",
        "Cadeaux exclusifs"
      ],
      image: "👑"
    },
    {
      icon: Heart,
      title: "Sécurité & suivi",
      description: "Vos enfants en sécurité, vous en tranquillité",
      accent: "text-pink",
      details: [
        "Photos des événements",
        "Encadrement professionnel",
        "Contact d'urgence",
        "Autorisations de sortie"
      ],
      image: "🛡️"
    }
  ]

  const teenFeatures = [
    {
      icon: Trophy,
      title: "Système de badges",
      description: "Complète des défis et deviens une légende",
      accent: "text-gold",
      details: [
        "Défis quotidiens",
        "Badges exclusifs",
        "Niveaux à débloquer",
        "Récompenses réelles"
      ],
      image: "🏆"
    },
    {
      icon: Users,
      title: "Retrouve tes amis",
      description: "Vois qui participe aux events et rejoins-les",
      accent: "text-pink",
      details: [
        "Liste d'amis",
        "Voir les participants",
        "Inviter des amis",
        "Groupes scolaires"
      ],
      image: "👥"
    },
    {
      icon: Star,
      title: "Ton profil unique",
      description: "Personnalise ton avatar et montre ta personnalité",
      accent: "text-teal",
      details: [
        "Avatar personnalisé",
        "Pseudo unique",
        "Badges visibles",
        "Statistiques XP"
      ],
      image: "⭐"
    },
    {
      icon: Zap,
      title: "Events exclusifs",
      description: "Accède à des événements réservés aux membres",
      accent: "text-lime",
      details: [
        "Events VIP",
        "Réservation prioritaire",
        "Nouveautés en avant-première",
        "Surprise chaque mois"
      ],
      image: "⚡"
    }
  ]

  const features = userType === 'parent' ? parentFeatures : teenFeatures
  const currentFeatureData = features[currentFeature]
  const Icon = currentFeatureData.icon

  const handleNext = () => {
    if (currentFeature < features.length - 1) {
      setCurrentFeature(currentFeature + 1)
    } else {
      // For teens, show gamification tutorial before continuing
      if (userType === 'teen' && !showGamificationTutorial) {
        setShowGamificationTutorial(true)
      } else {
        onNext()
      }
    }
  }

  const handlePrev = () => {
    // If showing tutorial, go back to features
    if (showGamificationTutorial) {
      setShowGamificationTutorial(false)
      return
    }

    if (currentFeature > 0) {
      setCurrentFeature(currentFeature - 1)
    } else {
      onBack()
    }
  }

  // Handle tutorial completion
  const handleTutorialComplete = () => {
    onNext()
  }

  const handleTutorialSkip = () => {
    onNext()
  }

  // Show gamification tutorial for teens
  if (showGamificationTutorial) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <p className="eyebrow tracking-[0.18em] text-mute mb-3">Bonus · Gamification</p>
          <h2 className="text-3xl sm:text-4xl font-display font-extrabold mb-3 text-ink">
            Découvre ton <em className="font-semibold not-italic text-pink">Pouvoir XP</em>
          </h2>
          <p className="text-mute max-w-2xl mx-auto">
            Gagne des points, débloque des badges et deviens une légende !
          </p>
        </div>

        {/* Gamification Tutorial */}
        <GamificationIntro
          onComplete={handleTutorialComplete}
          onSkip={handleTutorialSkip}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <p className="eyebrow tracking-[0.18em] text-mute mb-3">
          {String(currentFeature + 1).padStart(2, '0')} / {features.length}
        </p>
        <h2 className="text-3xl sm:text-4xl font-display font-extrabold mb-3 text-ink">
          {userType === 'parent' ? 'Vos outils' : 'Tes avantages'}
        </h2>
        <p className="text-mute max-w-2xl mx-auto">
          Découvrez les fonctionnalités qui vont vous simplifier la vie
        </p>
      </div>

      {/* Feature Card */}
      <StickerCard className="overflow-hidden max-w-2xl mx-auto">
        {/* Header pastel pilier */}
        <div className="flex flex-col items-center justify-center text-ink bg-paper border-b-2 border-ink py-10">
          <div className="text-6xl mb-4" aria-hidden="true">
            {currentFeatureData.image}
          </div>
          <div className="flex items-center gap-2">
            <Icon className={`w-6 h-6 ${currentFeatureData.accent}`} />
            <h3 className="text-2xl font-display font-extrabold">{currentFeatureData.title}</h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <p className="text-lg text-mute mb-6 text-center">
            {currentFeatureData.description}
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {currentFeatureData.details.map((detail) => (
              <div
                key={detail}
                className="flex items-center gap-3 p-3 rounded-xl border-2 border-ink bg-paper"
              >
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-ink bg-lime"
                  aria-hidden="true"
                >
                  <CheckCircle2 className="w-4 h-4 text-ink" />
                </span>
                <span className="text-sm font-medium">{detail}</span>
              </div>
            ))}
          </div>
        </div>
      </StickerCard>

      {/* Progress segmenté */}
      <div className="max-w-2xl mx-auto">
        <SegmentedProgress steps={features.length} current={currentFeature} />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={handlePrev}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          {currentFeature === 0 ? 'Retour' : 'Précédent'}
        </Button>

        <Button
          variant="pink"
          onClick={handleNext}
          className="gap-2"
        >
          {currentFeature < features.length - 1 ? 'Suivant' : 'Terminer'}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
