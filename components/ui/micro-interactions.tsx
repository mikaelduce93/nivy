"use client"

import * as React from "react"
import { motion, type HTMLMotionProps, type Variants } from "framer-motion"
import { cn } from "@/lib/utils"

// ============================================================================
// GEN-Z MICRO-INTERACTIONS
// Bounces, tilts, pops, wiggles - all the fun stuff that makes UI delightful
//
// IMPORTANT: All motion components respect prefers-reduced-motion via the
// useReducedMotion hook. Use it to conditionally disable animations.
// For CSS animations, use Tailwind's motion-safe: and motion-reduce: variants.
// ============================================================================

/**
 * Hook to detect user's reduced motion preference
 * Use this to conditionally disable Framer Motion animations
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}

// Animation variants for consistent motion
export const microAnimations = {
  // Bounce on tap - subtle but satisfying
  bounceTap: {
    scale: 0.95,
    transition: { type: "spring", stiffness: 400, damping: 17 }
  },

  // Pop in with overshoot
  popIn: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 20 }
    },
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.15 } }
  },

  // Slide up with fade
  slideUpFade: {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 25 }
    },
    exit: { opacity: 0, y: 10, transition: { duration: 0.15 } }
  },

  // Wiggle for attention
  wiggle: {
    rotate: [0, -3, 3, -3, 3, 0],
    transition: { duration: 0.5, ease: "easeInOut" }
  },

  // Pulse glow effect
  pulseGlow: {
    scale: [1, 1.02, 1],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
  },

  // Float animation
  float: {
    y: [0, -8, 0],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
  },

  // XP float up animation
  xpFloat: {
    initial: { opacity: 1, y: 0, scale: 1 },
    animate: { 
      opacity: 0, 
      y: -60, 
      scale: 1.2,
      transition: { duration: 1, ease: "easeOut" }
    }
  },

  // Stagger children
  staggerContainer: {
    animate: {
      transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    }
  },

  staggerItem: {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 25 }
    }
  }
} as const

// ============================================================================
// MOTION COMPONENTS
// ============================================================================

interface TapBounceProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

/**
 * Wrapper that adds a bounce effect on tap/click
 */
