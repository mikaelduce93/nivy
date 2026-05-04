'use client'

import * as React from 'react'
import { motion, AnimatePresence, Variants, usePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/* ==========================================================================
   CINEMATIC TRANSITIONS - Silicon Valley Grade
   
   World-class page transitions inspired by award-winning sites:
   - Curtain/reveal animations
   - Morphing content transitions
   - Staggered element reveals
   - Blur/scale transitions
   - Color sweep effects
   - Perspective transitions
   - Liquid/wave effects
   ========================================================================== */

type TransitionType = 
  | 'fade'
  | 'slide'
  | 'scale'
  | 'blur'
  | 'curtain'
  | 'reveal'
  | 'morph'
  | 'wave'
  | 'perspective'
  | 'split'
  | 'diagonal'
  | 'pixelate'

interface CinematicTransitionProps {
  children: React.ReactNode
  type?: TransitionType
  duration?: number
  delay?: number
  className?: string
  /** Custom transition color for curtain/reveal */
  color?: string
  /** Enable staggered children */
  stagger?: boolean
  staggerDelay?: number
  /** Easing curve */
  ease?: number[] | string
}

// Premium easing curves
const PREMIUM_EASINGS = {
  smooth: [0.23, 1, 0.32, 1],        // Smooth deceleration
  bouncy: [0.68, -0.55, 0.265, 1.55], // Slight overshoot
  snappy: [0.25, 0.1, 0.25, 1],      // Quick and clean
  dramatic: [0.16, 1, 0.3, 1],       // Dramatic reveal
  elastic: [0.5, 1.5, 0.5, 1],       // Elastic feel
}

/* ==========================================================================
   CINEMATIC PAGE WRAPPER - Main component
   ========================================================================== */

export function CinematicPageWrapper({
  children,
  type = 'reveal',
  duration = 0.8,
  delay = 0,
  className,
  color = '#8b5cf6',
  stagger = true,
  staggerDelay = 0.05,
  ease = PREMIUM_EASINGS.smooth,
}: CinematicTransitionProps) {
  const pathname = usePathname()
  
  // Transition variants based on type
  const getVariants = (): Variants => {
    switch (type) {
      case 'fade':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        }

      case 'slide':
        return {
          initial: { opacity: 0, x: 100 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -100 },
        }

      case 'scale':
        return {
          initial: { opacity: 0, scale: 0.9 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 1.1 },
        }

      case 'blur':
        return {
          initial: { opacity: 0, filter: 'blur(20px)', scale: 0.95 },
          animate: { opacity: 1, filter: 'blur(0px)', scale: 1 },
          exit: { opacity: 0, filter: 'blur(20px)', scale: 1.05 },
        }

      case 'perspective':
        return {
          initial: { opacity: 0, rotateX: -15, y: 50, perspective: 1000 },
          animate: { opacity: 1, rotateX: 0, y: 0 },
          exit: { opacity: 0, rotateX: 15, y: -50 },
        }

      case 'morph':
        return {
          initial: { 
            opacity: 0, 
            scale: 0.8, 
            borderRadius: '50%',
            filter: 'blur(10px)',
          },
          animate: { 
            opacity: 1, 
            scale: 1, 
            borderRadius: '0%',
            filter: 'blur(0px)',
          },
          exit: { 
            opacity: 0, 
            scale: 0.8, 
            borderRadius: '50%',
            filter: 'blur(10px)',
          },
        }

      default:
        return {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -20 },
        }
    }
  }

  // Container variants for staggered children
  const containerVariants: Variants = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: stagger ? staggerDelay : 0,
        delayChildren: delay,
      },
    },
    exit: {
      transition: {
        staggerChildren: stagger ? staggerDelay / 2 : 0,
        staggerDirection: -1,
      },
    },
  }

  return (
    <AnimatePresence mode="wait">
      {/* Curtain/Reveal overlay */}
      {(type === 'curtain' || type === 'reveal') && (
        <CurtainOverlay color={color} type={type} duration={duration} />
      )}

      {/* Wave transition */}
      {type === 'wave' && (
        <WaveTransition color={color} duration={duration} />
      )}

      {/* Split transition */}
      {type === 'split' && (
        <SplitTransition color={color} duration={duration} />
      )}

      {/* Diagonal transition */}
      {type === 'diagonal' && (
        <DiagonalTransition color={color} duration={duration} />
      )}

      <motion.div
        key={pathname}
        className={className}
        variants={stagger ? containerVariants : getVariants()}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          duration,
          ease: ease as any,
          delay,
        }}
      >
        {stagger ? (
          <StaggerContainer variants={getVariants()} delay={staggerDelay}>
            {children}
          </StaggerContainer>
        ) : (
          children
        )}
      </motion.div>
    </AnimatePresence>
  )
}

