'use client'

/**
 * TEENS PARTY MOROCCO - Skip Links Component
 * ==========================================
 *
 * Liens de navigation rapide pour les utilisateurs clavier
 * et lecteurs d'écran.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

/* ==========================================================================
   TYPES
   ========================================================================== */

interface SkipLink {
  /** Target element ID (without #) */
  targetId: string
  /** Label for the link */
  label: string
}

interface SkipLinksProps {
  /** Custom skip links (defaults to main content) */
  links?: SkipLink[]
  /** Additional className */
  className?: string
}

/* ==========================================================================
   DEFAULT LINKS
   ========================================================================== */

const defaultLinks: SkipLink[] = [
  { targetId: 'main-content', label: 'Aller au contenu principal' },
  { targetId: 'main-navigation', label: 'Aller à la navigation' },
]

/* ==========================================================================
   SKIP LINKS COMPONENT
   ========================================================================== */

export function SkipLinks({ links = defaultLinks, className }: SkipLinksProps) {
  return (
    <nav
      aria-label="Liens d'accès rapide"
      className={cn('skip-links', className)}
    >
      {links.map((link) => (
        <a
          key={link.targetId}
          href={`#${link.targetId}`}
          className={cn(
            // Visually hidden by default
            'sr-only',
            // Show on focus
            'focus:not-sr-only',
            'focus:fixed focus:top-4 focus:left-4 focus:z-[9999]',
            'focus:px-4 focus:py-2',
            'focus:bg-primary focus:text-primary-foreground',
            'focus:rounded-lg focus:shadow-lg',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'font-medium text-sm',
            'transition-all duration-200'
          )}
          onClick={(e) => {
            // Smooth scroll to target
            e.preventDefault()
            const target = document.getElementById(link.targetId)
            if (target) {
              target.scrollIntoView({ behavior: 'smooth' })
              target.focus({ preventScroll: true })
            }
          }}
        >
          {link.label}
        </a>
      ))}
    </nav>
  )
}

/* ==========================================================================
   SKIP TARGET COMPONENT
   ========================================================================== */

interface SkipTargetProps {
  /** ID that skip links will target */
  id: string
  /** Content */
  children: React.ReactNode
  /** HTML element to render */
  as?: 'main' | 'nav' | 'section' | 'div'
  /** Additional className */
  className?: string
  /** ARIA label for the region */
  label?: string
}

export function SkipTarget({
  id,
  children,
  as: Component = 'main',
  className,
  label,
}: SkipTargetProps) {
  return (
    <Component
      id={id}
      className={cn('outline-none', className)}
      tabIndex={-1}
      aria-label={label}
    >
      {children}
    </Component>
  )
}

/* ==========================================================================
   MAIN CONTENT WRAPPER
   ========================================================================== */

interface MainContentProps {
  children: React.ReactNode
  className?: string
}

export function MainContent({ children, className }: MainContentProps) {
  return (
    <SkipTarget
      id="main-content"
      as="main"
      label="Contenu principal"
      className={className}
    >
      {children}
    </SkipTarget>
  )
}

/* ==========================================================================
   MAIN NAVIGATION WRAPPER
   ========================================================================== */

interface MainNavigationProps {
  children: React.ReactNode
  className?: string
}

export function MainNavigation({ children, className }: MainNavigationProps) {
  return (
    <SkipTarget
      id="main-navigation"
      as="nav"
      label="Navigation principale"
      className={className}
    >
      {children}
    </SkipTarget>
  )
}
