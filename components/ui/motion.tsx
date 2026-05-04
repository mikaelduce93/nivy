'use client'

/**
 * TEENS PARTY MOROCCO - Motion Components
 * =======================================
 *
 * Composants wrapper pour simplifier l'utilisation des animations Framer Motion.
 * Includes support for prefers-reduced-motion accessibility preference.
 *
 * Usage:
 * <FadeIn>Contenu qui apparaît en fondu</FadeIn>
 * <FadeInUp delay={0.2}>Contenu avec délai</FadeInUp>
 * <StaggerList>
 *   <StaggerItem>Item 1</StaggerItem>
 *   <StaggerItem>Item 2</StaggerItem>
 * </StaggerList>
 */

import * as React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'

/* ==========================================================================
   REDUCED MOTION HOOK
   ========================================================================== */

/**
 * Hook to detect user's reduced motion preference
 * Returns true if user prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
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

/**
 * Returns animation props that respect reduced motion preference
 */
export function useReducedMotionProps<T extends Record<string, unknown>>(
  animationProps: T
): T | Record<string, never> {
  const prefersReducedMotion = usePrefersReducedMotion()
  return prefersReducedMotion ? {} : animationProps
}
import {
  fadeIn,
  fadeInUp,
  fadeInDown,
  fadeInLeft,
  fadeInRight,
  scaleIn,
  scaleInBounce,
  popIn,
  slideInRight,
  slideInLeft,
  slideInUp,
  staggerContainer,
  staggerContainerFast,
  staggerContainerSlow,
  staggerItem,
  staggerItemScale,
  motionProps,
  viewportMotionProps,
  hoverScale,
  hoverScaleSmall,
  tapScale,
  hoverLift,
} from '@/lib/animations'
import { cn } from '@/lib/utils'

/* ==========================================================================
   TYPES
   ========================================================================== */

interface MotionComponentProps extends Omit<HTMLMotionProps<'div'>, 'variants' | 'viewport'> {
  children: React.ReactNode
  className?: string
  delay?: number
  /** Animate when element enters viewport instead of on mount */
  animateOnView?: boolean
  /** Only animate once when entering viewport */
  once?: boolean
}

/* ==========================================================================
   FADE COMPONENTS
   ========================================================================== */

