/**
 * TEENS PARTY MOROCCO - Automatic Alerts
 * =======================================
 *
 * Système d'alertes automatiques:
 * - Alertes erreurs critiques
 * - Seuils de performance
 * - Notifications webhook
 */

import { captureError, captureMessage } from './sentry'
import { logger } from './logger'

/* ==========================================================================
   TYPES
   ========================================================================== */

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface AlertConfig {
  name: string
  severity: AlertSeverity
  threshold?: number
  webhookUrl?: string
  enabled: boolean
}

export interface Alert {
  id: string
  type: string
  severity: AlertSeverity
  message: string
  timestamp: string
  context?: Record<string, unknown>
  resolved: boolean
}

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// Alert thresholds
const THRESHOLDS = {
  // Payment
  paymentFailureRate: 0.1, // 10% failure rate triggers alert
  paymentConsecutiveFailures: 3,

  // Performance
  apiResponseTime: 5000, // 5 seconds
  pageLoadTime: 3000, // 3 seconds

  // Errors
  errorRatePerMinute: 10,
  criticalErrorsPerHour: 5,

  // Security
  failedLoginAttempts: 5,
  suspiciousActivityScore: 80,
}

/* ==========================================================================
   ALERT TRACKING
   ========================================================================== */

const alertCounters: Map<string, { count: number; lastReset: number }> = new Map()

function incrementCounter(key: string): number {
  const now = Date.now()
  const counter = alertCounters.get(key)

  if (!counter || now - counter.lastReset > 60000) {
    // Reset counter every minute
    alertCounters.set(key, { count: 1, lastReset: now })
    return 1
  }

  counter.count++
  return counter.count
}

function getCounter(key: string): number {
  return alertCounters.get(key)?.count || 0
}

/* ==========================================================================
   NOTIFICATION FUNCTIONS
   ========================================================================== */

/**
 * Send alert to Slack webhook
 */
