#!/usr/bin/env node
/**
 * smoke-routes.mjs — Wave 5B closed-beta route smoke test.
 *
 * Hits a fixed list of canonical routes against an already-running dev
 * server (default http://localhost:3000) and verifies each route either:
 *   - returns 200 (renders), or
 *   - returns 30x with the expected Location prefix (canonical redirect), or
 *   - returns 401/302→/auth/login (auth gate — also acceptable).
 *
 * What this is NOT:
 *   - Not a Playwright e2e — no real signup, no real DB writes.
 *   - Not a load test.
 *   - Not a deploy gate.
 *
 * What it catches:
 *   - 404s on canonical routes (regression of routing.locked.md).
 *   - 500s from a typo in middleware / a missing import.
 *   - Redirects pointing at the wrong target (e.g. an old /events).
 *
 * Usage:
 *   1. Start the dev server: `npm run dev`
 *   2. In another shell: `npm run smoke`
 *
 * Override base URL: SMOKE_BASE=http://localhost:3001 npm run smoke
 */

const BASE = process.env.SMOKE_BASE || "http://localhost:3000"

const PASS = "[32mPASS[0m"
const FAIL = "[31mFAIL[0m"
const SKIP = "[33mSKIP[0m"

/** @type {Array<{path: string, kind: "render" | "redirect" | "auth-gated", expectLocationPrefix?: string}>} */
const ROUTES = [
  // Public
  { path: "/",                      kind: "render" },
  { path: "/agenda",                kind: "render" },
  { path: "/clubs",                 kind: "render" },
  { path: "/anniversaires",         kind: "render" },
  { path: "/marketplace",           kind: "render" },
  { path: "/legal/cgv",             kind: "render" },
  { path: "/legal/cgu",             kind: "render" },
  { path: "/aide",                  kind: "render" },
  { path: "/auth/login",            kind: "render" },
  { path: "/auth/sign-up",          kind: "render" },

  // Wave 5A redirect stubs — must 308 to canonical target.
  { path: "/autorisations",         kind: "redirect", expectLocationPrefix: "/parent/approvals" },
  { path: "/autorisations/ajouter", kind: "redirect", expectLocationPrefix: "/parent/approvals" },
  { path: "/notifications",         kind: "redirect", expectLocationPrefix: "/auth/redirect" },
  { path: "/notifications/preferences", kind: "redirect", expectLocationPrefix: "/auth/redirect" },
  { path: "/gamification",          kind: "redirect", expectLocationPrefix: "/teen" },
  { path: "/gamification/missions", kind: "redirect" },
  { path: "/gamification/defis",    kind: "redirect" },
  { path: "/teen/shop",             kind: "redirect" },

  // Auth-gated role homes — should 30x to /auth/login or render their
  // own gate (200 with auth UI).
  { path: "/teen",                  kind: "auth-gated" },
  { path: "/parent",                kind: "auth-gated" },
  { path: "/partner",               kind: "auth-gated" },
  { path: "/admin",                 kind: "auth-gated" },
  { path: "/ambassador",            kind: "auth-gated" },
  { path: "/mentor/dashboard",      kind: "auth-gated" },

  // Wave 5A new dock targets — must exist (auth-gated).
  { path: "/partner/settings",      kind: "auth-gated" },
  { path: "/admin/evenements",      kind: "auth-gated" },
  { path: "/admin/moderation",      kind: "auth-gated" },
  { path: "/admin/logs",            kind: "auth-gated" },
  { path: "/ambassador/boutique",   kind: "auth-gated" },
  { path: "/ambassador/commissions", kind: "auth-gated" },

  // Specific role dashboards / pages from Waves 3-4.
  { path: "/parent/approvals",      kind: "auth-gated" },
  { path: "/parent/teens",          kind: "auth-gated" },
  { path: "/parent/teens/add",      kind: "auth-gated" },
  { path: "/parent/notifications",  kind: "auth-gated" },
  { path: "/teen/wallet",           kind: "auth-gated" },
  { path: "/teen/quests",           kind: "auth-gated" },
  { path: "/teen/social",           kind: "auth-gated" },
  { path: "/teen/profile",          kind: "auth-gated" },
  { path: "/teen/activity",         kind: "auth-gated" },
]

