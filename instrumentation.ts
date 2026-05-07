// Next.js instrumentation hook (https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation).
// Wires Sentry server-side init at framework boot, and Edge runtime init for
// the middleware. Helpers live in lib/monitoring/sentry.ts (client) and
// lib/monitoring/sentry-server.ts (server). No-ops when SENTRY_DSN unset.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initSentryServer } = await import("./lib/monitoring/sentry")
    initSentryServer()
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    const { initSentryServer } = await import("./lib/monitoring/sentry")
    initSentryServer()
  }
}

// Forward server-side errors to Sentry through the framework's onRequestError.
export async function onRequestError(
  err: unknown,
  request: {
    path: string
    method: string
    headers: Record<string, string | string[] | undefined>
  },
  context: {
    routerKind: "Pages Router" | "App Router"
    routePath: string
    routeType: "render" | "route" | "action" | "middleware"
    renderSource?: "react-server-components" | "react-server-components-payload" | "server-rendering"
    revalidateReason?: "on-demand" | "stale" | undefined
    renderType?: "dynamic" | "dynamic-resume"
  }
) {
  try {
    const Sentry = await import("@sentry/nextjs")
    Sentry.captureRequestError(err, request, context)
  } catch {
    // Sentry not configured — fall back to console (server only).
    console.error("[instrumentation] request error:", err)
  }
}
