'use client'

/* ==========================================================================
   PARTICLE SYSTEM V2 - Canvas-based High-Performance Particles
   
   Key optimizations:
   - Canvas API instead of DOM elements (100x fewer elements)
   - RequestAnimationFrame with time-based animation
   - Adaptive particle count based on device
   - Viewport-aware (pauses when not visible)
   - Respects prefers-reduced-motion
   - Memory-efficient particle pooling
   ========================================================================== */

import * as React from 'react'
import { cn } from '@/lib/utils'

/* ==========================================================================
   TYPES
   ========================================================================== */

export interface ParticleSystemV2Props {
  /** Number of particles (auto-adjusts for performance) */
  count?: number
  /** Particle colors (hex or rgb) */
  colors?: string[]
  /** Speed preset */
  speed?: 'slow' | 'medium' | 'fast'
  /** Direction of particle movement */
  direction?: 'up' | 'down' | 'random' | 'radial'
  /** Size range [min, max] */
  size?: [number, number]
  /** Enable glow effect */
  glow?: boolean
  /** Glow intensity (blur radius) */
  glowIntensity?: number
  /** Container className */
  className?: string
  /** Explicitly enable/disable */
  enabled?: boolean
  /** Fade in on edges */
  fadeEdges?: boolean
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  opacity: number
  life: number
  maxLife: number
}

/* ==========================================================================
   DEFAULT PALETTES
   ========================================================================== */

export const PALETTES = {
  lavender: ['#8b5cf6', '#a78bfa', '#c4b5fd'],
  coral: ['#f43f5e', '#fb7185', '#fda4af'],
  mint: ['#10b981', '#34d399', '#6ee7b7'],
  gold: ['#f59e0b', '#fbbf24', '#fcd34d'],
  sky: ['#0ea5e9', '#38bdf8', '#7dd3fc'],
  rainbow: ['#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#0ea5e9'],
  white: ['#ffffff', '#f5f5f5', '#e5e5e5'],
} as const

/* ==========================================================================
   SPEED CONFIGS
   ========================================================================== */

const SPEED_CONFIGS = {
  slow: { base: 0.3, variance: 0.2 },
  medium: { base: 0.6, variance: 0.4 },
  fast: { base: 1.2, variance: 0.8 },
} as const

/* ==========================================================================
   UTILITY FUNCTIONS
   ========================================================================== */

// Check if device is low-end (reduce particles)
function getDevicePerformanceLevel(): 'low' | 'medium' | 'high' {
  if (typeof window === 'undefined') return 'medium'
  
  // Check for low-end indicators
  const hardwareConcurrency = navigator.hardwareConcurrency || 2
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  if (hardwareConcurrency <= 2 || deviceMemory < 4 || isMobile) return 'low'
  if (hardwareConcurrency >= 8 && deviceMemory >= 8) return 'high'
  return 'medium'
}

// Get adaptive particle count
function getAdaptiveCount(requestedCount: number): number {
  const level = getDevicePerformanceLevel()
  switch (level) {
    case 'low': return Math.min(requestedCount, 10)
    case 'medium': return Math.min(requestedCount, 20)
    case 'high': return requestedCount
  }
}

