/**
 * Wave 1A.5 — AUTH-006 middleware onboarding-gate integration test.
 *
 * The middleware reads `profiles.role` + `profiles.is_onboarded` after
 * `getUser()` and, for any authed non-admin user with `is_onboarded=false`
 * hitting a non-onboarding path, redirects to the role's canonical wizard
 * root. Admins bypass. Missing profile → /auth/error?reason=missing_profile.
 * /api/* and /onboarding/* paths pass through (loop prevention + APIs).
 *
 * Strategy: stub the heavy deps (rate-limiter, csrf, sentry, updateSession)
 * AND `@supabase/ssr.createServerClient` so the middleware runs end-to-end
 * against an in-process fake. We then construct NextRequest objects for
 * every path the canon mandates and assert on the redirect Location.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

// ─── Stubs for non-auth side modules ─────────────────────────────────────

vi.mock("@/lib/security/rate-limiter-redis", () => ({
  rateLimitDistributed: async () => ({
    allowed: true,
    remaining: 999,
    resetAt: Date.now() + 60_000,
  }),
}))

vi.mock("@/lib/security/rate-limiter", () => ({
  RATE_LIMITS: {
    api: { max: 1000, window: 60_000 },
    auth: { max: 1000, window: 60_000 },
    booking: { max: 1000, window: 60_000 },
    payment: { max: 1000, window: 60_000 },
    upload: { max: 1000, window: 60_000 },
  },
}))

vi.mock("@/lib/security/csrf", () => ({
  validateCSRFToken: async () => true,
}))

vi.mock("@/lib/monitoring/sentry-server", () => ({
  setEnvironmentTag: () => {},
}))

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: async (_req: unknown) => {
    const { NextResponse } = await import("next/server")
    return NextResponse.next()
  },
}))

// ─── Fake Supabase SSR client ────────────────────────────────────────────

interface FakeProfile {
  role: string
  is_onboarded: boolean
}

interface FakeAdminRoleRow {
  role: string
}

interface FakeAuthState {
  user: { id: string } | null
  profile: FakeProfile | null
  adminRole: FakeAdminRoleRow | null
}

const fakeState: FakeAuthState = {
  user: null,
  profile: null,
  adminRole: null,
}

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: fakeState.user } }),
    },
    from: (table: string) => {
      const single = async () => {
        if (table === "admin_roles") return { data: fakeState.adminRole, error: null }
        if (table === "profiles") return { data: fakeState.profile, error: null }
        return { data: null, error: null }
      }
      const builder = {
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: single, single }),
            maybeSingle: single,
            single,
          }),
        }),
      }
      return builder
    },
  }),
}))

// Pre-populate env so the middleware does not bail on the missing-config
// branch. These values never escape the fake client.
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-for-tests"

// ─── Helpers ──────────────────────────────────────────────────────────────

async function callMiddleware(path: string) {
  // Lazy-import after vi.mock has been registered.
  const mod = await import("@/middleware")
  const url = `http://localhost${path}`
  const req = new NextRequest(url, { method: "GET" })
  const res = await mod.middleware(req)
  return res
}

function locationOf(res: Response): string | null {
  return res.headers.get("location")
}

beforeEach(() => {
  fakeState.user = null
  fakeState.profile = null
  fakeState.adminRole = null
})

afterEach(() => {
  vi.clearAllMocks()
})

// ─── Tests ────────────────────────────────────────────────────────────────

describe("middleware — AUTH-006 is_onboarded gate", () => {
  it("redirects parent with is_onboarded=false hitting /parent → /onboarding/parent/e-signature", async () => {
    // #51 — the parent onboarding entry point is now the e-signature step.
    fakeState.user = { id: "p-1" }
    fakeState.profile = { role: "parent", is_onboarded: false }
    const res = await callMiddleware("/parent")
    expect(res.status).toBe(307)
    expect(locationOf(res)).toMatch(/\/onboarding\/parent\/e-signature$/)
  })

  it("lets parent with is_onboarded=true reach /parent (no redirect)", async () => {
    fakeState.user = { id: "p-2" }
    fakeState.profile = { role: "parent", is_onboarded: true }
    const res = await callMiddleware("/parent")
    expect(res.status).toBe(200)
    expect(locationOf(res)).toBeNull()
  })

  it("redirects teen with is_onboarded=false hitting /teen → /onboarding/interests", async () => {
    fakeState.user = { id: "t-1" }
    fakeState.profile = { role: "teen", is_onboarded: false }
    const res = await callMiddleware("/teen")
    expect(res.status).toBe(307)
    expect(locationOf(res)).toMatch(/\/onboarding\/interests$/)
  })

  it("redirects mentor with is_onboarded=false on /mentor/dashboard → /mentor/onboarding/kyc", async () => {
    fakeState.user = { id: "m-1" }
    fakeState.profile = { role: "mentor", is_onboarded: false }
    const res = await callMiddleware("/mentor/dashboard")
    expect(res.status).toBe(307)
    expect(locationOf(res)).toMatch(/\/mentor\/onboarding\/kyc$/)
  })

  it("redirects driver with is_onboarded=false on /driver/dashboard → /driver/onboarding/kyc", async () => {
    fakeState.user = { id: "d-1" }
    fakeState.profile = { role: "driver", is_onboarded: false }
    const res = await callMiddleware("/driver/dashboard")
    expect(res.status).toBe(307)
    expect(locationOf(res)).toMatch(/\/driver\/onboarding\/kyc$/)
  })

  it("admin with is_onboarded=false hitting /admin passes through (admin bypass)", async () => {
    fakeState.user = { id: "a-1" }
    fakeState.profile = { role: "admin", is_onboarded: false }
    fakeState.adminRole = { role: "super_admin" }
    const res = await callMiddleware("/admin")
    // The admin-routes block accepts a row in admin_roles; the protected-
    // routes block does NOT include /admin. The onboarding gate skips
    // because role==='admin'. Final response has no Location header.
    expect(locationOf(res)).toBeNull()
  })

  it("authed user with no profile → /auth/error?reason=missing_profile", async () => {
    fakeState.user = { id: "x-1" }
    fakeState.profile = null
    const res = await callMiddleware("/parent")
    expect(res.status).toBe(307)
    const loc = locationOf(res) || ""
    expect(loc).toContain("/auth/error")
    expect(loc).toContain("reason=missing_profile")
  })

  it("does not redirect when user is already on the canonical onboarding target", async () => {
    fakeState.user = { id: "p-3" }
    fakeState.profile = { role: "parent", is_onboarded: false }
    // /onboarding/parent is the canonical target — must not bounce.
    // Note: /onboarding/* is in the protectedPaths matcher fallthrough but
    // path is in ONBOARDING_PATH_PREFIXES so the gate skips.
    const res = await callMiddleware("/onboarding/parent")
    expect(locationOf(res)).toBeNull()
  })

  it("does not gate /api/* paths even when is_onboarded=false", async () => {
    fakeState.user = { id: "p-4" }
    fakeState.profile = { role: "parent", is_onboarded: false }
    // /api/* is not in protectedPaths to begin with, but defense in depth:
    // the gate's prefix list includes /api/ explicitly.
    const res = await callMiddleware("/api/parent/teens")
    // No location header from the onboarding gate; CSRF stub is permissive.
    expect(locationOf(res)).toBeNull()
  })
})
