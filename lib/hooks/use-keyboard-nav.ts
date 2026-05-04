'use client'

/* ==========================================================================
   KEYBOARD NAVIGATION HOOK - Accessible Interactions
   
   Provides keyboard navigation utilities for interactive elements.
   Ensures all interactive components are keyboard accessible.
   ========================================================================== */

import { useCallback, useEffect, useRef, KeyboardEvent } from 'react'

/* ==========================================================================
   TYPES
   ========================================================================== */

export interface KeyboardNavOptions {
  /** Trigger on Enter key */
  onEnter?: boolean
  /** Trigger on Space key */
  onSpace?: boolean
  /** Trigger on Escape key */
  onEscape?: () => void
  /** Prevent default browser behavior */
  preventDefault?: boolean
}

export interface UseKeyboardNavReturn {
  /** Handler for keydown events */
  handleKeyDown: (e: KeyboardEvent, action: () => void) => void
  /** Props to spread on interactive elements */
  keyboardProps: {
    role: 'button'
    tabIndex: number
    onKeyDown: (e: KeyboardEvent) => void
  }
  /** Create keyboard handler with action */
  createKeyboardHandler: (action: () => void) => (e: KeyboardEvent) => void
}

/* ==========================================================================
   MAIN HOOK
   ========================================================================== */

/**
 * Hook for adding keyboard navigation to interactive elements
 * 
 * @param options - Configuration options
 * @returns Keyboard navigation utilities
 * 
 * @example
 * ```tsx
 * const { keyboardProps, handleKeyDown } = useKeyboardNav()
 * 
 * <div
 *   {...keyboardProps}
 *   onKeyDown={(e) => handleKeyDown(e, handleClick)}
 *   onClick={handleClick}
 * >
 *   Clickable content
 * </div>
 * ```
 */
export function useKeyboardNav(options: KeyboardNavOptions = {}): UseKeyboardNavReturn {
  const {
    onEnter = true,
    onSpace = true,
    onEscape,
    preventDefault = true,
  } = options
  
  const actionRef = useRef<() => void>()
  
  const handleKeyDown = useCallback((e: KeyboardEvent, action: () => void) => {
    const shouldTrigger = 
      (onEnter && e.key === 'Enter') ||
      (onSpace && e.key === ' ')
    
    if (shouldTrigger) {
      if (preventDefault) {
        e.preventDefault()
      }
      action()
    }
    
    if (e.key === 'Escape' && onEscape) {
      if (preventDefault) {
        e.preventDefault()
      }
      onEscape()
    }
  }, [onEnter, onSpace, onEscape, preventDefault])
  
  const internalKeyDown = useCallback((e: KeyboardEvent) => {
    if (actionRef.current) {
      handleKeyDown(e, actionRef.current)
    }
  }, [handleKeyDown])
  
  const createKeyboardHandler = useCallback((action: () => void) => {
    return (e: KeyboardEvent) => handleKeyDown(e, action)
  }, [handleKeyDown])
  
  return {
    handleKeyDown,
    keyboardProps: {
      role: 'button' as const,
      tabIndex: 0,
      onKeyDown: internalKeyDown,
    },
    createKeyboardHandler,
  }
}

/* ==========================================================================
   FOCUS MANAGEMENT
   ========================================================================== */

/**
 * Hook for managing focus within a container (focus trap)
 * 
 * @param enabled - Whether the focus trap is active
 * @returns Container ref and focus utilities
 */
export function useFocusTrap(enabled = true) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (!enabled || !containerRef.current) return
    
    const container = containerRef.current
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Tab') return
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }
    
    // Focus first element on mount
    firstElement?.focus()
    
    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [enabled])
  
  return {
    containerRef,
    focusFirst: () => {
      const firstElement = containerRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      firstElement?.focus()
    },
  }
}

/* ==========================================================================
   ROVING TABINDEX
   ========================================================================== */

/**
 * Hook for implementing roving tabindex pattern (arrow key navigation)
 * Used for toolbars, tab lists, menu bars, etc.
 * 
 * @param itemCount - Number of items in the group
 * @param options - Configuration options
 * @returns Current index and handlers
 */
export function useRovingTabindex(
  itemCount: number,
  options: {
    /** Wrap around at ends */
    loop?: boolean
    /** Orientation for arrow keys */
    orientation?: 'horizontal' | 'vertical' | 'both'
    /** Initial focused index */
    initialIndex?: number
  } = {}
) {
  const {
    loop = true,
    orientation = 'horizontal',
    initialIndex = 0,
  } = options
  
  const [currentIndex, setCurrentIndex] = useRef(initialIndex).current
  const indexRef = useRef(initialIndex)
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isHorizontal = orientation === 'horizontal' || orientation === 'both'
    const isVertical = orientation === 'vertical' || orientation === 'both'
    
    let newIndex = indexRef.current
    
    if ((e.key === 'ArrowRight' && isHorizontal) || (e.key === 'ArrowDown' && isVertical)) {
      e.preventDefault()
      newIndex = indexRef.current + 1
      if (newIndex >= itemCount) {
        newIndex = loop ? 0 : itemCount - 1
      }
    } else if ((e.key === 'ArrowLeft' && isHorizontal) || (e.key === 'ArrowUp' && isVertical)) {
      e.preventDefault()
      newIndex = indexRef.current - 1
      if (newIndex < 0) {
        newIndex = loop ? itemCount - 1 : 0
      }
    } else if (e.key === 'Home') {
      e.preventDefault()
      newIndex = 0
    } else if (e.key === 'End') {
      e.preventDefault()
      newIndex = itemCount - 1
    }
    
    if (newIndex !== indexRef.current) {
      indexRef.current = newIndex
    }
    
    return newIndex
  }, [itemCount, loop, orientation])
  
  const getItemProps = useCallback((index: number) => ({
    tabIndex: index === indexRef.current ? 0 : -1,
    'aria-selected': index === indexRef.current,
  }), [])
  
  return {
    currentIndex: indexRef.current,
    handleKeyDown,
    getItemProps,
    setCurrentIndex: (index: number) => {
      indexRef.current = index
    },
  }
}

/* ==========================================================================
   ACCESSIBLE CLICK HANDLER
   ========================================================================== */

/**
 * Creates an accessible click handler that works with keyboard
 * 
 * @param onClick - Click handler function
 * @param options - Keyboard options
 * @returns Props to spread on element
 */
export function useAccessibleClick(
  onClick: () => void,
  options: KeyboardNavOptions = {}
) {
  const { handleKeyDown } = useKeyboardNav(options)
  
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick,
    onKeyDown: (e: KeyboardEvent) => handleKeyDown(e, onClick),
    className: 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.75_0.15_290)] focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.08_0.015_290)]',
  }
}

/* ==========================================================================
   SKIP LINK
   ========================================================================== */

/**
 * Skip link for keyboard users to bypass navigation
 * 
 * @param targetId - ID of the main content to skip to
 * @returns Skip link props
 */
export function useSkipLink(targetId: string) {
  const handleClick = useCallback(() => {
    const target = document.getElementById(targetId)
    if (target) {
      target.focus()
      target.scrollIntoView({ behavior: 'smooth' })
    }
  }, [targetId])
  
  return {
    href: `#${targetId}`,
    onClick: (e: React.MouseEvent) => {
      e.preventDefault()
      handleClick()
    },
    className: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-lg',
  }
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export default useKeyboardNav