// Parse color to RGB
function parseColor(color: string): { r: number; g: number; b: number } | null {
  // Hex color
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    const bigint = parseInt(hex, 16)
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    }
  }
  // RGB color
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (match) {
    return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) }
  }
  return null
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export function ParticleSystemV2({
  count = 20,
  colors = PALETTES.lavender,
  speed = 'medium',
  direction = 'up',
  size = [2, 6],
  glow = true,
  glowIntensity = 10,
  className,
  enabled = true,
  fadeEdges = true,
}: ParticleSystemV2Props) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const particlesRef = React.useRef<Particle[]>([])
  const animationRef = React.useRef<number>()
  const isVisibleRef = React.useRef(true)
  
  // Check for reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])
  
  // Initialize particles
  const initParticles = React.useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const adaptiveCount = getAdaptiveCount(count)
    const speedConfig = SPEED_CONFIGS[speed]
    
    particlesRef.current = Array.from({ length: adaptiveCount }, () => {
      const particleSize = size[0] + Math.random() * (size[1] - size[0])
      const color = colors[Math.floor(Math.random() * colors.length)]
      
      // Initial velocity based on direction
      let vx = 0
      let vy = 0
      switch (direction) {
        case 'up':
          vy = -(speedConfig.base + Math.random() * speedConfig.variance)
          vx = (Math.random() - 0.5) * speedConfig.variance
          break
        case 'down':
          vy = speedConfig.base + Math.random() * speedConfig.variance
          vx = (Math.random() - 0.5) * speedConfig.variance
          break
        case 'random':
          vx = (Math.random() - 0.5) * speedConfig.base * 2
          vy = (Math.random() - 0.5) * speedConfig.base * 2
          break
        case 'radial':
          const angle = Math.random() * Math.PI * 2
          const velocity = speedConfig.base + Math.random() * speedConfig.variance
          vx = Math.cos(angle) * velocity
          vy = Math.sin(angle) * velocity
          break
      }
      
      return {
        x: Math.random() * canvas.width,
        y: direction === 'up' ? canvas.height + Math.random() * 100 : Math.random() * canvas.height,
        vx,
        vy,
        size: particleSize,
        color,
        opacity: 0.3 + Math.random() * 0.5,
        life: 0,
        maxLife: 200 + Math.random() * 200, // frames
      }
    })
  }, [count, colors, speed, direction, size])
  
  // Animation loop
  const animate = React.useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !isVisibleRef.current) {
      animationRef.current = requestAnimationFrame(animate)
      return
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Update and draw particles
    particlesRef.current.forEach((p) => {
      // Update position
      p.x += p.vx
      p.y += p.vy
      p.life++
      
      // Calculate opacity based on life and edge fade
      let opacity = p.opacity
      
      // Fade in at start
      if (p.life < 20) {
        opacity *= p.life / 20
      }
      
      // Edge fade
      if (fadeEdges) {
        const edgeFadeX = Math.min(p.x / 50, (canvas.width - p.x) / 50, 1)
        const edgeFadeY = Math.min(p.y / 50, (canvas.height - p.y) / 50, 1)
        opacity *= Math.min(edgeFadeX, edgeFadeY)
      }
      
      // Reset particle if out of bounds or life exceeded
      if (p.y < -20 || p.y > canvas.height + 20 || p.x < -20 || p.x > canvas.width + 20 || p.life > p.maxLife) {
        // Reset position based on direction
        p.x = Math.random() * canvas.width
        p.y = direction === 'up' ? canvas.height + 10 : -10
        p.life = 0
        p.opacity = 0.3 + Math.random() * 0.5
        
        // Randomize new velocity
        const speedConfig = SPEED_CONFIGS[speed]
        switch (direction) {
          case 'up':
            p.vy = -(speedConfig.base + Math.random() * speedConfig.variance)
            p.vx = (Math.random() - 0.5) * speedConfig.variance
            break
          case 'down':
            p.vy = speedConfig.base + Math.random() * speedConfig.variance
            p.vx = (Math.random() - 0.5) * speedConfig.variance
            break
        }
      }
      
      // Draw particle
      const rgb = parseColor(p.color)
      if (!rgb) return
      
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`
      ctx.fill()
      
      // Glow effect
      if (glow && opacity > 0.2) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size + glowIntensity, 0, Math.PI * 2)
        const gradient = ctx.createRadialGradient(p.x, p.y, p.size, p.x, p.y, p.size + glowIntensity)
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.3})`)
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
        ctx.fillStyle = gradient
        ctx.fill()
      }
    })
    
    animationRef.current = requestAnimationFrame(animate)
  }, [direction, fadeEdges, glow, glowIntensity, speed])
  
  // Handle canvas resize
  const handleResize = React.useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const container = canvas.parentElement
    if (!container) return
    
    const { width, height } = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
    }
    
    // Reinitialize particles for new canvas size
    initParticles()
  }, [initParticles])
  
  // Visibility observer
  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting
      },
      { threshold: 0.1 }
    )
    
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])
  
  // Initialize and start animation
  React.useEffect(() => {
    if (!enabled || prefersReducedMotion) return
    
    handleResize()
    window.addEventListener('resize', handleResize)
    
    animationRef.current = requestAnimationFrame(animate)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [enabled, prefersReducedMotion, handleResize, animate])
  
  // Don't render if disabled or reduced motion
  if (!enabled || prefersReducedMotion) {
    return null
  }
  
  return (
    <canvas
      ref={canvasRef}
      className={cn(
        'absolute inset-0 pointer-events-none',
        className
      )}
      aria-hidden="true"
    />
  )
}

/* ==========================================================================
   SIMPLE FLOATING PARTICLES - Backwards compatible with old API
   ========================================================================== */

export interface FloatingParticlesProps {
  count?: number
  colors?: string[]
  className?: string
  direction?: 'up' | 'down' | 'random'
  speed?: 'slow' | 'medium' | 'fast'
  glow?: boolean
}

export function FloatingParticles({
  count = 15,
  colors = PALETTES.lavender,
  direction = 'up',
  speed = 'slow',
  glow = true,
  className,
}: FloatingParticlesProps) {
  return (
    <ParticleSystemV2
      count={count}
      colors={colors}
      direction={direction}
      speed={speed}
      glow={glow}
      className={className}
    />
  )
}

/* ==========================================================================
   RISING SPARKS - Backwards compatible
   ========================================================================== */

export interface RisingSparksProps {
  count?: number
  colors?: string[]
  intensity?: 'low' | 'medium' | 'high'
  className?: string
}

export function RisingSparks({
  count = 8,
  colors = PALETTES.gold,
  intensity = 'medium',
  className,
}: RisingSparksProps) {
  const speedMap = { low: 'slow', medium: 'medium', high: 'fast' } as const
  const countMap = { low: count * 0.5, medium: count, high: count * 1.5 }
  
  return (
    <ParticleSystemV2
      count={Math.floor(countMap[intensity])}
      colors={colors}
      direction="up"
      speed={speedMap[intensity]}
      glow={true}
      glowIntensity={15}
      size={[1, 4]}
      className={className}
    />
  )
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export default ParticleSystemV2