export function TapBounce({ 
  children, 
  className, 
  disabled = false,
  ...props 
}: TapBounceProps) {
  return (
    <motion.div
      className={cn("cursor-pointer", className)}
      whileTap={disabled ? undefined : microAnimations.bounceTap}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface PopInProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  className?: string
  delay?: number
}

/**
 * Animates children with a pop-in effect
 */
export function PopIn({ 
  children, 
  className, 
  delay = 0,
  ...props 
}: PopInProps) {
  return (
    <motion.div
      className={className}
      initial={microAnimations.popIn.initial}
      animate={{
        ...microAnimations.popIn.animate,
        transition: {
          ...microAnimations.popIn.animate.transition,
          delay
        }
      }}
      exit={microAnimations.popIn.exit}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface SlideUpFadeProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  className?: string
  delay?: number
}

/**
 * Animates children sliding up with fade
 */
export function SlideUpFade({ 
  children, 
  className, 
  delay = 0,
  ...props 
}: SlideUpFadeProps) {
  return (
    <motion.div
      className={className}
      initial={microAnimations.slideUpFade.initial}
      animate={{
        ...microAnimations.slideUpFade.animate,
        transition: {
          ...microAnimations.slideUpFade.animate.transition,
          delay
        }
      }}
      exit={microAnimations.slideUpFade.exit}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface WiggleProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  className?: string
  trigger?: boolean
}

/**
 * Wiggles children for attention
 */
export function Wiggle({ 
  children, 
  className,
  trigger = false,
  ...props 
}: WiggleProps) {
  return (
    <motion.div
      className={className}
      animate={trigger ? microAnimations.wiggle : {}}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface FloatProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  className?: string
}

/**
 * Floating animation for ambient movement
 */
export function Float({ children, className, ...props }: FloatProps) {
  return (
    <motion.div
      className={className}
      animate={microAnimations.float}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface PulseGlowProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  className?: string
}

/**
 * Subtle pulsing glow effect
 */
export function PulseGlow({ children, className, ...props }: PulseGlowProps) {
  return (
    <motion.div
      className={className}
      animate={microAnimations.pulseGlow}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface XPFloatProps {
  amount: number
  className?: string
  onComplete?: () => void
}

/**
 * Floating XP indicator that animates up and fades out
 */
export function XPFloat({ amount, className, onComplete }: XPFloatProps) {
  return (
    <motion.div
      className={cn(
        "absolute pointer-events-none font-bold text-lg",
        "text-gen-z-lime drop-shadow-lg",
        className
      )}
      initial={microAnimations.xpFloat.initial}
      animate={microAnimations.xpFloat.animate}
      onAnimationComplete={onComplete}
    >
      +{amount} XP
    </motion.div>
  )
}

interface StaggerContainerProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  className?: string
}

/**
 * Container that staggers children animations
 */
export function StaggerContainer({ 
  children, 
  className, 
  ...props 
}: StaggerContainerProps) {
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="animate"
      variants={microAnimations.staggerContainer as Variants}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface StaggerItemProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  className?: string
}

/**
 * Item within a StaggerContainer
 */
export function StaggerItem({ 
  children, 
  className, 
  ...props 
}: StaggerItemProps) {
  return (
    <motion.div
      className={className}
      variants={microAnimations.staggerItem as Variants}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// ============================================================================
// HOVER EFFECTS
// ============================================================================

interface HoverTiltProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  className?: string
  intensity?: number
}

/**
 * 3D tilt effect on hover
 */
export function HoverTilt({ 
  children, 
  className, 
  intensity = 5,
  ...props 
}: HoverTiltProps) {
  const [rotateX, setRotateX] = React.useState(0)
  const [rotateY, setRotateY] = React.useState(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const percentX = (e.clientX - centerX) / (rect.width / 2)
    const percentY = (e.clientY - centerY) / (rect.height / 2)
    
    setRotateX(-percentY * intensity)
    setRotateY(percentX * intensity)
  }

  const handleMouseLeave = () => {
    setRotateX(0)
    setRotateY(0)
  }

  return (
    <motion.div
      className={cn("transform-gpu", className)}
      style={{ perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX,
        rotateY,
        transition: { type: "spring", stiffness: 300, damping: 30 }
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface HoverLiftProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  className?: string
  liftAmount?: number
}

/**
 * Lifts element on hover with shadow
 */
export function HoverLift({ 
  children, 
  className, 
  liftAmount = 4,
  ...props 
}: HoverLiftProps) {
  return (
    <motion.div
      className={cn("transition-shadow duration-300", className)}
      whileHover={{ 
        y: -liftAmount,
        transition: { type: "spring", stiffness: 400, damping: 25 }
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// ============================================================================
// CELEBRATION EFFECTS
// ============================================================================

interface ConfettiPieceProps {
  delay: number
  color: string
}

function ConfettiPiece({ delay, color }: ConfettiPieceProps) {
  const randomX = Math.random() * 200 - 100
  const randomRotate = Math.random() * 720
  
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-sm"
      style={{ backgroundColor: color, left: "50%" }}
      initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
      animate={{
        y: [0, -100, 300],
        x: [0, randomX],
        rotate: [0, randomRotate],
        opacity: [1, 1, 0]
      }}
      transition={{
        duration: 2,
        delay,
        ease: "easeOut"
      }}
    />
  )
}

interface MiniConfettiProps {
  trigger: boolean
  colors?: string[]
  count?: number
}

/**
 * Mini confetti burst effect
 */
export function MiniConfetti({ 
  trigger, 
  colors = ["#a78bfa", "#f472b6", "#34d399", "#fbbf24", "#60a5fa"],
  count = 20 
}: MiniConfettiProps) {
  if (!trigger) return null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <ConfettiPiece 
          key={i} 
          delay={i * 0.05} 
          color={colors[i % colors.length]} 
        />
      ))}
    </div>
  )
}

// ============================================================================
// LOADING STATES
// ============================================================================

interface SkeletonPulseProps {
  className?: string
}

/**
 * Pulsing skeleton with Gen-Z gradient
 */
export function SkeletonPulse({ className }: SkeletonPulseProps) {
  return (
    <motion.div
      className={cn(
        "rounded-xl bg-gradient-to-r from-muted via-muted/50 to-muted",
        "bg-[length:200%_100%]",
        className
      )}
      animate={{
        backgroundPosition: ["0% 0%", "200% 0%"]
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  )
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to trigger haptic feedback (if available)
 */
export function useHaptic() {
  const trigger = React.useCallback((
    type: "light" | "medium" | "heavy" = "light"
  ) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30, 10, 30]
      }
      navigator.vibrate(patterns[type])
    }
  }, [])

  return { trigger }
}

/**
 * Magnetic effect for buttons - attracts to cursor
 */
export function Magnetic({ children, intensity = 0.5 }: { children: React.ReactNode, intensity?: number }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return
    const { clientX, clientY } = e
    const { left, top, width, height } = ref.current.getBoundingClientRect()
    const centerX = left + width / 2
    const centerY = top + height / 2
    const x = (clientX - centerX) * intensity
    const y = (clientY - centerY) * intensity
    setPosition({ x, y })
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Cursor following glow effect for cards
 */
export function CursorGlow({ className }: { className?: string }) {
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 })
  const containerRef = React.useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    const { clientX, clientY } = e
    const { left, top } = containerRef.current.getBoundingClientRect()
    setMousePosition({ x: clientX - left, y: clientY - top })
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={cn("absolute inset-0 z-0 overflow-hidden pointer-events-none", className)}
    >
      <motion.div
        className="absolute -inset-px rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, var(--primary-glow, rgba(255,255,255,0.1)), transparent 40%)`,
        }}
      />
    </div>
  )
}
