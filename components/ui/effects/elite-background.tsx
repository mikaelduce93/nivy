'use client'

import * as React from 'react'
import { motion, useMotionValue, useSpring, useTransform, useAnimationFrame } from 'framer-motion'
import { cn } from '@/lib/utils'

/* ==========================================================================
   ELITE BACKGROUND SYSTEM - Silicon Valley Grade
   
   World-class animated backgrounds inspired by Linear, Stripe, Vercel:
   - Animated mesh gradients
   - Aurora borealis effect
   - Flowing gradient orbs
   - Animated grain texture
   - Depth fog layers
   - Star field effect
   ========================================================================== */

/* ==========================================================================
   ANIMATED MESH GRADIENT - Premium flowing gradient
   ========================================================================== */

interface AnimatedMeshGradientProps {
  className?: string
  /** Primary color */
  color1?: string
  /** Secondary color */
  color2?: string
  /** Tertiary color */
  color3?: string
  /** Fourth color */
  color4?: string
  /** Animation speed (1 = normal) */
  speed?: number
  /** Opacity */
  opacity?: number
  /** Blur intensity */
  blur?: number
}

export function AnimatedMeshGradient({
  className,
  color1 = '#8b5cf6',
  color2 = '#ec4899',
  color3 = '#06b6d4',
  color4 = '#10b981',
  speed = 1,
  opacity = 0.5,
  blur = 100,
}: AnimatedMeshGradientProps) {
  const time = useMotionValue(0)
  
  useAnimationFrame((t) => {
    time.set(t * 0.0001 * speed)
  })
  const blob1Left = useTransform(time, (t) => `${30 + Math.sin(t) * 20}%`)
  const blob1Top = useTransform(time, (t) => `${20 + Math.cos(t * 0.8) * 15}%`)
  const blob2Right = useTransform(time, (t) => `${20 + Math.sin(t * 0.9) * 25}%`)
  const blob2Top = useTransform(time, (t) => `${30 + Math.cos(t * 1.1) * 20}%`)
  const blob3Left = useTransform(time, (t) => `${40 + Math.sin(t * 0.7) * 15}%`)
  const blob3Bottom = useTransform(time, (t) => `${10 + Math.cos(t * 0.6) * 20}%`)
  const blob4Right = useTransform(time, (t) => `${30 + Math.sin(t * 1.2) * 20}%`)
  const blob4Bottom = useTransform(time, (t) => `${20 + Math.cos(t * 0.9) * 15}%`)

  return (
    <div
      className={cn('absolute inset-0 overflow-hidden', className)}
      style={{ opacity }}
    >
      {/* NOTE: blob sizes (450-600px) are intentionally above Tailwind's max scale (w-96=384px)
          to create ambient full-viewport gradient effects. Cannot be replaced with canonical scale. */}
      {/* Gradient blob 1 */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${color1}80, transparent 70%)`,
          filter: `blur(${blur}px)`,
          left: blob1Left,
          top: blob1Top,
        }}
      />
      
      {/* Gradient blob 2 */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${color2}60, transparent 70%)`,
          filter: `blur(${blur}px)`,
          right: blob2Right,
          top: blob2Top,
        }}
      />
      
      {/* Gradient blob 3 */}
      <motion.div
        className="absolute w-[550px] h-[550px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${color3}50, transparent 70%)`,
          filter: `blur(${blur}px)`,
          left: blob3Left,
          bottom: blob3Bottom,
        }}
      />
      
      {/* Gradient blob 4 */}
      <motion.div
        className="absolute w-[450px] h-[450px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${color4}40, transparent 70%)`,
          filter: `blur(${blur}px)`,
          right: blob4Right,
          bottom: blob4Bottom,
        }}
      />
    </div>
  )
}

/* ==========================================================================
   AURORA EFFECT - Northern lights background
   ========================================================================== */

interface AuroraEffectProps {
  className?: string
  /** Aurora colors */
  colors?: string[]
  /** Animation speed */
  speed?: number
  /** Opacity */
  opacity?: number
}

export function AuroraEffect({
  className,
  colors = ['#22d3ee', '#8b5cf6', '#ec4899', '#22d3ee'],
  speed = 1,
  opacity = 0.3,
}: AuroraEffectProps) {
  const time = useMotionValue(0)
  
  useAnimationFrame((t) => {
    time.set(t * 0.0001 * speed)
  })
  const wave1BackgroundPosition = useTransform(time, (t) => `${50 + Math.sin(t) * 50}% ${50 + Math.cos(t * 0.8) * 50}%`)
  const wave1Transform = useTransform(time, (t) => `skewY(${Math.sin(t * 0.5) * 5}deg)`)
  const wave2BackgroundPosition = useTransform(time, (t) => `${50 + Math.cos(t * 0.9) * 50}% ${50 + Math.sin(t * 1.1) * 50}%`)
  const wave2Transform = useTransform(time, (t) => `skewY(${Math.cos(t * 0.6) * -5}deg)`)

  return (
    <div 
      className={cn('absolute inset-0 overflow-hidden', className)}
      style={{ opacity }}
    >
      {/* Aurora wave 1 */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(${colors.join(', ')})`,
          backgroundSize: '400% 400%',
          backgroundPosition: wave1BackgroundPosition,
          filter: 'blur(80px)',
          transform: wave1Transform,
        }}
      />
      
      {/* Aurora wave 2 (offset) */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(45deg, ${colors.slice().reverse().join(', ')})`,
          backgroundSize: '400% 400%',
          backgroundPosition: wave2BackgroundPosition,
          filter: 'blur(100px)',
          transform: wave2Transform,
          mixBlendMode: 'screen',
        }}
      />
    </div>
  )
}

