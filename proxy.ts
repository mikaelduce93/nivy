import { updateSession } from "@/lib/supabase/middleware"
import { NextResponse, type NextRequest } from "next/server"
import { rateLimitDistributed } from "@/lib/security/rate-limiter-redis"
import { RATE_LIMITS } from "@/lib/security/rate-limiter"
import { validateCSRFToken } from "@/lib/security/csrf"
import { setEnvironmentTag } from "@/lib/monitoring/sentry-server"

// Next 16 renamed the `middleware` file convention to `proxy` (named `proxy`
// export). Same network-boundary layer: CSP/security headers, distributed
// rate-limit, CSRF, /admin + protected-route guards, role/onboarding gate.
// https://nextjs.org/docs/messages/middleware-to-proxy
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  // Set Sentry environment tag
  setEnvironmentTag(process.env.NODE_ENV || 'development')

  // Generate nonce for inline scripts (CSP security)
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  // Store nonce in response headers for use in layout
  response.headers.set('x-nonce', nonce)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseOrigin = (() => {
    if (!supabaseUrl) return null
    try {
      return new URL(supabaseUrl).origin
    } catch {
      return null
    }
  })()
  const supabaseWsOrigin = supabaseOrigin ? supabaseOrigin.replace(/^http/, "ws") : null

  // Build CSP header with nonce
  // Note: 'unsafe-eval' may be needed for Next.js dev mode, but removed in production
  const isDev = process.env.NODE_ENV === 'development'

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`, // Allow scripts with this nonce
    'https://js.stripe.com',
    'https://www.google.com',
    'https://www.gstatic.com',
    // Only allow unsafe-eval in development (Next.js hot reload)
    ...(isDev ? ["'unsafe-eval'"] : []),
  ].join(' ')

  const styleSrc = [
    "'self'",
    `'nonce-${nonce}'`, // Allow styles with this nonce
    // Tailwind may need unsafe-inline for runtime styles, but we try without first
    ...(process.env.NODE_ENV === 'development' ? ["'unsafe-inline'"] : []),
  ].join(' ')

  const connectSrc = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://api.stripe.com",
  ]

  if (supabaseOrigin && !connectSrc.includes(supabaseOrigin)) {
    connectSrc.push(supabaseOrigin)
  }
  if (supabaseWsOrigin && !connectSrc.includes(supabaseWsOrigin)) {
    connectSrc.push(supabaseWsOrigin)
  }

  const cspHeader = [
    "default-src 'self'",
    // Scripts: self + nonce + Stripe (no unsafe-inline, no unsafe-eval in production)
    `script-src ${scriptSrc}`,
    // Styles: self + nonce (no unsafe-inline in production)
    `style-src ${styleSrc}`,
    // Images: self + data URLs + external services
    "img-src 'self' data: https: blob:",
    // Fonts: self + data URLs
    "font-src 'self' data:",
    // Connections: self + Supabase + Stripe + analytics
    `connect-src ${connectSrc.join(" ")}`,
    // Frames: Stripe, Google reCAPTCHA
    "frame-src 'self' https://js.stripe.com https://www.google.com",
    // Prevent embedding
    "frame-ancestors 'none'",
    // Base URI restriction
    "base-uri 'self'",
    // Form submission targets
    "form-action 'self'",
    // Object restrictions
    "object-src 'none'",
    // Worker scripts
    "worker-src 'self' blob:",
    // Manifest for PWA
    "manifest-src 'self'",
    // Upgrade insecure requests in production
    process.env.NODE_ENV === 'production' ? "upgrade-insecure-requests" : "",
  ].filter(Boolean).join('; ')

  response.headers.set('Content-Security-Policy', cspHeader)
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=()")

  const path = request.nextUrl.pathname
  let rateLimitConfig = RATE_LIMITS.api

  if (isDev) {
    rateLimitConfig = { max: 1000, window: 60000 } // Relaxed for dev
  } else if (path.startsWith('/api/auth')) rateLimitConfig = RATE_LIMITS.auth
  else if (path.startsWith('/api/bookings')) rateLimitConfig = RATE_LIMITS.booking
  else if (path.startsWith('/api/payments')) rateLimitConfig = RATE_LIMITS.payment
  else if (path.startsWith('/api/upload')) rateLimitConfig = RATE_LIMITS.upload

  // Use distributed rate limiting (Redis) if available, falls back to in-memory
  const { allowed, remaining, resetAt } = await rateLimitDistributed(request, rateLimitConfig)

  response.headers.set('X-RateLimit-Limit', rateLimitConfig.max.toString())
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', resetAt.toString())

  if (!allowed) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: response.headers,
    })
  }

  // PSP webhook endpoints authenticate via provider signature (Stripe-Signature
  // header, CMI HMAC), not via our CSRF cookie — they cannot send one. Skip the
  // generic CSRF check for these paths so reconciliation isn't 403'd.
  // Per Wave-A audit: middleware was previously blocking all PSP webhooks.
  const csrfExemptPrefixes = [
    '/api/csrf',
    '/api/webhooks/stripe',
    '/api/webhooks/cashplus',  // Wave Ops-D — HMAC signature in header
    '/api/webhooks/wafacash',  // Wave Ops-D — HMAC signature in header
    '/api/webhooks/m2t',       // Wave Ops-D — HMAC signature in header
    '/api/payments/cmi/webhook',
    '/api/cron/', // Cron routes authenticate via CRON_SECRET bearer token
  ]
  const isCsrfExempt = csrfExemptPrefixes.some((p) => path.startsWith(p))

  if (path.startsWith('/api/') && !isCsrfExempt) {
    const isValidCSRF = await validateCSRFToken(request)
    if (!isValidCSRF && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return new NextResponse('Invalid CSRF Token', {
        status: 403,
        headers: response.headers,
      })
    }
  }

  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Fail-closed in production: never silently disable auth on a live deploy.
    if (process.env.NODE_ENV === 'production') {
      console.error("[middleware] Supabase configuration missing in production - blocking request")
      return new NextResponse('Service Unavailable: authentication not configured', {
        status: 503,
        headers: response.headers,
      })
    }
    console.warn("[middleware] Supabase not configured - authentication disabled (non-production only)")
    return response
  }

  let user: Awaited<ReturnType<typeof updateSession>>["user"] = null
  let supabase: Awaited<ReturnType<typeof updateSession>>["supabase"] = null

  try {
    const { response: sessionResponse, user: sessionUser, supabase: sessionSupabase } = await updateSession(request)
    response = sessionResponse
    user = sessionUser
    supabase = sessionSupabase

    // Copier les headers de sécurité (including nonce)
    response.headers.set('Content-Security-Policy', cspHeader)
    response.headers.set('x-nonce', nonce) // Ensure nonce is available in response
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("X-XSS-Protection", "1; mode=block")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=()")
  } catch (error) {
    console.error("[v0] Error updating session:", error)
    return response
  }

  // Admin routes protection
  if (request.nextUrl.pathname.startsWith("/admin")) {
    try {
      if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        url.searchParams.set("redirect", request.nextUrl.pathname)
        return NextResponse.redirect(url)
      }

      // Skip the admin role check when credentials are missing (supabase is
      // null) — matches the prior fail-soft behavior.
      if (supabase) {
        const { data: adminRole } = await supabase.from("admin_roles").select("role").eq("profile_id", user.id).single()

        if (!adminRole) {
          const url = request.nextUrl.clone()
          url.pathname = "/"
          return NextResponse.redirect(url)
        }

        // #320 — HTTP-level ring-fence for the two super-admin-only surfaces.
        // The page-level guard (notFound()/redirect) fires only AFTER Next.js
        // has already streamed loading.tsx with HTTP 200, so a non-super-admin
        // probe receives a misleading 200 shell. Enforce super_admin at the
        // request boundary for these EXACT paths so the response is a 404
        // (fail-closed, fewer probe leaks) before any content is served.
        const SUPER_ADMIN_ONLY_PATHS = ["/admin/scripts-sql", "/admin/permissions"]
        const isSuperAdminOnlyPath = SUPER_ADMIN_ONLY_PATHS.some(
          (p) => request.nextUrl.pathname === p || request.nextUrl.pathname.startsWith(`${p}/`)
        )
        if (isSuperAdminOnlyPath && adminRole.role !== "super_admin") {
          return new NextResponse(null, {
            status: 404,
            headers: response.headers,
          })
        }
      }
    } catch (error) {
      console.error("[v0] Error checking admin access:", error)
    }
  }

  // Protected routes - Routes nécessitant authentification
  const protectedPaths = [
    "/dashboard",
    "/profile",
    "/mes-",
    "/parent",
    "/teen",
    "/ambassador",
    "/partner",
    "/mentor",
    "/driver",
  ]

  const isProtectedRoute = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedRoute) {
    try {
      if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        url.searchParams.set("redirect", request.nextUrl.pathname)
        return NextResponse.redirect(url)
      }

      // Skip the profile/onboarding gate when credentials are missing
      // (supabase is null) — matches the prior fail-soft behavior.
      if (supabase) {
      // ────────────────────────────────────────────────────────────────────
      // Wave 1A.5 — AUTH-006: is_onboarded gate
      // Canon: docs/canon/auth-onboarding.locked.md §4 LOCKED.
      //
      // After auth resolution, we read profiles.role + profiles.is_onboarded
      // (single round-trip with the existing role-route check) and:
      //   - missing profile  →  /auth/error?reason=missing_profile
      //   - admin           →  bypass is_onboarded gate (canon §4 policy)
      //   - is_onboarded=false on a non-onboarding/non-API path →  redirect
      //     to the role-canonical wizard root.
      //   - is_onboarded=true falls through to the existing role-route check.
      //
      // Loop prevention: if the requested path is already inside the role's
      // onboarding wizard (or any /onboarding/, /auth/, /api/, /_next/ path),
      // the gate does not redirect.
      // ────────────────────────────────────────────────────────────────────
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_onboarded")
        .eq("id", user.id)
        .maybeSingle()

      const pathname = request.nextUrl.pathname

      // Per-role canonical onboarding wizard root.
      // `null` means the role bypasses the onboarding gate entirely (admin).
      // Source: canon §3 LOCKED redirect table + §4 LOCKED wizards.
      const ONBOARDING_TARGETS: Record<string, string | null> = {
        // #51 — parent onboarding starts at the e-signature step (canon §4.1).
        // The /onboarding/ prefix below exempts the whole flow from re-redirect.
        parent: "/onboarding/parent/e-signature",
        teen: "/onboarding/interests",
        partner: "/partner/onboarding/awaiting-approval",
        mentor: "/mentor/onboarding/kyc",
        driver: "/driver/onboarding/kyc",
        ambassador: "/ambassador/onboarding/awaiting-approval",
        admin: null,
      }

      // Path prefixes that MUST NOT trigger an onboarding redirect (loop
      // prevention + APIs/static never gated).
      const ONBOARDING_PATH_PREFIXES = [
        "/onboarding/",
        "/partner/onboarding/",
        "/mentor/onboarding/",
        "/driver/onboarding/",
        "/ambassador/onboarding/",
        "/auth/",
        "/api/",
        "/_next/",
      ]

      const isOnboardingOrSystemPath = ONBOARDING_PATH_PREFIXES.some((p) =>
        pathname.startsWith(p)
      )

      if (!profile) {
        // Authed user with no profile row → canon §6 #13: never fall back to
        // /onboarding (it's the pre-account showcase). Surface as an error so
        // the bug is observable.
        const url = request.nextUrl.clone()
        url.pathname = "/auth/error"
        url.searchParams.set("reason", "missing_profile")
        return NextResponse.redirect(url)
      }

      const userRole = profile?.role || "unknown"
      const isOnboarded = profile?.is_onboarded === true

      if (
        !isOnboarded &&
        userRole !== "admin" &&
        !isOnboardingOrSystemPath
      ) {
        const target = ONBOARDING_TARGETS[userRole as keyof typeof ONBOARDING_TARGETS]
        if (target == null) {
          // Unknown / unsupported role: route to /auth/error rather than
          // bouncing to /onboarding (canon §6 FORBIDDEN #13).
          const url = request.nextUrl.clone()
          url.pathname = "/auth/error"
          url.searchParams.set("reason", "unknown_role")
          return NextResponse.redirect(url)
        }

        // Loop prevention: only redirect if we're not already at the target.
        if (pathname !== target && !pathname.startsWith(`${target}/`)) {
          const url = request.nextUrl.clone()
          url.pathname = target
          return NextResponse.redirect(url)
        }
      }

      // Vérifier si l'utilisateur accède à la bonne route pour son rôle
      const roleRouteMap: Record<string, string> = {
        teen: "/teen",
        parent: "/parent",
        ambassador: "/ambassador",
        partner: "/partner",
        mentor: "/mentor",
        driver: "/driver",
        admin: "/admin",
      }

      // Si l'utilisateur essaie d'accéder à un dashboard qui n'est pas le sien
      const dashboardPaths = ["/teen", "/parent", "/ambassador", "/partner", "/mentor", "/driver"]
      const isAccessingWrongDashboard = dashboardPaths.some((path) => {
        if (pathname.startsWith(path)) {
          const expectedRole = path.slice(1) // Enlève le "/"
          return userRole !== expectedRole
        }
        return false
      })

      if (isAccessingWrongDashboard) {
        // Rediriger vers le bon dashboard
        const correctPath = roleRouteMap[userRole] || "/auth/redirect"
        const url = request.nextUrl.clone()
        url.pathname = correctPath
        return NextResponse.redirect(url)
      }

      // Rediriger /dashboard vers le bon dashboard selon le rôle
      if (pathname === "/dashboard") {
        const correctPath = roleRouteMap[userRole] || "/auth/redirect"
        const url = request.nextUrl.clone()
        url.pathname = correctPath
        return NextResponse.redirect(url)
      }
      }

    } catch (error) {
      console.error("[v0] Error checking protected route access:", error)
    }
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
