"use client"

/**
 * CSRFAwareForm + useCSRFAwareSubmit — TICKET-045 [W3-A14]
 * ---------------------------------------------------------------------------
 * UX fallback for CSRF-token failures (HTTP 403 + body indicating CSRF).
 *
 * Why this exists
 * - The middleware in `lib/security/api-middleware.ts` validates CSRF on
 *   POST/PUT/PATCH/DELETE; on failure it returns 403 with `{ error: "Token
 *   de sécurité invalide..." }`. Before this component, the user only saw
 *   a generic error and had to refresh manually.
 * - This wrapper:
 *     1. Fetches `/api/csrf` on mount to seed the token cookie + state.
 *     2. Injects a hidden `<input name="_csrf">` so server-rendered forms
 *        (or progressive-enhancement code) can read it without re-fetching.
 *     3. Exposes `submitWithCSRFRecovery(fn)` — a helper that runs an async
 *        request, detects 403 CSRF failures, refetches the token, retries
 *        ONCE, and shows a sonner toast on the recovery path.
 *
 * Usage (POC: parent/topup/manual)
 * ```tsx
 * <CSRFAwareForm onSubmit={handleSubmit}>
 *   { ...inputs... }
 * </CSRFAwareForm>
 * ```
 * Inside `handleSubmit`, callers can use the exported `useCSRFAwareSubmit`
 * hook to wrap their `fetch` call so the auto-retry kicks in.
 */

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormHTMLAttributes,
  type ReactNode,
  type Ref,
} from "react"
import { toast } from "sonner"
import { fetchWithCSRF } from "@/lib/security/fetch-with-csrf"

/* ==========================================================================
   Internal: token fetcher
   ========================================================================== */

async function fetchCSRFToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/csrf", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = (await res.json()) as { token?: string }
    return data.token ?? null
  } catch {
    return null
  }
}

/**
 * Heuristic: did this 403 response come from the CSRF check?
 * The middleware uses a fixed French copy; we also accept a generic
 * "csrf" substring (case-insensitive) for forward compat.
 */
async function isCSRFFailure(response: Response): Promise<boolean> {
  if (response.status !== 403) return false
  // Clone so callers can still .json() the original.
  try {
    const cloned = response.clone()
    const data = (await cloned.json()) as { error?: string }
    const msg = (data?.error ?? "").toString().toLowerCase()
    return (
      msg.includes("csrf") ||
      msg.includes("token de sécurité") ||
      msg.includes("token de securite")
    )
  } catch {
    return false
  }
}

/* ==========================================================================
   Context — exposes the current token + a refresh fn to nested submitters
   ========================================================================== */

interface CSRFAwareCtx {
  token: string
  refresh: () => Promise<string | null>
}

const CSRFAwareContext = createContext<CSRFAwareCtx | null>(null)

/**
 * Wraps a fetch call with one-time CSRF auto-recovery.
 * - On 403/CSRF, refetches token, shows toast "Session expirée. Réessaie.",
 *   then retries once. If retry still fails, the second response is returned
 *   so callers can show their normal error path.
 */
export function useCSRFAwareSubmit() {
  const ctx = useContext(CSRFAwareContext)

  return useCallback(
    async (
      url: string,
      init: RequestInit & { method: string }
    ): Promise<Response> => {
      const first = await fetchWithCSRF(url, init)
      if (!(await isCSRFFailure(first))) return first

      // Try to refresh and retry once.
      if (ctx) {
        await ctx.refresh()
      } else {
        await fetchCSRFToken()
      }
      toast.error("Session expirée. Réessaie.")
      const second = await fetchWithCSRF(url, init)
      return second
    },
    [ctx]
  )
}

/* ==========================================================================
   <CSRFAwareForm>
   ========================================================================== */

export interface CSRFAwareFormProps
  extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode
}

export const CSRFAwareForm = forwardRef(function CSRFAwareForm(
  { children, ...formProps }: CSRFAwareFormProps,
  ref: Ref<HTMLFormElement>
) {
  const [token, setToken] = useState<string>("")
  const mountedRef = useRef(true)

  const refresh = useCallback(async () => {
    const t = await fetchCSRFToken()
    if (mountedRef.current && t) setToken(t)
    return t
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void refresh()
    return () => {
      mountedRef.current = false
    }
  }, [refresh])

  return (
    <CSRFAwareContext.Provider value={{ token, refresh }}>
      <form ref={ref} {...formProps}>
        {/* Hidden CSRF field — useful for server-rendered submissions
            and for assistive tools that inspect form state. */}
        <input type="hidden" name="_csrf" value={token} readOnly />
        {children}
      </form>
    </CSRFAwareContext.Provider>
  )
})

export default CSRFAwareForm
