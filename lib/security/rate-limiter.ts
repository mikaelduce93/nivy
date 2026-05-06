/**
 * Rate Limiting pour protéger les APIs.
 *
 * SOURCE OF TRUTH for app-wide rate limiting (in-memory backend).
 *
 * Architecture (Finalisation-B):
 * - `lib/security/rate-limiter.ts` (ce fichier): backend in-memory canonique. API:
 *     `rateLimit(request, config)` + presets `RATE_LIMITS`.
 *   Importeurs principaux: `middleware.ts`, `app/api/bookings/create/route.ts`,
 *   `lib/security/api-middleware.ts`, `tests/lib/security/rate-limiter.test.ts`.
 *
 * - `lib/security/rate-limiter-redis.ts`: variante distribuee (Upstash) qui retombe
 *     automatiquement sur le backend in-memory ci-dessus si Redis n'est pas configure.
 *     Importeur principal: `middleware.ts` (`rateLimitDistributed`).
 *
 * - `lib/utils/rate-limiter.ts`: ancienne facade legacy avec un contrat different
 *     (`checkRateLimit` / `createRateLimiter`). Sans importeur connu, conservee
 *     uniquement comme shim de retro-compatibilite (cf. header de ce fichier).
 *
 * Pour le code nouveau, importer depuis ce module ou depuis `rate-limiter-redis`.
 */
import { NextRequest } from 'next/server'

interface RateLimitStore {
  [key: string]: { count: number; resetAt: number }
}

const store: RateLimitStore = {}

export interface RateLimitConfig {
  max: number // Nombre max de requêtes
  window: number // Fenêtre en millisecondes
}

const DEFAULT_CONFIG: RateLimitConfig = {
  max: 60,
  window: 60000, // 1 minute
}

export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  // Identifier l'utilisateur (IP + user agent)
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const key = `${ip}:${userAgent.slice(0, 50)}`

  const now = Date.now()
  const record = store[key]

  // Nettoyer les anciennes entrées
  Object.keys(store).forEach((k) => {
    if (store[k].resetAt < now) {
      delete store[k]
    }
  })

  if (!record || record.resetAt < now) {
    // Nouvelle fenêtre
    store[key] = {
      count: 1,
      resetAt: now + config.window,
    }
    return { allowed: true, remaining: config.max - 1, resetAt: store[key].resetAt }
  }

  record.count++

  if (record.count > config.max) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt }
  }

  return { allowed: true, remaining: config.max - record.count, resetAt: record.resetAt }
}

// Rate limits spécifiques par endpoint
export const RATE_LIMITS = {
  auth: { max: 5, window: 60000 }, // 5 tentatives/min
  booking: { max: 10, window: 60000 }, // 10 réservations/min
  payment: { max: 3, window: 60000 }, // 3 paiements/min
  upload: { max: 10, window: 60000 }, // 10 uploads/min
  api: { max: 60, window: 60000 }, // 60 requêtes/min
}
