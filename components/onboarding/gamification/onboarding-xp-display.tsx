'use client'

/**
 * Nivy - Onboarding XP Display
 * ===========================================
 *
 * Affichage XP flottant pendant l'onboarding avec:
 * - Barre de progression animée
 * - Popup "+XX XP" à chaque gain
 * - Compteur total
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Star, Gift } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TOTAL_ONBOARDING_XP } from '@/gamification-system/features/onboarding/schema'

interface OnboardingXPDisplayProps {
  currentXP: number
  lastGainedXP?: number
  lastGainReason?: string
  showGainAnimation?: boolean
  className?: string
}

export function OnboardingXPDisplay({
  currentXP,
  lastGainedXP = 0,
  lastGainReason,
  showGainAnimation = false,
  className,
}: OnboardingXPDisplayProps) {
  const [displayXP, setDisplayXP] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const percentage = Math.min((currentXP / TOTAL_ONBOARDING_XP) * 100, 100)

  // Animate XP counter
  useEffect(() => {
    if (currentXP === displayXP) return

    setIsAnimating(true)
    const duration = 800
    const startTime = Date.now()
    const startXP = displayXP

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const newXP = Math.round(startXP + (currentXP - startXP) * easeOut)

      setDisplayXP(newXP)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
      }
    }

    requestAnimationFrame(animate)
  }, [currentXP])

  return (
    <div className={cn('relative', className)}>
      {/* XP Gain Popup */}
      <AnimatePresence>
        {showGainAnimation && lastGainedXP > 0 && (
          <XPGainPopup amount={lastGainedXP} reason={lastGainReason} />
        )}
      </AnimatePresence>

      {/* Main XP Bar */}
      <motion.div
        className="rounded-2xl border-2 border-ink bg-white p-4 shadow-stkr-md"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <motion.div
              className="w-8 h-8 rounded-full border-2 border-ink bg-gold flex items-center justify-center"
              animate={isAnimating ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Zap className="w-4 h-4 text-ink" />
            </motion.div>
            {/* #308 — libellé non ambigu : compteur d'avancement d'inscription
                (PAS de l'XP réelle créditée, qui arrive après validation). */}
            <span className="text-mute text-sm font-medium">Progression d'inscription</span>
          </div>

          <motion.div
            className="flex items-center gap-1.5"
            key={displayXP}
            initial={{ scale: 1 }}
            animate={isAnimating ? { scale: [1, 1.1, 1] } : {}}
          >
            <span className="text-ink font-display font-extrabold text-lg tabular-nums">{displayXP}</span>
            <span className="text-mute font-mono text-sm">/ {TOTAL_ONBOARDING_XP}</span>
          </motion.div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-3 bg-ink/10 rounded-full border-2 border-ink overflow-hidden">
          <motion.div
            className="h-full bg-pink rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />

          {/* Milestone Markers */}
          {[25, 50, 75].map((mark) => (
            <div
              key={mark}
              className="absolute top-0 bottom-0 w-0.5 bg-ink/40"
              style={{ left: `${mark}%` }}
            />
          ))}
        </div>

        {/* Rewards Preview */}
        <div className="flex items-center justify-between mt-3 font-mono text-xs text-mute">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-gold" />
            <span>2 badges à débloquer</span>
          </div>
          <div className="flex items-center gap-1">
            <Gift className="w-3 h-3 text-coral" />
            <span>+50 coins bonus</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ==========================================================================
   XP GAIN POPUP
   ========================================================================== */

interface XPGainPopupProps {
  amount: number
  reason?: string
}

function XPGainPopup({ amount, reason }: XPGainPopupProps) {
  return (
    <motion.div
      className="absolute -top-2 right-0 z-50"
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: -60, scale: 1 }}
      exit={{ opacity: 0, y: -80, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      <div className="rounded-xl border-2 border-ink bg-white px-4 py-2 shadow-stkr-sm">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-8 h-8 rounded-full border-2 border-ink bg-gold flex items-center justify-center"
            animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5 }}
          >
            <Zap className="w-4 h-4 text-ink" />
          </motion.div>
          <div>
            <motion.p
              className="text-ink font-display font-extrabold text-lg"
              initial={{ scale: 0.5 }}
              animate={{ scale: [0.5, 1.3, 1] }}
              transition={{ duration: 0.4 }}
            >
              +{amount} XP
            </motion.p>
            {reason && <p className="text-mute text-xs">{reason}</p>}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   COMPACT VERSION (for mobile header)
   ========================================================================== */

interface OnboardingXPCompactProps {
  currentXP: number
  className?: string
}

export function OnboardingXPCompact({ currentXP, className }: OnboardingXPCompactProps) {
  const percentage = Math.min((currentXP / TOTAL_ONBOARDING_XP) * 100, 100)

  return (
    <motion.div
      className={cn(
        'flex items-center gap-2 rounded-full border-2 border-ink bg-white px-3 py-1.5',
        className
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      title="Progression d'inscription"
      aria-label="Progression d'inscription"
    >
      <div className="w-5 h-5 rounded-full border-2 border-ink bg-gold flex items-center justify-center">
        <Zap className="w-3 h-3 text-ink" />
      </div>
      <div className="w-16 h-1.5 bg-ink/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-pink rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      {/* #308 — « pts » d'avancement, pas de l'XP réelle. */}
      <span className="text-ink font-mono text-xs font-bold">{currentXP} pts</span>
    </motion.div>
  )
}
