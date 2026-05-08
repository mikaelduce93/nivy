import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Heading primitives — TICKET-003 (design-system architect).
 *
 * Goals:
 *  - Enforce the canonical Nivy typographic scale (H1→H4).
 *  - Default the page-title pattern to Geist italic + tight letter-spacing.
 *  - Provide an `accent` prop for brand / accent gradient text.
 *  - Stay accessible: each component renders its semantically correct
 *    `<h1>`–`<h4>` by default, but accepts an `as` prop so authors can
 *    re-tag the visual level (e.g. an H2 visual style on an `<h3>`)
 *    without breaking document outline.
 *
 * All variants extend the project semantic token system (see
 * `app/globals.css`) — no raw color literals.
 */

// ---------------------------------------------------------------------------
// Shared base — feature-rich Geist tuning + balanced wrapping
// ---------------------------------------------------------------------------
const headingBase = 'font-sans text-balance text-foreground antialiased'

// ---------------------------------------------------------------------------
// Accent variants — gradient text (cyan→emerald or brand-soft→accent-soft)
// ---------------------------------------------------------------------------
type AccentVariant = 'none' | 'brand' | 'accent' | 'gen-z'

const accentClasses: Record<AccentVariant, string> = {
  none: '',
  // brand-soft → accent-soft (lavender → coral)
  brand:
    'bg-clip-text text-transparent bg-gradient-to-r from-brand-soft to-accent-soft',
  // primary → accent (saturated)
  accent:
    'bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent',
  // multi-stop gen-z holographic
  'gen-z':
    'bg-clip-text text-transparent bg-gradient-to-r from-brand-soft via-accent-soft to-success-soft',
}

// ---------------------------------------------------------------------------
// Per-level scale — canonical typography
// ---------------------------------------------------------------------------
// text-4xl + italic + font-semibold — page-title pattern (per ticket spec)
const h1Scale = cn(
  headingBase,
  'text-4xl italic font-semibold tracking-tight leading-[1.05]',
)
const h2Scale = cn(
  headingBase,
  'text-2xl font-semibold tracking-tight leading-tight',
)
const h3Scale = cn(
  headingBase,
  'text-xl font-medium tracking-tight leading-snug',
)
const h4Scale = cn(
  headingBase,
  'text-lg font-medium tracking-tight leading-snug',
)

// ---------------------------------------------------------------------------
// Type plumbing
// ---------------------------------------------------------------------------
type SemanticTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div'

type BaseHeadingProps = {
  /** Override the rendered semantic tag (a11y document-outline control). */
  as?: SemanticTag
  /** Optional gradient text accent. */
  accent?: AccentVariant
} & React.HTMLAttributes<HTMLHeadingElement>

function createHeading(
  defaultTag: SemanticTag,
  scaleClasses: string,
  displayName: string,
) {
  const Component = React.forwardRef<HTMLHeadingElement, BaseHeadingProps>(
    function Heading(
      { as, accent = 'none', className, children, ...rest },
      ref,
    ) {
      const Tag = (as ?? defaultTag) as SemanticTag
      return React.createElement(
        Tag,
        {
          ref,
          'data-slot': displayName.toLowerCase(),
          'data-accent': accent === 'none' ? undefined : accent,
          className: cn(scaleClasses, accentClasses[accent], className),
          ...rest,
        },
        children,
      )
    },
  )
  Component.displayName = displayName
  return Component
}

// ---------------------------------------------------------------------------
// Public components
// ---------------------------------------------------------------------------
export const H1 = createHeading('h1', h1Scale, 'H1')
export const H2 = createHeading('h2', h2Scale, 'H2')
export const H3 = createHeading('h3', h3Scale, 'H3')
export const H4 = createHeading('h4', h4Scale, 'H4')

/** Canonical heading scale class strings — useful when you need to apply the
 *  visual rhythm to a non-heading element (e.g. an animated counter). */
export const headingScale = {
  h1: h1Scale,
  h2: h2Scale,
  h3: h3Scale,
  h4: h4Scale,
} as const

export type { AccentVariant, BaseHeadingProps as HeadingProps }
