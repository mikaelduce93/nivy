'use client'

/**
 * Nivy - Gamification Intro Tutorial
 * ==================================
 *
 * Tutoriel interactif en 4 slides expliquant:
 * 1. XP & Niveaux
 * 2. Badges
 * 3. Streaks
 * 4. Leaderboard
 */

import { useState } from 'react'
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
import { StickerCard } from '@/components/ui/sticker-card'
import { SegmentedProgress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface GamificationIntroProps {
  onComplete: () => void
  onSkip: () => void
}

interface Slide {
  id: string
  icon: React.ReactNode
  iconColor: string
  title: string
  description: string
  content: React.ReactNode
}

export function GamificationIntro({ onComplete, onSkip }: GamificationIntroProps) {
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides: Slide[] = [
    {
      id: 'xp',
      icon: <Zap className="w-8 h-8 text-gold" />,
      iconColor: 'text-gold',
      title: 'Gagne de l\'XP à chaque action !',
      description: 'Chaque participation, défi complété ou événement te rapporte de l\'XP pour monter de niveau.',
      content: <XPSlideContent />,
    },
    {
      id: 'badges',
      icon: <Award className="w-8 h-8 text-pink" />,
      iconColor: 'text-pink',
      title: 'Débloque des badges exclusifs !',
      description: 'Collectionne plus de 50 badges uniques en accomplissant des défis spéciaux.',
      content: <BadgesSlideContent />,
    },
    {
      id: 'streaks',
      icon: <Flame className="w-8 h-8 text-coral" />,
      iconColor: 'text-coral',
      title: 'Maintiens ta flamme !',
      description: 'Reviens chaque jour pour augmenter ton streak et multiplier tes gains.',
      content: <StreaksSlideContent />,
    },
    {
      id: 'leaderboard',
      icon: <Trophy className="w-8 h-8 text-teal" />,
      iconColor: 'text-teal',
      title: 'Grimpe le classement !',
      description: 'Défie tes amis et deviens le numéro 1 du leaderboard.',
      content: <LeaderboardSlideContent />,
    },
  ]

  const goNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    } else {
      onComplete()
    }
  }

  const goBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const slide = slides[currentSlide]

  return (
    <StickerCard className="p-6 max-w-lg mx-auto">
      {/* Header with skip button */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="eyebrow tracking-[0.16em] text-mute">Découvre la gamification</h3>
        <button
          onClick={onSkip}
          className="text-mute hover:text-ink transition-colors flex items-center gap-1 text-sm"
        >
          Passer <X className="w-4 h-4" />
        </button>
      </div>

      {/* Slide content */}
      <div className="relative min-h-[320px]">
        <div className="text-center">
          {/* Icon on pastel pilier */}
          <div
            className="w-20 h-20 rounded-2xl border-2 border-ink bg-paper mx-auto mb-6 flex items-center justify-center"
            aria-hidden="true"
          >
            {slide.icon}
          </div>

          {/* Title */}
          <h2 className="text-xl font-display font-extrabold text-ink mb-2">{slide.title}</h2>

          {/* Description */}
          <p className="text-mute text-sm mb-6">{slide.description}</p>

          {/* Interactive content */}
          <div className="rounded-2xl border-2 border-ink bg-paper p-4">{slide.content}</div>
        </div>
      </div>

      {/* Progress segmenté */}
      <div className="my-6">
        <SegmentedProgress steps={slides.length} current={currentSlide} />
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
          variant="pink"
          onClick={goNext}
          className={cn('flex-1', currentSlide === 0 && 'w-full')}
        >
          {currentSlide === slides.length - 1 ? 'C\'est parti !' : 'Suivant'}
          {currentSlide < slides.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
        </Button>
      </div>
    </StickerCard>
  )
}

/* ==========================================================================
   SLIDE CONTENTS
   ========================================================================== */

function XPSlideContent() {
  return (
    <div className="space-y-3">
      {/* Mini XP bar */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-ink bg-gold flex items-center justify-center">
          <span className="text-ink font-bold text-sm">5</span>
        </div>
        <div className="flex-1">
          <div className="h-3 bg-ink/12 rounded-full overflow-hidden border border-ink">
            <div className="h-full bg-gold rounded-full" style={{ width: '75%' }} />
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
          <div key={item.label} className="rounded-lg border-2 border-ink bg-white p-2">
            <p className="text-gold font-bold text-sm">{item.xp}</p>
            <p className="text-mute text-xs">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function BadgesSlideContent() {
  const badges = [
    { name: 'VIP', accent: 'text-gold', unlocked: true },
    { name: 'Legend', accent: 'text-pink', unlocked: true },
    { name: '???', accent: 'text-mute', unlocked: false },
  ]

  return (
    <div className="flex justify-center gap-4">
      {badges.map((badge) => (
        <div
          key={badge.name}
          className={cn(
            'w-16 h-16 rounded-full border-2 border-ink bg-white flex items-center justify-center',
            !badge.unlocked && 'opacity-50',
          )}
        >
          {badge.unlocked ? (
            <Award className={cn('w-8 h-8', badge.accent)} />
          ) : (
            <span className="text-mute text-lg">?</span>
          )}
        </div>
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
        <Flame className="w-8 h-8 text-coral" />
        <span className="text-3xl font-display font-extrabold text-ink">7</span>
        <span className="text-mute">jours</span>
      </div>

      {/* Week calendar */}
      <div className="flex justify-center gap-2">
        {days.map((day, i) => (
          <div
            key={i}
            className={cn(
              'w-8 h-8 rounded-full border-2 border-ink flex items-center justify-center text-xs font-medium',
              i < 5 ? 'bg-coral text-ink' : 'bg-white text-mute',
            )}
          >
            {i < 5 ? <Flame className="w-4 h-4" /> : day}
          </div>
        ))}
      </div>

      {/* Multiplier */}
      <div className="flex items-center justify-center gap-1 text-sm">
        <TrendingUp className="w-4 h-4 text-lime" />
        <span className="text-lime font-semibold">x1.5 XP bonus</span>
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
      {players.map((player) => (
        <div
          key={player.rank}
          className={cn(
            'flex items-center gap-3 p-2 rounded-lg border-2 border-ink',
            player.you ? 'bg-ink text-paper' : 'bg-white',
          )}
        >
          {/* Rank */}
          <div
            className={cn(
              'w-6 h-6 rounded-full border-2 border-ink flex items-center justify-center text-xs font-bold',
              player.rank === 1
                ? 'bg-gold text-ink'
                : player.rank === 2
                  ? 'bg-paper text-ink'
                  : 'bg-coral text-ink',
            )}
          >
            {player.rank}
          </div>

          {/* Name */}
          <span className={cn('flex-1 font-medium', player.you ? 'text-paper' : 'text-ink')}>
            {player.name}
            {player.you && <Star className="w-3 h-3 inline ml-1 text-gold" />}
          </span>

          {/* XP */}
          <span className={cn('text-sm', player.you ? 'text-paper/70' : 'text-mute')}>
            {player.xp.toLocaleString()} XP
          </span>
        </div>
      ))}
    </div>
  )
}
