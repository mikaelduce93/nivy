'use client'

import * as React from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/* ==========================================================================
   PAGE TRANSITIONS - Silicon Valley Grade
   
   Premium page transition system with multiple effects:
   - Fade with slide
   - Scale transitions
   - Shared element transitions
   - Staggered content reveals
   - View Transitions API integration
   ========================================================================== */

// Transition presets
const TRANSITION_PRESETS = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 },
  },
  scaleUp: {
    initial: { opacity: 0, scale: 0.9, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: -10 },
  },
  blur: {
    initial: { opacity: 0, filter: 'blur(10px)' },
    animate: { opacity: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, filter: 'blur(10px)' },
  },
  flip: {
    initial: { opacity: 0, rotateY: -15, scale: 0.95 },
    animate: { opacity: 1, rotateY: 0, scale: 1 },
    exit: { opacity: 0, rotateY: 15, scale: 0.95 },
  },
} as const

type TransitionPreset = keyof typeof TRANSITION_PRESETS

// Spring configurations
const SPRING_CONFIGS = {
  snappy: { type: 'spring', stiffness: 400, damping: 30 },
  bouncy: { type: 'spring', stiffness: 300, damping: 20 },
  gentle: { type: 'spring', stiffness: 200, damping: 25 },
  smooth: { duration: 0.4, ease: [0.23, 1, 0.32, 1] },
} as const

/* ==========================================================================
   PAGE TRANSITION WRAPPER
   ========================================================================== */

interface PageTransitionProps {
  children: React.ReactNode
  preset?: TransitionPreset
  spring?: keyof typeof SPRING_CONFIGS
  className?: string
  /** Unique key for page - defaults to pathname */
  pageKey?: string
  /** Enable staggered children animation */
  stagger?: boolean
  /** Duration multiplier */
  duration?: number
}

export function PageTransition({
  children,
  preset = 'scaleUp',
  spring = 'smooth',
  className,
  pageKey,
  stagger = true,
  duration = 1,
}: PageTransitionProps) {
  const pathname = usePathname()
  const key = pageKey || pathname

  const variants = TRANSITION_PRESETS[preset]
  // SPRING_CONFIGS may or may not include `duration` depending on the preset.
  // Read it via an index access cast to widen the property surface.
  const springCfg = SPRING_CONFIGS[spring] as { duration?: number } & typeof SPRING_CONFIGS[typeof spring]
  const transition = {
    ...SPRING_CONFIGS[spring],
    duration: springCfg.duration
      ? springCfg.duration * duration
      : undefined,
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={variants}
        transition={transition}
        className={className}
      >
        {stagger ? (
          <StaggerContainer>{children}</StaggerContainer>
        ) : (
          children
        )}
      </motion.div>
    </AnimatePresence>
  )
}

/* ==========================================================================
   STAGGER CONTAINER - Animates children with delay
   ========================================================================== */

interface StaggerContainerProps {
  children: React.ReactNode
  staggerDelay?: number
  className?: string
}

