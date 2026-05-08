'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import canvasConfetti from 'canvas-confetti'
import { cn } from '@/lib/utils'

/* ==========================================================================
   CONFETTI SYSTEM - Silicon Valley Grade Celebration Effects
   
   Premium celebration effects for achievements, level-ups, and victories:
   - Classic confetti rain
   - Particle explosion burst
   - Fireworks effect
   - Emoji shower
   - Star burst
   - XP celebration
   ========================================================================== */

// Color palettes for different celebration types
const CONFETTI_PALETTES = {
  default: ['#8b5cf6', '#f43f5e', '#10b981', '#fbbf24', '#0ea5e9', '#ec4899'],
  gold: ['#fbbf24', '#f59e0b', '#d97706', '#fcd34d', '#fef3c7', '#fffbeb'],
  rainbow: ['#ef4444', '#f97316', '#fbbf24', '#22c55e', '#0ea5e9', '#8b5cf6', '#ec4899'],
  lavender: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#f5f3ff'],
  success: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#ecfdf5'],
  xp: ['#8b5cf6', '#fbbf24', '#ffffff', '#a78bfa', '#f59e0b'],
}

/* ==========================================================================
   CLASSIC CONFETTI - Rain from top
   ========================================================================== */

interface ConfettiProps {
  trigger: boolean
  duration?: number
  palette?: keyof typeof CONFETTI_PALETTES | string[]
  numberOfPieces?: number
  recycle?: boolean
  gravity?: number
  wind?: number
  className?: string
}

export function Confetti({
  trigger,
  duration = 5000,
  palette = 'default',
  numberOfPieces = 200,
  recycle = false,
  gravity = 0.15,
  wind = 0,
}: ConfettiProps) {
  const colors = Array.isArray(palette) ? palette : CONFETTI_PALETTES[palette]

  React.useEffect(() => {
    if (!trigger || typeof window === 'undefined') return

    let cancelled = false

    const fireOnce = () => {
      canvasConfetti({
        particleCount: numberOfPieces,
        spread: 90,
        startVelocity: 45,
        gravity: gravity * 6,
        drift: wind,
        ticks: Math.max(60, Math.floor(duration / 16)),
        origin: { x: 0.5, y: 0 },
        colors,
        zIndex: 100,
      })
    }

    fireOnce()

    if (recycle) {
      const interval = window.setInterval(() => {
        if (!cancelled) fireOnce()
      }, 1500)
      const stopTimer = window.setTimeout(() => {
        cancelled = true
        window.clearInterval(interval)
        canvasConfetti.reset()
      }, duration)
      return () => {
        cancelled = true
        window.clearInterval(interval)
        window.clearTimeout(stopTimer)
      }
    }

    const cleanup = window.setTimeout(() => canvasConfetti.reset(), duration)
    return () => {
      cancelled = true
      window.clearTimeout(cleanup)
    }
  }, [trigger, duration, numberOfPieces, recycle, gravity, wind, colors])

  return null
}

/* ==========================================================================
   CONFETTI BURST - Explosion from a point
   ========================================================================== */

interface ConfettiBurstProps {
  trigger: boolean
  x?: number // percentage or pixel
  y?: number // percentage or pixel
  count?: number
  spread?: number
  palette?: keyof typeof CONFETTI_PALETTES | string[]
  duration?: number
  className?: string
}

interface BurstParticle {
  id: number
  x: number
  y: number
  size: number
  color: string
  rotation: number
  velocityX: number
  velocityY: number
}

