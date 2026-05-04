/**
 * Supabase wrapper with timeout support
 * 
 * SECURITY: Prevents Supabase requests from blocking indefinitely
 * All Supabase operations should use this wrapper to ensure proper timeout handling
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import * as Sentry from "@sentry/nextjs"

export class SupabaseTimeoutError extends Error {
  constructor(public operation: string, public timeout: number) {
    super(`Supabase operation ${operation} timed out after ${timeout}ms`)
    this.name = 'SupabaseTimeoutError'
  }
}

/**
 * Wraps a Supabase promise with timeout
 * 
 * @param promise - Supabase operation promise
 * @param operation - Operation name for logging (e.g., "getUser", "from('events').select()")
 * @param timeoutMs - Timeout in milliseconds (default: 30000 = 30s)
 * @returns Promise<T> - Result of the operation
 * @throws SupabaseTimeoutError if operation times out
 * 
 * @example
 * ```ts
 * const { data, error } = await withSupabaseTimeout(
 *   supabase.auth.getUser(),
 *   'getUser',
 *   10000
 * )
 * ```
 */
export async function withSupabaseTimeout<T>(
  promise: PromiseLike<T>,
  operation: string,
  timeoutMs: number = 30000
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      const error = new SupabaseTimeoutError(operation, timeoutMs)
      
      // Log to Sentry for monitoring
      Sentry.captureException(error, {
        tags: {
          operation,
          timeout: timeoutMs,
          type: 'supabase_timeout',
        },
        level: 'warning',
      })
      
      reject(error)
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeout])
  } catch (error) {
    // If it's our timeout error, re-throw it
    if (error instanceof SupabaseTimeoutError) {
      throw error
    }
    
    // For other errors, log to Sentry and re-throw
    if (error instanceof Error) {
      Sentry.captureException(error, {
        tags: {
          operation,
          type: 'supabase_error',
        },
        level: 'error',
      })
    }
    
    throw error
  }
}

/**
 * Wraps a Supabase query builder chain with timeout
 * 
 * This is a helper for common Supabase patterns like:
 * supabase.from('table').select('*').eq('id', 1)
 * 
 * @param queryPromise - Promise from Supabase query
 * @param table - Table name for logging
 * @param timeoutMs - Timeout in milliseconds (default: 30000 = 30s)
 * @returns Promise with data and error
 * 
 * @example
 * ```ts
 * const { data, error } = await withSupabaseQueryTimeout(
 *   supabase.from('events').select('*'),
 *   'events',
 *   10000
 * )
 * ```
 */
export async function withSupabaseQueryTimeout<T>(
  queryPromise: Promise<{ data: T | null; error: any }>,
  table: string,
  timeoutMs: number = 30000
): Promise<{ data: T | null; error: any }> {
  try {
    return await withSupabaseTimeout(queryPromise, `from('${table}').select()`, timeoutMs)
  } catch (error) {
    if (error instanceof SupabaseTimeoutError) {
      return {
        data: null,
        error: {
          message: error.message,
          name: error.name,
        },
      }
    }
    throw error
  }
}

/**
 * Creates a wrapped Supabase client with automatic timeout on all operations
 * 
 * Note: This is a convenience wrapper. For better control, use
 * withSupabaseTimeout on individual operations.
 * 
 * @param client - Supabase client instance
 * @param defaultTimeout - Default timeout in milliseconds (default: 30000 = 30s)
 * @returns Wrapped client with timeout support
 */
export function createSupabaseClientWithTimeout(
  client: SupabaseClient,
  defaultTimeout: number = 30000
): SupabaseClient {
  // Create a proxy that wraps all async methods with timeout
  return new Proxy(client, {
    get(target, prop) {
      const value = (target as any)[prop]
      
      // If it's a function, wrap it
      if (typeof value === 'function') {
        return function (...args: any[]) {
          const result = value.apply(target, args)
          
          // If result is a promise, wrap it with timeout
          if (result && typeof result.then === 'function') {
            return withSupabaseTimeout(
              result,
              `${String(prop)}(${args.map(() => '...').join(', ')})`,
              defaultTimeout
            )
          }
          
          return result
        }
      }
      
      // If it's an object (like .from()), return a proxy for it too
      if (value && typeof value === 'object') {
        return createSupabaseClientWithTimeout(value as any, defaultTimeout)
      }
      
      return value
    },
  }) as SupabaseClient
}







