'use client'

/**
 * TEENS PARTY MOROCCO - Gamification Intro Tutorial
 * =================================================
 *
 * Tutoriel interactif en 4 slides expliquant:
 * 1. XP & Niveaux
 * 2. Badges
 * 3. Streaks
 * 4. Leaderboard
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  Award,
  Flame,
  Trophy,
  ChevronLeft,
  ChevronRight,
  X,
  Star,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface GamificationIntroProps {
  onComplete: () => void
  onSkip: () => void
}

interface Slide {
  id: string
  icon: React.ReactNode
  iconBg: string
  title: string
  description: string
  content: React.ReactNode
}

export function GamificationIntro({ onComplete, onSkip }: GamificationIntroProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [direction, setDirection] = useState(1)

  const slides: Slide[] = [
    {
      id: 'xp',
      icon: <Zap className="w-8 h-8 text-ink" />,
      iconBg: 'from-teal to-teal',
      title: 'Gagne de l\'XP à chaque action!',
      description: 'Chaque participation, défi complété ou événement te rapporte de l\'XP pour monter de niveau.',
      content: <XPSlideContent />,
    },
    {
      id: 'badges',
      icon: <Award className="w-8 h-8 text-ink" />,
      iconBg: 'from-pink to-pink',
      title: 'Débloque des badges exclusifs!',
      description: 'Collectionne plus de 50 badges uniques en accomplissant des défis spéciaux.',
      content: <BadgesSlideContent />,
    },
    {
      id: 'streaks',
      icon: <Flame className="w-8 h-8 text-ink" />,
      iconBg: 'from-coral to-destructive',
      title: 'Maintiens ta flamme!',
      description: 'Reviens chaque jour pour augmenter ton streak et multiplier tes gains.',
      content: <StreaksSlideContent />,
    },
    {
      id: 'leaderboard',
      icon: <Trophy className="w-8 h-8 text-ink" />,
      iconBg: 'from-gold to-coral',
      title: 'Grimpe le classement!',
      description: 'Défie tes amis et deviens le numéro 1 du leaderboard.',
      content: <LeaderboardSlideContent />,
    },
  ]

  const goNext = () => {
    if (currentSlide < slides.length - 1) {
      setDirection(1)
      setCurrentSlide(currentSlide + 1)
    } else {
      onComplete()
    }
  }

  const goBack = () => {
    if (currentSlide > 0) {
      setDirection(-1)
      setCurrentSlide(currentSlide - 1)
    }
  }

  const slide = slides[currentSlide]

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  }

  return (
    <motion.div
      className="bg-gradient-to-br from-paper-2 to-card border border-ink rounded-2xl p-6 max-w-lg mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header with skip button */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-medium text-mute">Découvre la gamification</h3>
        <button
          onClick={onSkip}
          className="text-mute hover:text-ink transition-colors flex items-center gap-1 text-sm"
        >
          Passer <X className="w-4 h-4" />
        </button>
      </div>

      {/* Slide content */}
      <div className="relative overflow-hidden min-h-[320px]">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={slide.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="text-center"
          >
            {/* Icon */}
            <motion.div
              className={cn(
                'w-20 h-20 rounded-full bg-gradient-to-br mx-auto mb-6 flex items-center justify-center',
                slide.iconBg
              )}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {slide.icon}
            </motion.div>

            {/* Title */}
            <h2 className="text-xl font-bold text-ink mb-2">{slide.title}</h2>

            {/* Description */}
            <p className="text-mute text-sm mb-6">{slide.description}</p>

            {/* Interactive content */}
            <div className="bg-card rounded-2xl p-4">{slide.content}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation dots */}
      <div className="flex justify-center gap-2 my-6">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setDirection(index > currentSlide ? 1 : -1)
              setCurrentSlide(index)
            }}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              index === currentSlide
                ? 'w-6 bg-teal'
                : 'bg-muted hover:bg-muted'
            )}
          />
        ))}
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-3">
        {currentSlide > 0 && (
          <Button variant="outline" onClick={goBack} className="flex-1">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Précédent
          </Button>
        )}
        <Button
          onClick={goNext}
          className={cn(
            'flex-1 bg-gradient-to-r from-teal to-teal hover:from-teal hover:to-teal',
            currentSlide === 0 && 'w-full'
          )}
        >
          {currentSlide === slides.length - 1 ? 'C\'est parti!' : 'Suivant'}
          {currentSlide < slides.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
        </Button>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   SLIDE CONTENTS
   ========================================================================== */

function XPSlideContent() {
  return (
    <div className="space-y-3">
      {/* Mini XP bar animation */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal to-teal flex items-center justify-center">
          <span className="text-ink font-bold text-sm">5</span>
        </div>
        <div className="flex-1">
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-teal to-teal rounded-full"
              initial={{ width: '20%' }}
              animate={{ width: '75%' }}
              transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
            />
          </div>
          <div className="flex justify-between text-xs text-mute mt-1">
            <span>75 / 100 XP</span>
            <span>Niveau 6</span>
          </div>
        </div>
      </div>

      {/* XP sources */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Événement', xp: '+100' },
          { label: 'Défi', xp: '+50' },
          { label: 'Check-in', xp: '+25' },
        ].map((item) => (
          <div key={item.label} className="bg-muted rounded-lg p-2">
            <p className="text-teal font-bold text-sm">{item.xp}</p>
            <p className="text-mute text-xs">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function BadgesSlideContent() {
  const badges = [
    { name: 'VIP', color: 'from-gold to-coral', unlocked: true },
    { name: 'Legend', color: 'from-pink to-pink', unlocked: true },
    { name: '???', color: 'from-paper-2 to-card', unlocked: false },
  ]

  return (
    <div className="flex justify-center gap-4">
      {badges.map((badge, i) => (
        <motion.div
          key={badge.name}
          className={cn(
            'w-16 h-16 rounded-full bg-gradient-to-br flex items-center justify-center',
            badge.color,
            !badge.unlocked && 'opacity-50'
          )}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: i * 0.2, type: 'spring' }}
        >
          {badge.unlocked ? (
            <Award className="w-8 h-8 text-ink" />
          ) : (
            <span className="text-ink text-lg">?</span>
          )}
        </motion.div>
      ))}
    </div>
  )
}

function StreaksSlideContent() {
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

  return (
    <div className="space-y-4">
      {/* Flame counter */}
      <div className="flex items-center justify-center gap-2">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          <Flame className="w-8 h-8 text-coral" />
        </motion.div>
        <span className="text-3xl font-bold text-ink">7</span>
        <span className="text-mute">jours</span>
      </div>

      {/* Week calendar */}
      <div className="flex justify-center gap-2">
        {days.map((day, i) => (
          <motion.div
            key={i}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium',
              i < 5
                ? 'bg-gradient-to-br from-coral to-destructive text-ink'
                : 'bg-muted text-mute'
            )}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            {i < 5 ? <Flame className="w-4 h-4" /> : day}
          </motion.div>
        ))}
      </div>

      {/* Multiplier */}
      <div className="flex items-center justify-center gap-1 text-sm">
        <TrendingUp className="w-4 h-4 text-lime" />
        <span className="text-lime">x1.5 XP bonus</span>
      </div>
    </div>
  )
}

function LeaderboardSlideContent() {
  const players = [
    { rank: 1, name: 'Sarah', xp: 12450, you: false },
    { rank: 2, name: 'Toi', xp: 11200, you: true },
    { rank: 3, name: 'Youssef', xp: 10800, you: false },
  ]

  return (
    <div className="space-y-2">
      {players.map((player, i) => (
        <motion.div
          key={player.rank}
          className={cn(
            'flex items-center gap-3 p-2 rounded-lg',
            player.you
              ? 'bg-gradient-to-r from-teal/20 to-teal/20 border border-teal/30'
              : 'bg-muted'
          )}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.15 }}
        >
          {/* Rank */}
          <div
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
              player.rank === 1
                ? 'bg-gold text-ink'
                : player.rank === 2
                  ? 'bg-muted text-ink'
                  : 'bg-coral text-ink'
            )}
          >
            {player.rank}
          </div>

          {/* Name */}
          <span className={cn('flex-1 font-medium', player.you ? 'text-teal' : 'text-ink')}>
            {player.name}
            {player.you && <Star className="w-3 h-3 inline ml-1 text-gold" />}
          </span>

          {/* XP */}
          <span className="text-mute text-sm">{player.xp.toLocaleString()} XP</span>
        </motion.div>
      ))}
    </div>
  )
}