export function ConfettiBurst({
  trigger,
  x = 50,
  y = 50,
  count = 30,
  spread = 180,
  palette = 'default',
  duration = 2000,
  className,
}: ConfettiBurstProps) {
  const [particles, setParticles] = React.useState<BurstParticle[]>([])
  const colors = Array.isArray(palette) ? palette : CONFETTI_PALETTES[palette]

  React.useEffect(() => {
    if (trigger) {
      const newParticles = Array.from({ length: count }, (_, i) => {
        const angle = (Math.random() * spread - spread / 2) * (Math.PI / 180)
        const velocity = 8 + Math.random() * 12
        return {
          id: i,
          x,
          y,
          size: 6 + Math.random() * 8,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          velocityX: Math.sin(angle) * velocity,
          velocityY: -Math.cos(angle) * velocity,
        }
      })
      setParticles(newParticles)

      const timer = setTimeout(() => setParticles([]), duration)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [trigger, x, y, count, spread, colors, duration])

  return (
    <div className={cn('fixed inset-0 pointer-events-none z-[100] overflow-hidden', className)}>
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              transform: `rotate(${particle.rotation}deg)`,
            }}
            initial={{
              x: 0,
              y: 0,
              opacity: 1,
              scale: 1,
            }}
            animate={{
              x: particle.velocityX * 30,
              y: particle.velocityY * 30 + 200, // gravity effect
              opacity: [1, 1, 0],
              scale: [1, 1.2, 0.5],
              rotate: particle.rotation + 720,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: duration / 1000,
              ease: [0.23, 1, 0.32, 1],
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

/* ==========================================================================
   FIREWORKS EFFECT - Multiple bursts at random positions
   ========================================================================== */

interface FireworksProps {
  trigger: boolean
  count?: number
  duration?: number
  palette?: keyof typeof CONFETTI_PALETTES | string[]
  className?: string
}

export function Fireworks({
  trigger,
  count = 5,
  duration = 3000,
  palette = 'rainbow',
  className,
}: FireworksProps) {
  const [bursts, setBursts] = React.useState<Array<{ id: number; x: number; y: number; delay: number }>>([])
  const colors = Array.isArray(palette) ? palette : CONFETTI_PALETTES[palette]

  React.useEffect(() => {
    if (trigger) {
      const newBursts = Array.from({ length: count }, (_, i) => ({
        id: i,
        x: 15 + Math.random() * 70,
        y: 20 + Math.random() * 40,
        delay: i * 300,
      }))
      setBursts(newBursts)

      const timer = setTimeout(() => setBursts([]), duration + count * 300)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [trigger, count, duration])

  return (
    <div className={cn('fixed inset-0 pointer-events-none z-[100]', className)}>
      {bursts.map((burst) => (
        <motion.div
          key={burst.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: burst.delay / 1000 }}
        >
          {/* Burst center flash */}
          <motion.div
            className="absolute rounded-full"
            style={{
              left: `${burst.x}%`,
              top: `${burst.y}%`,
              width: 4,
              height: 4,
              backgroundColor: colors[burst.id % colors.length],
              boxShadow: `0 0 40px 20px ${colors[burst.id % colors.length]}`,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 3, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              delay: burst.delay / 1000,
              duration: 0.5,
            }}
          />

          {/* Burst particles */}
          {Array.from({ length: 20 }).map((_, i) => {
            const angle = (i / 20) * Math.PI * 2
            const distance = 50 + Math.random() * 100
            return (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  left: `${burst.x}%`,
                  top: `${burst.y}%`,
                  width: 4 + Math.random() * 4,
                  height: 4 + Math.random() * 4,
                  backgroundColor: colors[(burst.id + i) % colors.length],
                  boxShadow: `0 0 6px ${colors[(burst.id + i) % colors.length]}`,
                }}
                initial={{ x: 0, y: 0, opacity: 0 }}
                animate={{
                  x: Math.cos(angle) * distance,
                  y: Math.sin(angle) * distance + 50, // gravity
                  opacity: [0, 1, 1, 0],
                  scale: [0, 1, 0.5],
                }}
                transition={{
                  delay: burst.delay / 1000,
                  duration: 1.5,
                  ease: 'easeOut',
                }}
              />
            )
          })}
        </motion.div>
      ))}
    </div>
  )
}

/* ==========================================================================
   EMOJI SHOWER - Falling emojis
   ========================================================================== */

interface EmojiShowerProps {
  trigger: boolean
  emojis?: string[]
  count?: number
  duration?: number
  className?: string
}

export function EmojiShower({
  trigger,
  emojis = ['🎉', '🎊', '✨', '⭐', '🌟', '💫', '🔥', '💪'],
  count = 30,
  duration = 4000,
  className,
}: EmojiShowerProps) {
  const [particles, setParticles] = React.useState<Array<{
    id: number
    emoji: string
    x: number
    delay: number
    duration: number
    size: number
  }>>([])

  React.useEffect(() => {
    if (trigger) {
      const newParticles = Array.from({ length: count }, (_, i) => ({
        id: i,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        x: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 2,
        size: 16 + Math.random() * 24,
      }))
      setParticles(newParticles)

      const timer = setTimeout(() => setParticles([]), duration + 2000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [trigger, emojis, count, duration])

  return (
    <div className={cn('fixed inset-0 pointer-events-none z-[100] overflow-hidden', className)}>
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute"
            style={{
              left: `${particle.x}%`,
              top: -50,
              fontSize: particle.size,
            }}
            initial={{ y: 0, opacity: 0, rotate: 0 }}
            animate={{
              y: window.innerHeight + 100,
              opacity: [0, 1, 1, 0],
              rotate: [-30, 30, -30],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              ease: 'linear',
              rotate: {
                repeat: Infinity,
                duration: 1,
              },
            }}
          >
            {particle.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/* ==========================================================================
   STAR BURST - Stars exploding outward
   ========================================================================== */

interface StarBurstProps {
  trigger: boolean
  x?: number
  y?: number
  count?: number
  palette?: keyof typeof CONFETTI_PALETTES | string[]
  duration?: number
  className?: string
}

export function StarBurst({
  trigger,
  x = 50,
  y = 50,
  count = 12,
  palette = 'gold',
  duration = 1500,
  className,
}: StarBurstProps) {
  const [show, setShow] = React.useState(false)
  const colors = Array.isArray(palette) ? palette : CONFETTI_PALETTES[palette]

  React.useEffect(() => {
    if (trigger) {
      setShow(true)
      const timer = setTimeout(() => setShow(false), duration)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [trigger, duration])

  if (!show) return null

  return (
    <div className={cn('fixed inset-0 pointer-events-none z-[100]', className)}>
      {/* Central glow */}
      <motion.div
        className="absolute"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          transform: 'translate(-50%, -50%)',
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: [0, 2, 3],
          opacity: [0, 1, 0],
        }}
        transition={{ duration: 0.6 }}
      >
        <div
          className="w-20 h-20 rounded-full"
          style={{
            background: `radial-gradient(circle, ${colors[0]}80 0%, transparent 70%)`,
          }}
        />
      </motion.div>

      {/* Stars */}
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2
        const distance = 80 + Math.random() * 60
        return (
          <motion.div
            key={i}
            className="absolute text-2xl"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              color: colors[i % colors.length],
              filter: `drop-shadow(0 0 8px ${colors[i % colors.length]})`,
            }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              scale: [0, 1.5, 1, 0],
              opacity: [0, 1, 1, 0],
              rotate: 360,
            }}
            transition={{
              duration: duration / 1000,
              ease: [0.23, 1, 0.32, 1],
            }}
          >
            ⭐
          </motion.div>
        )
      })}
    </div>
  )
}

/* ==========================================================================
   XP CELEBRATION - Level up / XP gain effect
   ========================================================================== */

interface XPCelebrationProps {
  trigger: boolean
  xpAmount?: number
  message?: string
  duration?: number
  className?: string
}

export function XPCelebration({
  trigger,
  xpAmount = 100,
  message = 'XP Gagné!',
  duration = 3000,
  className,
}: XPCelebrationProps) {
  const [show, setShow] = React.useState(false)
  const colors = CONFETTI_PALETTES.xp

  React.useEffect(() => {
    if (trigger) {
      setShow(true)
      const timer = setTimeout(() => setShow(false), duration)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [trigger, duration])

  if (!show) return null

  return (
    <div className={cn('fixed inset-0 pointer-events-none z-[100] flex items-center justify-center', className)}>
      {/* Background flash */}
      <motion.div
        className="absolute inset-0 bg-brand-soft/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.5 }}
      />

      {/* Central badge */}
      <motion.div
        className="relative"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {/* Glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${colors[0]}40 0%, transparent 70%)`,
            filter: 'blur(20px)',
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{ duration: 1, repeat: Infinity }}
        />

        {/* Badge */}
        <motion.div
          className="relative bg-gradient-to-br from-brand-soft to-gen-z-grape rounded-2xl p-6 shadow-2xl"
          style={{
            boxShadow: `0 0 60px ${colors[0]}60`,
          }}
          animate={{
            y: [0, -10, 0],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="text-center">
            <motion.div
              className="text-4xl mb-2"
              animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5 }}
            >
              ⚡
            </motion.div>
            <motion.div
              className="text-3xl font-black text-white mb-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              +{xpAmount}
            </motion.div>
            <motion.div
              className="text-sm font-bold text-white/80 uppercase tracking-wider"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {message}
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      {/* Radiating particles */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * Math.PI * 2
        return (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              backgroundColor: colors[i % colors.length],
              boxShadow: `0 0 10px ${colors[i % colors.length]}`,
              left: '50%',
              top: '50%',
            }}
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{
              x: Math.cos(angle) * 150,
              y: Math.sin(angle) * 150,
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 1,
              delay: i * 0.05,
              ease: 'easeOut',
            }}
          />
        )
      })}
    </div>
  )
}

/* ==========================================================================
   QUEST CONFETTI - Legacy export for backward compatibility
   ========================================================================== */

export function QuestConfetti({ trigger }: { trigger: boolean }) {
  return <Confetti trigger={trigger} palette="default" numberOfPieces={200} duration={5000} />
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */export { CONFETTI_PALETTES }