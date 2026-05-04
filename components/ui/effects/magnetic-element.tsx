'use client'

import * as React from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

/* ==========================================================================
   MAGNETIC ELEMENT - Silicon Valley Grade Cursor Attraction
   
   A wrapper component that creates a magnetic effect, attracting or repelling
   the element towards/away from the cursor.
   
   Features:
   - Magnetic attraction (element follows cursor)
   - Magnetic repulsion (element moves away from cursor)
   - Cursor glow effect following mouse
   - Custom cursor on hover
   - Configurable strength and distance
   ========================================================================== */

interface MagneticElementProps {
  children: React.ReactNode
  className?: string
  /** Magnetic strength (0-1). Higher = stronger pull. Default 0.3 */
  strength?: number
  /** Max distance for magnetic effect in pixels. Default 100 */
  distance?: number
  /** Repel instead of attract. Default false */
  repel?: boolean
  /** Enable cursor glow effect. Default false */
  cursorGlow?: boolean
  /** Glow color */
  glowColor?: string
  /** Glow size in pixels */
  glowSize?: number
  /** Disable effect on touch devices */
  disableOnTouch?: boolean
  /** Spring stiffness */
  stiffness?: number
  /** Spring damping */
  damping?: number
  /** Scale on hover */
  hoverScale?: number
  /** Enable/disable the effect */
  enabled?: boolean
  /** As child - pass motion props to child */
  asChild?: boolean
}

export function MagneticElement({
  children,
  className,
  strength = 0.3,
  distance = 100,
  repel = false,
  cursorGlow = false,
  glowColor = 'rgba(139, 92, 246, 0.4)',
  glowSize = 150,
  disableOnTouch = true,
  stiffness = 150,
  damping = 15,
  hoverScale = 1,
  enabled = true,
  asChild = false,
}: MagneticElementProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = React.useState(false)
  const [isTouchDevice, setIsTouchDevice] = React.useState(false)

  // Motion values for position
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  // Motion values for glow position (raw, not sprung)
  const glowX = useMotionValue(50)
  const glowY = useMotionValue(50)

  // Spring physics
  const springX = useSpring(x, { stiffness, damping })
  const springY = useSpring(y, { stiffness, damping })
  const glowBackground = useTransform(
    [glowX, glowY],
    ([gx, gy]) =>
      `radial-gradient(${glowSize}px circle at ${gx}% ${gy}%, ${glowColor}, transparent 60%)`
  )

  // Check for touch device
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
    }
  }, [])

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current || !enabled) return
      if (disableOnTouch && isTouchDevice) return

      const rect = ref.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      // Calculate distance from center
      const distX = e.clientX - centerX
      const distY = e.clientY - centerY
      const dist = Math.sqrt(distX * distX + distY * distY)

      // Only apply effect within distance threshold
      if (dist < distance) {
        const factor = repel ? -strength : strength
        const dampingFactor = 1 - dist / distance // Stronger when closer
        
        x.set(distX * factor * dampingFactor)
        y.set(distY * factor * dampingFactor)
      }

      // Update glow position (as percentage)
      if (cursorGlow) {
        const relX = ((e.clientX - rect.left) / rect.width) * 100
        const relY = ((e.clientY - rect.top) / rect.height) * 100
        glowX.set(relX)
        glowY.set(relY)
      }
    },
    [enabled, disableOnTouch, isTouchDevice, distance, repel, strength, x, y, cursorGlow, glowX, glowY]
  )

  const handleMouseEnter = () => {
    if (!enabled || (disableOnTouch && isTouchDevice)) return
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    x.set(0)
    y.set(0)
  }

  const isActive = enabled && (!disableOnTouch || !isTouchDevice)

  return (
    <motion.div
      ref={ref}
      className={cn('relative', className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        x: isActive ? springX : 0,
        y: isActive ? springY : 0,
      }}
      animate={isActive && isHovered && hoverScale !== 1 ? { scale: hoverScale } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Cursor glow effect */}
      {cursorGlow && isHovered && (
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-[inherit] opacity-0 transition-opacity duration-300"
          style={{
            opacity: isHovered ? 1 : 0,
            background: glowBackground,
          }}
        />
      )}

      {children}
    </motion.div>
  )
}

