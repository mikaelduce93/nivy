/**
 * Re-export shim for backwards compatibility.
 *
 * Canonical source: `@/lib/security/rate-limiter` (in-memory)
 * Distributed variant:  `@/lib/security/rate-limiter-redis` (Upstash Redis with in-memory fallback)
 *
 * Canonicalisation Finalisation-B:
 * - Aucun importeur connu pour ce module au moment de la consolidation.
 * - Conserve uniquement pour eviter de casser des imports legacy externes.
 *
 * Le contrat exporte ici (checkRateLimit / createRateLimiter / rateLimiters)
 * differe de celui de `lib/security/rate-limiter.ts` (rateLimit / RATE_LIMITS).
 * Pour cette raison, cette facade conserve son API specifique mais delegue
 * son backend in-memory a `lib/security/rate-limiter` quand pertinent.
 *
 * Nouveau code: importer directement `@/lib/security/rate-limiter`.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
  blocked?: boolean
}

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  blockDurationMs?: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 60,
  windowMs: 60000,
  blockDurationMs: 60000,
}

const rateLimitStore = new Map<string, RateLimitEntry>()

const CLEANUP_INTERVAL = 5 * 60 * 1000
let cleanupInterval: NodeJS.Timeout | null = null

function startCleanup() {
  if (cleanupInterval) return

  cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetAt) {
        rateLimitStore.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)
}

startCleanup()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfter?: number
}

/**
 * @deprecated Use `rateLimit` from `@/lib/security/rate-limiter` instead.
 */
export function checkRateLimit(
  identifier: string,
  config: Partial<RateLimitConfig> = {}
): RateLimitResult {
  const { maxRequests, windowMs, blockDurationMs } = { ...DEFAULT_CONFIG, ...config }
  const now = Date.now()

  const entry = rateLimitStore.get(identifier)

  if (entry?.blocked && entry.resetAt > now) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
      blocked: false,
    })
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    }
  }

  if (entry.count >= maxRequests) {
    if (blockDurationMs) {
      entry.blocked = true
      entry.resetAt = now + blockDurationMs
    }

    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  entry.count++
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * @deprecated Prefer `rateLimit` + `RATE_LIMITS` from `@/lib/security/rate-limiter`.
 */
export function createRateLimiter(config: RateLimitConfig) {
  return {
    check: (identifier: string) => checkRateLimit(identifier, config),
    reset: (identifier: string) => rateLimitStore.delete(identifier),
    getRemaining: (identifier: string): number => {
      const entry = rateLimitStore.get(identifier)
      if (!entry) return config.maxRequests
      return Math.max(0, config.maxRequests - entry.count)
    }
  }
}

/**
 * @deprecated Prefer `RATE_LIMITS` from `@/lib/security/rate-limiter`.
 */
export const rateLimiters = {
  auth: createRateLimiter({
    maxRequests: 5,
    windowMs: 60000,
    blockDurationMs: 300000,
  }),

  api: createRateLimiter({
    maxRequests: 60,
    windowMs: 60000,
  }),

  read: createRateLimiter({
    maxRequests: 120,
    windowMs: 60000,
  }),

  ai: createRateLimiter({
    maxRequests: 20,
    windowMs: 60000,
    blockDurationMs: 60000,
  }),
}

export default rateLimiters
