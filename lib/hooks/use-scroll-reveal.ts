'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'

/* ==========================================================================
   SCROLL REVEAL SYSTEM - Silicon Valley Grade
   
   Advanced scroll-based animations:
   - Viewport detection with configurable threshold
   - Parallax effects
   - Scroll progress tracking
   - Staggered group reveals
   - Performance optimized with IntersectionObserver
   ========================================================================== */

// Animation presets
export type RevealPreset = 
  | 'fade'
  | 'fadeUp'
  | 'fadeDown'
  | 'fadeLeft'
  | 'fadeRight'
  | 'scale'
  | 'scaleUp'
  | 'blur'
  | 'flip'
  | 'rotate'

export interface RevealStyles {
  initial: React.CSSProperties
  visible: React.CSSProperties
}

const REVEAL_PRESETS: Record<RevealPreset, RevealStyles> = {
  fade: {
    initial: { opacity: 0 },
    visible: { opacity: 1 },
  },
  fadeUp: {
    initial: { opacity: 0, transform: 'translateY(30px)' },
    visible: { opacity: 1, transform: 'translateY(0)' },
  },
  fadeDown: {
    initial: { opacity: 0, transform: 'translateY(-30px)' },
    visible: { opacity: 1, transform: 'translateY(0)' },
  },
  fadeLeft: {
    initial: { opacity: 0, transform: 'translateX(30px)' },
    visible: { opacity: 1, transform: 'translateX(0)' },
  },
  fadeRight: {
    initial: { opacity: 0, transform: 'translateX(-30px)' },
    visible: { opacity: 1, transform: 'translateX(0)' },
  },
  scale: {
    initial: { opacity: 0, transform: 'scale(0.9)' },
    visible: { opacity: 1, transform: 'scale(1)' },
  },
  scaleUp: {
    initial: { opacity: 0, transform: 'scale(0.8) translateY(20px)' },
    visible: { opacity: 1, transform: 'scale(1) translateY(0)' },
  },
  blur: {
    initial: { opacity: 0, filter: 'blur(10px)' },
    visible: { opacity: 1, filter: 'blur(0px)' },
  },
  flip: {
    initial: { opacity: 0, transform: 'perspective(1000px) rotateX(-10deg)' },
    visible: { opacity: 1, transform: 'perspective(1000px) rotateX(0)' },
  },
  rotate: {
    initial: { opacity: 0, transform: 'rotate(-5deg) scale(0.95)' },
    visible: { opacity: 1, transform: 'rotate(0) scale(1)' },
  },
}

/* ==========================================================================
   useScrollReveal - Main hook for scroll-triggered animations
   ========================================================================== */

interface UseScrollRevealOptions {
  /** Animation preset */
  preset?: RevealPreset
  /** Custom initial styles */
  initialStyles?: React.CSSProperties
  /** Custom visible styles */
  visibleStyles?: React.CSSProperties
  /** Threshold for triggering (0-1) */
  threshold?: number
  /** Root margin for early/late triggering */
  rootMargin?: string
  /** Only trigger once */
  once?: boolean
  /** Delay before animation starts (ms) */
  delay?: number
  /** Animation duration (ms) */
  duration?: number
  /** Easing function */
  easing?: string
}

interface UseScrollRevealReturn {
  ref: React.RefObject<HTMLDivElement | null>
  style: React.CSSProperties
  isVisible: boolean
}

export function useScrollReveal(options: UseScrollRevealOptions = {}): UseScrollRevealReturn {
  const {
    preset = 'fadeUp',
    initialStyles,
    visibleStyles,
    threshold = 0.1,
    rootMargin = '0px 0px -50px 0px',
    once = true,
    delay = 0,
    duration = 600,
    easing = 'cubic-bezier(0.23, 1, 0.32, 1)',
  } = options

  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  const presetStyles = REVEAL_PRESETS[preset]
  const initial = initialStyles || presetStyles.initial
  const visible = visibleStyles || presetStyles.visible

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay)
          if (once) {
            observer.unobserve(element)
          }
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once, delay])

  const style: React.CSSProperties = useMemo(() => ({
    ...(isVisible ? visible : initial),
    transition: `all ${duration}ms ${easing}`,
    willChange: 'opacity, transform, filter',
  }), [isVisible, initial, visible, duration, easing])

  return { ref, style, isVisible }
}

/* ==========================================================================
   useScrollProgress - Track scroll progress within an element
   ========================================================================== */

interface UseScrollProgressOptions {
  /** Offset from element top to start tracking */
  offset?: number
}

interface UseScrollProgressReturn {
  ref: React.RefObject<HTMLDivElement | null>
  progress: number // 0 to 1
}

