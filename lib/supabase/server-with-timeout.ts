/**
 * Server-side Supabase client with automatic timeout
 * 
 * Use this instead of createClient from lib/supabase/server for routes that need timeout protection
 */

import { createClient as createServerClient } from './server'
import { withSupabaseTimeout } from './wrapper'

/**
 * Creates a Supabase client with automatic timeout on all operations
 * 
 * @param timeoutMs - Timeout in milliseconds (default: 30000 = 30s)
 * @returns Supabase client with timeout protection
 * 
 * @example
 * ```ts
 * const supabase = await createClientWithTimeout(10000) // 10s timeout
 * const { data, error } = await supabase.auth.getUser()
 * ```
 */
export async function createClientWithTimeout(timeoutMs: number = 30000) {
  const client = await createServerClient()
  
  // Wrap auth methods
  const originalAuth = client.auth
  client.auth = {
    ...originalAuth,
    getUser: async () => withSupabaseTimeout(originalAuth.getUser(), 'auth.getUser', timeoutMs),
    signInWithPassword: async (credentials: any) => 
      withSupabaseTimeout(originalAuth.signInWithPassword(credentials), 'auth.signInWithPassword', timeoutMs),
    signOut: async () => 
      withSupabaseTimeout(originalAuth.signOut(), 'auth.signOut', timeoutMs),
    signUp: async (credentials: any) => 
      withSupabaseTimeout(originalAuth.signUp(credentials), 'auth.signUp', timeoutMs),
  } as typeof originalAuth
  
  // Wrap from() method to add timeout to queries
  const originalFrom = client.from.bind(client)
  client.from = (table: string) => {
    const queryBuilder = originalFrom(table)
    
    // Wrap select, insert, update, delete methods
    const wrapQuery = (method: any, name: string) => {
      return (...args: any[]) => {
        const promise = method.apply(queryBuilder, args)
        return withSupabaseTimeout(promise, `from('${table}').${name}()`, timeoutMs)
      }
    }
    
    return {
      ...queryBuilder,
      select: wrapQuery(queryBuilder.select, 'select'),
      insert: wrapQuery(queryBuilder.insert, 'insert'),
      update: wrapQuery(queryBuilder.update, 'update'),
      delete: wrapQuery(queryBuilder.delete, 'delete'),
      upsert: wrapQuery(queryBuilder.upsert, 'upsert'),
    } as typeof queryBuilder
  }
  
  return client
}







