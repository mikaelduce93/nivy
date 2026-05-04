'use client'

/**
 * TEENS PARTY MOROCCO - Focus Trap Component
 * ==========================================
 *
 * Composant pour capturer le focus dans un conteneur (modals, drawers, etc.)
 */

import * as React from 'react'
import { getFocusableElements } from '@/lib/accessibility'

/* ==========================================================================
   TYPES
   ========================================================================== */

interface FocusTrapProps {
  /** Children to trap focus within */
  children: React.ReactNode
  /** Whether focus trap is active */
  active?: boolean
  /** Element to return focus to when trap is deactivated */
  returnFocusOnDeactivate?: boolean
  /** Auto focus first element on mount */
  autoFocus?: boolean
  /** Element to focus on mount (selector or ref) */
  initialFocus?: React.RefObject<HTMLElement> | string
}

/* ==========================================================================
   FOCUS TRAP COMPONENT
   ========================================================================== */

export function FocusTrap({
  children,
  active = true,
  returnFocusOnDeactivate = true,
  autoFocus = true,
  initialFocus,
}: FocusTrapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const previouslyFocusedElement = React.useRef<Element | null>(null)

  // Store the previously focused element
  React.useEffect(() => {
    if (active) {
      previouslyFocusedElement.current = document.activeElement
    }
  }, [active])

  // Handle initial focus
  React.useEffect(() => {
    if (!active || !autoFocus || !containerRef.current) return

    const focusInitialElement = () => {
      if (initialFocus) {
        if (typeof initialFocus === 'string') {
          const element = containerRef.current?.querySelector<HTMLElement>(initialFocus)
          element?.focus()
        } else if (initialFocus.current) {
          initialFocus.current.focus()
        }
      } else {
        const focusableElements = getFocusableElements(containerRef.current!)
        focusableElements[0]?.focus()
      }
    }

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(focusInitialElement, 0)
    return () => clearTimeout(timeoutId)
  }, [active, autoFocus, initialFocus])

  // Handle focus trap
  React.useEffect(() => {
    if (!active || !containerRef.current) return

    const container = containerRef.current

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements(container)
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      // Shift + Tab
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      }
      // Tab
      else {
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    // Also handle focus trying to escape the container
    const handleFocusIn = (event: FocusEvent) => {
      if (!container.contains(event.target as Node)) {
        event.preventDefault()
        const focusableElements = getFocusableElements(container)
        focusableElements[0]?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', handleFocusIn)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', handleFocusIn)
    }
  }, [active])

  // Return focus on deactivation
  React.useEffect(() => {
    return () => {
      if (returnFocusOnDeactivate && previouslyFocusedElement.current) {
        (previouslyFocusedElement.current as HTMLElement)?.focus?.()
      }
    }
  }, [returnFocusOnDeactivate])

  return (
    <div ref={containerRef} data-focus-trap={active ? 'true' : 'false'}>
      {children}
    </div>
  )
}

/* ==========================================================================
   USE FOCUS TRAP HOOK
   ========================================================================== */

interface UseFocusTrapOptions {
  /** Whether focus trap is active */
  active?: boolean
  /** Auto focus first element */
  autoFocus?: boolean
  /** Return focus on deactivation */
  returnFocus?: boolean
}

export function useFocusTrap<T extends HTMLElement>(options: UseFocusTrapOptions = {}) {
  const { active = true, autoFocus = true, returnFocus = true } = options
  const containerRef = React.useRef<T>(null)
  const previouslyFocusedRef = React.useRef<Element | null>(null)

  React.useEffect(() => {
    if (!active || !containerRef.current) return

    // Store previously focused element
    previouslyFocusedRef.current = document.activeElement

    const container = containerRef.current

    // Auto focus first element
    if (autoFocus) {
      const focusableElements = getFocusableElements(container)
      focusableElements[0]?.focus()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements(container)
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (returnFocus && previouslyFocusedRef.current) {
        (previouslyFocusedRef.current as HTMLElement)?.focus?.()
      }
    }
  }, [active, autoFocus, returnFocus])

  return containerRef
}
