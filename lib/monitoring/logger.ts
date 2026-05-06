/**
 * TEENS PARTY MOROCCO - Centralized Logger
 * =========================================
 *
 * Centralized logging system that:
 * - Replaces console.log with structured logging
 * - Integrates with Sentry for error tracking
 * - Supports different log levels (info, warn, error)
 * - Sanitizes sensitive data
 */

import * as Sentry from '@sentry/nextjs'

/* ==========================================================================
   TYPES
   ========================================================================== */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'

// Log levels hierarchy
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// Minimum log level (only log at or above this level)
const MIN_LOG_LEVEL: LogLevel = IS_PRODUCTION ? 'info' : 'debug'

/* ==========================================================================
   UTILITIES
   ========================================================================== */

/**
 * Sanitize data to remove sensitive information
 */
function sanitizeData(data: unknown): Record<string, unknown> | unknown[] | unknown {
  if (!data || typeof data !== 'object') {
    return data
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'authorization',
    'creditCard',
    'cvv',
    'ssn',
    'socialSecurityNumber',
    'accessToken',
    'refreshToken',
  ]

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item))
  }

  const sanitized = { ...data } as Record<string, unknown>

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase()
    if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key])
    }
  }

  return sanitized
}

/**
 * Format log message with context
 */
function formatLogMessage(message: string, context?: LogContext): string {
  if (!context || Object.keys(context).length === 0) {
    return message
  }

  const sanitizedContext = sanitizeData(context)
  return `${message} ${JSON.stringify(sanitizedContext)}`
}

/**
 * Check if log level should be logged
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL]
}

/* ==========================================================================
   LOGGER CLASS
   ========================================================================== */

class Logger {
  /**
   * Log debug message (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (!shouldLog('debug')) return

    if (IS_DEVELOPMENT) {
      console.debug(`[DEBUG] ${formatLogMessage(message, context)}`)
    }
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    if (!shouldLog('info')) return

    const formatted = formatLogMessage(message, context)
    console.info(`[INFO] ${formatted}`)

    // In production, also send to Sentry as breadcrumb
    if (IS_PRODUCTION && typeof window !== 'undefined') {
      Sentry.addBreadcrumb({
        message,
        category: 'log',
        level: 'info',
        data: sanitizeData(context) as Record<string, unknown>,
      })
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    if (!shouldLog('warn')) return

    const formatted = formatLogMessage(message, context)
    console.warn(`[WARN] ${formatted}`)

    // Send to Sentry as breadcrumb
    if (typeof window !== 'undefined') {
      Sentry.addBreadcrumb({
        message,
        category: 'log',
        level: 'warning',
        data: sanitizeData(context) as Record<string, unknown>,
      })
    }

    // In production, also capture as message
    if (IS_PRODUCTION) {
      Sentry.captureMessage(message, {
        level: 'warning',
        extra: sanitizeData(context) as Record<string, unknown>,
      })
    }
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!shouldLog('error')) return

    const formatted = formatLogMessage(message, context)
    console.error(`[ERROR] ${formatted}`, error)

    // Send to Sentry
    if (error instanceof Error) {
      Sentry.captureException(error, {
        level: 'error',
        extra: {
          message,
          ...(sanitizeData(context) as Record<string, unknown>),
        },
      })
    } else {
      Sentry.captureMessage(message, {
        level: 'error',
        extra: {
          error: String(error),
          ...(sanitizeData(context) as Record<string, unknown>),
        },
      })
    }
  }

  /**
   * Log API request
   */
  apiRequest(method: string, url: string, context?: LogContext): void {
    this.info(`API Request: ${method} ${url}`, context)
  }

  /**
   * Log API response
   */
  apiResponse(method: string, url: string, status: number, duration?: number, context?: LogContext): void {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
    const message = `API Response: ${method} ${url} - ${status}${duration ? ` (${duration}ms)` : ''}`

    if (level === 'error') {
      this.error(message, undefined, context)
    } else if (level === 'warn') {
      this.warn(message, context)
    } else {
      this.info(message, context)
    }
  }

  /**
   * Log user action
   */
  userAction(action: string, context?: LogContext): void {
    this.info(`User Action: ${action}`, context)
  }

  /**
   * Log performance metric
   */
  performance(metric: string, value: number, unit: string = 'ms', context?: LogContext): void {
    this.info(`Performance: ${metric} = ${value}${unit}`, context)

    // Send to Sentry metrics (if available). Sentry.metrics.distribution
    // typings vary by SDK version; cast options through unknown so `tags`
    // keeps working across versions.
    if (typeof window !== 'undefined' && 'metrics' in Sentry) {
      try {
        Sentry.metrics.distribution(metric, value, {
          unit,
          tags: context as Record<string, string>,
        } as unknown as { unit: string })
      } catch {
        // Ignore if metrics not available
      }
    }
  }
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

// Export singleton instance
export const logger = new Logger()

// Export convenience functions
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext) => logger.warn(message, context),
  error: (message: string, error?: Error | unknown, context?: LogContext) => logger.error(message, error, context),
  apiRequest: (method: string, url: string, context?: LogContext) => logger.apiRequest(method, url, context),
  apiResponse: (method: string, url: string, status: number, duration?: number, context?: LogContext) =>
    logger.apiResponse(method, url, status, duration, context),
  userAction: (action: string, context?: LogContext) => logger.userAction(action, context),
  performance: (metric: string, value: number, unit?: string, context?: LogContext) =>
    logger.performance(metric, value, unit, context),
}

// Default export
export default logger