/* ==========================================================================
   FLOWING ORBS - Ambient floating orbs
   ========================================================================== */

interface FlowingOrbsProps {
  className?: string
  /** Number of orbs */
  count?: number
  /** Colors for orbs */
  colors?: string[]
  /** Size range [min, max] */
  sizeRange?: [number, number]
  /** Speed multiplier */
  speed?: number
}

export function FlowingOrbs({
  className,
  count = 5,
  colors = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'],
  sizeRange = [200, 500],
  speed = 1,
}: FlowingOrbsProps) {
  const orbs = React.useMemo(() => 
    Array.from({ length: count }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 15 + Math.random() * 20,
      delay: Math.random() * 10,
    })),
    [count, colors, sizeRange]
  )

  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)}>
      {orbs.map((orb) => (
        <motion.div
          key={orb.id}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color}40, transparent 70%)`,
            filter: 'blur(60px)',
            left: `${orb.x}%`,
            top: `${orb.y}%`,
          }}
          animate={{
            x: [0, 100, -50, 100, 0],
            y: [0, -50, 100, 50, 0],
            scale: [1, 1.2, 0.9, 1.1, 1],
          }}
          transition={{
            duration: orb.duration / speed,
            delay: orb.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

/* ==========================================================================
   ANIMATED GRAIN - Premium grain texture
   ========================================================================== */

interface AnimatedGrainProps {
  className?: string
  /** Grain opacity */
  opacity?: number
  /** Animate the grain */
  animated?: boolean
}

export function AnimatedGrain({
  className,
  opacity = 0.03,
  animated = true,
}: AnimatedGrainProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const frameRef = React.useRef<number>(0)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const render = () => {
      const imageData = ctx.createImageData(canvas.width, canvas.height)
      const data = imageData.data
      
      for (let i = 0; i < data.length; i += 4) {
        const noise = Math.random() * 255
        data[i] = noise     // R
        data[i + 1] = noise // G
        data[i + 2] = noise // B
        data[i + 3] = 255   // A
      }
      
      ctx.putImageData(imageData, 0, 0)
      
      if (animated) {
        frameRef.current = requestAnimationFrame(render)
      }
    }

    render()

    return () => {
      window.removeEventListener('resize', resize)
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [animated])

  return (
    <canvas
      ref={canvasRef}
      className={cn('absolute inset-0 pointer-events-none', className)}
      style={{ opacity, mixBlendMode: 'overlay' }}
    />
  )
}

/* ==========================================================================
   STAR FIELD - Animated stars background
   ========================================================================== */

interface StarFieldProps {
  className?: string
  /** Number of stars */
  count?: number
  /** Star color */
  color?: string
  /** Enable twinkling */
  twinkle?: boolean
  /** Speed of star movement */
  speed?: number
}

export function StarField({
  className,
  count = 100,
  color = '#ffffff',
  twinkle = true,
  speed = 0.5,
}: StarFieldProps) {
  const stars = React.useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2,
      duration: 2 + Math.random() * 4,
      delay: Math.random() * 2,
    })),
    [count]
  )

  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)}>
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full"
          style={{
            width: star.size,
            height: star.size,
            backgroundColor: color,
            left: `${star.x}%`,
            top: `${star.y}%`,
            boxShadow: `0 0 ${star.size * 2}px ${color}`,
          }}
          animate={twinkle ? {
            opacity: [0.3, 1, 0.3],
            scale: [1, 1.5, 1],
          } : {}}
          transition={{
            duration: star.duration,
            delay: star.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

/* ==========================================================================
   DEPTH FOG - Layered fog effect
   ========================================================================== */

interface DepthFogProps {
  className?: string
  /** Fog color */
  color?: string
  /** Number of layers */
  layers?: number
  /** Animation speed */
  speed?: number
}

function DepthFogLayer({
  time,
  index,
  color,
}: {
  time: ReturnType<typeof useMotionValue<number>>
  index: number
  color: string
}) {
  const transform = useTransform(time, (t) => `translateY(${Math.sin(t + index) * 20}%)`)

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        background: `linear-gradient(180deg, transparent 0%, ${color} 50%, transparent 100%)`,
        transform,
        opacity: 0.3 - index * 0.05,
      }}
    />
  )
}

export function DepthFog({
  className,
  color = 'rgba(0, 0, 0, 0.3)',
  layers = 3,
  speed = 1,
}: DepthFogProps) {
  const time = useMotionValue(0)
  
  useAnimationFrame((t) => {
    time.set(t * 0.00005 * speed)
  })

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      {Array.from({ length: layers }).map((_, i) => (
        <DepthFogLayer
          key={i}
          time={time}
          index={i}
          color={color}
        />
      ))}
    </div>
  )
}

/* ==========================================================================
   GRID PATTERN - Animated grid background
   ========================================================================== */

interface GridPatternProps {
  className?: string
  /** Grid size in pixels */
  size?: number
  /** Line color */
  color?: string
  /** Fade edges */
  fade?: boolean
}

export function GridPattern({
  className,
  size = 50,
  color = 'rgba(255, 255, 255, 0.05)',
  fade = true,
}: GridPatternProps) {
  return (
    <div
      className={cn('absolute inset-0 pointer-events-none', className)}
      style={{
        backgroundImage: `
          linear-gradient(${color} 1px, transparent 1px),
          linear-gradient(90deg, ${color} 1px, transparent 1px)
        `,
        backgroundSize: `${size}px ${size}px`,
        mask: fade 
          ? 'radial-gradient(ellipse at center, black 30%, transparent 70%)' 
          : undefined,
      }}
    />
  )
}

/* ==========================================================================
   SPOTLIGHT AMBIENT - Global spotlight that follows something
   ========================================================================== */

interface SpotlightAmbientProps {
  className?: string
  /** Spotlight color */
  color?: string
  /** Size of spotlight */
  size?: number
  /** Position x (0-100%) */
  x?: number
  /** Position y (0-100%) */
  y?: number
  /** Animate position */
  animate?: boolean
}

export function SpotlightAmbient({
  className,
  color = 'rgba(139, 92, 246, 0.15)',
  size = 600,
  x = 50,
  y = 30,
  animate = true,
}: SpotlightAmbientProps) {
  const time = useMotionValue(0)
  
  useAnimationFrame((t) => {
    if (animate) {
      time.set(t * 0.0001)
    }
  })
  const animatedLeft = useTransform(time, (t) => `calc(${x}% + ${Math.sin(t) * 100}px)`)
  const animatedTop = useTransform(time, (t) => `calc(${y}% + ${Math.cos(t * 0.8) * 50}px)`)

  return (
    <motion.div
      className={cn('absolute pointer-events-none', className)}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color}, transparent 70%)`,
        left: animate ? animatedLeft : `${x}%`,
        top: animate ? animatedTop : `${y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    />
  )
}

/* ==========================================================================
   ELITE BACKGROUND PRESET - Full premium background
   ========================================================================== */

interface EliteBackgroundProps {
  className?: string
  /** Preset theme */
  preset?: 'default' | 'aurora' | 'cosmos' | 'minimal' | 'cyber'
  /** Primary accent color */
  accentColor?: string
}

export function EliteBackground({
  className,
  preset = 'default',
  accentColor = '#8b5cf6',
}: EliteBackgroundProps) {
  const presets = {
    default: (
      <>
        <AnimatedMeshGradient opacity={0.3} speed={0.5} />
        <GridPattern fade />
        <AnimatedGrain opacity={0.02} />
      </>
    ),
    aurora: (
      <>
        <AuroraEffect opacity={0.4} speed={0.8} />
        <StarField count={50} twinkle />
        <AnimatedGrain opacity={0.015} />
      </>
    ),
    cosmos: (
      <>
        <StarField count={150} twinkle speed={0.3} />
        <FlowingOrbs count={3} colors={[accentColor, '#ec4899', '#06b6d4']} />
        <DepthFog layers={2} />
        <AnimatedGrain opacity={0.01} />
      </>
    ),
    minimal: (
      <>
        <SpotlightAmbient color={`${accentColor}20`} size={800} animate />
        <GridPattern size={80} fade />
        <AnimatedGrain opacity={0.02} animated={false} />
      </>
    ),
    cyber: (
      <>
        <AnimatedMeshGradient 
          color1="#00ff88" 
          color2="#00ccff" 
          color3="#ff00ff" 
          color4="#ffff00"
          opacity={0.2}
          speed={0.8}
        />
        <GridPattern size={40} color="rgba(0, 255, 136, 0.08)" />
        <AnimatedGrain opacity={0.03} />
      </>
    ),
  }

  return (
    <div className={cn('fixed inset-0 z-0 overflow-hidden bg-[#020203]', className)}>
      {presets[preset]}
    </div>
  )
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export type {
  AnimatedMeshGradientProps,
  AuroraEffectProps,
  FlowingOrbsProps,
  AnimatedGrainProps,
  StarFieldProps,
  DepthFogProps,
  GridPatternProps,
  SpotlightAmbientProps,
  EliteBackgroundProps,
}
