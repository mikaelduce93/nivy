/**
 * TEENS PARTY MOROCCO - Wrapped Slides Component
 * ===============================================
 *
 * Composants de slides pour le récapitulatif annuel style Spotify.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  Share2,
  X,
  Sparkles,
  Trophy,
  Flame,
  Gamepad2,
  Target,
  Calendar,
  Heart,
  Crown,
  Zap,
} from "lucide-react"
import confetti from "canvas-confetti"
import {
  type UserWrapped,
  type WrappedSlide,
  generateWrappedSlides,
  formatWrappedValue,
  getPercentileMessage,
  WRAPPED_ACHIEVEMENT_CONFIG,
  type WrappedAchievement,
} from "../../features/annual-wrapped"

/* ==========================================================================
   WRAPPED VIEWER
   ========================================================================== */

interface WrappedViewerProps {
  wrapped: UserWrapped
  onClose?: () => void
  onShare?: () => void
}

export function WrappedViewer({ wrapped, onClose, onShare }: WrappedViewerProps) {
  const slides = generateWrappedSlides(wrapped)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  const currentSlide = slides[currentIndex]

  const goToNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      setDirection(1)
      setCurrentIndex((prev) => prev + 1)
    }
  }, [currentIndex, slides.length])

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1)
      setCurrentIndex((prev) => prev - 1)
    }
  }, [currentIndex])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        goToNext()
      } else if (e.key === "ArrowLeft") {
        goToPrev()
      } else if (e.key === "Escape" && onClose) {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [goToNext, goToPrev, onClose])

  // Confetti on special slides
  useEffect(() => {
    if (
      currentSlide.type === "achievements" ||
      currentSlide.type === "percentile" ||
      currentSlide.type === "outro"
    ) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      })
    }
  }, [currentIndex, currentSlide.type])

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Progress dots */}
        <div className="flex gap-1">
          {slides.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 rounded-full transition-all ${
                idx === currentIndex
                  ? "w-6 bg-white"
                  : idx < currentIndex
                  ? "w-2 bg-white/70"
                  : "w-2 bg-white/30"
              }`}
            />
          ))}
        </div>

        <button
          onClick={onShare}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <Share2 className="w-6 h-6" />
        </button>
      </div>

      {/* Slide content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentIndex}
          custom={direction}
          initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction > 0 ? -100 : 100 }}
          transition={{ duration: 0.3 }}
          className={`absolute inset-0 flex flex-col items-center justify-center p-8 bg-gradient-to-br ${currentSlide.config.gradient}`}
          onClick={(e) => {
            const x = e.clientX
            const width = window.innerWidth
            if (x > width / 2) {
              goToNext()
            } else {
              goToPrev()
            }
          }}
        >
          <SlideContent
            slide={currentSlide}
            wrapped={wrapped}
            isLast={currentIndex === slides.length - 1}
          />
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-between px-4">
        <button
          onClick={(e) => {
            e.stopPropagation()
            goToPrev()
          }}
          disabled={currentIndex === 0}
          className={`p-3 rounded-full bg-white/10 text-white transition-opacity ${
            currentIndex === 0 ? "opacity-30" : "hover:bg-white/20"
          }`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation()
            goToNext()
          }}
          disabled={currentIndex === slides.length - 1}
          className={`p-3 rounded-full bg-white/10 text-white transition-opacity ${
            currentIndex === slides.length - 1 ? "opacity-30" : "hover:bg-white/20"
          }`}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}

/* ==========================================================================
   SLIDE CONTENT
   ========================================================================== */

interface SlideContentProps {
  slide: WrappedSlide
  wrapped: UserWrapped
  isLast: boolean
}

function SlideContent({ slide, wrapped, isLast }: SlideContentProps) {
  const { type, content } = slide

  // Render based on slide type
  switch (type) {
    case "intro":
      return <IntroSlide year={wrapped.year} />

    case "total_xp":
      return (
        <StatSlide
          emoji="⚡"
          value={wrapped.data.summary.total_xp}
          unit="XP"
          title="Tu as accumulé"
          subtitle="cette année"
        />
      )

    case "total_events":
      return (
        <StatSlide
          emoji="🎉"
          value={wrapped.data.summary.total_events}
          unit="événements"
          title="Tu as participé à"
          subtitle="Quelle année !"
        />
      )

    case "most_xp_day":
      return (
        <HighlightSlide
          title={content.title}
          description={content.description}
          value={content.value}
          unit={content.unit}
          emoji="🏆"
        />
      )

    case "longest_streak":
      return (
        <StatSlide
          emoji="🔥"
          value={wrapped.data.summary.longest_streak}
          unit="jours"
          title="Ta plus longue série"
          subtitle="de connexion"
        />
      )

    case "challenges_completed":
      return (
        <StatSlide
          emoji="🎯"
          value={wrapped.data.summary.total_challenges}
          unit="défis"
          title="Tu as relevé"
          subtitle="Impressionnant !"
        />
      )

    case "games_played":
      return (
        <StatSlide
          emoji="🎮"
          value={wrapped.data.summary.total_games}
          unit="parties"
          title="Tu as joué"
          subtitle="de mini-jeux"
        />
      )

    case "favorites":
      return (
        <FavoritesSlide
          topMonth={wrapped.data.favorites.top_month}
          favoriteGame={wrapped.data.favorites.favorite_game}
          topDay={wrapped.data.favorites.top_day}
        />
      )

    case "achievements":
      return <AchievementsSlide achievements={wrapped.achievements} />

    case "percentile":
      return (
        <PercentileSlide percentile={wrapped.data.percentiles.xp_percentile || 0} />
      )

    case "outro":
      return <OutroSlide year={wrapped.year} />

    default:
      return (
        <HighlightSlide
          title={content.title}
          description={content.description}
          value={content.value}
          unit={content.unit}
          emoji={content.emoji}
        />
      )
  }
}

/* ==========================================================================
   INTRO SLIDE
   ========================================================================== */

interface IntroSlideProps {
  year: number
}

function IntroSlide({ year }: IntroSlideProps) {
  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="text-8xl mb-6"
      >
        ✨
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-4xl font-bold text-white mb-4"
      >
        Ton {year}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-xl text-white/80 mb-8"
      >
        en revue
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-white/60"
      >
        Tape pour commencer →
      </motion.p>
    </div>
  )
}

/* ==========================================================================
   STAT SLIDE
   ========================================================================== */

interface StatSlideProps {
  emoji: string
  value: number
  unit: string
  title: string
  subtitle?: string
}

function StatSlide({ emoji, value, unit, title, subtitle }: StatSlideProps) {
  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="text-7xl mb-6"
      >
        {emoji}
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-xl text-white/80 mb-4"
      >
        {title}
      </motion.p>

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        className="mb-4"
      >
        <CountingNumber value={value} className="text-7xl font-bold text-white" />
        <p className="text-2xl text-white/80 mt-2">{unit}</p>
      </motion.div>

      {subtitle && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-lg text-white/60"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  )
}

/* ==========================================================================
   HIGHLIGHT SLIDE
   ========================================================================== */

interface HighlightSlideProps {
  title: string
  description?: string
  value?: number | string
  unit?: string
  emoji: string
}

function HighlightSlide({
  title,
  description,
  value,
  unit,
  emoji,
}: HighlightSlideProps) {
  return (
    <div className="text-center max-w-md">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring" }}
        className="text-6xl mb-6"
      >
        {emoji}
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-bold text-white mb-4"
      >
        {title}
      </motion.h2>

      {value !== undefined && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring" }}
          className="mb-4"
        >
          <span className="text-5xl font-bold text-white">
            {typeof value === "number" ? value.toLocaleString() : value}
          </span>
          {unit && <span className="text-xl text-white/80 ml-2">{unit}</span>}
        </motion.div>
      )}

      {description && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-lg text-white/80"
        >
          {description}
        </motion.p>
      )}
    </div>
  )
}

/* ==========================================================================
   FAVORITES SLIDE
   ========================================================================== */

interface FavoritesSlideProps {
  topMonth: string | null
  favoriteGame: string | null
  topDay: string | null
}

function FavoritesSlide({
  topMonth,
  favoriteGame,
  topDay,
}: FavoritesSlideProps) {
  return (
    <div className="text-center max-w-md">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="text-6xl mb-6"
      >
        ❤️
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-white mb-8"
      >
        Tes préférés
      </motion.h2>

      <div className="space-y-4">
        {topMonth && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-xl bg-white/10"
          >
            <p className="text-white/60 text-sm">Mois préféré</p>
            <p className="text-xl font-bold text-white">{topMonth}</p>
          </motion.div>
        )}

        {topDay && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="p-4 rounded-xl bg-white/10"
          >
            <p className="text-white/60 text-sm">Jour préféré</p>
            <p className="text-xl font-bold text-white">{topDay}</p>
          </motion.div>
        )}

        {favoriteGame && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="p-4 rounded-xl bg-white/10"
          >
            <p className="text-white/60 text-sm">Jeu favori</p>
            <p className="text-xl font-bold text-white capitalize">
              {favoriteGame.replace("_", " ")}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

/* ==========================================================================
   ACHIEVEMENTS SLIDE
   ========================================================================== */

interface AchievementsSlideProps {
  achievements: UserWrapped["achievements"]
}

function AchievementsSlide({ achievements }: AchievementsSlideProps) {
  return (
    <div className="text-center max-w-md">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="text-6xl mb-6"
      >
        🏅
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-white mb-2"
      >
        Tes titres
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-white/60 mb-8"
      >
        Tu as débloqué {achievements.length} badge{achievements.length > 1 ? "s" : ""}
      </motion.p>

      <div className="grid grid-cols-2 gap-3">
        {achievements.slice(0, 4).map((achievement, idx) => {
          const config =
            WRAPPED_ACHIEVEMENT_CONFIG[achievement.slug as WrappedAchievement]

          return (
            <motion.div
              key={achievement.slug}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
              className={`p-4 rounded-xl bg-gradient-to-br ${
                config?.gradient || "from-zinc-500 to-zinc-600"
              }`}
            >
              <span className="text-3xl">{achievement.emoji}</span>
              <p className="text-sm font-bold text-white mt-2">
                {achievement.title}
              </p>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* ==========================================================================
   PERCENTILE SLIDE
   ========================================================================== */

interface PercentileSlideProps {
  percentile: number
}

function PercentileSlide({ percentile }: PercentileSlideProps) {
  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="text-7xl mb-6"
      >
        👑
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl text-white/80 mb-4"
      >
        Tu fais mieux que
      </motion.p>

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring" }}
        className="mb-4"
      >
        <CountingNumber
          value={percentile}
          className="text-8xl font-bold text-white"
        />
        <span className="text-4xl text-white/80">%</span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-xl text-white/80 mb-2"
      >
        des membres
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-lg text-white/60"
      >
        {getPercentileMessage(percentile)}
      </motion.p>
    </div>
  )
}

/* ==========================================================================
   OUTRO SLIDE
   ========================================================================== */

interface OutroSlideProps {
  year: number
}

function OutroSlide({ year }: OutroSlideProps) {
  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring" }}
        className="text-8xl mb-6"
      >
        🚀
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-4xl font-bold text-white mb-4"
      >
        Merci pour {year} !
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-xl text-white/80 mb-8"
      >
        À l'année prochaine pour encore plus d'aventures !
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex items-center justify-center gap-2 text-white/60"
      >
        <Sparkles className="w-5 h-5" />
        <span>Teens Party Morocco</span>
        <Sparkles className="w-5 h-5" />
      </motion.div>
    </div>
  )
}

/* ==========================================================================
   COUNTING NUMBER
   ========================================================================== */

interface CountingNumberProps {
  value: number
  className?: string
}

function CountingNumber({ value, className }: CountingNumberProps) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const duration = 1500
    const steps = 60
    const increment = value / steps
    let current = 0
    let step = 0

    const timer = setInterval(() => {
      step++
      current = Math.min(value, Math.round(increment * step))
      setDisplayValue(current)

      if (step >= steps) {
        clearInterval(timer)
        setDisplayValue(value)
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [value])

  return <span className={className}>{displayValue.toLocaleString()}</span>
}
