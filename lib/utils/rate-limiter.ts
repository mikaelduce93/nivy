/**
 * RATE LIMITER UTILITY
 * ====================
 * 
 * Simple in-memory rate limiter for API routes.
 * For production, consider using Redis or a dedicated rate limiting service.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
  blocked?: boolean
}

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  blockDurationMs?: number // Optional: how long to block after exceeding limit
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 60,
  windowMs: 60000, // 1 minute
  blockDurationMs: 60000, // Block for 1 minute after exceeding
}

// Global rate limit store
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes
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
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
  identifier: string,
  config: Partial<RateLimitConfig> = {}
): RateLimitResult {
  const { maxRequests, windowMs, blockDurationMs } = { ...DEFAULT_CONFIG, ...config }
  const now = Date.now()
  
  const entry = rateLimitStore.get(identifier)
  
  // If blocked and still in block period
  if (entry?.blocked && entry.resetAt > now) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    }
  }
  
  // If no entry or window expired, create new
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
  
  // Within window, check count
  if (entry.count >= maxRequests) {
    // Block the user
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
  
  // Increment and allow
  entry.count++
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Create a rate limiter with specific config
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

// Pre-configured rate limiters for different use cases
export const rateLimiters = {
  // Strict: For authentication endpoints
  auth: createRateLimiter({
    maxRequests: 5,
    windowMs: 60000,
    blockDurationMs: 300000, // 5 min block
  }),
  
  // Standard: For most API endpoints
  api: createRateLimiter({
    maxRequests: 60,
    windowMs: 60000,
  }),
  
  // Lenient: For read-heavy endpoints
  read: createRateLimiter({
    maxRequests: 120,
    windowMs: 60000,
  }),
  
  // AI: For AI/LLM endpoints (expensive)
  ai: createRateLimiter({
    maxRequests: 20,
    windowMs: 60000,
    blockDurationMs: 60000,
  }),
}

export default rateLimiters
