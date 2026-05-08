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

/* ==========================================================================
   <Motion.*> — REDUCED-MOTION-AWARE DROP-IN REPLACEMENT
   ==========================================================================
   TICKET-023 (Wave 1): solves the audit's #1 finding — only 14 % of
   framer-motion call sites respect `prefers-reduced-motion`. Wave 2 will
   codemod ~227 files from:
       import { motion } from 'framer-motion'
   to:
       import { Motion as motion } from '@/components/ui/motion'
   Once swapped, animations automatically:
     1. Skip `initial` / `animate` / `exit` / `transition` when the user's OS
        reports `prefers-reduced-motion: reduce` — render the final state.
     2. Default `transition` to the canonical EASE_STANDARD curve.
   The wrapper is API-compatible with `framer-motion/motion`, so call sites
   need no other changes.
   ========================================================================== */

import {
  motion as framerMotion,
  useReducedMotion as useFramerReducedMotion,
  MotionConfig as FramerMotionConfig,
  type MotionProps,
  type MotionConfigProps,
  type ForwardRefComponent,
} from 'framer-motion'
import { DEFAULT_TRANSITION } from '@/lib/motion/easing'

/**
 * Re-export every easing/spring/duration token through this barrel so
 * downstream code can do `import { EASE } from '@/components/ui/motion'`.
 */
export {
  EASE,
  SPRING,
  DURATION,
  EASE_STANDARD,
  EASE_DECELERATE,
  EASE_ACCELERATE,
  EASE_SMOOTH,
  EASE_SNAPPY,
  EASE_DRAMATIC,
  SPRING_SNAPPY,
  SPRING_BOUNCY,
  SPRING_GENTLE,
  SPRING_STIFF,
  DURATION_FAST,
  DURATION_NORMAL,
  DURATION_SLOW,
  DURATION_DRAMATIC,
  DURATION_INSTANT,
  DEFAULT_TRANSITION,
  REDUCED_MOTION_TRANSITION,
} from '@/lib/motion/easing'

/**
 * Strips animation-driving props when reduced-motion is requested so the
 * element renders directly in its final state. We keep `style`, `className`
 * and event handlers untouched.
 */
function applyReducedMotion<P extends MotionProps>(
  props: P,
  prefersReducedMotion: boolean | null
): P {
  if (!prefersReducedMotion) {
    // Inject default transition only if caller didn't specify one.
    if (props.transition === undefined) {
      return { ...props, transition: DEFAULT_TRANSITION }
    }
    return props
  }

  // Reduced motion: render final state immediately. We collapse `initial` to
  // match `animate` (so no entrance frame is shown) and force a 0-duration
  // transition. `exit` is left as-is — AnimatePresence respects the same
  // 0-duration override via the transition prop.
  const next: MotionProps = { ...props }

  if (next.animate !== undefined) {
    // Use the animate target as the initial state so nothing animates in.
    next.initial = next.animate as MotionProps['initial']
  } else {
    next.initial = false
  }

  next.transition = { duration: 0, delay: 0 }

  // Disable layout animations to prevent FLIP transitions under reduced motion.
  if (next.layout !== undefined) next.layout = false
  if (next.layoutId !== undefined) {
    // layoutId is informational; framer still snaps without animation when
    // transition.duration === 0, so leave it.
  }

  // Strip whileHover / whileTap visual scaling (still allow color changes via
  // CSS). We only nuke them when they are objects; string variant names are
  // fine because they resolve through `variants`.
  if (typeof next.whileHover === 'object') next.whileHover = undefined
  if (typeof next.whileTap === 'object') next.whileTap = undefined
  if (typeof next.whileFocus === 'object') next.whileFocus = undefined
  if (typeof next.whileDrag === 'object') next.whileDrag = undefined
  if (typeof next.whileInView === 'object') next.whileInView = undefined

  return next as P
}

/** Internal: build a reduced-motion-aware wrapper around a framer-motion tag. */
function createMotionComponent<Tag extends keyof typeof framerMotion>(
  tag: Tag
): (typeof framerMotion)[Tag] {
  const Base = framerMotion[tag] as ForwardRefComponent<HTMLElement, MotionProps>

  const Wrapped = React.forwardRef<HTMLElement, MotionProps>((props, ref) => {
    const prefersReducedMotion = useFramerReducedMotion()
    const safeProps = applyReducedMotion(props, prefersReducedMotion)
    return <Base ref={ref} {...safeProps} />
  })

  Wrapped.displayName = `Motion.${String(tag)}`
  return Wrapped as unknown as (typeof framerMotion)[Tag]
}

/**
 * Reduced-motion-aware drop-in for `framer-motion`'s `motion` namespace.
 *
 * Use exactly like `motion.*` — every prop and type is forwarded.
 *
 * @example
 * ```tsx
 * import { Motion } from '@/components/ui/motion'
 *
 * <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
 *   Fades in — but renders immediately under prefers-reduced-motion.
 * </Motion.div>
 * ```
 *
 * Implementation note: we use a Proxy so we don't enumerate every framer
 * tag (there are ~150). Components are memoised on first access.
 */
const motionCache = new Map<string, unknown>()

export const Motion: typeof framerMotion = new Proxy(framerMotion, {
  get(target, prop, receiver) {
    if (typeof prop !== 'string') {
      return Reflect.get(target, prop, receiver)
    }
    if (!(prop in target)) {
      return Reflect.get(target, prop, receiver)
    }
    if (motionCache.has(prop)) {
      return motionCache.get(prop)
    }
    const wrapped = createMotionComponent(prop as keyof typeof framerMotion)
    motionCache.set(prop, wrapped)
    return wrapped
  },
}) as typeof framerMotion

/* ==========================================================================
   <MotionProvider> — global reduced-motion + default-transition gate
   ==========================================================================
   Wave 2 will mount this in `app/layout.tsx`:
       <MotionProvider>{children}</MotionProvider>
   It applies framer-motion's `MotionConfig` with:
     - `reducedMotion="user"`  → trust the OS preference globally
     - `transition={DEFAULT_TRANSITION}` → ambient EASE_STANDARD / 250 ms
   Existing `motion.*` call sites benefit even before the codemod lands.
   ========================================================================== */

interface MotionProviderProps extends Omit<MotionConfigProps, 'children'> {
  children: React.ReactNode
}

export function MotionProvider({
  children,
  reducedMotion = 'user',
  transition = DEFAULT_TRANSITION,
  ...rest
}: MotionProviderProps) {
  return (
    <FramerMotionConfig
      reducedMotion={reducedMotion}
      transition={transition}
      {...rest}
    >
      {children}
    </FramerMotionConfig>
  )
}

/** Re-export framer's `useReducedMotion` so consumers have one import. */
export { useReducedMotion } from 'framer-motion'
