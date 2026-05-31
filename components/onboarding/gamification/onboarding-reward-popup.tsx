'use client'

/**
 * Nivy - Onboarding Reward Popup
 * =============================================
 *
 * Popups de célébration pour les récompenses:
 * - XP gain avec animation
 * - Badge unlock avec modal
 * - Coins bonus
 * - Confetti effects
 */

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, Award, Coins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import confetti from 'canvas-confetti'
import { BADGE_DISPLAY_INFO } from '@/gamification-system/features/onboarding/schema'

/* ==========================================================================
   TYPES
   ========================================================================== */

type RewardType = 'xp' | 'badge' | 'coins' | 'completion'

interface BaseReward {
  type: RewardType
}

interface XPReward extends BaseReward {
  type: 'xp'
  amount: number
  reason?: string
}

interface BadgeReward extends BaseReward {
  type: 'badge'
  badgeCode: string
}

interface CoinsReward extends BaseReward {
  type: 'coins'
  amount: number
}

interface CompletionReward extends BaseReward {
  type: 'completion'
  totalXP: number
  badges: string[]
  coins: number
}

type Reward = XPReward | BadgeReward | CoinsReward | CompletionReward

interface OnboardingRewardPopupProps {
  reward: Reward | null
  onClose: () => void
  autoClose?: boolean
  autoCloseDelay?: number
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export function OnboardingRewardPopup({
  reward,
  onClose,
  autoClose = true,
  autoCloseDelay = 3000,
}: OnboardingRewardPopupProps) {
  // Auto close timer
  useEffect(() => {
    if (!reward || !autoClose) return
    if (reward.type === 'completion' || reward.type === 'badge') return // Don't auto-close these

    const timer = setTimeout(onClose, autoCloseDelay)
    return () => clearTimeout(timer)
  }, [reward, autoClose, autoCloseDelay, onClose])

  // Confetti on badge/completion
  useEffect(() => {
    if (!reward) return
    if (reward.type === 'badge' || reward.type === 'completion') {
      triggerConfetti()
    }
  }, [reward])

  if (!reward) return null

  return (
    <AnimatePresence mode="wait">
      {reward.type === 'xp' && <XPPopup reward={reward} onClose={onClose} />}
      {reward.type === 'coins' && <CoinsPopup reward={reward} onClose={onClose} />}
      {reward.type === 'badge' && <BadgeModal reward={reward} onClose={onClose} />}
      {reward.type === 'completion' && <CompletionModal reward={reward} onClose={onClose} />}
    </AnimatePresence>
  )
}

/* ==========================================================================
   XP POPUP (Toast style)
   ========================================================================== */

function XPPopup({ reward, onClose }: { reward: XPReward; onClose: () => void }) {
  return (
    <motion.div
      className="fixed top-24 right-4 z-50"
      initial={{ opacity: 0, x: 100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="rounded-2xl border-2 border-ink bg-white px-5 py-4 shadow-stkr-md">
        <div className="flex items-center gap-4">
          <motion.div
            className="w-12 h-12 rounded-full border-2 border-ink bg-gold flex items-center justify-center"
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: 2 }}
          >
            <Zap className="w-6 h-6 text-ink" />
          </motion.div>
          <div>
            <motion.p
              className="text-ink font-display font-extrabold text-2xl"
              initial={{ scale: 0.5 }}
              animate={{ scale: [0.5, 1.2, 1] }}
              transition={{ duration: 0.4 }}
            >
              +{reward.amount} XP
            </motion.p>
            {reward.reason && <p className="text-mute text-sm">{reward.reason}</p>}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   COINS POPUP (Toast style)
   ========================================================================== */

function CoinsPopup({ reward, onClose }: { reward: CoinsReward; onClose: () => void }) {
  return (
    <motion.div
      className="fixed top-24 right-4 z-50"
      initial={{ opacity: 0, x: 100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="rounded-2xl border-2 border-ink bg-white px-5 py-4 shadow-stkr-md">
        <div className="flex items-center gap-4">
          <motion.div
            className="w-12 h-12 rounded-full border-2 border-ink bg-coral flex items-center justify-center"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            <Coins className="w-6 h-6 text-ink" />
          </motion.div>
          <div>
            <motion.p
              className="text-ink font-display font-extrabold text-2xl"
              initial={{ scale: 0.5 }}
              animate={{ scale: [0.5, 1.2, 1] }}
              transition={{ duration: 0.4 }}
            >
              +{reward.amount} Coins
            </motion.p>
            <p className="text-mute text-sm">Bonus de bienvenue</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   BADGE MODAL (Full screen)
   ========================================================================== */

function BadgeModal({ reward, onClose }: { reward: BadgeReward; onClose: () => void }) {
  const badgeInfo = BADGE_DISPLAY_INFO[reward.badgeCode] || {
    name: 'Badge',
    description: 'Récompense débloquée !',
    icon: 'award',
    rarity: 'common',
  }

  const rarityColors: Record<string, string> = {
    common: 'bg-paper-2',
    rare: 'bg-teal',
    epic: 'bg-pink',
    legendary: 'bg-gold',
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative bg-white border-2 border-ink rounded-2xl p-8 max-w-sm mx-4 text-center shadow-stkr-md"
        initial={{ scale: 0.5, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-mute hover:text-ink transition-colors"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Badge icon */}
        <motion.div
          className={cn(
            'w-24 h-24 mx-auto rounded-full border-2 border-ink flex items-center justify-center mb-6 shadow-stkr-sm',
            rarityColors[badgeInfo.rarity]
          )}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Award className="w-12 h-12 text-ink" />
        </motion.div>

        {/* Badge title */}
        <motion.h2
          className="font-display text-2xl font-extrabold text-ink mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {badgeInfo.name}
        </motion.h2>

        {/* Description */}
        <motion.p
          className="text-mute mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {badgeInfo.description}
        </motion.p>

        {/* Continue button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button onClick={onClose} variant="pink" className="w-full">
            Continuer
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

/* ==========================================================================
   COMPLETION MODAL (Final celebration)
   ========================================================================== */

function CompletionModal({
  reward,
  onClose,
}: {
  reward: CompletionReward
  onClose: () => void
}) {
  useEffect(() => {
    // Multiple confetti bursts
    const bursts = [0, 500, 1000]
    bursts.forEach((delay) => {
      setTimeout(() => triggerConfetti(), delay)
    })
  }, [])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative bg-white border-2 border-ink rounded-2xl p-8 max-w-md mx-4 text-center overflow-hidden shadow-stkr-md"
        initial={{ scale: 0.5, y: 100 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        {/* Content */}
        <div className="relative">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="font-display text-3xl font-extrabold text-ink mb-2">
              <em className="font-semibold italic text-pink">Bienvenue !</em>
            </h1>
            <p className="text-mute mb-8">Tu fais maintenant partie de la famille</p>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="grid grid-cols-3 gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {/* XP */}
            <div className="rounded-xl border-2 border-ink bg-paper-2 p-4">
              <Zap className="w-6 h-6 text-gold mx-auto mb-2" />
              <p className="font-display text-2xl font-extrabold text-ink tabular-nums">{reward.totalXP}</p>
              <p className="font-mono text-xs uppercase tracking-wide text-mute">XP gagnés</p>
            </div>

            {/* Badges */}
            <div className="rounded-xl border-2 border-ink bg-paper-2 p-4">
              <Award className="w-6 h-6 text-teal mx-auto mb-2" />
              <p className="font-display text-2xl font-extrabold text-ink tabular-nums">{reward.badges.length}</p>
              <p className="font-mono text-xs uppercase tracking-wide text-mute">Badges</p>
            </div>

            {/* Coins */}
            <div className="rounded-xl border-2 border-ink bg-paper-2 p-4">
              <Coins className="w-6 h-6 text-coral mx-auto mb-2" />
              <p className="font-display text-2xl font-extrabold text-ink tabular-nums">{reward.coins}</p>
              <p className="font-mono text-xs uppercase tracking-wide text-mute">Coins</p>
            </div>
          </motion.div>

          {/* Badges earned */}
          {reward.badges.length > 0 && (
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <p className="font-mono text-sm uppercase tracking-wide text-mute mb-3">Badges débloqués</p>
              <div className="flex justify-center gap-3">
                {reward.badges.map((badge, i) => (
                  <motion.div
                    key={badge}
                    className="w-12 h-12 rounded-full border-2 border-ink bg-pink flex items-center justify-center shadow-stkr-sm"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.8 + i * 0.2, type: 'spring' }}
                  >
                    <Award className="w-6 h-6 text-ink" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <Button onClick={onClose} variant="pink" size="lg" className="w-full text-lg">
              Découvre ton dashboard
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ==========================================================================
   HELPER: Confetti
   ========================================================================== */

function triggerConfetti() {
  const count = 200
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
    // Charte / a11y : aucune particule sous prefers-reduced-motion.
    disableForReducedMotion: true,
  }

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    })
  }

  // Palettes 100% tokens charte : pink · gold (XP) · lime (succès) · teal
  // (niveau) · coral (coins) · pink-soft.
  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    colors: ['#0f8a8a', '#ff3d80', '#e0a82e'],
  })
  fire(0.2, {
    spread: 60,
    colors: ['#e0a82e', '#7dac3e', '#ff7a4d'],
  })
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
    colors: ['#0f8a8a', '#ff3d80'],
  })
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
    colors: ['#ff3d80', '#e0a82e'],
  })
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    colors: ['#7dac3e', '#0f8a8a'],
  })
}
