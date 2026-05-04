'use client'

import * as React from 'react'
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

/* ==========================================================================
   PARTICLE SYSTEM - Silicon Valley Grade
   
   A comprehensive particle system with multiple effects:
   - Floating particles (ambient)
   - Burst particles (on action)
   - Trail particles (follow cursor/element)
   - Border particles (follow path)
   - Rising particles (like bubbles/sparks)
   ========================================================================== */

// Particle configuration types
interface ParticleConfig {
  count?: number
  colors?: string[]
  size?: { min: number; max: number }
  speed?: { min: number; max: number }
  opacity?: { min: number; max: number }
  blur?: number
  glow?: boolean
}

interface Particle {
  id: number
  x: number
  y: number
  size: number
  color: string
  opacity: number
  duration: number
  delay: number
  blur: number
}

// Default color palettes
const PALETTES = {
  lavender: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'],
  coral: ['#f43f5e', '#fb7185', '#fda4af', '#fecdd3'],
  mint: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
  gold: ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a'],
  sky: ['#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd'],
  rainbow: ['#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#0ea5e9'],
}

// Generate random particles
function generateParticles(count: number, config: ParticleConfig): Particle[] {
  const colors = config.colors || PALETTES.lavender
  const sizeRange = config.size || { min: 2, max: 6 }
  const speedRange = config.speed || { min: 3, max: 8 }
  const opacityRange = config.opacity || { min: 0.3, max: 0.8 }

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: sizeRange.min + Math.random() * (sizeRange.max - sizeRange.min),
    color: colors[Math.floor(Math.random() * colors.length)],
    opacity: opacityRange.min + Math.random() * (opacityRange.max - opacityRange.min),
    duration: speedRange.min + Math.random() * (speedRange.max - speedRange.min),
    delay: Math.random() * 2,
    blur: config.blur || 0,
  }))
}

/* ==========================================================================
   FLOATING PARTICLES - Ambient background effect
   ========================================================================== */

interface FloatingParticlesProps {
  count?: number
  colors?: string[]
  className?: string
  direction?: 'up' | 'down' | 'random'
  speed?: 'slow' | 'medium' | 'fast'
  glow?: boolean
}

export function FloatingParticles({
  count = 20,
  colors = PALETTES.lavender,
  className,
  direction = 'up',
  speed = 'medium',
  glow = true,
}: FloatingParticlesProps) {
  const speedMultiplier = { slow: 1.5, medium: 1, fast: 0.6 }[speed]
  
  const particles = React.useMemo(
    () => generateParticles(count, { 
      colors, 
      size: { min: 2, max: 5 },
      speed: { min: 8 * speedMultiplier, max: 15 * speedMultiplier },
    }),
    [count, colors, speedMultiplier]
  )

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: direction === 'down' ? '-5%' : direction === 'up' ? '105%' : `${particle.y}%`,
            backgroundColor: particle.color,
            opacity: particle.opacity,
            boxShadow: glow ? `0 0 ${particle.size * 2}px ${particle.color}` : undefined,
            filter: particle.blur ? `blur(${particle.blur}px)` : undefined,
          }}
          animate={{
            y: direction === 'up' ? '-120vh' : direction === 'down' ? '120vh' : ['-10vh', '10vh'],
            x: direction === 'random' ? ['-5vw', '5vw'] : 0,
            opacity: [0, particle.opacity, particle.opacity, 0],
            scale: [0.5, 1, 1, 0.5],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  )
}

/* ==========================================================================
   PARTICLE BURST - Explosion effect on action
   ========================================================================== */

interface ParticleBurstProps {
  trigger: boolean
  x?: number
  y?: number
  count?: number
  colors?: string[]
  spread?: number
  duration?: number
  onComplete?: () => void
}