/* ==========================================================================
   STAGGER CONTAINER - Animates children sequentially
   ========================================================================== */

interface StaggerContainerProps {
  children: React.ReactNode
  variants: Variants
  delay: number
}

function StaggerContainer({ children, variants, delay }: StaggerContainerProps) {
  const childrenArray = React.Children.toArray(children)
  
  return (
    <>
      {childrenArray.map((child, index) => (
        <motion.div
          key={index}
          variants={variants}
          transition={{
            duration: 0.5,
            delay: index * delay,
            ease: PREMIUM_EASINGS.smooth,
          }}
        >
          {child}
        </motion.div>
      ))}
    </>
  )
}

/* ==========================================================================
   CURTAIN OVERLAY - Full screen curtain effect
   ========================================================================== */

interface OverlayProps {
  color: string
  type?: 'curtain' | 'reveal'
  duration: number
}

function CurtainOverlay({ color, type, duration }: OverlayProps) {
  const [isPresent, safeToRemove] = usePresence()

  return (
    <motion.div
      className="fixed inset-0 z-[999] pointer-events-none"
      initial={type === 'curtain' ? { scaleY: 0 } : { clipPath: 'circle(0% at 50% 50%)' }}
      animate={type === 'curtain' 
        ? { scaleY: [0, 1, 1, 0] }
        : { clipPath: ['circle(0% at 50% 50%)', 'circle(150% at 50% 50%)'] }
      }
      transition={{
        duration: duration * 2,
        times: type === 'curtain' ? [0, 0.4, 0.6, 1] : [0, 1],
        ease: PREMIUM_EASINGS.dramatic,
      }}
      style={{
        backgroundColor: color,
        transformOrigin: 'bottom',
      }}
      onAnimationComplete={() => {
        if (!isPresent) safeToRemove?.()
      }}
    >
      {/* Animated pattern inside curtain */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, transparent 25%, rgba(255,255,255,0.1) 50%, transparent 75%)`,
          backgroundSize: '400% 400%',
        }}
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%'],
        }}
        transition={{
          duration: duration * 2,
          ease: 'linear',
        }}
      />
    </motion.div>
  )
}

/* ==========================================================================
   WAVE TRANSITION - Organic wave reveal
   ========================================================================== */

function WaveTransition({ color, duration }: Omit<OverlayProps, 'type'>) {
  const waveCount = 5

  return (
    <div className="fixed inset-0 z-[999] pointer-events-none overflow-hidden">
      {Array.from({ length: waveCount }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute inset-x-0 h-[120%]"
          style={{
            backgroundColor: color,
            opacity: 1 - i * 0.15,
            borderRadius: '0 0 50% 50%',
          }}
          initial={{ y: '-100%' }}
          animate={{ y: ['−100%', '100%'] }}
          transition={{
            duration: duration * 1.5,
            delay: i * 0.1,
            ease: PREMIUM_EASINGS.smooth,
          }}
        />
      ))}
    </div>
  )
}

/* ==========================================================================
   SPLIT TRANSITION - Split screen reveal
   ========================================================================== */

function SplitTransition({ color, duration }: Omit<OverlayProps, 'type'>) {
  return (
    <div className="fixed inset-0 z-[999] pointer-events-none">
      {/* Left panel */}
      <motion.div
        className="absolute inset-y-0 left-0 w-1/2"
        style={{ backgroundColor: color }}
        initial={{ x: 0 }}
        animate={{ x: [0, 0, '-100%'] }}
        transition={{
          duration: duration * 1.5,
          times: [0, 0.5, 1],
          ease: PREMIUM_EASINGS.dramatic,
        }}
      />
      {/* Right panel */}
      <motion.div
        className="absolute inset-y-0 right-0 w-1/2"
        style={{ backgroundColor: color }}
        initial={{ x: 0 }}
        animate={{ x: [0, 0, '100%'] }}
        transition={{
          duration: duration * 1.5,
          times: [0, 0.5, 1],
          ease: PREMIUM_EASINGS.dramatic,
        }}
      />
    </div>
  )
}

/* ==========================================================================
   DIAGONAL TRANSITION - Diagonal sweep
   ========================================================================== */

function DiagonalTransition({ color, duration }: Omit<OverlayProps, 'type'>) {
  return (
    <motion.div
      className="fixed inset-0 z-[999] pointer-events-none"
      style={{ backgroundColor: color }}
      initial={{ clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
      animate={{
        clipPath: [
          'polygon(0 0, 0 0, 0 100%, 0 100%)',
          'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
          'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)',
        ],
      }}
      transition={{
        duration: duration * 1.5,
        times: [0, 0.5, 1],
        ease: PREMIUM_EASINGS.smooth,
      }}
    />
  )
}

/* ==========================================================================
   REVEAL ELEMENT - For staggered content reveals
   ========================================================================== */

interface RevealElementProps {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right'
  distance?: number
  duration?: number
  once?: boolean
}

export function RevealElement({
  children,
  className,
  delay = 0,
  direction = 'up',
  distance = 30,
  duration = 0.6,
  once = true,
}: RevealElementProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = React.useState(false)

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
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [once])

  const getInitialPosition = () => {
    switch (direction) {
      case 'up': return { y: distance }
      case 'down': return { y: -distance }
      case 'left': return { x: distance }
      case 'right': return { x: -distance }
    }
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, ...getInitialPosition() }}
      animate={isVisible ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{
        duration,
        delay,
        ease: PREMIUM_EASINGS.smooth,
      }}
    >
      {children}
    </motion.div>
  )
}

/* ==========================================================================
   TEXT REVEAL - Character by character reveal
   ========================================================================== */

interface TextRevealProps {
  text: string
  className?: string
  delay?: number
  staggerDelay?: number
  /** Animation type */
  type?: 'fade' | 'slide' | 'scale' | 'blur' | 'wave'
}

export function TextReveal({
  text,
  className,
  delay = 0,
  staggerDelay = 0.03,
  type = 'slide',
}: TextRevealProps) {
  const characters = text.split('')

  const getCharVariants = (): Variants => {
    switch (type) {
      case 'fade':
        return {
          hidden: { opacity: 0 },
          visible: { opacity: 1 },
        }
      case 'slide':
        return {
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 },
        }
      case 'scale':
        return {
          hidden: { opacity: 0, scale: 0 },
          visible: { opacity: 1, scale: 1 },
        }
      case 'blur':
        return {
          hidden: { opacity: 0, filter: 'blur(10px)' },
          visible: { opacity: 1, filter: 'blur(0px)' },
        }
      case 'wave':
        return {
          hidden: { opacity: 0, y: 20 },
          visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
              delay: delay + i * staggerDelay,
              type: 'spring',
              damping: 12,
              stiffness: 200,
            },
          }),
        }
      default:
        return {
          hidden: { opacity: 0 },
          visible: { opacity: 1 },
        }
    }
  }

  return (
    <motion.span
      className={cn('inline-flex flex-wrap', className)}
      initial="hidden"
      animate="visible"
    >
      {characters.map((char, index) => (
        <motion.span
          key={index}
          variants={getCharVariants()}
          custom={index}
          transition={{
            duration: 0.4,
            delay: delay + index * staggerDelay,
            ease: PREMIUM_EASINGS.smooth,
          }}
          style={{ display: 'inline-block', whiteSpace: 'pre' }}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  )
}

/* ==========================================================================
   MORPH ELEMENT - Smooth shape morphing
   ========================================================================== */

interface MorphElementProps {
  children: React.ReactNode
  className?: string
  /** Trigger morphing */
  trigger?: boolean
  /** Morph shapes */
  shapes?: string[]
  duration?: number
}

export function MorphElement({
  children,
  className,
  trigger = true,
  shapes = [
    'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)', // Pentagon
    'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',           // Diamond
    'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',           // Square
    'circle(50% at 50% 50%)',                                  // Circle
  ],
  duration = 3,
}: MorphElementProps) {
  const [shapeIndex, setShapeIndex] = React.useState(0)

  React.useEffect(() => {
    if (!trigger) return
    
    const interval = setInterval(() => {
      setShapeIndex(prev => (prev + 1) % shapes.length)
    }, duration * 1000)

    return () => clearInterval(interval)
  }, [trigger, shapes, duration])

  return (
    <motion.div
      className={className}
      animate={{
        clipPath: shapes[shapeIndex],
      }}
      transition={{
        duration: duration * 0.8,
        ease: PREMIUM_EASINGS.smooth,
      }}
    >
      {children}
    </motion.div>
  )
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export { PREMIUM_EASINGS }
export type { TransitionType, CinematicTransitionProps }
