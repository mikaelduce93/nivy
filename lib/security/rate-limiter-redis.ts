/**
 * Distributed Rate Limiting with Redis (Upstash)
 * 
 * SECURITY: Prevents rate limit bypass by using a shared Redis store
 * Rate limits persist across server restarts and are shared between Vercel instances
 */

import { NextRequest } from 'next/server'

export interface RateLimitConfig {
  max: number // Nombre max de requêtes
  window: number // Fenêtre en millisecondes
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

// Lazy load Redis client (only when needed)
let redisClient: any = null

/**
 * Initialize Redis client (Upstash)
 * 
 * @returns Redis client instance
 */
async function getRedisClient() {
  if (redisClient) {
    return redisClient
  }

  // Try to import @upstash/redis
  try {
    const { Redis } = await import('@upstash/redis')
    
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!redisUrl || !redisToken) {
      console.warn('[v0] Upstash Redis not configured - falling back to in-memory rate limiting')
      return null
    }

    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
    })

    return redisClient
  } catch (error) {
    console.warn('[v0] Failed to initialize Redis client:', error)
    return null
  }
}

/**
 * Distributed rate limiting with Redis
 * 
 * @param request - Next.js request
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export async function rateLimitDistributed(
  request: NextRequest,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = await getRedisClient()

  // Fallback to in-memory if Redis is not available
  if (!redis) {
    // Import and use in-memory rate limiter as fallback
    const { rateLimit } = await import('./rate-limiter')
    return rateLimit(request, config)
  }

  // Identifier l'utilisateur (IP + user agent)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip') 
    || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const key = `rate_limit:${ip}:${userAgent.slice(0, 50)}`

  const now = Date.now()
  const windowSeconds = Math.ceil(config.window / 1000)

  try {
    // Use Redis INCR with expiration
    // This is atomic and handles the window automatically
    const count = await redis.incr(key)
    
    // Set expiration on first request (count === 1)
    if (count === 1) {
      await redis.expire(key, windowSeconds)
    }

    const remaining = Math.max(0, config.max - count)
    const resetAt = now + config.window

    return {
      allowed: count <= config.max,
      remaining,
      resetAt,
    }
  } catch (error) {
    console.error('[v0] Redis rate limiting error:', error)
    
    // Fallback to in-memory on error
    const { rateLimit } = await import('./rate-limiter')
    return rateLimit(request, config)
  }
}

/**
 * Check if Redis is available
 * 
 * @returns true if Redis is configured and available
 */
export async function isRedisAvailable(): Promise<boolean> {
  const redis = await getRedisClient()
  return redis !== null
}







