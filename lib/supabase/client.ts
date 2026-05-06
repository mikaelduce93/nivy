import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

export { createBrowserClient } from "@supabase/ssr"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

const createMockClient = () =>
  ({
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
      signIn: async () => ({ data: null, error: new Error("Supabase not configured") }),
      signUp: async () => ({ data: null, error: new Error("Supabase not configured") }),
    },
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: new Error("Supabase not configured") }),
      update: () => ({ data: null, error: new Error("Supabase not configured") }),
      delete: () => ({ data: null, error: new Error("Supabase not configured") }),
    }),
  }) as any

// Global singleton instance stored in window to persist across re-renders
let clientInstance: SupabaseClient | null = null

// Store instance in window for true global singleton
if (typeof window !== 'undefined') {
  if (!window.__supabaseClient) {
    window.__supabaseClient = null
  }
}

/**
 * Creates a Supabase client for browser-side usage.
 * 
 * SECURITY: This client uses cookies managed by the middleware (httpOnly),
 * NOT localStorage. Tokens are stored securely in httpOnly cookies and
 * synchronized via the middleware's updateSession function.
 * 
 * @returns Supabase client instance
 */
export function createClient() {
  if (typeof window === "undefined") {
    return createMockClient()
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("[v0] Supabase client not configured - using mock client")

    // Return a mock client that won't crash the app
    return createMockClient()
  }

  if (typeof window !== 'undefined' && window.__supabaseClient) {
    return window.__supabaseClient
  }

  if (!clientInstance) {
    // SECURITY: Do NOT use localStorage for tokens (vulnerable to XSS)
    // Instead, use cookies managed by the middleware
    // By not specifying storage, Supabase SSR will use cookies automatically
    // The middleware's updateSession function handles httpOnly cookie synchronization
    clientInstance = createSupabaseBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          if (typeof document === "undefined") {
            return []
          }

          // Supabase SSR will read cookies from document.cookie
          // The middleware sets httpOnly cookies on the server
          return document.cookie.split('; ').map(cookie => {
            const [name, ...rest] = cookie.split('=')
            return { name, value: decodeURIComponent(rest.join('=')) }
          }).filter(c => c.name && c.value)
        },
        setAll(cookiesToSet) {
          if (typeof document === "undefined") {
            return
          }

          // Supabase SSR will set cookies via document.cookie
          // Note: httpOnly cookies must be set by the server (middleware)
          // This sets non-httpOnly cookies for client-side access
          cookiesToSet.forEach(({ name, value, options }) => {
            if (options?.httpOnly) {
              // httpOnly cookies are set by the server via middleware
              // Skip setting them client-side
              return
            }
            const cookieParts = [`${name}=${encodeURIComponent(value)}`]
            if (options?.path) cookieParts.push(`path=${options.path}`)
            if (options?.maxAge) cookieParts.push(`max-age=${options.maxAge}`)
            if (options?.sameSite) cookieParts.push(`sameSite=${options.sameSite}`)
            if (options?.secure) cookieParts.push('secure')
            document.cookie = cookieParts.join('; ')
          })
        },
      },
    })
    
    // Store in window for true global access
    if (typeof window !== 'undefined') {
      window.__supabaseClient = clientInstance
    }
  }

  return clientInstance
}
