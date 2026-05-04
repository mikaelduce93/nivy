/**
 * TEENS PARTY MOROCCO - Monitoring Exports
 * =========================================
 *
 * Central export point for all monitoring utilities
 */

// Sentry enhanced (client-side)
export {
  setupSentryBreadcrumbs,
  trackedFetch,
  setUserContext,
  clearUserContext,
  setTags,
  setTag,
  setEnvironmentTag,
  setFeatureFlags,
  type UserContext,
} from './sentry-enhanced'

// Sentry server (server-side)
export {
  setEnvironmentTag as setEnvironmentTagServer,
  setTags as setTagsServer,
  setUserContext as setUserContextServer,
} from './sentry-server'

// Sentry base utilities
export {
  addBreadcrumb,
  captureError,
  captureMessage,
  setSentryUser,
  clearSentryUser,
  capturePaymentError,
  captureBookingError,
  captureAPIError,
  captureAuthError,
  type SentryUser,
  type ErrorContext,
  type BreadcrumbCategory,
} from './sentry'

// Logger
export { logger, log } from './logger'
export type { LogLevel } from './logger'
