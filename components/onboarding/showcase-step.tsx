"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  ArrowRight, ArrowLeft, PartyPopper, Palette, Dumbbell,
  Gamepad2, Music, Camera, MapPin, Clock, Users, ChevronLeft,
  ChevronRight, Play
} from 'lucide-react'
import Image from "next/image"

interface ShowcaseStepProps {
  onNext: () => void
  onBack: () => void
}

export function ShowcaseStep({ onNext, onBack }: ShowcaseStepProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const prefersReducedMotion = useReducedMotion()

  const showcases = [
    {
      category: "Anniversaires",
      icon: PartyPopper,
      title: "Fête ton anniversaire comme jamais",
      description: "Des anniversaires inoubliables avec tes amis, des activités folles et des souvenirs à vie",
      image: "/images/onboarding/birthday.jpg",
      color: "from-pink-500 to-rose-500",
      stats: [
        { label: "Formules", value: "3+" },
        { label: "Activités", value: "10+" },
        { label: "Places", value: "15-30" }
      ],
      highlights: [
        "Salle décorée à ton goût",
        "Animations et jeux",
        "Gâteau et goûter inclus",
        "Photos souvenirs"
      ]
    },
    {
      category: "Clubs",
      icon: Palette,
      title: "Développe tes talents",
      description: "Rejoins nos clubs créatifs, sportifs et technologiques. Apprends en t'amusant !",
      image: "/images/onboarding/clubs.jpg",
      color: "from-purple-500 to-indigo-500",
      stats: [
        { label: "Clubs", value: "12+" },
        { label: "Catégories", value: "3" },
        { label: "Profs", value: "Expert" }
      ],
      highlights: [
        "Art & Créativité",
        "Sport & Fitness",
        "Tech & Gaming",
        "Musique & Danse"
      ]
    },
    {
      category: "Events",
      icon: Gamepad2,
      title: "Des événements chaque semaine",
      description: "Sorties au ciné, gaming parties, workshops… Il se passe toujours quelque chose !",
      image: "/images/onboarding/events.jpg",
      color: "from-blue-500 to-cyan-500",
      stats: [
        { label: "Events/mois", value: "50+" },
        { label: "Ados", value: "500+" },
        { label: "Nouveaux", value: "Weekly" }
      ],
      highlights: [
        "Gaming tournaments",
        "Sorties ciné & bowling",
        "Workshops créatifs",
        "Pool parties d'été"
      ]
    }
  ]

  const currentShowcase = showcases[currentSlide]
  const Icon = currentShowcase.icon

  const handleNext = () => {
    if (currentSlide < showcases.length - 1) {
      setCurrentSlide(currentSlide + 1)
    } else {
      onNext()
    }
  }

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    } else {
      onBack()
    }
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
          <Icon className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">{currentShowcase.category}</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-black mb-3">{currentShowcase.title}</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">{currentShowcase.description}</p>
      </motion.div>

      {/* Main Showcase Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -100 }}
          transition={{ duration: prefersReducedMotion ? 0.15 : 0.3 }}
          role="tabpanel"
          aria-label={currentShowcase.category}
        >
          <Card className="overflow-hidden border-2">
            {/* Image Section */}
            <div className={`relative h-64 sm:h-80 bg-gradient-to-br ${currentShowcase.color} flex items-center justify-center`}>
              {/* Placeholder for actual images */}
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative z-10 text-center text-white" aria-hidden="true">
                <motion.div
                  initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={prefersReducedMotion ? { duration: 0.15 } : { delay: 0.2, type: "spring" }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-4"
                >
                  <Icon className="w-10 h-10" />
                </motion.div>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Play className="w-4 h-4" />
                  <span>Voir la vidéo</span>
                </div>
              </div>

              {/* Stats Overlay */}
              <div className="absolute bottom-4 left-4 right-4 flex gap-2" role="group" aria-label="Statistiques">
                {currentShowcase.stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: prefersReducedMotion ? 0 : 0.3 + index * 0.1 }}
                    className="flex-1 bg-white/90 backdrop-blur-sm rounded-lg p-3 text-center"
                  >
                    <p className="text-2xl font-black text-primary tabular-nums">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6 sm:p-8">
              <h3 className="font-bold text-xl mb-4">Ce qui t'attend :</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {currentShowcase.highlights.map((highlight, index) => (
                  <motion.div
                    key={highlight}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${currentShowcase.color}`} />
                    <span className="text-sm font-medium">{highlight}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Slide Indicators */}
      <div className="flex justify-center gap-2" role="tablist" aria-label="Diaporama des fonctionnalités">
        {showcases.map((showcase, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            role="tab"
            aria-selected={index === currentSlide}
            aria-label={`Voir ${showcase.category} (${index + 1} sur ${showcases.length})`}
            className={`h-2 rounded-full transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              index === currentSlide ? 'w-8 bg-primary' : 'w-2 bg-secondary hover:bg-secondary/80'
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
          Retour
        </Button>

        <Button
          onClick={handleNext}
          className="gap-2 bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 text-white"
        >
          {currentSlide < showcases.length - 1 ? 'Suivant' : 'Continuer'}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
