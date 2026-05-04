'use client'

/**
 * TEENS PARTY MOROCCO - Onboarding Reward Popup
 * =============================================
 *
 * Popups de célébration pour les récompenses:
 * - XP gain avec animation
 * - Badge unlock avec modal
 * - Coins bonus
 * - Confetti effects
 */

import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, Award, Coins, Share2, Sparkles } from 'lucide-react'
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
      <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-xl border border-cyan-500/30 rounded-2xl px-5 py-4 shadow-2xl shadow-cyan-500/20">
        <div className="flex items-center gap-4">
          <motion.div
            className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center"
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: 2 }}
          >
            <Zap className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <motion.p
              className="text-cyan-400 font-bold text-2xl"
              initial={{ scale: 0.5 }}
              animate={{ scale: [0.5, 1.2, 1] }}
              transition={{ duration: 0.4 }}
            >
              +{reward.amount} XP
            </motion.p>
            {reward.reason && <p className="text-zinc-400 text-sm">{reward.reason}</p>}
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
      <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-xl border border-yellow-500/30 rounded-2xl px-5 py-4 shadow-2xl shadow-yellow-500/20">
        <div className="flex items-center gap-4">
          <motion.div
            className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            <Coins className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <motion.p
              className="text-yellow-400 font-bold text-2xl"
              initial={{ scale: 0.5 }}
              animate={{ scale: [0.5, 1.2, 1] }}
              transition={{ duration: 0.4 }}
            >
              +{reward.amount} Coins
            </motion.p>
            <p className="text-zinc-400 text-sm">Bonus de bienvenue</p>
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
    description: 'Achievement unlocked!',
    icon: 'award',
    rarity: 'common',
  }

  const rarityColors: Record<string, string> = {
    common: 'from-zinc-400 to-zinc-500',
    rare: 'from-blue-400 to-cyan-500',
    epic: 'from-purple-400 to-pink-500',
    legendary: 'from-yellow-400 to-orange-500',
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Light rays */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 h-[200%] w-2 bg-gradient-to-t from-transparent via-cyan-500/20 to-transparent origin-bottom"
            style={{ rotate: `${i * 30}deg` }}
            animate={{ rotate: [`${i * 30}deg`, `${i * 30 + 360}deg`] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />
        ))}
      </div>

      <motion.div
        className="relative bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-3xl p-8 max-w-sm mx-4 text-center"
        initial={{ scale: 0.5, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Badge icon */}
        <motion.div
          className={cn(
            'w-24 h-24 mx-auto rounded-full bg-gradient-to-br flex items-center justify-center mb-6',
            rarityColors[badgeInfo.rarity]
          )}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Award className="w-12 h-12 text-white" />

          {/* Sparkles */}
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                top: `${20 + Math.random() * 60}%`,
                left: `${20 + Math.random() * 60}%`,
              }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            >
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </motion.div>
          ))}
        </motion.div>

        {/* Badge title */}
        <motion.h2
          className="text-2xl font-bold text-white mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {badgeInfo.name}
        </motion.h2>

        {/* Description */}
        <motion.p
          className="text-zinc-400 mb-6"
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
          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
          >
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-cyan-500/30 rounded-3xl p-8 max-w-md mx-4 text-center overflow-hidden"
        initial={{ scale: 0.5, y: 100 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10" />

        {/* Content */}
        <div className="relative">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
              Bienvenue!
            </h1>
            <p className="text-zinc-400 mb-8">Tu fais maintenant partie de la famille</p>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="grid grid-cols-3 gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {/* XP */}
            <div className="bg-zinc-800/50 rounded-xl p-4">
              <Zap className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{reward.totalXP}</p>
              <p className="text-xs text-zinc-500">XP gagnés</p>
            </div>

            {/* Badges */}
            <div className="bg-zinc-800/50 rounded-xl p-4">
              <Award className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{reward.badges.length}</p>
              <p className="text-xs text-zinc-500">Badges</p>
            </div>

            {/* Coins */}
            <div className="bg-zinc-800/50 rounded-xl p-4">
              <Coins className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{reward.coins}</p>
              <p className="text-xs text-zinc-500">Coins</p>
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
              <p className="text-sm text-zinc-500 mb-3">Badges débloqués</p>
              <div className="flex justify-center gap-3">
                {reward.badges.map((badge, i) => {
                  const info = BADGE_DISPLAY_INFO[badge]
                  return (
                    <motion.div
                      key={badge}
                      className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.8 + i * 0.2, type: 'spring' }}
                    >
                      <Award className="w-6 h-6 text-white" />
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <Button
              onClick={onClose}
              size="lg"
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-lg"
            >
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
  }

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    })
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    colors: ['#06b6d4', '#8b5cf6', '#ec4899'],
  })
  fire(0.2, {
    spread: 60,
    colors: ['#fbbf24', '#22c55e', '#3b82f6'],
  })
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
    colors: ['#06b6d4', '#8b5cf6'],
  })
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
    colors: ['#ec4899', '#fbbf24'],
  })
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    colors: ['#22c55e', '#3b82f6'],
  })
}
