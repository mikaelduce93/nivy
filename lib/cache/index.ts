/**
 * Cache System
 * ============
 * In-memory cache with TTL and optional Redis support
 *
 * Usage:
 * import { cache, cached } from '@/lib/cache'
 *
 * // Simple get/set
 * cache.set('key', value, 300) // 5 minutes TTL
 * const value = cache.get('key')
 *
 * // Cached function wrapper
 * const getData = cached('data-key', async () => fetchData(), 600)
 */

// Cache entry with metadata
interface CacheEntry<T> {
  value: T
  expiresAt: number
  createdAt: number
  hits: number
}

// Cache options
interface CacheOptions {
  ttl?: number // Time to live in seconds
  tags?: string[] // Tags for group invalidation
}

// Default TTL values (in seconds)
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 600, // 10 minutes
  HOUR: 3600, // 1 hour
  DAY: 86400, // 24 hours
} as const

// Predefined cache keys
export const CACHE_KEYS = {
  EVENTS_LIST: "events:list",
  EVENTS_UPCOMING: "events:upcoming",
  EVENT_DETAIL: (id: string) => `events:${id}`,
  LEADERBOARD: "gamification:leaderboard",
  LEADERBOARD_WEEKLY: "gamification:leaderboard:weekly",
  USER_STATS: (userId: string) => `user:${userId}:stats`,
  TEEN_XP: (teenId: string) => `teen:${teenId}:xp`,
  CIRCLES_LIST: "circles:list",
} as const

/**
 * In-memory cache implementation
 */
class MemoryCache {
  private store: Map<string, CacheEntry<any>> = new Map()
  private tagIndex: Map<string, Set<string>> = new Map()
  private maxSize: number = 1000
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000)
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key)

    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key)
      return null
    }

    // Increment hit counter
    entry.hits++

    return entry.value as T
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, options: CacheOptions | number = {}): void {
    // Handle simple TTL number
    const opts = typeof options === "number" ? { ttl: options } : options
    const ttl = opts.ttl || CACHE_TTL.MEDIUM

    // Check cache size limit
    if (this.store.size >= this.maxSize) {
      this.evictLRU()
    }

    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttl * 1000,
      createdAt: Date.now(),
      hits: 0,
    }

    this.store.set(key, entry)

    // Index by tags
    if (opts.tags) {
      opts.tags.forEach((tag) => {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set())
        }
        this.tagIndex.get(tag)!.add(key)
      })
    }
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    return this.store.delete(key)
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.store.get(key)
    if (!entry) return false
    if (Date.now() > entry.expiresAt) {
      this.delete(key)
      return false
    }
    return true
  }

  /**
   * Invalidate all entries with a specific tag
   */
  invalidateTag(tag: string): number {
    const keys = this.tagIndex.get(tag)
    if (!keys) return 0

    let count = 0
    keys.forEach((key) => {
      if (this.delete(key)) count++
    })

    this.tagIndex.delete(tag)
    return count
  }

  /**
   * Invalidate entries matching a pattern
   */
  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"))
    let count = 0

    this.store.forEach((_, key) => {
      if (regex.test(key)) {
        this.delete(key)
        count++
      }
    })

    return count
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.store.clear()
    this.tagIndex.clear()
  }

  /**
   * Get cache statistics
   */
  stats(): {
    size: number
    maxSize: number
    hitRate: number
    oldestEntry: number | null
  } {
    let totalHits = 0
    let totalEntries = 0
    let oldestEntry: number | null = null

    this.store.forEach((entry) => {
      totalHits += entry.hits
      totalEntries++
      if (oldestEntry === null || entry.createdAt < oldestEntry) {
        oldestEntry = entry.createdAt
      }
    })

    return {
      size: this.store.size,
      maxSize: this.maxSize,
      hitRate: totalEntries > 0 ? totalHits / totalEntries : 0,
      oldestEntry,
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    this.store.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        this.delete(key)
      }
    })
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(): void {
    // Find entries with lowest hit count
    let minHits = Infinity
    let keyToEvict: string | null = null

    this.store.forEach((entry, key) => {
      if (entry.hits < minHits) {
        minHits = entry.hits
        keyToEvict = key
      }
    })

    if (keyToEvict) {
      this.delete(keyToEvict)
    }
  }

  /**
   * Destroy cache instance
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.clear()
  }
}

// Singleton cache instance
export const cache = new MemoryCache()

/**
 * Cached function wrapper
 * Caches the result of an async function
 */
export function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = CACHE_TTL.MEDIUM
): () => Promise<T> {
  return async () => {
    // Check cache first
    const cached = cache.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Execute function and cache result
    const result = await fn()
    cache.set(key, result, ttl)

    return result
  }
}

/**
 * Cached function with key builder
 * Useful for functions with parameters
 */
export function cachedWithKey<T, Args extends any[]>(
  keyBuilder: (...args: Args) => string,
  fn: (...args: Args) => Promise<T>,
  ttl: number = CACHE_TTL.MEDIUM
): (...args: Args) => Promise<T> {
  return async (...args: Args) => {
    const key = keyBuilder(...args)

    // Check cache first
    const cached = cache.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Execute function and cache result
    const result = await fn(...args)
    cache.set(key, result, ttl)

    return result
  }
}

/**
 * Decorator for caching class methods
 */
export function Cached(ttl: number = CACHE_TTL.MEDIUM) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const key = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`

      const cached = cache.get(key)
      if (cached !== null) {
        return cached
      }

      const result = await originalMethod.apply(this, args)
      cache.set(key, result, ttl)

      return result
    }

    return descriptor
  }
}

/**
 * Helper to invalidate related caches on mutation
 */
export function invalidateRelated(patterns: string[]): void {
  patterns.forEach((pattern) => {
    if (pattern.includes("*")) {
      cache.invalidatePattern(pattern)
    } else {
      cache.delete(pattern)
    }
  })
}

export default cache