// Next.js `force-static` + `permanentRedirect()` produces a 200 HTML
// response containing `<meta http-equiv="refresh" content="0;url=...">`
// instead of a 308. That's a real redirect from the user's POV — the
// browser follows it instantly — so smoke must treat it as such.
const META_REFRESH_RX = /<meta[^>]*http-equiv=["']refresh["'][^>]*content=["']\s*\d+\s*;\s*url=([^"']+)["']/i

async function probe(route) {
  const url = `${BASE}${route.path}`
  let res
  try {
    // redirect: manual so we can inspect Location ourselves.
    res = await fetch(url, { redirect: "manual", headers: { accept: "text/html" } })
  } catch (err) {
    return { route, status: 0, ok: false, reason: `fetch failed: ${err.message}` }
  }

  const status = res.status
  const location = res.headers.get("location") || ""

  // Read body once so we can sniff for meta-refresh on redirect-style routes.
  let metaTarget = ""
  if (status === 200 && route.kind === "redirect") {
    const body = await res.text()
    const m = body.match(META_REFRESH_RX)
    if (m) metaTarget = m[1] || ""
  }

  switch (route.kind) {
    case "render": {
      if (status === 200) return { route, status, ok: true }
      // /auth/login + /auth/sign-up sometimes 30x in middleware when a
      // session already exists; treat 30x to a role home as also fine.
      if (status >= 300 && status < 400) return { route, status, ok: true, note: `→ ${location}` }
      return { route, status, ok: false, reason: `expected 200, got ${status}` }
    }
    case "redirect": {
      if (status >= 300 && status < 400) {
        if (route.expectLocationPrefix && !location.startsWith(route.expectLocationPrefix)) {
          return { route, status, ok: false, reason: `expected → ${route.expectLocationPrefix}, got → ${location}` }
        }
        return { route, status, ok: true, note: `→ ${location}` }
      }
      // Static permanentRedirect — body carries a meta-refresh.
      if (status === 200 && metaTarget) {
        if (route.expectLocationPrefix && !metaTarget.startsWith(route.expectLocationPrefix)) {
          return { route, status, ok: false, reason: `meta-refresh → ${metaTarget}, expected ${route.expectLocationPrefix}` }
        }
        return { route, status, ok: true, note: `meta-refresh → ${metaTarget}` }
      }
      return { route, status, ok: false, reason: `expected 30x, got ${status}` }
    }
    case "auth-gated": {
      // Either auth-gate redirect (30x to /auth/login) or render a 200
      // with whatever the page does for unauthenticated callers.
      if (status === 200) return { route, status, ok: true }
      if (status >= 300 && status < 400) return { route, status, ok: true, note: `→ ${location}` }
      if (status === 401) return { route, status, ok: true }
      return { route, status, ok: false, reason: `unexpected ${status}` }
    }
  }
  return { route, status: 0, ok: false, reason: "unknown kind" }
}

async function pingServer() {
  try {
    await fetch(BASE, { redirect: "manual" })
    return true
  } catch {
    return false
  }
}

async function main() {
  if (!(await pingServer())) {
    console.error(`smoke: cannot reach ${BASE} — start \`npm run dev\` first.`)
    process.exit(2)
  }

  console.log(`smoke: ${ROUTES.length} routes against ${BASE}`)
  console.log("-".repeat(80))

  const results = []
  for (const route of ROUTES) {
    const r = await probe(route)
    results.push(r)
    const tag = r.ok ? PASS : FAIL
    const extra = r.ok ? (r.note ? ` ${r.note}` : "") : ` — ${r.reason}`
    console.log(`${tag} ${String(r.status).padStart(3)} ${route.kind.padEnd(10)} ${route.path}${extra}`)
  }

  const failed = results.filter((r) => !r.ok)
  const ok = results.length - failed.length
  console.log("-".repeat(80))
  console.log(`smoke: ${ok}/${results.length} ok`)
  if (failed.length > 0) {
    console.log("\nFailures:")
    for (const f of failed) {
      console.log(`  - ${f.route.path}: ${f.reason}`)
    }
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(2)
})