export function useScrollProgress(options: UseScrollProgressOptions = {}): UseScrollProgressReturn {
  const { offset = 0 } = options
  const ref = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const handleScroll = () => {
      const rect = element.getBoundingClientRect()
      const windowHeight = window.innerHeight
      const elementTop = rect.top - offset
      const elementHeight = rect.height

      // Calculate progress: 0 when element enters viewport, 1 when it leaves
      const scrollProgress = Math.max(
        0,
        Math.min(1, (windowHeight - elementTop) / (windowHeight + elementHeight))
      )
      setProgress(scrollProgress)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial calculation

    return () => window.removeEventListener('scroll', handleScroll)
  }, [offset])

  return { ref, progress }
}

/* ==========================================================================
   useParallax - Parallax scrolling effect
   ========================================================================== */

interface UseParallaxOptions {
  /** Speed multiplier (negative for reverse) */
  speed?: number
  /** Direction */
  direction?: 'vertical' | 'horizontal'
}

interface UseParallaxReturn {
  ref: React.RefObject<HTMLDivElement | null>
  style: React.CSSProperties
}

export function useParallax(options: UseParallaxOptions = {}): UseParallaxReturn {
  const { speed = 0.5, direction = 'vertical' } = options
  const ref = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const handleScroll = () => {
      const rect = element.getBoundingClientRect()
      const windowHeight = window.innerHeight
      const elementCenter = rect.top + rect.height / 2
      const viewportCenter = windowHeight / 2
      const distance = (elementCenter - viewportCenter) * speed
      setOffset(distance)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [speed])

  const style: React.CSSProperties = {
    transform: direction === 'vertical' 
      ? `translateY(${offset}px)` 
      : `translateX(${offset}px)`,
    willChange: 'transform',
  }

  return { ref, style }
}

/* ==========================================================================
   useStaggeredReveal - Reveal multiple items with stagger
   ========================================================================== */

interface UseStaggeredRevealOptions {
  /** Number of items */
  count: number
  /** Stagger delay between items (ms) */
  stagger?: number
  /** Base options for each item */
  baseOptions?: Omit<UseScrollRevealOptions, 'delay'>
}

interface UseStaggeredRevealReturn {
  containerRef: React.RefObject<HTMLDivElement | null>
  getItemProps: (index: number) => {
    style: React.CSSProperties
    'data-index': number
  }
  isContainerVisible: boolean
}

export function useStaggeredReveal(options: UseStaggeredRevealOptions): UseStaggeredRevealReturn {
  const { count, stagger = 50, baseOptions = {} } = options
  const containerRef = useRef<HTMLDivElement>(null)
  const [isContainerVisible, setIsContainerVisible] = useState(false)

  const {
    preset = 'fadeUp',
    threshold = 0.1,
    rootMargin = '0px',
    once = true,
    duration = 600,
    easing = 'cubic-bezier(0.23, 1, 0.32, 1)',
  } = baseOptions

  const presetStyles = REVEAL_PRESETS[preset]

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsContainerVisible(true)
          if (once) {
            observer.unobserve(container)
          }
        } else if (!once) {
          setIsContainerVisible(false)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(container)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once])

  const getItemProps = useCallback((index: number) => {
    const delay = index * stagger
    const isVisible = isContainerVisible

    return {
      style: {
        ...(isVisible ? presetStyles.visible : presetStyles.initial),
        transition: `all ${duration}ms ${easing} ${delay}ms`,
        willChange: 'opacity, transform',
      } as React.CSSProperties,
      'data-index': index,
    }
  }, [isContainerVisible, stagger, presetStyles, duration, easing])

  return { containerRef, getItemProps, isContainerVisible }
}

/* ==========================================================================
   useScrollDirection - Detect scroll direction
   ========================================================================== */

type ScrollDirection = 'up' | 'down' | null

export function useScrollDirection(): ScrollDirection {
  const [direction, setDirection] = useState<ScrollDirection>(null)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY > lastScrollY.current) {
        setDirection('down')
      } else if (currentScrollY < lastScrollY.current) {
        setDirection('up')
      }
      
      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return direction
}

/* ==========================================================================
   useScrollPosition - Track detailed scroll position
   ========================================================================== */

interface ScrollPosition {
  x: number
  y: number
  direction: ScrollDirection
  isAtTop: boolean
  isAtBottom: boolean
  percentScrolled: number
}

export function useScrollPosition(): ScrollPosition {
  const [position, setPosition] = useState<ScrollPosition>({
    x: 0,
    y: 0,
    direction: null,
    isAtTop: true,
    isAtBottom: false,
    percentScrolled: 0,
  })

  const lastY = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY
      const x = window.scrollX
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      
      setPosition({
        x,
        y,
        direction: y > lastY.current ? 'down' : y < lastY.current ? 'up' : null,
        isAtTop: y <= 0,
        isAtBottom: y >= maxScroll - 10,
        percentScrolled: maxScroll > 0 ? (y / maxScroll) * 100 : 0,
      })
      
      lastY.current = y
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return position
}

/* ==========================================================================
   CSS HELPER - Generate reveal animation CSS class
   ========================================================================== */

export function getRevealStyles(preset: RevealPreset): RevealStyles {
  return REVEAL_PRESETS[preset]
}

export { REVEAL_PRESETS }
