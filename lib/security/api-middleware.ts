/**
 * API Middleware - Security helpers for API routes
 *
 * Usage:
 * import { withSecurity } from '@/lib/security/api-middleware'
 *
 * export const POST = withSecurity(async (request) => {
 *   // Your route logic
 * }, { rateLimit: 'booking' })
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateCSRFToken } from './csrf'
import { rateLimit, RATE_LIMITS, RateLimitConfig } from './rate-limiter'
import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'

type RateLimitType = keyof typeof RATE_LIMITS

interface SecurityOptions {
  /** Type de rate limit à appliquer */
  rateLimit?: RateLimitType | RateLimitConfig
  /** Désactiver la validation CSRF (pour webhooks, etc.) */
  skipCSRF?: boolean
  /** Nécessite une authentification */
  requireAuth?: boolean
  /** Rôles autorisés */
  allowedRoles?: string[]
}

type RouteHandler = (
  request: NextRequest,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse | Response> | NextResponse | Response

/**
 * Wrapper sécurisé pour les routes API
 * Ajoute automatiquement CSRF validation et rate limiting
 */
export function withSecurity(
  handler: RouteHandler,
  options: SecurityOptions = {}
): RouteHandler {
  return async (request: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      // Rate limiting
      const rateLimitConfig = typeof options.rateLimit === 'string'
        ? RATE_LIMITS[options.rateLimit]
        : options.rateLimit || RATE_LIMITS.api

      const rateLimitResult = await rateLimit(request, rateLimitConfig)

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: 'Trop de requêtes. Veuillez réessayer dans quelques instants.',
            retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
              'X-RateLimit-Remaining': String(rateLimitResult.remaining),
              'X-RateLimit-Reset': String(rateLimitResult.resetAt),
            },
          }
        )
      }

      // CSRF validation (sauf si désactivé)
      if (!options.skipCSRF && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
        const isValidCSRF = await validateCSRFToken(request)
        if (!isValidCSRF) {
          return NextResponse.json(
            { error: 'Token de sécurité invalide. Veuillez rafraîchir la page.' },
            { status: 403 }
          )
        }
      }

      // Exécuter le handler
      const response = await handler(request, context)

      // Ajouter headers de rate limit à la réponse (si c'est une NextResponse)
      if (response instanceof NextResponse) {
        response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining))
      }

      return response
    } catch (error) {
      // Log error to Sentry with full context
      await logAPIErrorToSentry(error, request, context)
      
      console.error('[API Error]', error)
      return NextResponse.json(
        { error: 'Une erreur inattendue est survenue.' },
        { status: 500 }
      )
    }
  }
}

/**
 * Log API error to Sentry with full context
 */
async function logAPIErrorToSentry(
  error: unknown,
  request: NextRequest,
  context?: { params?: Promise<Record<string, string>> }
) {
  try {
    const url = new URL(request.url)
    const route = url.pathname
    const method = request.method
    const searchParams = Object.fromEntries(url.searchParams.entries())

    // Get user context if available
    let userContext: { id?: string; email?: string; role?: string } | null = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, email')
          .eq('id', user.id)
          .single()

        userContext = {
          id: user.id,
          email: profile?.email || user.email || undefined,
          role: profile?.role || undefined,
        }
      }
    } catch (authError) {
      // Ignore auth errors when logging API errors
    }

    // Get route params if available
    let routeParams: Record<string, string> = {}
    try {
      if (context?.params) {
        routeParams = await context.params
      }
    } catch {
      // Ignore if params not available
    }

    // Get request body (safely, without sensitive data)
    let requestBody: unknown = null
    try {
      const contentType = request.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const clonedRequest = request.clone()
        const body = await clonedRequest.json()
        // Remove sensitive fields
        const sanitizedBody = sanitizeRequestBody(body)
        requestBody = sanitizedBody
      }
    } catch {
      // Ignore if body parsing fails
    }

    // Capture error with full context
    Sentry.withScope((scope) => {
      // Set tags
      scope.setTag('feature', 'api')
      scope.setTag('endpoint', route)
      scope.setTag('method', method)
      scope.setTag('error_type', error instanceof Error ? error.constructor.name : 'Unknown')

      // Set user context
      if (userContext) {
        scope.setUser({
          id: userContext.id,
          email: userContext.email,
          role: userContext.role,
        })
      }

      // Set extra context
      scope.setExtra('route', route)
      scope.setExtra('method', method)
      scope.setExtra('searchParams', searchParams)
      scope.setExtra('routeParams', routeParams)
      if (requestBody) {
        scope.setExtra('requestBody', requestBody)
      }
      scope.setExtra('userAgent', request.headers.get('user-agent'))
      scope.setExtra('ip', request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown')

      // Capture exception
      if (error instanceof Error) {
        Sentry.captureException(error)
      } else {
        Sentry.captureException(new Error(String(error)))
      }
    })
  } catch (loggingError) {
    // Fallback: log to console if Sentry logging fails
    console.error('[Sentry] Failed to log API error:', loggingError)
    console.error('[API] Original error:', error)
  }
}

/**
 * Sanitize request body to remove sensitive data
 */
function sanitizeRequestBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return body
  }

  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization', 'creditCard', 'cvv']
  const sanitized = { ...body }

  for (const key in sanitized) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeRequestBody(sanitized[key])
    }
  }

  return sanitized
}

/**
 * Helper pour créer une réponse JSON avec les bons headers
 */
export function jsonResponse<T>(
  data: T,
  options: { status?: number; headers?: Record<string, string> } = {}
): NextResponse {
  return NextResponse.json(data, {
    status: options.status || 200,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

/**
 * Helper pour les erreurs standardisées
 */
export function errorResponse(
  message: string,
  status: number = 400,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      ...(details && { details }),
    },
    { status }
  )
}