export function ParticleBurst({
  trigger,
  x = 50,
  y = 50,
  count = 12,
  colors = PALETTES.gold,
  spread = 100,
  duration = 0.8,
  onComplete,
}: ParticleBurstProps) {
  const [particles, setParticles] = React.useState<Particle[]>([])

  React.useEffect(() => {
    if (trigger) {
      const newParticles = Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2
        const velocity = 0.5 + Math.random() * 0.5
        return {
          id: i,
          x: x,
          y: y,
          targetX: x + Math.cos(angle) * spread * velocity,
          targetY: y + Math.sin(angle) * spread * velocity,
          size: 3 + Math.random() * 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          opacity: 0.8 + Math.random() * 0.2,
          duration: duration * (0.8 + Math.random() * 0.4),
          delay: 0,
          blur: 0,
        }
      })
      setParticles(newParticles as any)
      
      const timeout = setTimeout(() => {
        setParticles([])
        onComplete?.()
      }, duration * 1000 + 100)
      
      return () => clearTimeout(timeout)
    }
  }, [trigger, x, y, count, colors, spread, duration, onComplete])

  return (
    <AnimatePresence>
      {particles.map((particle: any) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{
            left: `${particle.targetX}%`,
            top: `${particle.targetY}%`,
            scale: [0, 1.5, 0],
            opacity: [1, 1, 0],
          }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{
            duration: particle.duration,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        />
      ))}
    </AnimatePresence>
  )
}

/* ==========================================================================
   SPARKLE TRAIL - Particles following cursor/element
   ========================================================================== */

interface SparkleTrailProps {
  children: React.ReactNode
  colors?: string[]
  count?: number
  enabled?: boolean
  className?: string
}

export function SparkleTrail({
  children,
  colors = PALETTES.gold,
  count = 8,
  enabled = true,
  className,
}: SparkleTrailProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [sparkles, setSparkles] = React.useState<Array<{
    id: number
    x: number
    y: number
    color: string
    size: number
  }>>([])
  const sparkleId = React.useRef(0)

  const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (!enabled || !containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    
    // Add new sparkle
    const newSparkle = {
      id: sparkleId.current++,
      x,
      y,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 3 + Math.random() * 4,
    }
    
    setSparkles(prev => [...prev.slice(-count + 1), newSparkle])
  }, [enabled, colors, count])

  // Clean up old sparkles
  React.useEffect(() => {
    if (sparkles.length === 0) return
    const timeout = setTimeout(() => {
      setSparkles(prev => prev.slice(1))
    }, 500)
    return () => clearTimeout(timeout)
  }, [sparkles])

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={cn('relative', className)}
    >
      {children}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {sparkles.map((sparkle) => (
            <motion.div
              key={sparkle.id}
              className="absolute rounded-full"
              style={{
                width: sparkle.size,
                height: sparkle.size,
                left: `${sparkle.x}%`,
                top: `${sparkle.y}%`,
                backgroundColor: sparkle.color,
                boxShadow: `0 0 ${sparkle.size * 2}px ${sparkle.color}`,
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 0, opacity: 0, y: -20 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ==========================================================================
   ORBIT PARTICLES - Particles orbiting around element
   ========================================================================== */

interface OrbitParticlesProps {
  size?: number
  count?: number
  colors?: string[]
  speed?: number
  className?: string
  reverse?: boolean
  glow?: boolean
}

export function OrbitParticles({
  size = 100,
  count = 6,
  colors = PALETTES.lavender,
  speed = 8,
  className,
  reverse = false,
  glow = true,
}: OrbitParticlesProps) {
  const particles = React.useMemo(() => 
    Array.from({ length: count }, (_, i) => ({
      id: i,
      angle: (i / count) * 360,
      size: 3 + Math.random() * 3,
      color: colors[i % colors.length],
      orbitOffset: 0.9 + Math.random() * 0.2,
    })),
    [count, colors]
  )

  return (
    <div 
      className={cn('relative', className)}
      style={{ width: size, height: size }}
    >
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            boxShadow: glow ? `0 0 ${particle.size * 3}px ${particle.color}` : undefined,
            left: '50%',
            top: '50%',
            marginLeft: -particle.size / 2,
            marginTop: -particle.size / 2,
          }}
          animate={{
            rotate: reverse ? -360 : 360,
          }}
          transition={{
            duration: speed,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            boxShadow: glow ? `0 0 ${particle.size * 3}px ${particle.color}` : undefined,
            transformOrigin: `${size / 2 * particle.orbitOffset}px center`,
          }}
        />
      ))}
    </div>
  )
}

