/**
 * TEENS PARTY MOROCCO - Sentry Enhanced Monitoring
 * ===============================================
 *
 * Enhanced Sentry configuration with:
 * - Automatic breadcrumbs (navigation, actions, API)
 * - User context management
 * - Tags management
 * - Tracked fetch wrapper
 */

'use client'

import * as Sentry from '@sentry/nextjs'
import { addBreadcrumb } from './sentry'

/* ==========================================================================
   BREADCRUMBS SETUP
   ========================================================================== */

/**
 * Setup automatic breadcrumbs for navigation, user actions, and API calls
 * Should be called once in app/layout.tsx (client-side)
 */
export function setupSentryBreadcrumbs() {
  if (typeof window === 'undefined') {
    return // Server-side, skip
  }

  // Track navigation (Next.js router)
  if (typeof window !== 'undefined' && window.history) {
    // Track initial page load
    addBreadcrumb('Page loaded', 'navigation', {
      path: window.location.pathname,
      search: window.location.search,
    })

    // Track pushState/replaceState (Next.js navigation)
    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState

    history.pushState = function (...args) {
      originalPushState.apply(history, args)
      addBreadcrumb('Navigation (pushState)', 'navigation', {
        path: window.location.pathname,
        search: window.location.search,
      })
    }

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args)
      addBreadcrumb('Navigation (replaceState)', 'navigation', {
        path: window.location.pathname,
        search: window.location.search,
      })
    }

    // Track popstate (back/forward)
    window.addEventListener('popstate', () => {
      addBreadcrumb('Navigation (popstate)', 'navigation', {
        path: window.location.pathname,
        search: window.location.search,
      })
    })
  }

  // Track user interactions (clicks on important elements)
  if (typeof document !== 'undefined') {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      
      // Only track clicks on buttons, links, and form elements
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('form')
      ) {
        const button = target.closest('button') || target.closest('a')
        const text = button?.textContent?.trim() || target.textContent?.trim() || 'Unknown'
        const href = (button as HTMLAnchorElement)?.href || ''
        
        addBreadcrumb('User action (click)', 'ui', {
          element: target.tagName,
          text: text.substring(0, 50), // Limit text length
          href: href ? new URL(href).pathname : undefined,
        })
      }
    }, { capture: true })
  }
}

/* ==========================================================================
   TRACKED FETCH
   ========================================================================== */

/**
 * Wrapper for fetch that automatically adds breadcrumbs for API calls
 * Use this instead of native fetch for better debugging in Sentry
 */
export async function trackedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  const method = init?.method || 'GET'
  const startTime = Date.now()

  // Add breadcrumb before request
  addBreadcrumb('API Request', 'api', {
    url,
    method,
    hasBody: !!init?.body,
  }, 'info')

  try {
    const response = await fetch(input, init)
    const duration = Date.now() - startTime

    // Add breadcrumb after response
    addBreadcrumb('API Response', 'api', {
      url,
      method,
      status: response.status,
      statusText: response.statusText,
      duration: `${duration}ms`,
    }, response.ok ? 'info' : 'warning')

    // If error status, capture as warning
    if (!response.ok) {
      Sentry.captureMessage(`API Error: ${method} ${url} returned ${response.status}`, {
        level: 'warning',
        tags: {
          feature: 'api',
          endpoint: url,
          method,
          status_code: response.status.toString(),
        },
        extra: {
          statusText: response.statusText,
          duration,
        },
      })
    }

    return response
  } catch (error) {
    const duration = Date.now() - startTime

    // Add breadcrumb for error
    addBreadcrumb('API Error', 'api', {
      url,
      method,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
    }, 'error')

    // Capture error in Sentry
    Sentry.captureException(error, {
      tags: {
        feature: 'api',
        endpoint: url,
        method,
      },
      extra: {
        url,
        method,
        duration,
      },
    })

    throw error
  }
}

/* ==========================================================================
   USER CONTEXT
   ========================================================================== */

export interface UserContext {
  id: string
  email?: string
  username?: string
  role?: string
  [key: string]: unknown
}

/**
 * Set user context in Sentry
 * Should be called after successful login
 */
export function setUserContext(user: UserContext | null) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    })

    // Add breadcrumb for user context change
    addBreadcrumb('User context set', 'auth', {
      userId: user.id,
      role: user.role,
    })
  } else {
    Sentry.setUser(null)
    addBreadcrumb('User context cleared', 'auth')
  }
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  setUserContext(null)
}

/* ==========================================================================
   TAGS
   ========================================================================== */

/**
 * Set tags in Sentry for filtering and grouping
 */
export function setTags(tags: Record<string, string>) {
  Object.entries(tags).forEach(([key, value]) => {
    Sentry.setTag(key, value)
  })
}

/**
 * Set a single tag
 */
export function setTag(key: string, value: string) {
  Sentry.setTag(key, value)
}

/**
 * Set environment tag (should be called in middleware)
 */
export function setEnvironmentTag(environment: string = process.env.NODE_ENV || 'development') {
  Sentry.setTag('environment', environment)
}

/**
 * Set feature flag tags
 */
export function setFeatureFlags(flags: Record<string, boolean>) {
  Object.entries(flags).forEach(([key, value]) => {
    Sentry.setTag(`feature_flag_${key}`, value ? 'enabled' : 'disabled')
  })
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export { Sentry }

