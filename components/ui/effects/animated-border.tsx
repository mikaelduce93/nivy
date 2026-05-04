'use client'

import * as React from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

/* ==========================================================================
   ANIMATED BORDERS - Silicon Valley Grade Holographic Effects
   
   Multi-layer rotating gradients with synchronized glow effects:
   - HolographicBorder: Premium multi-ring rotating border
   - GlowingBorder: Simple animated glow border
   - PulseBorder: Pulsing border effect
   - RainbowBorder: Animated rainbow gradient
   ========================================================================== */

// Border presets
const GRADIENTS = {
  lavender: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#8b5cf6'],
  coral: ['#f43f5e', '#fb7185', '#f43f5e', '#e11d48'],
  mint: ['#10b981', '#34d399', '#10b981', '#059669'],
  gold: ['#f59e0b', '#fbbf24', '#f59e0b', '#d97706'],
  rainbow: ['#8b5cf6', '#f43f5e', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6'],
  holographic: ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6'],
  fire: ['#f97316', '#ef4444', '#fbbf24', '#f97316'],
  ice: ['#0ea5e9', '#06b6d4', '#8b5cf6', '#0ea5e9'],
  neon: ['#f0abfc', '#c084fc', '#8b5cf6', '#f0abfc'],
}

/* ==========================================================================
   HOLOGRAPHIC BORDER - Premium multi-layer effect
   ========================================================================== */

interface HolographicBorderProps {
  children: React.ReactNode
  gradient?: keyof typeof GRADIENTS | string[]
  borderWidth?: number
  borderRadius?: number | string
  speed?: 'slow' | 'medium' | 'fast'
  intensity?: 'subtle' | 'medium' | 'strong'
  glow?: boolean
  glowSize?: number
  className?: string
  innerClassName?: string
  hover?: boolean
}

export function HolographicBorder({
  children,
  gradient = 'holographic',
  borderWidth = 2,
  borderRadius = 24,
  speed = 'medium',
  intensity = 'medium',
  glow = true,
  glowSize = 20,
  className,
  innerClassName,
  hover = false,
}: HolographicBorderProps) {
  const [isHovered, setIsHovered] = React.useState(false)
  const colors = Array.isArray(gradient) ? gradient : GRADIENTS[gradient]
  
  const speedDuration = { slow: 8, medium: 4, fast: 2 }[speed]
  const intensityOpacity = { subtle: 0.5, medium: 0.75, strong: 1 }[intensity]
  
  const shouldAnimate = hover ? isHovered : true
  const gradientString = `conic-gradient(from 0deg, ${colors.join(', ')})`

  return (
    <div
      className={cn('relative group', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Outer glow layer */}
      {glow && (
        <motion.div
          className="absolute -inset-[1px] pointer-events-none"
          style={{
            borderRadius,
            background: gradientString,
            filter: `blur(${glowSize}px)`,
            opacity: shouldAnimate ? intensityOpacity * 0.6 : 0,
          }}
          animate={shouldAnimate ? {
            rotate: [0, 360],
          } : {}}
          transition={{
            duration: speedDuration * 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}

      {/* Main rotating border */}
      <motion.div
        className="absolute -inset-[1px] pointer-events-none"
        style={{
          borderRadius,
          padding: borderWidth,
          background: gradientString,
          opacity: intensityOpacity,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
        animate={shouldAnimate ? {
          rotate: [0, 360],
        } : {}}
        transition={{
          duration: speedDuration,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Second layer - counter rotation for depth */}
      <motion.div
        className="absolute -inset-[1px] pointer-events-none"
        style={{
          borderRadius,
          padding: borderWidth * 0.5,
          background: gradientString,
          opacity: intensityOpacity * 0.3,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
        animate={shouldAnimate ? {
          rotate: [360, 0],
        } : {}}
        transition={{
          duration: speedDuration * 2,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Shimmer overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ borderRadius }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
          }}
          animate={shouldAnimate ? {
            x: ['-100%', '200%'],
          } : {}}
          transition={{
            duration: speedDuration * 0.75,
            repeat: Infinity,
            repeatDelay: speedDuration,
            ease: 'easeInOut',
          }}
        />
      </motion.div>

      {/* Content */}
      <div className={cn('relative', innerClassName)} style={{ borderRadius }}>
        {children}
      </div>
    </div>
  )
}

/* ==========================================================================
   GLOWING BORDER - Simple animated glow
   ========================================================================== */

interface GlowingBorderProps {
  children: React.ReactNode
  color?: string
  borderWidth?: number
  borderRadius?: number | string
  pulseSpeed?: number
  glowIntensity?: number
  className?: string
}

export function GlowingBorder({
  children,
  color = '#8b5cf6',
  borderWidth = 2,
  borderRadius = 16,
  pulseSpeed = 2,
  glowIntensity = 20,
  className,
}: GlowingBorderProps) {
  return (
    <div className={cn('relative', className)}>
      {/* Glow layer */}
      <motion.div
        className="absolute -inset-[1px] pointer-events-none"
        style={{
          borderRadius,
          background: color,
          filter: `blur(${glowIntensity}px)`,
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: pulseSpeed,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Border */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius,
          border: `${borderWidth}px solid ${color}`,
        }}
      />

      {/* Content */}
      <div className="relative">{children}</div>
    </div>
  )
}

/* ==========================================================================
   PULSE BORDER - Pulsing ring effect
   ========================================================================== */

interface PulseBorderProps {
  children: React.ReactNode
  color?: string
  borderRadius?: number | string
  rings?: number
  className?: string
}

export function PulseBorder({
  children,
  color = '#8b5cf6',
  borderRadius = 16,
  rings = 3,
  className,
}: PulseBorderProps) {
  return (
    <div className={cn('relative', className)}>
      {/* Pulse rings */}
      {Array.from({ length: rings }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius,
            border: `2px solid ${color}`,
          }}
          animate={{
            scale: [1, 1.5 + i * 0.2],
            opacity: [0.6, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.4,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Static border */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius,
          border: `2px solid ${color}`,
          opacity: 0.5,
        }}
      />

      {/* Content */}
      <div className="relative">{children}</div>
    </div>
  )
}

/* ==========================================================================
   RAINBOW BORDER - Animated gradient border
   ========================================================================== */

interface RainbowBorderProps {
  children: React.ReactNode
  borderWidth?: number
  borderRadius?: number | string
  speed?: number
  className?: string
}

export function RainbowBorder({
  children,
  borderWidth = 2,
  borderRadius = 16,
  speed = 3,
  className,
}: RainbowBorderProps) {
  return (
    <div className={cn('relative', className)}>
      {/* Animated gradient border */}
      <motion.div
        className="absolute -inset-[1px] pointer-events-none"
        style={{
          borderRadius,
          padding: borderWidth,
          background: 'linear-gradient(90deg, #8b5cf6, #f43f5e, #f59e0b, #10b981, #0ea5e9, #8b5cf6)',
          backgroundSize: '300% 100%',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
        animate={{
          backgroundPosition: ['0% 0%', '300% 0%'],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Content */}
      <div className="relative">{children}</div>
    </div>
  )
}

/* ==========================================================================
   SPOTLIGHT BORDER - Cursor-following spotlight
   ========================================================================== */

interface SpotlightBorderProps {
  children: React.ReactNode
  color?: string
  borderWidth?: number
  borderRadius?: number | string
  spotlightSize?: number
  className?: string
}

export function SpotlightBorder({
  children,
  color = '#8b5cf6',
  borderWidth = 2,
  borderRadius = 16,
  spotlightSize = 200,
  className,
}: SpotlightBorderProps) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }

  return (
    <div
      className={cn('relative group', className)}
      onMouseMove={handleMouseMove}
    >
      {/* Spotlight gradient border */}
      <motion.div
        className="absolute -inset-[1px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          borderRadius,
          padding: borderWidth,
          background: useTransform(
            [mouseX, mouseY],
            ([x, y]) => 
              `radial-gradient(${spotlightSize}px circle at ${x}px ${y}px, ${color}, transparent 60%)`
          ),
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />

      {/* Base border */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius,
          border: `${borderWidth}px solid rgba(255,255,255,0.1)`,
        }}
      />

      {/* Content */}
      <div className="relative">{children}</div>
    </div>
  )
}

/* ==========================================================================
   LIQUID BORDER - Organic flowing border
   ========================================================================== */

interface LiquidBorderProps {
  children: React.ReactNode
  color?: string
  borderRadius?: number | string
  className?: string
}

export function LiquidBorder({
  children,
  color = '#8b5cf6',
  borderRadius = 16,
  className,
}: LiquidBorderProps) {
  return (
    <div className={cn('relative', className)}>
      {/* Liquid blobs */}
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute w-8 h-8 rounded-full pointer-events-none"
          style={{
            background: color,
            filter: 'blur(8px)',
            opacity: 0.6,
          }}
          animate={{
            x: [
              `${25 * i}%`,
              `${25 * ((i + 1) % 4)}%`,
              `${25 * ((i + 2) % 4)}%`,
              `${25 * ((i + 3) % 4)}%`,
              `${25 * i}%`,
            ],
            y: [
              i % 2 === 0 ? '-10%' : '110%',
              i % 2 === 0 ? '110%' : '-10%',
              i % 2 === 0 ? '110%' : '-10%',
              i % 2 === 0 ? '-10%' : '110%',
              i % 2 === 0 ? '-10%' : '110%',
            ],
          }}
          transition={{
            duration: 8 + i,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Content with backdrop */}
      <div 
        className="relative bg-zinc-950/90 backdrop-blur-xl"
        style={{ borderRadius }}
      >
        {children}
      </div>
    </div>
  )
}

/* ==========================================================================
   EXPORT GRADIENTS
   ========================================================================== */

export { GRADIENTS }
