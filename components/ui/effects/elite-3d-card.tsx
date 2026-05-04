'use client'

import * as React from 'react'
import { motion, useMotionValue, useSpring, useTransform, MotionStyle } from 'framer-motion'
import { cn } from '@/lib/utils'

/* ==========================================================================
   ELITE 3D CARD SYSTEM - Silicon Valley Grade
   
   World-class 3D card effects with:
   - Realistic perspective transforms
   - Dynamic lighting simulation
   - Multi-layer depth with parallax
   - Holographic surface effects
   - Edge lighting on hover
   - Reflection/refraction effects
   - Animated glare
   - Depth-based shadow system
   ========================================================================== */

interface Elite3DCardProps {
  children: React.ReactNode
  className?: string
  /** 3D tilt intensity (0-30) */
  tiltIntensity?: number
  /** Perspective distance (lower = more dramatic) */
  perspective?: number
  /** Enable dynamic lighting */
  lighting?: boolean
  /** Light color */
  lightColor?: string
  /** Enable holographic effect */
  holographic?: boolean
  /** Enable glare effect */
  glare?: boolean
  glareColor?: string
  glareOpacity?: number
  /** Enable edge glow */
  edgeGlow?: boolean
  edgeGlowColor?: string
  /** Enable floating effect */
  float?: boolean
  floatIntensity?: number
  /** Enable depth shadows */
  depthShadow?: boolean
  /** Enable shine effect on surface */
  shine?: boolean
  /** Border radius */
  borderRadius?: number
  /** Scale on hover */
  hoverScale?: number
  /** Inner content depth offset */
  contentDepth?: number
}