export function FadeIn({
  children,
  className,
  delay = 0,
  animateOnView = false,
  once = true,
  ...props
}: MotionComponentProps) {
  const animateProps = animateOnView
    ? { ...viewportMotionProps, viewport: { once, margin: '-100px' } }
    : motionProps

  return (
    <motion.div
      variants={fadeIn}
      {...animateProps}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function FadeInUp({
  children,
  className,
  delay = 0,
  animateOnView = false,
  once = true,
  ...props
}: MotionComponentProps) {
  const animateProps = animateOnView
    ? { ...viewportMotionProps, viewport: { once, margin: '-100px' } }
    : motionProps

  return (
    <motion.div
      variants={fadeInUp}
      {...animateProps}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function FadeInDown({
  children,
  className,
  delay = 0,
  animateOnView = false,
  once = true,
  ...props
}: MotionComponentProps) {
  const animateProps = animateOnView
    ? { ...viewportMotionProps, viewport: { once, margin: '-100px' } }
    : motionProps

  return (
    <motion.div
      variants={fadeInDown}
      {...animateProps}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function FadeInLeft({
  children,
  className,
  delay = 0,
  animateOnView = false,
  once = true,
  ...props
}: MotionComponentProps) {
  const animateProps = animateOnView
    ? { ...viewportMotionProps, viewport: { once, margin: '-100px' } }
    : motionProps

  return (
    <motion.div
      variants={fadeInLeft}
      {...animateProps}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function FadeInRight({
  children,
  className,
  delay = 0,
  animateOnView = false,
  once = true,
  ...props
}: MotionComponentProps) {
  const animateProps = animateOnView
    ? { ...viewportMotionProps, viewport: { once, margin: '-100px' } }
    : motionProps

  return (
    <motion.div
      variants={fadeInRight}
      {...animateProps}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/* ==========================================================================
   SCALE COMPONENTS
   ========================================================================== */

export function ScaleIn({
  children,
  className,
  delay = 0,
  animateOnView = false,
  once = true,
  ...props
}: MotionComponentProps) {
  const animateProps = animateOnView
    ? { ...viewportMotionProps, viewport: { once, margin: '-100px' } }
    : motionProps

  return (
    <motion.div
      variants={scaleIn}
      {...animateProps}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function ScaleInBounce({
  children,
  className,
  delay = 0,
  animateOnView = false,
  once = true,
  ...props
}: MotionComponentProps) {
  const animateProps = animateOnView
    ? { ...viewportMotionProps, viewport: { once, margin: '-100px' } }
    : motionProps

  return (
    <motion.div
      variants={scaleInBounce}
      {...animateProps}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function PopIn({
  children,
  className,
  delay = 0,
  animateOnView = false,
  once = true,
  ...props
}: MotionComponentProps) {
  const animateProps = animateOnView
    ? { ...viewportMotionProps, viewport: { once, margin: '-100px' } }
    : motionProps

  return (
    <motion.div
      variants={popIn}
      {...animateProps}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/* ==========================================================================
   SLIDE COMPONENTS
   ========================================================================== */

export function SlideInRight({
  children,
  className,
  delay = 0,
  animateOnView = false,
  once = true,
  ...props
}: MotionComponentProps) {
  const animateProps = animateOnView
    ? { ...viewportMotionProps, viewport: { once, margin: '-100px' } }
    : motionProps

  return (
    <motion.div
      variants={slideInRight}
      {...animateProps}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function SlideInLeft({
  children,
  className,
  delay = 0,
  animateOnView = false,
  once = true,
  ...props
}: MotionComponentProps) {
  const animateProps = animateOnView
    ? { ...viewportMotionProps, viewport: { once, margin: '-100px' } }
    : motionProps

  return (
    <motion.div
      variants={slideInLeft}
      {...animateProps}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function SlideInUp({
  children,
  className,
  delay = 0,
  animateOnView = false,
  once = true,
  ...props
}: MotionComponentProps) {
  const animateProps = animateOnView
    ? { ...viewportMotionProps, viewport: { once, margin: '-100px' } }
    : motionProps

  return (
    <motion.div
      variants={slideInUp}
      {...animateProps}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/* ==========================================================================
   STAGGER COMPONENTS
   ========================================================================== */

interface StaggerListProps extends Omit<HTMLMotionProps<'div'>, 'variants' | 'viewport'> {
  children: React.ReactNode
  className?: string
  /** Stagger speed: 'fast' | 'normal' | 'slow' */
  speed?: 'fast' | 'normal' | 'slow'
  /** Animate when element enters viewport */
  animateOnView?: boolean
  once?: boolean
}

export function StaggerList({
  children,
  className,
  speed = 'normal',
  animateOnView = false,
  once = true,
  ...props
}: StaggerListProps) {
  const variants = {
    fast: staggerContainerFast,
    normal: staggerContainer,
    slow: staggerContainerSlow,
  }[speed]

  const animateProps = animateOnView
    ? { ...viewportMotionProps, viewport: { once, margin: '-100px' } }
    : motionProps

  return (
    <motion.div variants={variants} {...animateProps} className={className} {...props}>
      {children}
    </motion.div>
  )
}

interface StaggerItemProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  children: React.ReactNode
  className?: string
  /** Animation style: 'fadeUp' | 'scale' */
  animation?: 'fadeUp' | 'scale'
}

export function StaggerItem({
  children,
  className,
  animation = 'fadeUp',
  ...props
}: StaggerItemProps) {
  const variants = animation === 'scale' ? staggerItemScale : staggerItem

  return (
    <motion.div variants={variants} className={className} {...props}>
      {children}
    </motion.div>
  )
}

/* ==========================================================================
   INTERACTIVE COMPONENTS
   ========================================================================== */

interface HoverCardProps extends Omit<HTMLMotionProps<'div'>, 'whileHover' | 'whileTap'> {
  children: React.ReactNode
  className?: string
  /** Hover effect: 'scale' | 'scaleSmall' | 'lift' */
  effect?: 'scale' | 'scaleSmall' | 'lift'
  /** Enable tap/click effect */
  tap?: boolean
}

export function HoverCard({
  children,
  className,
  effect = 'scaleSmall',
  tap = true,
  ...props
}: HoverCardProps) {
  const hoverEffect = {
    scale: hoverScale,
    scaleSmall: hoverScaleSmall,
    lift: hoverLift,
  }[effect]

  return (
    <motion.div
      whileHover={hoverEffect}
      whileTap={tap ? tapScale : undefined}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/* ==========================================================================
   ANIMATED PRESENCE WRAPPER
   ========================================================================== */

interface AnimatePresenceWrapperProps {
  children: React.ReactNode
  className?: string
  isVisible: boolean
  animation?: 'fade' | 'fadeUp' | 'scale' | 'slideRight'
}

export function AnimatePresenceWrapper({
  children,
  className,
  isVisible,
  animation = 'fade',
}: AnimatePresenceWrapperProps) {
  const variants = {
    fade: fadeIn,
    fadeUp: fadeInUp,
    scale: scaleIn,
    slideRight: slideInRight,
  }[animation]

  if (!isVisible) return null

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ==========================================================================
   ANIMATED TEXT (caractère par caractère)
   ========================================================================== */

interface AnimatedTextProps {
  text: string
  className?: string
  /** Delay between each character */
  staggerDelay?: number
  /** Initial delay before animation starts */
  initialDelay?: number
}

export function AnimatedText({
  text,
  className,
  staggerDelay = 0.03,
  initialDelay = 0,
}: AnimatedTextProps) {
  const letters = text.split('')

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: initialDelay,
      },
    },
  }

  const child = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: [0, 0, 0.2, 1],
      },
    },
  }

  return (
    <motion.span
      variants={container}
      initial="hidden"
      animate="visible"
      className={cn('inline-flex flex-wrap', className)}
    >
      {letters.map((letter, index) => (
        <motion.span key={index} variants={child} className="inline-block">
          {letter === ' ' ? '\u00A0' : letter}
        </motion.span>
      ))}
    </motion.span>
  )
}

/* ==========================================================================
   ANIMATED COUNTER
   ========================================================================== */

interface AnimatedCounterProps {
  value: number
  className?: string
  duration?: number
  /** Format function (e.g., to add suffix like "K" or "%") */
  format?: (value: number) => string
}

export function AnimatedCounter({
  value,
  className,
  duration = 1,
  format = (v) => Math.round(v).toString(),
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = React.useState(0)

  React.useEffect(() => {
    let startTime: number | null = null
    let animationFrame: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(easeOut * value)

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animationFrame)
  }, [value, duration])

  return <span className={className}>{format(displayValue)}</span>
}

/* ==========================================================================
   RE-EXPORTS for convenience
   ========================================================================== */

export { motion, AnimatePresence } from 'framer-motion'
