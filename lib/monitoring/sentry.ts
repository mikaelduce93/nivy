/**
 * TEENS PARTY MOROCCO - Sentry Configuration
 * ==========================================
 *
 * Configuration centralisée pour Sentry:
 * - Error tracking
 * - Performance monitoring
 * - User context
 */

import * as Sentry from '@sentry/nextjs'

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'

/**
 * Initialize Sentry on the client side
 */
export function initSentryClient() {
  if (!SENTRY_DSN) {
    console.warn('[Sentry] No DSN configured, skipping initialization')
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    enabled: IS_PRODUCTION,
    tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    beforeSend(event, hint) {
      if (IS_DEVELOPMENT) {
        return null
      }

      const error = hint.originalException as Error | undefined
      if (error?.message?.includes('ResizeObserver')) {
        return null
      }

      return event
    },

    ignoreErrors: [
      'top.GLOBALS',
      'fb_xd_fragment',
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Network request failed',
      'Failed to fetch',
      'NetworkError',
      'Load failed',
      'AbortError',
      'The operation was aborted',
    ],

    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
      /^safari-extension:\/\//i,
    ],
  })
}

/**
 * Initialize Sentry on the server side
 */
export function initSentryServer() {
  if (!SENTRY_DSN) {
    console.warn('[Sentry] No DSN configured, skipping initialization')
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    enabled: IS_PRODUCTION,
    tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0,
    profilesSampleRate: 0.1,

    beforeSend(event) {
      if (event.exception?.values?.[0]?.type === 'NotFoundError') {
        return null
      }
      return event
    },
  })
}

/* ==========================================================================
   USER CONTEXT
   ========================================================================== */

export interface SentryUser {
  id: string
  email?: string
  username?: string
  role?: string
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(user: SentryUser | null) {
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

/**
 * Clear user context
 */
export function clearSentryUser() {
  Sentry.setUser(null)
}

/* ==========================================================================
   ERROR CAPTURING
   ========================================================================== */

export interface ErrorContext {
  tags?: Record<string, string>
  extra?: Record<string, unknown>
  level?: Sentry.SeverityLevel
  fingerprint?: string[]
}

/**
 * Capture an error with context
 */
export function captureError(
  error: Error | string,
  context?: ErrorContext
) {
  const errorObj = typeof error === 'string' ? new Error(error) : error

  Sentry.withScope((scope) => {
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value)
      })
    }

    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value)
      })
    }

    if (context?.level) {
      scope.setLevel(context.level)
    }

    if (context?.fingerprint) {
      scope.setFingerprint(context.fingerprint)
    }

    Sentry.captureException(errorObj)
  })
}

/**
 * Capture a message
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Omit<ErrorContext, 'level'>
) {
  Sentry.withScope((scope) => {
    scope.setLevel(level)

    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value)
      })
    }

    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value)
      })
    }

    Sentry.captureMessage(message)
  })
}

/* ==========================================================================
   BREADCRUMBS
   ========================================================================== */

export type BreadcrumbCategory =
  | 'navigation'
  | 'api'
  | 'ui'
  | 'user'
  | 'payment'
  | 'booking'
  | 'auth'

/**
 * Add a breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: BreadcrumbCategory,
  data?: Record<string, unknown>,
  level: Sentry.SeverityLevel = 'info'
) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level,
  })
}

/* ==========================================================================
   PERFORMANCE
   ========================================================================== */

/**
 * Start a performance transaction
 */
export function startTransaction(
  name: string,
  op: string
) {
  return Sentry.startSpan({ name, op }, () => {})
}

/**
 * Wrap an async function with performance tracking
 */
export async function withTransaction<T>(
  name: string,
  op: string,
  fn: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan({ name, op }, async () => {
    return fn()
  })
}

/* ==========================================================================
   SPECIALIZED HELPERS
   ========================================================================== */

/**
 * Capture a payment error
 */
export function capturePaymentError(
  error: Error,
  paymentMethod: string,
  bookingId?: string,
  amount?: number
) {
  captureError(error, {
    tags: {
      feature: 'payment',
      payment_method: paymentMethod,
    },
    extra: {
      bookingId,
      amount,
    },
    level: 'error',
    fingerprint: ['payment-error', paymentMethod],
  })
}

/**
 * Capture a booking error
 */
export function captureBookingError(
  error: Error,
  eventId?: string,
  teenIds?: string[]
) {
  captureError(error, {
    tags: {
      feature: 'booking',
    },
    extra: {
      eventId,
      teenIds,
    },
    level: 'error',
    fingerprint: ['booking-error'],
  })
}

/**
 * Capture an API error
 */
export function captureAPIError(
  error: Error,
  endpoint: string,
  method: string,
  statusCode?: number
) {
  captureError(error, {
    tags: {
      feature: 'api',
      endpoint,
      method,
      status_code: statusCode?.toString() ?? 'unknown',
    },
    level: statusCode && statusCode >= 500 ? 'error' : 'warning',
    fingerprint: ['api-error', endpoint, method],
  })
}

/**
 * Capture an authentication error
 */
export function captureAuthError(
  error: Error,
  action: 'login' | 'logout' | 'register' | 'reset_password'
) {
  captureError(error, {
    tags: {
      feature: 'auth',
      action,
    },
    level: 'warning',
    fingerprint: ['auth-error', action],
  })
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export { Sentry }