export function StaggerContainer({
  children,
  staggerDelay = 0.05,
  className,
}: StaggerContainerProps) {
  const containerVariants: Variants = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
    exit: {
      transition: {
        staggerChildren: staggerDelay / 2,
        staggerDirection: -1,
      },
    },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ==========================================================================
   STAGGER ITEM - Individual item in stagger sequence
   ========================================================================== */

interface StaggerItemProps {
  children: React.ReactNode
  className?: string
  preset?: 'fade' | 'slideUp' | 'slideLeft' | 'scale' | 'blur'
}

export function StaggerItem({
  children,
  className,
  preset = 'slideUp',
}: StaggerItemProps) {
  const variants: Record<string, Variants> = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    slideUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -10 },
    },
    slideLeft: {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -10 },
    },
    scale: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
    },
    blur: {
      initial: { opacity: 0, filter: 'blur(8px)' },
      animate: { opacity: 1, filter: 'blur(0px)' },
      exit: { opacity: 0, filter: 'blur(4px)' },
    },
  }

  return (
    <motion.div
      variants={variants[preset]}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ==========================================================================
   REVEAL ON ENTER - Reveals content when entering viewport
   ========================================================================== */

interface RevealOnEnterProps {
  children: React.ReactNode
  className?: string
  preset?: 'fade' | 'slideUp' | 'slideLeft' | 'slideRight' | 'scale' | 'blur'
  delay?: number
  duration?: number
  once?: boolean
  threshold?: number
}

export function RevealOnEnter({
  children,
  className,
  preset = 'slideUp',
  delay = 0,
  duration = 0.6,
  once = true,
  threshold = 0.1,
}: RevealOnEnterProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once && ref.current) {
            observer.unobserve(ref.current)
          }
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [once, threshold])

  const variants = TRANSITION_PRESETS[preset]

  return (
    <motion.div
      ref={ref}
      initial="initial"
      animate={isVisible ? 'animate' : 'initial'}
      variants={variants}
      transition={{
        duration,
        delay,
        ease: [0.23, 1, 0.32, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ==========================================================================
   MORPHING SKELETON - Skeleton that morphs into content
   ========================================================================== */

interface MorphingSkeletonProps {
  isLoading: boolean
  skeleton: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function MorphingSkeleton({
  isLoading,
  skeleton,
  children,
  className,
}: MorphingSkeletonProps) {
  return (
    <div className={cn('relative', className)}>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ 
              opacity: 0,
              scale: 0.98,
              filter: 'blur(4px)',
            }}
            transition={{ duration: 0.3 }}
          >
            {skeleton}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ 
              opacity: 0,
              scale: 1.02,
              filter: 'blur(4px)',
            }}
            animate={{ 
              opacity: 1,
              scale: 1,
              filter: 'blur(0px)',
            }}
            transition={{ 
              duration: 0.4,
              ease: [0.23, 1, 0.32, 1],
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ==========================================================================
   SHARED ELEMENT TRANSITION - For hero images, cards, etc.
   ========================================================================== */

interface SharedElementProps {
  children: React.ReactNode
  layoutId: string
  className?: string
}

export function SharedElement({
  children,
  layoutId,
  className,
}: SharedElementProps) {
  return (
    <motion.div
      layoutId={layoutId}
      className={className}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
    >
      {children}
    </motion.div>
  )
}

/* ==========================================================================
   PAGE OVERLAY TRANSITION - Full screen overlay effect
   ========================================================================== */

interface PageOverlayProps {
  isActive: boolean
  color?: string
  className?: string
}

export function PageOverlay({
  isActive,
  color = '#8b5cf6',
  className,
}: PageOverlayProps) {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className={cn(
            'fixed inset-0 z-50 pointer-events-none',
            className
          )}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          exit={{ scaleY: 0 }}
          style={{
            backgroundColor: color,
            transformOrigin: 'bottom',
          }}
          transition={{
            duration: 0.5,
            ease: [0.23, 1, 0.32, 1],
          }}
        />
      )}
    </AnimatePresence>
  )
}

/* ==========================================================================
   CURTAIN REVEAL - Curtain-style page reveal
   ========================================================================== */

interface CurtainRevealProps {
  children: React.ReactNode
  isReady?: boolean
  color?: string
  className?: string
}

export function CurtainReveal({
  children,
  isReady = true,
  color = '#09090b',
  className,
}: CurtainRevealProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      <AnimatePresence>
        {!isReady && (
          <>
            <motion.div
              className="fixed inset-y-0 left-0 w-1/2 z-50"
              initial={{ x: 0 }}
              exit={{ x: '-100%' }}
              style={{ backgroundColor: color }}
              transition={{
                duration: 0.8,
                ease: [0.23, 1, 0.32, 1],
                delay: 0.1,
              }}
            />
            <motion.div
              className="fixed inset-y-0 right-0 w-1/2 z-50"
              initial={{ x: 0 }}
              exit={{ x: '100%' }}
              style={{ backgroundColor: color }}
              transition={{
                duration: 0.8,
                ease: [0.23, 1, 0.32, 1],
                delay: 0.1,
              }}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ==========================================================================
   ANIMATED LIST - For lists with staggered animations
   ========================================================================== */

interface AnimatedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string
  className?: string
  itemClassName?: string
  staggerDelay?: number
  preset?: 'fade' | 'slideUp' | 'slideLeft' | 'scale'
}

export function AnimatedList<T>({
  items,
  renderItem,
  keyExtractor,
  className,
  itemClassName,
  staggerDelay = 0.05,
  preset = 'slideUp',
}: AnimatedListProps<T>) {
  const variants: Record<string, Variants> = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
    },
    slideUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
    },
    slideLeft: {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
    },
    scale: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
    },
  }

  return (
    <div className={className}>
      {items.map((item, index) => (
        <motion.div
          key={keyExtractor(item, index)}
          variants={variants[preset]}
          initial="initial"
          animate="animate"
          transition={{
            duration: 0.4,
            delay: index * staggerDelay,
            ease: [0.23, 1, 0.32, 1],
          }}
          className={itemClassName}
        >
          {renderItem(item, index)}
        </motion.div>
      ))}
    </div>
  )
}

/* ==========================================================================
   EXPORT PRESETS FOR EXTERNAL USE
   ========================================================================== */

export { TRANSITION_PRESETS, SPRING_CONFIGS }
