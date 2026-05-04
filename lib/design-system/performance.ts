/* ==========================================================================
   PERFORMANCE UTILITIES - Animation & Rendering Optimization
   
   Tools for ensuring 60 FPS animations and optimal rendering.
   ========================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/* ==========================================================================
   DEBOUNCED HOVER HANDLER
   ========================================================================== */

/**
 * Creates a debounced hover handler to prevent excessive re-renders
 * 
 * @param delay - Debounce delay in ms (default: 50)
 * @returns Hover state and handlers
 */
export function useDebouncedHover(delay = 50) {
  const [isHovered, setIsHovered] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()
  
  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsHovered(true)
  }, [])
  
  const handleMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false)
    }, delay)
  }, [delay])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])
  
  return {
    isHovered,
    hoverProps: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
  }
}

/* ==========================================================================
   THROTTLED MOUSE POSITION
   ========================================================================== */

interface MousePosition {
  x: number
  y: number
  normalizedX: number // -0.5 to 0.5
  normalizedY: number // -0.5 to 0.5
}

/**
 * Tracks mouse position with throttling for performance
 * 
 * @param throttleMs - Throttle interval in ms (default: 16 = ~60fps)
 * @returns Mouse position and update handler
 */
export function useThrottledMousePosition(throttleMs = 16) {
  const [position, setPosition] = useState<MousePosition>({
    x: 0,
    y: 0,
    normalizedX: 0,
    normalizedY: 0,
  })
  
  const lastUpdateRef = useRef(0)
  const rafRef = useRef<number>()
  
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const now = performance.now()
    if (now - lastUpdateRef.current < throttleMs) return
    
    lastUpdateRef.current = now
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }
    
    rafRef.current = requestAnimationFrame(() => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      setPosition({
        x,
        y,
        normalizedX: x / rect.width - 0.5,
        normalizedY: y / rect.height - 0.5,
      })
    })
  }, [throttleMs])
  
  const handleMouseLeave = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }
    setPosition({
      x: 0,
      y: 0,
      normalizedX: 0,
      normalizedY: 0,
    })
  }, [])
  
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])
  
  return {
    position,
    mouseProps: {
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
    },
  }
}

/* ==========================================================================
   INTERSECTION OBSERVER HOOK
   ========================================================================== */

interface UseInViewOptions {
  threshold?: number | number[]
  rootMargin?: string
  triggerOnce?: boolean
}

/**
 * Detects when an element enters the viewport
 * 
 * @param options - Intersection observer options
 * @returns Ref and inView state
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewOptions = {}
) {
  const { threshold = 0.1, rootMargin = '0px', triggerOnce = false } = options
  
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  const [hasTriggered, setHasTriggered] = useState(false)
  
  useEffect(() => {
    const element = ref.current
    if (!element) return
    
    if (triggerOnce && hasTriggered) return
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        const isIntersecting = entry.isIntersecting
        setInView(isIntersecting)
        
        if (isIntersecting && triggerOnce) {
          setHasTriggered(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin }
    )
    
    observer.observe(element)
    
    return () => observer.disconnect()
  }, [threshold, rootMargin, triggerOnce, hasTriggered])
  
  return { ref, inView }
}

/* ==========================================================================
   REDUCED MOTION HOOK
   ========================================================================== */

/**
 * Detects user's reduced motion preference
 * 
 * @returns Whether user prefers reduced motion
 */
export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    
    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }
    
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])
  
  return prefersReducedMotion
}

/* ==========================================================================
   DEVICE PERFORMANCE HOOK
   ========================================================================== */

type PerformanceLevel = 'low' | 'medium' | 'high'

interface DevicePerformance {
  level: PerformanceLevel
  isMobile: boolean
  isLowEnd: boolean
  maxParticles: number
  enableHeavyEffects: boolean
}

/**
 * Detects device performance capabilities
 * 
 * @returns Device performance info
 */
export function useDevicePerformance(): DevicePerformance {
  const [performance, setPerformance] = useState<DevicePerformance>({
    level: 'medium',
    isMobile: false,
    isLowEnd: false,
    maxParticles: 20,
    enableHeavyEffects: true,
  })
  
  useEffect(() => {
    const hardwareConcurrency = navigator.hardwareConcurrency || 2
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    let level: PerformanceLevel = 'medium'
    let maxParticles = 20
    let enableHeavyEffects = true
    
    if (hardwareConcurrency <= 2 || deviceMemory < 4) {
      level = 'low'
      maxParticles = 8
      enableHeavyEffects = false
    } else if (hardwareConcurrency >= 8 && deviceMemory >= 8 && !isMobile) {
      level = 'high'
      maxParticles = 40
      enableHeavyEffects = true
    }
    
    // Mobile always gets reduced effects
    if (isMobile) {
      maxParticles = Math.min(maxParticles, 10)
      enableHeavyEffects = false
    }
    
    setPerformance({
      level,
      isMobile,
      isLowEnd: level === 'low',
      maxParticles,
      enableHeavyEffects,
    })
  }, [])
  
  return performance
}

/* ==========================================================================
   MEMOIZED PARTICLE POSITIONS
   ========================================================================== */

interface ParticlePosition {
  x: number
  y: number
  size: number
  delay: number
}

/**
 * Generate memoized random particle positions
 * 
 * @param count - Number of particles
 * @param seed - Optional seed for deterministic generation
 * @returns Array of particle positions
 */
export function useParticlePositions(count: number, seed?: number): ParticlePosition[] {
  return useMemo(() => {
    // Simple seeded random for deterministic results
    const random = seed !== undefined
      ? (() => {
          let s = seed
          return () => {
            s = (s * 9301 + 49297) % 233280
            return s / 233280
          }
        })()
      : Math.random
    
    return Array.from({ length: count }, () => ({
      x: random() * 100,
      y: random() * 100,
      size: 2 + random() * 4,
      delay: random() * 2,
    }))
  }, [count, seed])
}

/* ==========================================================================
   WILL-CHANGE MANAGER
   ========================================================================== */

/**
 * Manages will-change CSS property for animation performance
 * Automatically removes will-change after animation to free GPU memory
 */
export function useWillChange(properties: string[] = ['transform', 'opacity']) {
  const [isAnimating, setIsAnimating] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()
  
  const startAnimation = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsAnimating(true)
  }, [])
  
  const endAnimation = useCallback((delay = 300) => {
    timeoutRef.current = setTimeout(() => {
      setIsAnimating(false)
    }, delay)
  }, [])
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])
  
  return {
    willChange: isAnimating ? properties.join(', ') : 'auto',
    startAnimation,
    endAnimation,
  }
}

/* ==========================================================================
   FPS MONITOR (Debug only)
   ========================================================================== */

/**
 * Debug hook to monitor FPS during development
 * Only active in development mode
 */
export function useFPSMonitor() {
  const [fps, setFps] = useState(0)
  const framesRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    
    let rafId: number
    
    const measure = () => {
      framesRef.current++
      const now = performance.now()
      
      if (now - lastTimeRef.current >= 1000) {
        setFps(framesRef.current)
        framesRef.current = 0
        lastTimeRef.current = now
      }
      
      rafId = requestAnimationFrame(measure)
    }
    
    rafId = requestAnimationFrame(measure)
    
    return () => cancelAnimationFrame(rafId)
  }, [])
  
  return fps
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export default {
  useDebouncedHover,
  useThrottledMousePosition,
  useInView,
  usePrefersReducedMotion,
  useDevicePerformance,
  useParticlePositions,
  useWillChange,
  useFPSMonitor,
}
