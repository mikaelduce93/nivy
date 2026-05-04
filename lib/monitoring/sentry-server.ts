/**
 * TEENS PARTY MOROCCO - Sentry Server Utilities
 * ==============================================
 *
 * Server-side Sentry utilities for setting tags and context
 */

import * as Sentry from '@sentry/nextjs'

/**
 * Set environment tag (should be called in middleware)
 */
export function setEnvironmentTag(environment: string = process.env.NODE_ENV || 'development') {
  Sentry.setTag('environment', environment)
}

/**
 * Set tags in Sentry for filtering and grouping (server-side)
 */
export function setTags(tags: Record<string, string>) {
  Object.entries(tags).forEach(([key, value]) => {
    Sentry.setTag(key, value)
  })
}

/**
 * Set user context (server-side)
 */
export function setUserContext(user: {
  id: string
  email?: string
  username?: string
  role?: string
} | null) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    })
  } else {
    Sentry.setUser(null)
  }
}

