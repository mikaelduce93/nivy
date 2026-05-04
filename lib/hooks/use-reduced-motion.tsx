'use client'

/* ==========================================================================
   REDUCED MOTION HOOK - Global Motion Preference Management
   
   Provides comprehensive reduced motion support across the entire app.
   Respects user's system preferences and allows manual override.
   ========================================================================== */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Variants, Transition } from 'framer-motion'

/* ==========================================================================
   TYPES
   ========================================================================== */

export interface ReducedMotionSettings {
  /** Whether user prefers reduced motion */
  prefersReducedMotion: boolean
  /** Animation duration multiplier (0 = instant, 1 = normal) */
  durationMultiplier: number
  /** Whether to show particles */
  showParticles: boolean
  /** Whether to show 3D effects */
  show3DEffects: boolean
  /** Whether to show parallax effects */
  showParallax: boolean
  /** Whether to enable haptic feedback */
  enableHaptics: boolean
}

export interface ReducedMotionContextValue extends ReducedMotionSettings {
  /** Set manual preference (overrides system) */
  setPreference: (prefer: boolean | 'auto') => void
  /** Get motion-safe transition */
  getTransition: (base: Transition) => Transition
  /** Get motion-safe variants */
  getVariants: <V extends Variants>(variants: V) => V
}

/* ==========================================================================
   CONTEXT
   ========================================================================== */

const ReducedMotionContext = createContext<ReducedMotionContextValue | undefined>(undefined)

/* ==========================================================================
   PROVIDER
   ========================================================================== */

interface ReducedMotionProviderProps {
  children: ReactNode
  /** Default to reduced motion regardless of system preference */
  forceReduced?: boolean
}

export function ReducedMotionProvider({
  children,
  forceReduced = false,
}: ReducedMotionProviderProps) {
  const [systemPreference, setSystemPreference] = useState(false)
  const [manualPreference, setManualPreference] = useState<boolean | 'auto'>('auto')
  
  // Listen to system preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setSystemPreference(mediaQuery.matches)
    
    const handler = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches)
    }
    
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])
  
  // Calculate effective preference
  const prefersReducedMotion = forceReduced || 
    (manualPreference === 'auto' ? systemPreference : manualPreference)
  
  // Calculate settings based on preference
  const settings: ReducedMotionSettings = {
    prefersReducedMotion,
    durationMultiplier: prefersReducedMotion ? 0 : 1,
    showParticles: !prefersReducedMotion,
    show3DEffects: !prefersReducedMotion,
    showParallax: !prefersReducedMotion,
    enableHaptics: !prefersReducedMotion,
  }
  
  // Get motion-safe transition
  const getTransition = (base: Transition): Transition => {
    if (!prefersReducedMotion) return base
    
    return {
      duration: 0,
      delay: 0,
    }
  }
  
  // Get motion-safe variants
  const getVariants = <V extends Variants>(variants: V): V => {
    if (!prefersReducedMotion) return variants
    
    // Create reduced motion variants
    const reducedVariants: Variants = {}
    
    for (const [key, value] of Object.entries(variants)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const variant = value as { transition?: Transition; [key: string]: unknown }
        reducedVariants[key] = {
          ...variant,
          transition: { duration: 0 },
        }
      } else {
        reducedVariants[key] = value
      }
    }
    
    return reducedVariants as V
  }
  
  const value: ReducedMotionContextValue = {
    ...settings,
    setPreference: setManualPreference,
    getTransition,
    getVariants,
  }
  
  return (
    <ReducedMotionContext.Provider value={value}>
      {children}
    </ReducedMotionContext.Provider>
  )
}

/* ==========================================================================
   HOOK
   ========================================================================== */

/**
 * Hook to access reduced motion settings
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { prefersReducedMotion, showParticles, getTransition } = useReducedMotion()
 *   
 *   return (
 *     <motion.div
 *       animate={{ x: 100 }}
 *       transition={getTransition({ duration: 0.3 })}
 *     >
 *       {showParticles && <ParticleSystem />}
 *     </motion.div>
 *   )
 * }
 * ```
 */
export function useReducedMotion(): ReducedMotionContextValue {
  const context = useContext(ReducedMotionContext)
  const [fallbackPrefersReducedMotion, setFallbackPrefersReducedMotion] = useState(false)
  
  // Fallback for when used outside provider
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setFallbackPrefersReducedMotion(mediaQuery.matches)
    
    const handler = (e: MediaQueryListEvent) => {
      setFallbackPrefersReducedMotion(e.matches)
    }
    
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])
  
  if (!context) {
    return {
      prefersReducedMotion: fallbackPrefersReducedMotion,
      durationMultiplier: fallbackPrefersReducedMotion ? 0 : 1,
      showParticles: !fallbackPrefersReducedMotion,
      show3DEffects: !fallbackPrefersReducedMotion,
      showParallax: !fallbackPrefersReducedMotion,
      enableHaptics: !fallbackPrefersReducedMotion,
      setPreference: () => {},
      getTransition: (base) => fallbackPrefersReducedMotion ? { duration: 0 } : base,
      getVariants: (variants) => variants,
    }
  }
  
  return context
}

/* ==========================================================================
   SIMPLE HOOK (no context required)
   ========================================================================== */

/**
 * Simple hook that just returns the system preference
 * Use when you don't need the full context
 */
export function usePrefersReducedMotion(): boolean {
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
   EXPORTS
   ========================================================================== */

export default useReducedMotion
