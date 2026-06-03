"use client"

import { useState } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import {
  PartyPopper, Palette, Gamepad2, ChevronLeft, ChevronRight, Play
} from 'lucide-react'

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
      accent: "bg-pink",
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
      accent: "bg-gold",
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
      description: "Sorties au ciné, gaming parties, ateliers… Il se passe toujours quelque chose !",
      image: "/images/onboarding/events.jpg",
      accent: "bg-teal",
      stats: [
        { label: "Events/mois", value: "50+" },
        { label: "Ados", value: "500+" },
        { label: "Nouveaux", value: "Chaque semaine" }
      ],
      highlights: [
        "Tournois gaming",
        "Sorties ciné & bowling",
        "Ateliers créatifs",
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
        <div className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-paper-2 px-4 py-2 mb-4">
          <Icon className="w-4 h-4 text-ink" aria-hidden="true" />
          <span className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ink">{currentShowcase.category}</span>
        </div>
        <h2 className="font-display text-3xl sm:text-4xl font-extrabold mb-3">{currentShowcase.title}</h2>
        <p className="text-mute max-w-2xl mx-auto">{currentShowcase.description}</p>
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
          <StickerCard className="overflow-hidden">
            {/* Image Section */}
            <div className={`relative h-64 sm:h-80 ${currentShowcase.accent} flex items-center justify-center border-b-2 border-ink`}>
              <div className="relative z-10 text-center text-ink" aria-hidden="true">
                <motion.div
                  initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={prefersReducedMotion ? { duration: 0.15 } : { delay: 0.2, type: "spring" }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-ink bg-paper mb-4 shadow-stkr-sm"
                >
                  <Icon className="w-10 h-10" />
                </motion.div>
                <div className="flex items-center justify-center gap-2 text-sm font-medium">
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
                    className="flex-1 rounded-xl border-2 border-ink bg-paper p-3 text-center shadow-stkr-sm"
                  >
                    <p className="font-display text-2xl font-extrabold text-ink tabular-nums">{stat.value}</p>
                    <p className="font-mono text-[11px] uppercase tracking-wide text-mute">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6 sm:p-8">
              <h3 className="font-display font-bold text-xl mb-4">Ce qui t'attend :</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {currentShowcase.highlights.map((highlight, index) => (
                  <motion.div
                    key={highlight}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="flex items-center gap-3 rounded-xl border-2 border-ink bg-paper-2 p-3"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full border border-ink ${currentShowcase.accent}`} />
                    <span className="text-sm font-medium">{highlight}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </StickerCard>
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
            className={`h-2.5 rounded-full border-2 border-ink transition-all duration-200 focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 ${
              index === currentSlide ? 'w-8 bg-pink' : 'w-2.5 bg-paper-2 hover:bg-line'
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
          variant="pink"
          onClick={handleNext}
          className="gap-2"
        >
          {currentSlide < showcases.length - 1 ? 'Suivant' : 'Continuer'}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