async function sendSlackAlert(
  title: string,
  message: string,
  severity: AlertSeverity,
  context?: Record<string, unknown>
) {
  if (!SLACK_WEBHOOK_URL || !IS_PRODUCTION) {
    logger.debug(`[Alert] Would send Slack alert: ${title}`, { severity })
    return
  }

  const color = {
    low: '#36a64f',
    medium: '#ffc107',
    high: '#ff9800',
    critical: '#dc3545',
  }[severity]

  const payload = {
    attachments: [
      {
        color,
        title: `🚨 ${title}`,
        text: message,
        fields: context
          ? Object.entries(context).map(([title, value]) => ({
              title,
              value: String(value),
              short: true,
            }))
          : undefined,
        footer: 'Teens Party Morocco Alerts',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  }

  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    logger.error('Failed to send Slack alert', error)
  }
}

/**
 * Send alert to generic webhook
 */
async function sendWebhookAlert(
  type: string,
  message: string,
  severity: AlertSeverity,
  context?: Record<string, unknown>
) {
  if (!ALERT_WEBHOOK_URL || !IS_PRODUCTION) {
    logger.debug(`[Alert] Would send webhook alert: ${type}`, { severity })
    return
  }

  const payload = {
    type,
    message,
    severity,
    context,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  }

  try {
    await fetch(ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    logger.error('Failed to send webhook alert', error)
  }
}

/* ==========================================================================
   ALERT FUNCTIONS
   ========================================================================== */

/**
 * Trigger a generic alert
 */
export async function triggerAlert(
  type: string,
  message: string,
  severity: AlertSeverity,
  context?: Record<string, unknown>
) {
  logger.warn(`[Alert] ${type}: ${message}`, { severity, ...context })

  // Send to Sentry as well
  captureMessage(`Alert: ${type}`, severity === 'critical' ? 'fatal' : severity === 'high' ? 'error' : 'warning', {
    tags: { alert_type: type },
    extra: context,
  })

  // Send to notification channels
  await Promise.all([
    sendSlackAlert(type, message, severity, context),
    sendWebhookAlert(type, message, severity, context),
  ])
}

/**
 * Alert on payment failure
 */
export async function alertPaymentFailure(
  provider: string,
  error: string,
  bookingId?: string,
  amount?: number
) {
  const failureCount = incrementCounter(`payment_failure_${provider}`)

  // Alert if consecutive failures exceed threshold
  if (failureCount >= THRESHOLDS.paymentConsecutiveFailures) {
    await triggerAlert(
      'Payment Failures',
      `${failureCount} consecutive payment failures on ${provider}`,
      'critical',
      {
        provider,
        lastError: error,
        bookingId,
        amount,
      }
    )
  }
}

/**
 * Alert on high error rate
 */
export async function alertHighErrorRate(
  feature: string,
  errorCount: number,
  windowMinutes: number = 1
) {
  const rate = errorCount / windowMinutes

  if (rate >= THRESHOLDS.errorRatePerMinute) {
    await triggerAlert(
      'High Error Rate',
      `${errorCount} errors in ${windowMinutes} minute(s) for ${feature}`,
      'high',
      {
        feature,
        errorCount,
        windowMinutes,
        rate,
      }
    )
  }
}

/**
 * Alert on slow API response
 */
export async function alertSlowResponse(
  endpoint: string,
  responseTime: number,
  method: string = 'GET'
) {
  if (responseTime >= THRESHOLDS.apiResponseTime) {
    await triggerAlert(
      'Slow API Response',
      `${method} ${endpoint} took ${responseTime}ms`,
      'medium',
      {
        endpoint,
        method,
        responseTime,
        threshold: THRESHOLDS.apiResponseTime,
      }
    )
  }
}

/**
 * Alert on suspicious activity
 */
export async function alertSuspiciousActivity(
  userId: string,
  activityType: string,
  details: string
) {
  await triggerAlert(
    'Suspicious Activity',
    `Suspicious ${activityType} detected for user ${userId}`,
    'high',
    {
      userId,
      activityType,
      details,
    }
  )
}

/**
 * Alert on failed login attempts
 */
export async function alertFailedLogins(
  email: string,
  attemptCount: number,
  ipAddress?: string
) {
  if (attemptCount >= THRESHOLDS.failedLoginAttempts) {
    await triggerAlert(
      'Failed Login Attempts',
      `${attemptCount} failed login attempts for ${email}`,
      'medium',
      {
        email,
        attemptCount,
        ipAddress,
      }
    )
  }
}

/**
 * Alert on critical error
 */
export async function alertCriticalError(
  error: Error,
  feature: string,
  context?: Record<string, unknown>
) {
  const errorCount = incrementCounter(`critical_error_${feature}`)

  await triggerAlert(
    'Critical Error',
    error.message,
    'critical',
    {
      feature,
      errorName: error.name,
      errorStack: error.stack,
      occurrencesThisHour: errorCount,
      ...context,
    }
  )

  // Also capture in Sentry
  captureError(error, {
    tags: { critical: 'true', feature },
    level: 'fatal',
    extra: context,
  })
}

/**
 * Alert on service degradation
 */
export async function alertServiceDegradation(
  service: string,
  healthStatus: string,
  details?: string
) {
  await triggerAlert(
    'Service Degradation',
    `${service} is experiencing issues: ${healthStatus}`,
    'high',
    {
      service,
      healthStatus,
      details,
    }
  )
}

/* ==========================================================================
   HEALTH CHECK
   ========================================================================== */

/**
 * Perform health check and alert if issues found
 */
export async function performHealthCheck(
  services: Array<{
    name: string
    check: () => Promise<boolean>
  }>
): Promise<{ healthy: boolean; results: Record<string, boolean> }> {
  const results: Record<string, boolean> = {}
  let allHealthy = true

  for (const service of services) {
    try {
      const isHealthy = await service.check()
      results[service.name] = isHealthy

      if (!isHealthy) {
        allHealthy = false
        await alertServiceDegradation(service.name, 'unhealthy', 'Health check failed')
      }
    } catch (error) {
      results[service.name] = false
      allHealthy = false
      await alertServiceDegradation(
        service.name,
        'error',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  return { healthy: allHealthy, results }
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export default {
  triggerAlert,
  alertPaymentFailure,
  alertHighErrorRate,
  alertSlowResponse,
  alertSuspiciousActivity,
  alertFailedLogins,
  alertCriticalError,
  alertServiceDegradation,
  performHealthCheck,
}