export function Elite3DCard({
  children,
  className,
  tiltIntensity = 15,
  perspective = 1000,
  lighting = true,
  lightColor = 'rgba(255, 255, 255, 0.6)',
  holographic = false,
  glare = true,
  glareColor = 'rgba(255, 255, 255, 0.4)',
  glareOpacity = 0.3,
  edgeGlow = true,
  edgeGlowColor = 'rgba(139, 92, 246, 0.5)',
  float = false,
  floatIntensity = 10,
  depthShadow = true,
  shine = true,
  borderRadius = 24,
  hoverScale = 1.02,
  contentDepth = 40,
}: Elite3DCardProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = React.useState(false)

  // Mouse position (0-1 range from center)
  const mouseX = useMotionValue(0.5)
  const mouseY = useMotionValue(0.5)

  // Spring physics for smooth movement
  const springConfig = { damping: 20, stiffness: 300 }
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [tiltIntensity, -tiltIntensity]), springConfig)
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-tiltIntensity, tiltIntensity]), springConfig)

  // Glare position
  const glareX = useSpring(useTransform(mouseX, [0, 1], [-50, 150]), springConfig)
  const glareY = useSpring(useTransform(mouseY, [0, 1], [-50, 150]), springConfig)

  // Light position for dynamic lighting
  const lightX = useTransform(mouseX, [0, 1], ['0%', '100%'])
  const lightY = useTransform(mouseY, [0, 1], ['0%', '100%'])

  // Content parallax
  const contentX = useSpring(useTransform(mouseX, [0, 1], [-contentDepth * 0.3, contentDepth * 0.3]), springConfig)
  const contentY = useSpring(useTransform(mouseY, [0, 1], [-contentDepth * 0.3, contentDepth * 0.3]), springConfig)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    mouseX.set(x)
    mouseY.set(y)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    mouseX.set(0.5)
    mouseY.set(0.5)
  }

  // Dynamic shadow based on tilt
  const shadowX = useTransform(rotateY, [-tiltIntensity, tiltIntensity], [30, -30])
  const shadowY = useTransform(rotateX, [tiltIntensity, -tiltIntensity], [-30, 30])
  const shadowBlur = useTransform(
    [rotateX, rotateY],
    ([rx, ry]: number[]) => 40 + Math.abs(rx) + Math.abs(ry)
  )

  // Holographic gradient rotation
  const holoRotate = useTransform(
    [mouseX, mouseY],
    ([x, y]: number[]) => Math.atan2(y - 0.5, x - 0.5) * (180 / Math.PI)
  )

  return (
    <motion.div
      ref={ref}
      className={cn('relative', className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Floating animation wrapper */}
      <motion.div
        animate={float && isHovered ? {
          y: [-floatIntensity / 2, floatIntensity / 2],
        } : {}}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'easeInOut',
        }}
      >
        {/* Main card container */}
        <motion.div
          className="relative"
          style={{
            rotateX,
            rotateY,
            transformStyle: 'preserve-3d',
            borderRadius,
          }}
          animate={{
            scale: isHovered ? hoverScale : 1,
          }}
          transition={{ type: 'spring', ...springConfig }}
        >
          {/* Depth shadow layers */}
          {depthShadow && (
            <>
              {/* Primary shadow */}
              <motion.div
                className="absolute inset-0 -z-10"
                style={{
                  borderRadius,
                  x: shadowX,
                  y: shadowY,
                  filter: useTransform(shadowBlur, v => `blur(${v}px)`),
                  background: 'rgba(0, 0, 0, 0.3)',
                  transform: 'translateZ(-50px)',
                }}
              />
              {/* Secondary shadow (deeper) */}
              <motion.div
                className="absolute inset-0 -z-20"
                style={{
                  borderRadius,
                  x: useTransform(shadowX, v => v * 1.5),
                  y: useTransform(shadowY, v => v * 1.5),
                  filter: 'blur(60px)',
                  background: 'rgba(0, 0, 0, 0.2)',
                  transform: 'translateZ(-100px) scale(0.9)',
                }}
              />
            </>
          )}

          {/* Edge glow effect */}
          {edgeGlow && isHovered && (
            <motion.div
              className="absolute inset-[-2px] rounded-[inherit] -z-5"
              style={{
                borderRadius: borderRadius + 2,
                background: useTransform(
                  [lightX, lightY],
                  ([x, y]) => `radial-gradient(circle at ${x} ${y}, ${edgeGlowColor}, transparent 60%)`
                ),
                filter: 'blur(4px)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}

          {/* Card surface */}
          <div
            className="relative overflow-hidden"
            style={{
              borderRadius,
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Dynamic lighting overlay */}
            {lighting && (
              <motion.div
                className="absolute inset-0 pointer-events-none z-20"
                style={{
                  borderRadius,
                  background: useTransform(
                    [lightX, lightY],
                    ([x, y]) => `radial-gradient(ellipse 80% 80% at ${x} ${y}, ${lightColor}, transparent 70%)`
                  ),
                  opacity: isHovered ? 0.5 : 0,
                }}
                transition={{ duration: 0.3 }}
              />
            )}

            {/* Holographic effect */}
            {holographic && (
              <motion.div
                className="absolute inset-0 pointer-events-none z-20 mix-blend-overlay"
                style={{
                  borderRadius,
                  background: useTransform(
                    holoRotate,
                    r => `linear-gradient(${r}deg, 
                      rgba(255, 0, 128, 0.2), 
                      rgba(0, 255, 255, 0.2), 
                      rgba(255, 255, 0, 0.2), 
                      rgba(255, 0, 128, 0.2)
                    )`
                  ),
                  opacity: isHovered ? 0.6 : 0,
                }}
              />
            )}

            {/* Glare effect */}
            {glare && (
              <motion.div
                className="absolute inset-0 pointer-events-none z-30 overflow-hidden"
                style={{
                  borderRadius,
                  opacity: isHovered ? glareOpacity : 0,
                }}
              >
                <motion.div
                  className="absolute w-[200%] h-[200%]"
                  style={{
                    left: glareX,
                    top: glareY,
                    background: `linear-gradient(135deg, transparent 30%, ${glareColor} 50%, transparent 70%)`,
                    transform: 'translate(-50%, -50%) rotate(-45deg)',
                  }}
                />
              </motion.div>
            )}

            {/* Shine lines effect */}
            {shine && isHovered && (
              <motion.div
                className="absolute inset-0 pointer-events-none z-25 overflow-hidden"
                style={{ borderRadius }}
              >
                {/* Animated shine line */}
                <motion.div
                  className="absolute w-[200%] h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent"
                  style={{
                    top: '50%',
                    left: '-100%',
                  }}
                  animate={{
                    left: ['−100%', '100%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3,
                    ease: 'easeInOut',
                  }}
                />
              </motion.div>
            )}

            {/* Content with depth offset */}
            <motion.div
              className="relative z-10"
              style={{
                x: contentX,
                y: contentY,
                transform: `translateZ(${contentDepth}px)`,
              }}
            >
              {children}
            </motion.div>

            {/* Glass reflection at bottom */}
            <div
              className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none z-20"
              style={{
                borderRadius: `0 0 ${borderRadius}px ${borderRadius}px`,
                background: 'linear-gradient(to top, rgba(255,255,255,0.05), transparent)',
              }}
            />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

/* ==========================================================================
   ELITE GLASS CARD - Glassmorphism with depth
   ========================================================================== */

interface EliteGlassCardProps {
  children: React.ReactNode
  className?: string
  /** Blur intensity */
  blur?: number
  /** Background opacity */
  opacity?: number
  /** Border color */
  borderColor?: string
  /** Enable rainbow border */
  rainbowBorder?: boolean
  /** Enable noise texture */
  noise?: boolean
  /** Gradient tint */
  tint?: string
}

export function EliteGlassCard({
  children,
  className,
  blur = 20,
  opacity = 0.1,
  borderColor = 'rgba(255, 255, 255, 0.2)',
  rainbowBorder = false,
  noise = true,
  tint,
}: EliteGlassCardProps) {
  const [isHovered, setIsHovered] = React.useState(false)

  return (
    <motion.div
      className={cn('relative', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Rainbow border animation */}
      {rainbowBorder && (
        <motion.div
          className="absolute -inset-[2px] rounded-[inherit] z-[-1]"
          style={{
            background: 'conic-gradient(from 0deg, #8b5cf6, #ec4899, #f59e0b, #10b981, #0ea5e9, #8b5cf6)',
            backgroundSize: '400% 400%',
          }}
          animate={isHovered ? {
            backgroundPosition: ['0% 0%', '100% 100%'],
          } : {}}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}

      {/* Glass surface */}
      <div
        className="relative overflow-hidden rounded-[inherit]"
        style={{
          background: tint 
            ? `linear-gradient(135deg, ${tint}, rgba(255,255,255,${opacity}))`
            : `rgba(255, 255, 255, ${opacity})`,
          backdropFilter: `blur(${blur}px)`,
          WebkitBackdropFilter: `blur(${blur}px)`,
          border: rainbowBorder ? 'none' : `1px solid ${borderColor}`,
        }}
      >
        {/* Noise texture overlay */}
        {noise && (
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
        )}

        {/* Top reflection */}
        <div
          className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.1), transparent)',
          }}
        />

        {children}
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   DEPTH LAYER - For creating parallax depth in cards
   ========================================================================== */

interface DepthLayerProps {
  children: React.ReactNode
  className?: string
  /** Z-depth in pixels */
  depth?: number
  /** Parallax multiplier */
  parallax?: number
}

export function DepthLayer({
  children,
  className,
  depth = 0,
  parallax = 1,
}: DepthLayerProps) {
  return (
    <div
      className={cn('relative', className)}
      style={{
        transform: `translateZ(${depth}px)`,
        transformStyle: 'preserve-3d',
      }}
    >
      {children}
    </div>
  )
}

/* ==========================================================================
   ELITE BADGE - 3D floating badge
   ========================================================================== */

interface EliteBadgeProps {
  children: React.ReactNode
  className?: string
  /** Glow color */
  glowColor?: string
  /** Float animation */
  float?: boolean
  /** Pulse animation */
  pulse?: boolean
}

export function EliteBadge({
  children,
  className,
  glowColor = '#8b5cf6',
  float = true,
  pulse = true,
}: EliteBadgeProps) {
  return (
    <motion.div
      className={cn('relative inline-flex', className)}
      animate={float ? {
        y: [-2, 2],
        rotateZ: [-1, 1],
      } : {}}
      transition={{
        duration: 2,
        repeat: Infinity,
        repeatType: 'reverse',
        ease: 'easeInOut',
      }}
    >
      {/* Glow layer */}
      <motion.div
        className="absolute inset-0 rounded-[inherit] -z-10"
        style={{
          background: glowColor,
          filter: 'blur(15px)',
        }}
        animate={pulse ? {
          opacity: [0.4, 0.7, 0.4],
          scale: [1, 1.1, 1],
        } : {}}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Badge content */}
      <div
        className="relative overflow-hidden rounded-[inherit]"
        style={{
          boxShadow: `0 0 20px ${glowColor}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
        }}
      >
        {children}

        {/* Shine effect */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)',
          }}
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 4,
          }}
        />
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export type { Elite3DCardProps, EliteGlassCardProps, DepthLayerProps, EliteBadgeProps }
