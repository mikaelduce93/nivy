'use client'

import * as React from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/* ==========================================================================
   PAGE TRANSITION PROVIDER - Silicon Valley Grade Global Transitions
   
   Features:
   - Multiple transition types (fade, slide, blur, morph, reveal)
   - Route-aware animations
   - Staggered content reveals
   - Reduced motion support
   - Progress indicator
   - Sound integration ready
   ========================================================================== */

type TransitionPreset = 'fade' | 'slide' | 'blur' | 'morph' | 'reveal' | 'elegant' | 'cinematic'

interface PageTransitionProviderProps {
  children: React.ReactNode
  preset?: TransitionPreset
  duration?: number
  /** Show progress indicator during transition */
  showProgress?: boolean
  /** Enable sound effects */
  enableSound?: boolean
}

// Premium easing curves
const EASINGS = {
  smooth: [0.23, 1, 0.32, 1],
  bouncy: [0.68, -0.55, 0.265, 1.55],
  snappy: [0.25, 0.1, 0.25, 1],
  dramatic: [0.16, 1, 0.3, 1],
  elastic: [0.5, 1.5, 0.5, 1],
}

// Transition variants by preset
const getTransitionVariants = (preset: TransitionPreset) => {
  switch (preset) {
    case 'fade':
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    
    case 'slide':
      return {
        initial: { opacity: 0, x: 60 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -60 },
      }
    
    case 'blur':
      return {
        initial: { opacity: 0, filter: 'blur(20px)', scale: 0.95 },
        animate: { opacity: 1, filter: 'blur(0px)', scale: 1 },
        exit: { opacity: 0, filter: 'blur(20px)', scale: 1.05 },
      }
    
    case 'morph':
      return {
        initial: { 
          opacity: 0, 
          scale: 0.9, 
          borderRadius: '24px',
          filter: 'blur(8px)',
        },
        animate: { 
          opacity: 1, 
          scale: 1, 
          borderRadius: '0px',
          filter: 'blur(0px)',
        },
        exit: { 
          opacity: 0, 
          scale: 0.95, 
          borderRadius: '16px',
          filter: 'blur(8px)',
        },
      }
    
    case 'reveal':
      return {
        initial: { opacity: 0, y: 40, rotateX: -5 },
        animate: { opacity: 1, y: 0, rotateX: 0 },
        exit: { opacity: 0, y: -20, rotateX: 5 },
      }
    
    case 'elegant':
      return {
        initial: { 
          opacity: 0, 
          y: 30, 
          scale: 0.98,
          filter: 'blur(4px) saturate(0.5)',
        },
        animate: { 
          opacity: 1, 
          y: 0, 
          scale: 1,
          filter: 'blur(0px) saturate(1)',
        },
        exit: { 
          opacity: 0, 
          y: -20, 
          scale: 1.02,
          filter: 'blur(4px) saturate(0.5)',
        },
      }
    
    case 'cinematic':
      return {
        initial: { 
          opacity: 0, 
          scale: 1.1,
          filter: 'blur(40px) brightness(2)',
          y: 20,
        },
        animate: { 
          opacity: 1, 
          scale: 1,
          filter: 'blur(0px) brightness(1)',
          y: 0,
        },
        exit: { 
          opacity: 0, 
          scale: 0.95,
          filter: 'blur(20px) brightness(0.5)',
          y: -10,
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

// Context for controlling transitions
interface TransitionContextType {
  isTransitioning: boolean
  triggerTransition: () => void
  preset: TransitionPreset
  setPreset: (preset: TransitionPreset) => void
}

const TransitionContext = React.createContext<TransitionContextType>({
  isTransitioning: false,
  triggerTransition: () => {},
  preset: 'elegant',
  setPreset: () => {},
})

export const usePageTransition = () => React.useContext(TransitionContext)

export function PageTransitionProvider({
  children,
  preset: initialPreset = 'elegant',
  duration = 0.5,
  showProgress = true,
  enableSound = true,
}: PageTransitionProviderProps) {
  const pathname = usePathname()
  const [preset, setPreset] = React.useState<TransitionPreset>(initialPreset)
  const [isTransitioning, setIsTransitioning] = React.useState(false)
  const [reducedMotion, setReducedMotion] = React.useState(false)

  // Progress bar animation
  const progress = useMotionValue(0)
  const springProgress = useSpring(progress, { stiffness: 300, damping: 30 })
  const progressWidth = useTransform(springProgress, [0, 1], ['0%', '100%'])

  // Check for reduced motion preference
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)
    
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // Handle route change
  React.useEffect(() => {
    setIsTransitioning(true)
    progress.set(0)
    
    // Animate progress
    const progressInterval = setInterval(() => {
      progress.set(Math.min(progress.get() + 0.1, 0.9))
    }, 50)
    
    // Complete transition
    const timeout = setTimeout(() => {
      progress.set(1)
      clearInterval(progressInterval)
      setTimeout(() => {
        setIsTransitioning(false)
        progress.set(0)
      }, 200)
    }, duration * 1000)
    
    return () => {
      clearTimeout(timeout)
      clearInterval(progressInterval)
    }
  }, [pathname, duration, progress])

  const variants = reducedMotion 
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : getTransitionVariants(preset)

  return (
    <TransitionContext.Provider 
      value={{
        isTransitioning,
        triggerTransition: () => setIsTransitioning(true),
        preset,
        setPreset,
      }}
    >
      {/* Progress indicator */}
      {showProgress && isTransitioning && (
        <motion.div 
          className="fixed top-0 left-0 right-0 z-[9999] h-0.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500"
            style={{ width: progressWidth }}
          />
          {/* Glow effect */}
          <motion.div
            className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-white/50 to-transparent blur-sm"
            style={{ x: progressWidth }}
          />
        </motion.div>
      )}
      
      {/* Page content with transition */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          className="relative"
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{
            duration: reducedMotion ? 0.1 : duration,
            ease: EASINGS.smooth,
          }}
          style={{
            transformPerspective: 1200,
            transformStyle: 'preserve-3d',
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
      
      {/* Transition overlay for special effects */}
      <AnimatePresence>
        {isTransitioning && preset === 'cinematic' && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-[9998]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration / 2 }}
          >
            {/* Cinematic bars */}
            <motion.div
              className="absolute inset-x-0 top-0 bg-black"
              initial={{ height: '0%' }}
              animate={{ height: '8%' }}
              exit={{ height: '0%' }}
              transition={{ duration: duration, ease: EASINGS.dramatic }}
            />
            <motion.div
              className="absolute inset-x-0 bottom-0 bg-black"
              initial={{ height: '0%' }}
              animate={{ height: '8%' }}
              exit={{ height: '0%' }}
              transition={{ duration: duration, ease: EASINGS.dramatic }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </TransitionContext.Provider>
  )
}

/* ==========================================================================
   TRANSITION LINK - Animated navigation link
   ========================================================================== */

interface TransitionLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  children: React.ReactNode
  className?: string
}

export function TransitionLink({ href, children, className, ...props }: TransitionLinkProps) {
  const { triggerTransition } = usePageTransition()
  
  return (
    <a
      href={href}
      className={className}
      onClick={() => triggerTransition()}
      {...props}
    >
      {children}
    </a>
  )
}

/* ==========================================================================
   STAGGER CONTAINER - For staggered element reveals
   ========================================================================== */

interface StaggerContainerProps {
  children: React.ReactNode
  className?: string
  staggerDelay?: number
  direction?: 'up' | 'down' | 'left' | 'right'
}

export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.05,
  direction = 'up',
}: StaggerContainerProps) {
  const childArray = React.Children.toArray(children)
  
  const getOffset = () => {
    switch (direction) {
      case 'up': return { y: 20 }
      case 'down': return { y: -20 }
      case 'left': return { x: 20 }
      case 'right': return { x: -20 }
    }
  }
  
  return (
    <div className={className}>
      {childArray.map((child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, ...getOffset() }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{
            duration: 0.5,
            delay: index * staggerDelay,
            ease: EASINGS.smooth,
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  )
}

/* ==========================================================================
   FADE IN VIEW - Animate when scrolling into view
   ========================================================================== */

interface FadeInViewProps {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
  threshold?: number
}

export function FadeInView({
  children,
  className,
  delay = 0,
  duration = 0.6,
  direction = 'up',
  threshold = 0.1,
}: FadeInViewProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = React.useState(false)
  
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold }
    )
    
    if (ref.current) {
      observer.observe(ref.current)
    }
    
    return () => observer.disconnect()
  }, [threshold])
  
  const getOffset = () => {
    switch (direction) {
      case 'up': return { y: 30 }
      case 'down': return { y: -30 }
      case 'left': return { x: 30 }
      case 'right': return { x: -30 }
      case 'none': return {}
    }
  }
  
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, ...getOffset() }}
      animate={isVisible ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{
        duration,
        delay,
        ease: EASINGS.smooth,
      }}
    >
      {children}
    </motion.div>
  )
}

export { EASINGS as PAGE_TRANSITION_EASINGS }
