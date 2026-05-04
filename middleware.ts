import { updateSession } from "@/lib/supabase/middleware"
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { rateLimitDistributed } from "@/lib/security/rate-limiter-redis"
import { RATE_LIMITS } from "@/lib/security/rate-limiter"
import { validateCSRFToken } from "@/lib/security/csrf"
import { setEnvironmentTag } from "@/lib/monitoring/sentry-server"

export async function middleware(request: NextRequest) {
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

  if (path.startsWith('/api/') && !path.startsWith('/api/csrf')) {
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
    console.warn("[v0] Supabase not configured - authentication disabled")
    return response
  }

  try {
    response = await updateSession(request)
    
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
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          },
        },
      })

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        url.searchParams.set("redirect", request.nextUrl.pathname)
        return NextResponse.redirect(url)
      }

      const { data: adminRole } = await supabase.from("admin_roles").select("role").eq("profile_id", user.id).single()

      if (!adminRole) {
        const url = request.nextUrl.clone()
        url.pathname = "/"
        return NextResponse.redirect(url)
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
  ]

  const isProtectedRoute = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedRoute) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          },
        },
      })

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        url.searchParams.set("redirect", request.nextUrl.pathname)
        return NextResponse.redirect(url)
      }

      // Vérification du rôle pour les routes spécifiques
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      const userRole = profile?.role || "unknown"
      const pathname = request.nextUrl.pathname

      // Vérifier si l'utilisateur accède à la bonne route pour son rôle
      const roleRouteMap: Record<string, string> = {
        teen: "/teen",
        parent: "/parent",
        ambassador: "/ambassador",
        partner: "/partner",
        admin: "/admin",
      }

      // Si l'utilisateur essaie d'accéder à un dashboard qui n'est pas le sien
      const dashboardPaths = ["/teen", "/parent", "/ambassador", "/partner"]
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

    } catch (error) {
      console.error("[v0] Error checking protected route access:", error)
    }
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
