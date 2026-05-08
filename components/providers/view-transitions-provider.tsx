'use client'

/**
 * ============================================================================
 *  VIEW TRANSITIONS PROVIDER  —  TICKET-024 (Wave 2)
 * ============================================================================
 *
 *  Audit finding #2 was that the codebase had **zero** usage of the native
 *  View Transitions API. This provider lights it up as a *progressive
 *  enhancement* on top of the existing Next.js App Router navigation.
 *
 *  How it works
 *  ------------
 *  The browser API only morphs elements that share a `view-transition-name`
 *  between the *outgoing* DOM snapshot and the *incoming* one. With the App
 *  Router that means we have to:
 *
 *    1. Intercept same-origin `<a>` clicks **before** Next's client router
 *       starts swapping the tree, and
 *    2. Wrap the resulting `router.push` inside `document.startViewTransition`
 *       so the browser captures the "old" frame, runs our update callback,
 *       then captures the "new" frame and morphs the matching names.
 *
 *  Anything not supported (Safari < 18, Firefox without the flag, prefers-
 *  reduced-motion: reduce) silently falls back to a regular navigation —
 *  the named elements still render, they just don't morph.
 *
 *  Names are assigned via inline styles on five surface pairs (quest /
 *  mentor / marketplace / restaurant / feed-post). The actual cubic-bezier
 *  easing + reduced-motion kill switch lives in `app/globals.css`
 *  (search "View Transitions API — TICKET-024").
 *
 *  We deliberately keep this provider tiny and dependency-free so it can be
 *  removed without touching feature code if the API graduates to a Next.js
 *  primitive.
 * ============================================================================
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'

// `startViewTransition` is exposed on `Document` in modern TS DOM libs but
// is still nullable at runtime on browsers without support — so every
// callsite needs the `typeof === 'function'` guard regardless of types.
function supportsViewTransitions(): boolean {
  if (typeof document === 'undefined') return false
  return typeof document.startViewTransition === 'function'
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Best-effort detection: is this anchor an "internal" navigation we want to
 * intercept? We bail on:
 *   - modifier-key clicks (cmd / ctrl / shift / middle-click → new tab)
 *   - explicit target="_blank" or download
 *   - cross-origin URLs
 *   - same-document hash-only navigations (browsers handle those natively)
 *   - default-prevented events (someone else already owns this click)
 */
function shouldInterceptClick(
  event: MouseEvent,
  anchor: HTMLAnchorElement,
): { intercept: false } | { intercept: true; path: string } {
  if (event.defaultPrevented) return { intercept: false }
  if (event.button !== 0) return { intercept: false }
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return { intercept: false }
  }

  if (anchor.target && anchor.target !== '' && anchor.target !== '_self') {
    return { intercept: false }
  }
  if (anchor.hasAttribute('download')) return { intercept: false }
  if (anchor.dataset.viewTransition === 'off') return { intercept: false }

  const href = anchor.getAttribute('href')
  if (!href) return { intercept: false }

  // Resolve relative URLs against the current document.
  let url: URL
  try {
    url = new URL(href, window.location.href)
  } catch {
    return { intercept: false }
  }

  if (url.origin !== window.location.origin) return { intercept: false }

  // Pure hash-only navigation on the same page → let the browser handle it.
  const sameDocument =
    url.pathname === window.location.pathname && url.search === window.location.search
  if (sameDocument && url.hash) return { intercept: false }

  return { intercept: true, path: `${url.pathname}${url.search}${url.hash}` }
}

export function ViewTransitionsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  React.useEffect(() => {
    if (!supportsViewTransitions()) return undefined

    const handler = (event: MouseEvent) => {
      // Walk up from the click target to find the closest anchor — covers
      // cases where Link wraps an icon/svg/text node.
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a')
      if (!(anchor instanceof HTMLAnchorElement)) return

      const decision = shouldInterceptClick(event, anchor)
      if (!decision.intercept) return

      // Reduced-motion users still get the navigation, just without the morph.
      // We let the click proceed normally so the browser's snapshot machinery
      // doesn't kick in — the @media guard in globals.css zeroes out the
      // animation as a belt-and-braces safety net.
      if (prefersReducedMotion()) return

      const start = document.startViewTransition
      if (typeof start !== 'function') return

      event.preventDefault()
      // `bind(document)` keeps the correct receiver — `start` is grabbed off
      // the prototype and would otherwise lose its `this` when called.
      start.call(document, () => {
        // Returning the promise is recommended so the browser can keep the
        // "old" snapshot up while React commits the new tree. `router.push`
        // itself is fire-and-forget in the App Router; resolving on the next
        // microtask is enough to chain the morph correctly.
        router.push(decision.path)
        return Promise.resolve()
      })
    }

    document.addEventListener('click', handler, { capture: true })
    return () => document.removeEventListener('click', handler, { capture: true })
  }, [router])

  return <>{children}</>
}
