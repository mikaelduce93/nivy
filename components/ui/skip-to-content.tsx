'use client'

/**
 * SkipToContent — TICKET-049 (a11y)
 * ==================================
 *
 * Liaison clavier "Aller au contenu principal" mountée comme PREMIER élément
 * focusable de chaque layout de rôle (teen / parent / partner / admin / mentor /
 * ambassador / public). Sr-only par défaut, devient visible au focus clavier.
 *
 * Pourquoi un nouveau composant alors que `<SkipLinks />` existe déjà au
 * `app/layout.tsx` racine ?
 *  - Les layouts de rôle imbriquent leur propre header / sidebar / nav DANS le
 *    `<main id="main-content">` racine. Sans skip-link au niveau du rôle, un
 *    utilisateur clavier qui atterrit sur `/teen` doit re-tabuler à travers le
 *    header racine + le header rôle + la sidebar rôle avant d'atteindre le
 *    contenu. Ce composant skip directement vers le `<main id="main-content">`
 *    interne au layout rôle.
 *  - Le handler `onClick` cible le DERNIER `#main-content` du document
 *    (querySelectorAll → last) pour que la duplication d'ID inhérente à
 *    l'imbrication root-main / role-main résolve toujours vers le `<main>` le
 *    plus profond (= contenu réel de la page).
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

interface SkipToContentProps {
  /** Override target id (default: main-content) */
  targetId?: string
  /** Override label (default: French) */
  label?: string
  /** Additional className */
  className?: string
}

export function SkipToContent({
  targetId = 'main-content',
  label = 'Aller au contenu principal',
  className,
}: SkipToContentProps) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        // Visually hidden by default; revealed only on keyboard focus.
        'sr-only focus:not-sr-only',
        // Visible state — placed top-left, above all chrome (z-50 stacks above
        // navbar/sidebar/dock/modals' overlays).
        'focus:fixed focus:top-2 focus:left-2 focus:z-50',
        'focus:bg-primary focus:text-primary-foreground',
        'focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'text-sm font-medium',
        className,
      )}
      onClick={(e) => {
        // Resolve the deepest `#main-content` so nested layouts (root <main> +
        // role <main>) skip into the role's inner content rather than the
        // outer wrapper that still includes the role header / sidebar.
        const matches = document.querySelectorAll<HTMLElement>(`#${targetId}`)
        const target = matches.length > 0 ? matches[matches.length - 1] : null
        if (target) {
          e.preventDefault()
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
          // tabIndex=-1 on the target makes programmatic focus possible without
          // adding it to the tab sequence.
          target.focus({ preventScroll: true })
        }
      }}
    >
      {label}
    </a>
  )
}