/* ==========================================================================
   MAGNETIC LINK - A link with magnetic effect
   ========================================================================== */

interface MagneticLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode
  strength?: number
  cursorGlow?: boolean
  glowColor?: string
}

export function MagneticLink({
  children,
  strength = 0.2,
  cursorGlow = true,
  glowColor = 'rgba(139, 92, 246, 0.3)',
  className,
  ...props
}: MagneticLinkProps) {
  return (
    <MagneticElement
      strength={strength}
      cursorGlow={cursorGlow}
      glowColor={glowColor}
      hoverScale={1.05}
      className="inline-block"
    >
      <a className={cn('inline-block', className)} {...props}>
        {children}
      </a>
    </MagneticElement>
  )
}

/* ==========================================================================
   MAGNETIC ICON - An icon with magnetic effect
   ========================================================================== */

interface MagneticIconProps {
  children: React.ReactNode
  className?: string
  strength?: number
  glowColor?: string
  size?: 'sm' | 'md' | 'lg'
}

export function MagneticIcon({
  children,
  className,
  strength = 0.4,
  glowColor = 'rgba(139, 92, 246, 0.5)',
  size = 'md',
}: MagneticIconProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  return (
    <MagneticElement
      strength={strength}
      cursorGlow
      glowColor={glowColor}
      hoverScale={1.15}
      stiffness={200}
      damping={12}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 transition-colors hover:bg-white/10',
          sizeClasses[size],
          className
        )}
      >
        {children}
      </div>
    </MagneticElement>
  )
}

/* ==========================================================================
   MAGNETIC CARD - A card with magnetic tilt effect
   ========================================================================== */

interface MagneticCardProps {
  children: React.ReactNode
  className?: string
  tiltStrength?: number
  glowColor?: string
}

export function MagneticCard({
  children,
  className,
  tiltStrength = 0.15,
  glowColor = 'rgba(139, 92, 246, 0.3)',
}: MagneticCardProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = React.useState(false)

  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const glowX = useMotionValue(50)
  const glowY = useMotionValue(50)

  const springRotateX = useSpring(rotateX, { stiffness: 200, damping: 20 })
  const springRotateY = useSpring(rotateY, { stiffness: 200, damping: 20 })
  const glowBackground = useTransform(
    [glowX, glowY],
    ([gx, gy]) =>
      `radial-gradient(200px circle at ${gx}% ${gy}%, ${glowColor}, transparent 60%)`
  )

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return

    const rect = ref.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5

    rotateX.set(y * -20 * tiltStrength)
    rotateY.set(x * 20 * tiltStrength)
    glowX.set((x + 0.5) * 100)
    glowY.set((y + 0.5) * 100)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    rotateX.set(0)
    rotateY.set(0)
  }

  return (
    <motion.div
      ref={ref}
      className={cn('relative', className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: springRotateX,
        rotateY: springRotateY,
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-[inherit] transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: glowBackground,
        }}
      />

      {children}
    </motion.div>
  )
}

/* ==========================================================================
   REPEL ZONE - Area that repels cursor from elements
   ========================================================================== */

interface RepelZoneProps {
  children: React.ReactNode
  className?: string
  strength?: number
  distance?: number
}

export function RepelZone({
  children,
  className,
  strength = 0.5,
  distance = 80,
}: RepelZoneProps) {
  return (
    <MagneticElement
      repel
      strength={strength}
      distance={distance}
      className={className}
      stiffness={200}
      damping={20}
    >
      {children}
    </MagneticElement>
  )
}
