"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  ArrowRight, ArrowLeft, Trophy, Calendar, Crown, Users,
  Zap, Gift, Star, Sparkles, ChevronLeft, ChevronRight,
  CheckCircle2, Shield, Heart, Smartphone
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
      title: "Dashboard Parental",
      description: "Gérez tous les profils de vos enfants depuis un seul endroit",
      color: "from-blue-500 to-cyan-500",
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
      title: "Réservations Faciles",
      description: "Réservez et payez en quelques clics",
      color: "from-green-500 to-emerald-500",
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
      color: "from-yellow-500 to-orange-500",
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
      title: "Sécurité & Suivi",
      description: "Vos enfants en sécurité, vous en tranquillité",
      color: "from-pink-500 to-rose-500",
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
      title: "Système de Badges",
      description: "Complète des défis et deviens une légende",
      color: "from-yellow-500 to-orange-500",
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
      title: "Retrouve tes Amis",
      description: "Vois qui participe aux events et rejoins-les",
      color: "from-purple-500 to-pink-500",
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
      title: "Ton Profil Unique",
      description: "Personnalise ton avatar et montre ta personnalité",
      color: "from-blue-500 to-cyan-500",
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
      title: "Events Exclusifs",
      description: "Accède à des événements réservés aux membres",
      color: "from-green-500 to-emerald-500",
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
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 mb-4">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">
              Bonus: Système de Gamification
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black mb-3">
            Découvre ton{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Pouvoir XP
            </span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Gagne des points, débloque des badges et deviens une légende!
          </p>
        </motion.div>

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
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            {currentFeature + 1} / {features.length}
          </span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-black mb-3">
          {userType === 'parent' ? 'Vos Outils' : 'Tes Avantages'}
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Découvrez les fonctionnalités qui vont vous simplifier la vie
        </p>
      </motion.div>

      {/* Feature Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentFeature}
          initial={{ opacity: 0, scale: 0.9, rotateY: 90 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          exit={{ opacity: 0, scale: 0.9, rotateY: -90 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="overflow-hidden border-2 max-w-2xl mx-auto">
            {/* Header with gradient */}
            <div className={`relative h-48 bg-gradient-to-br ${currentFeatureData.color} flex flex-col items-center justify-center text-white`}>
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="text-6xl mb-4"
              >
                {currentFeatureData.image}
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-2"
              >
                <Icon className="w-6 h-6" />
                <h3 className="text-2xl font-black">{currentFeatureData.title}</h3>
              </motion.div>
            </div>

            {/* Content */}
            <div className="p-8">
              <p className="text-lg text-muted-foreground mb-6 text-center">
                {currentFeatureData.description}
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                {currentFeatureData.details.map((detail, index) => (
                  <motion.div
                    key={detail}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${currentFeatureData.color} flex items-center justify-center flex-shrink-0`}>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium">{detail}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Progress Dots */}
      <div className="flex justify-center gap-2">
        {features.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentFeature(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentFeature ? 'w-8 bg-primary' : 'w-2 bg-secondary hover:bg-secondary/80'
            }`}
          />
        ))}
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
          onClick={handleNext}
          className="gap-2 bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 text-white"
        >
          {currentFeature < features.length - 1 ? 'Suivant' : 'Terminer'}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
