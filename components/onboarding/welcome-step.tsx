"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Sparkles, Calendar, Users, Trophy, PartyPopper, Crown,
  Heart, Zap, Star, ArrowRight
} from 'lucide-react'

interface WelcomeStepProps {
  onNext: () => void
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  const prefersReducedMotion = useReducedMotion()

  const features = [
    {
      icon: Calendar,
      title: "Events Inoubliables",
      description: "Anniversaires, clubs, sorties… Des moments magiques chaque semaine",
      color: "from-pink to-pink"
    },
    {
      icon: Users,
      title: "Rencontre tes Amis",
      description: "Retrouve tes potes et fais de nouvelles rencontres",
      color: "from-pink to-pink"
    },
    {
      icon: Trophy,
      title: "Gagne des Badges",
      description: "Complète des défis et deviens une légende",
      color: "from-gold to-coral"
    },
    {
      icon: Crown,
      title: "Avantages VIP",
      description: "Réductions exclusives et accès prioritaire",
      color: "from-teal to-teal"
    }
  ]

  // Animation variants that respect reduced motion
  const heroAnimation = prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : {
        initial: { scale: 0, rotate: -180, opacity: 0 },
        animate: { scale: 1, rotate: 0, opacity: 1 },
        transition: { type: "spring", stiffness: 260, damping: 20, delay: 0.1 }
      }

  const fadeUp = (delay: number) => prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay } }
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay } }

  return (
    <div className="text-center space-y-8">
      {/* Hero Animation */}
      <motion.div
        {...heroAnimation}
        className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary to-pink mb-4"
        aria-hidden="true"
      >
        <Sparkles className="w-12 h-12 text-ink" aria-hidden="true" />
      </motion.div>

      {/* Title */}
      <motion.div {...fadeUp(0.2)}>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 leading-tight text-balance">
          Bienvenue sur
          <br />
          <span className="text-gradient bg-gradient-to-r from-primary via-pink to-pink bg-clip-text text-transparent">
            Teen&nbsp;Club
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
          La plateforme #1 pour les ados de 11–17&nbsp;ans à Casablanca
        </p>
      </motion.div>

      {/* Features Grid */}
      <motion.div
        {...fadeUp(0.4)}
        className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto mt-12"
        role="list"
        aria-label="Fonctionnalités principales"
      >
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <motion.div
              key={feature.title}
              {...fadeUp(0.5 + index * 0.1)}
              role="listitem"
            >
              <Card className="p-6 hover:shadow-lg transition-shadow duration-200 hover:scale-[1.02] focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 border-2 hover:border-primary/50">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}
                  aria-hidden="true"
                >
                  <Icon className="w-6 h-6 text-ink" aria-hidden="true" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-left">{feature.title}</h3>
                <p className="text-sm text-muted-foreground text-left">{feature.description}</p>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Stats */}
      <motion.div
        {...fadeUp(0.9)}
        className="flex items-center justify-center gap-8 pt-8"
        role="group"
        aria-label="Statistiques"
      >
        <div className="text-center">
          <p className="text-3xl font-black text-primary tabular-nums">500+</p>
          <p className="text-sm text-muted-foreground">Ados actifs</p>
        </div>
        <div className="h-12 w-px bg-border" aria-hidden="true" />
        <div className="text-center">
          <p className="text-3xl font-black text-primary tabular-nums">50+</p>
          <p className="text-sm text-muted-foreground">Events/mois</p>
        </div>
        <div className="h-12 w-px bg-border" aria-hidden="true" />
        <div className="text-center">
          <p className="text-3xl font-black text-primary tabular-nums">4.9</p>
          <p className="text-sm text-muted-foreground">
            <Star className="w-4 h-4 inline-block text-gold fill-gold" aria-hidden="true" />
            <span className="sr-only">Note moyenne :</span> Note
          </p>
        </div>
      </motion.div>

      {/* CTA Button */}
      <motion.div
        {...fadeUp(1.1)}
        className="pt-8"
      >
        <Button
          size="lg"
          onClick={onNext}
          className="bg-gradient-to-r from-primary to-pink hover:opacity-90 text-ink px-8 py-6 text-lg font-bold shadow-lg hover:shadow-xl transition-shadow duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Commencer l'aventure
          <motion.span
            animate={prefersReducedMotion ? {} : { x: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            aria-hidden="true"
          >
            <ArrowRight className="w-5 h-5 ml-2" />
          </motion.span>
        </Button>
      </motion.div>
    </div>
  )
}
