'use client'

/**
 * TEENS PARTY MOROCCO - Visually Hidden Component
 * ===============================================
 *
 * Composant pour masquer visuellement du contenu tout en le gardant
 * accessible aux lecteurs d'écran.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

/* ==========================================================================
   VISUALLY HIDDEN COMPONENT
   ========================================================================== */

interface VisuallyHiddenProps {
  children: React.ReactNode
  /** Render as different element */
  as?: React.ElementType
  /** Additional className */
  className?: string
}

export function VisuallyHidden({
  children,
  as: Component = 'span',
  className,
}: VisuallyHiddenProps) {
  return (
    <Component className={cn('sr-only', className)}>
      {children}
    </Component>
  )
}

/* ==========================================================================
   SCREEN READER ONLY TEXT
   ========================================================================== */

interface SrOnlyProps {
  /** Text to announce to screen readers */
  children: React.ReactNode
  /** Element tag */
  as?: React.ElementType
}

export function SrOnly({ children, as = 'span' }: SrOnlyProps) {
  return <VisuallyHidden as={as}>{children}</VisuallyHidden>
}

/* ==========================================================================
   FOCUS VISIBLE ONLY
   ========================================================================== */

interface FocusVisibleOnlyProps {
  children: React.ReactNode
  className?: string
}

/**
 * Content that is hidden until focused (for skip links, etc.)
 */
export function FocusVisibleOnly({ children, className }: FocusVisibleOnlyProps) {
  return (
    <span
      className={cn(
        'sr-only focus:not-sr-only focus:absolute focus:z-50',
        'focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground',
        'focus:rounded-lg focus:shadow-lg',
        className
      )}
      tabIndex={0}
    >
      {children}
    </span>
  )
}

/* ==========================================================================
   ARIA LIVE REGION
   ========================================================================== */

interface LiveRegionProps {
  /** Message to announce */
  message: string
  /** Priority level */
  priority?: 'polite' | 'assertive' | 'off'
  /** Atomic updates */
  atomic?: boolean
  /** Relevant changes */
  relevant?: 'additions' | 'removals' | 'text' | 'all'
  /** Clear message after delay (ms) */
  clearAfter?: number
}

export function LiveRegion({
  message,
  priority = 'polite',
  atomic = true,
  relevant,
  clearAfter,
}: LiveRegionProps) {
  const [currentMessage, setCurrentMessage] = React.useState(message)

  React.useEffect(() => {
    setCurrentMessage(message)

    if (clearAfter && message) {
      const timeoutId = setTimeout(() => {
        setCurrentMessage('')
      }, clearAfter)
      return () => clearTimeout(timeoutId)
    }
  }, [message, clearAfter])

  return (
    <div
      aria-live={priority}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className="sr-only"
    >
      {currentMessage}
    </div>
  )
}

/* ==========================================================================
   ANNOUNCER COMPONENT
   ========================================================================== */

interface AnnouncerProps {
  /** Message to announce */
  message: string
  /** Priority */
  priority?: 'polite' | 'assertive'
}

/**
 * Component to announce dynamic content changes to screen readers
 */
export function Announcer({ message, priority = 'polite' }: AnnouncerProps) {
  const [announcement, setAnnouncement] = React.useState('')

  React.useEffect(() => {
    if (message) {
      // Clear first to ensure re-announcement works
      setAnnouncement('')
      const timeoutId = setTimeout(() => {
        setAnnouncement(message)
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [message])

  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  )
}
