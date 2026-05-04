'use client'

import { useEffect, useCallback, useState } from 'react'

/* ==========================================================================
   ACCESSIBILITY UTILITIES
   Helpers for improved accessibility in the app
   ========================================================================== */

/**
 * Hook to detect if user prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
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
 * Hook to detect if user prefers high contrast
 */
export function usePrefersHighContrast(): boolean {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: more)')
    setPrefersHighContrast(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setPrefersHighContrast(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersHighContrast
}

/**
 * Hook for keyboard navigation detection
 */
export function useKeyboardNavigation() {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboardUser(true)
      }
    }

    const handleMouseDown = () => {
      setIsKeyboardUser(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  return isKeyboardUser
}

/**
 * Hook for focus trap (useful for modals)
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, isActive: boolean = true) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstFocusable = focusableElements[0] as HTMLElement
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault()
          lastFocusable?.focus()
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault()
          firstFocusable?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    firstFocusable?.focus()

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [containerRef, isActive])
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  if (typeof document === 'undefined') return

  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message
  
  document.body.appendChild(announcement)
  
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

/**
 * Hook for escape key handling (useful for closing modals)
 */
export function useEscapeKey(handler: () => void, isActive: boolean = true) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isActive) {
      handler()
    }
  }, [handler, isActive])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

/**
 * Skip link component props generator
 */
export function getSkipLinkProps(targetId: string) {
  return {
    href: `#${targetId}`,
    className: 'sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-lg focus:shadow-lg',
    children: 'Skip to main content',
  }
}

/**
 * Generate ARIA description for XP values
 */
export function getXPDescription(xp: number, level: number, xpToNext: number): string {
  return `Level ${level} with ${xp.toLocaleString()} XP. ${xpToNext.toLocaleString()} XP needed for next level.`
}

/**
 * Generate ARIA description for streaks
 */
export function getStreakDescription(days: number): string {
  if (days === 0) return 'No active streak. Start one today!'
  if (days === 1) return '1 day streak active.'
  return `${days} day streak active. Keep it going!`
}

/**
 * Generate ARIA label for interactive cards
 */
export function getCardAriaLabel(
  title: string, 
  type: string, 
  extras?: { xp?: number; status?: string }
): string {
  let label = `${type}: ${title}`
  if (extras?.xp) label += `. Rewards ${extras.xp} XP`
  if (extras?.status) label += `. Status: ${extras.status}`
  return label
}

/* ==========================================================================
   FOCUS VISIBLE STYLES
   CSS-in-JS helpers for focus visible states
   ========================================================================== */

export const focusVisibleStyles = {
  outline: '2px solid rgb(139, 92, 246)', // gen-z-lavender
  outlineOffset: '2px',
  borderRadius: '8px',
}

export const focusVisibleRingClass = 
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gen-z-lavender focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900'