/* ==========================================================================
   RISING SPARKS - Fire/energy effect
   ========================================================================== */

interface RisingSparksProps {
  count?: number
  colors?: string[]
  className?: string
  intensity?: 'low' | 'medium' | 'high'
}

export function RisingSparks({
  count = 15,
  colors = ['#fbbf24', '#f59e0b', '#f97316', '#ef4444'],
  className,
  intensity = 'medium',
}: RisingSparksProps) {
  const intensityConfig = {
    low: { count: count * 0.5, speed: 1.5, size: { min: 1, max: 3 } },
    medium: { count, speed: 1, size: { min: 2, max: 4 } },
    high: { count: count * 1.5, speed: 0.7, size: { min: 2, max: 5 } },
  }[intensity]

  const sparks = React.useMemo(() => 
    Array.from({ length: Math.floor(intensityConfig.count) }, (_, i) => ({
      id: i,
      x: 30 + Math.random() * 40,
      size: intensityConfig.size.min + Math.random() * (intensityConfig.size.max - intensityConfig.size.min),
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: (2 + Math.random() * 2) * intensityConfig.speed,
      delay: Math.random() * 2,
      drift: -20 + Math.random() * 40,
    })),
    [colors, intensityConfig]
  )

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      {sparks.map((spark) => (
        <motion.div
          key={spark.id}
          className="absolute rounded-full"
          style={{
            width: spark.size,
            height: spark.size,
            left: `${spark.x}%`,
            bottom: 0,
            backgroundColor: spark.color,
            boxShadow: `0 0 ${spark.size * 2}px ${spark.color}`,
          }}
          animate={{
            y: [0, '-100vh'],
            x: [0, spark.drift],
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1, 0.8, 0],
          }}
          transition={{
            duration: spark.duration,
            delay: spark.delay,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  )
}

/* ==========================================================================
   GLOW PULSE - Pulsing glow effect around element
   ========================================================================== */

interface GlowPulseProps {
  children: React.ReactNode
  color?: string
  intensity?: 'subtle' | 'medium' | 'strong'
  speed?: 'slow' | 'medium' | 'fast'
  className?: string
}

export function GlowPulse({
  children,
  color = '#8b5cf6',
  intensity = 'medium',
  speed = 'medium',
  className,
}: GlowPulseProps) {
  const intensityConfig = {
    subtle: { blur: 20, spread: 10, opacity: [0.2, 0.4] },
    medium: { blur: 40, spread: 20, opacity: [0.3, 0.6] },
    strong: { blur: 60, spread: 30, opacity: [0.4, 0.8] },
  }[intensity]

  const speedConfig = { slow: 3, medium: 2, fast: 1 }[speed]

  return (
    <div className={cn('relative', className)}>
      <motion.div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          background: color,
          filter: `blur(${intensityConfig.blur}px)`,
        }}
        animate={{
          opacity: intensityConfig.opacity,
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: speedConfig,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

/* ==========================================================================
   SHIMMER WAVE - Premium loading/highlight effect
   ========================================================================== */

interface ShimmerWaveProps {
  children: React.ReactNode
  color?: string
  className?: string
  active?: boolean
}

export function ShimmerWave({
  children,
  color = 'rgba(255, 255, 255, 0.1)',
  className,
  active = true,
}: ShimmerWaveProps) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {children}
      {active && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            transform: 'skewX(-20deg)',
          }}
          animate={{
            x: ['-200%', '200%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1,
            ease: 'easeInOut',
          }}
        />
      )}
    </div>
  )
}

/* ==========================================================================
   EXPORT PALETTES
   ========================================================================== */

export { PALETTES }
