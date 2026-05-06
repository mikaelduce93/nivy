/**
 * Browser-vendor and third-party globals attached to window/navigator at
 * runtime. Declared here so call sites can read them without `as any`.
 */

declare global {
  interface Window {
    /** Webkit-prefixed AudioContext for older Safari/iOS. */
    webkitAudioContext?: typeof AudioContext
    /** IE/Edge legacy detection helper. */
    MSStream?: unknown
    /** Vercel Analytics global queue. */
    va?: (event: string, payload?: Record<string, unknown>) => void
    /** Google Analytics global. */
    gtag?: (event: string, action: string, payload?: Record<string, unknown>) => void
    /** PostHog client. */
    posthog?: {
      capture: (event: string, payload?: Record<string, unknown>) => void
      [key: string]: unknown
    }
    /** Module-level singleton cache for the Supabase browser client. */
    __supabaseClient?: unknown
  }

  interface Navigator {
    /** iOS standalone mode flag. */
    standalone?: boolean
  }

  interface ServiceWorkerRegistration {
    /** Periodic Background Sync API (Chromium only). */
    periodicSync?: {
      register: (tag: string, options?: { minInterval?: number }) => Promise<void>
      unregister: (tag: string) => Promise<void>
      getTags: () => Promise<string[]>
    }
  }
}

export {}
