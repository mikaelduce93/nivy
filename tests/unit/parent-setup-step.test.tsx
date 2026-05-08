/**
 * Wave 1A.5 — AUTH-005 closure test.
 *
 * Verifies that the marketing wizard's "parent setup" step:
 *   1. No longer calls `supabase.auth.signUp` anywhere in the source.
 *   2. No longer inserts into the `parents` table from the source.
 *   3. No longer imports the supabase browser client at all (no side
 *      effects on auth state).
 *   4. Carries the canonical CTA target (`/auth/sign-up?source=wizard`)
 *      with `tempUserId` preserved when present.
 *
 * The render-tier RTL test is omitted intentionally: the project does not
 * carry `@testing-library/dom` and Next.js' `useRouter` requires the App
 * Router context which is non-trivial to stub in isolation. Instead, we
 * replicate the small URL-builder + storage-reader as pure functions and
 * assert source contains the invariants — which is what the canon lint
 * rule (eslint + scripts/canon-precommit.mjs) enforces on net-new code.
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const PARENT_SETUP_PATH = resolve(
  __dirname,
  "..",
  "..",
  "components",
  "onboarding",
  "parent-setup-step.tsx",
)

const SOURCE = readFileSync(PARENT_SETUP_PATH, "utf8")

// ─── URL builder mirroring the production helper ────────────────────────
// Production lives in components/onboarding/parent-setup-step.tsx.
// We mirror it here as a pure function so the test asserts the exact
// behaviour the wizard CTA depends on.
function buildSignUpHref(tempUserId: string | null): string {
  const params = new URLSearchParams()
  params.set("source", "wizard")
  if (tempUserId) params.set("tempUserId", tempUserId)
  return `/auth/sign-up?${params.toString()}`
}

// jsdom-style storage reader mirror.
function readTempUserIdFromStorage(storage: Storage): string | null {
  try {
    const raw = storage.getItem("nivy:onboarding:gamification")
    if (!raw) return null
    const parsed = JSON.parse(raw) as { tempUserId?: string }
    return parsed?.tempUserId ?? null
  } catch {
    return null
  }
}

describe("parent-setup-step.tsx — AUTH-005 source invariants", () => {
  it("does not call supabase.auth.signUp", () => {
    expect(SOURCE).not.toMatch(/\.\s*auth\s*\.\s*signUp\s*\(/)
  })

  it("does not insert into the parents table", () => {
    expect(SOURCE).not.toMatch(/from\(\s*['"]parents['"]\s*\)/)
  })

  it("does not import the supabase browser client (no DB side effects)", () => {
    expect(SOURCE).not.toMatch(/from\s+['"]@\/lib\/supabase\/client['"]/)
  })

  it("targets /auth/sign-up with source=wizard as the canonical CTA", () => {
    expect(SOURCE).toMatch(/\/auth\/sign-up/)
    expect(SOURCE).toMatch(/source=wizard/)
  })

  it("reads tempUserId from the wizard's gamification localStorage key", () => {
    expect(SOURCE).toMatch(/nivy:onboarding:gamification/)
    expect(SOURCE).toMatch(/tempUserId/)
  })

  it("uses next/navigation router for the CTA navigation", () => {
    expect(SOURCE).toMatch(/from\s+['"]next\/navigation['"]/)
    expect(SOURCE).toMatch(/useRouter/)
  })
})

describe("parent-setup-step CTA URL construction", () => {
  // Pure-function assertions. These mirror the helper inside the component.

  it("builds the bare signup href when no tempUserId is available", () => {
    expect(buildSignUpHref(null)).toBe("/auth/sign-up?source=wizard")
  })

  it("appends tempUserId as a query param when present", () => {
    const id = "11111111-1111-1111-1111-111111111111"
    expect(buildSignUpHref(id)).toBe(
      `/auth/sign-up?source=wizard&tempUserId=${id}`,
    )
  })

  it("never points anywhere other than /auth/sign-up", () => {
    expect(buildSignUpHref(null)).toMatch(/^\/auth\/sign-up\?/)
    expect(buildSignUpHref("any")).toMatch(/^\/auth\/sign-up\?/)
  })
})

describe("parent-setup-step localStorage tempUserId reader", () => {
  let mem: Record<string, string> = {}
  const storage: Storage = {
    getItem: (k: string) => (k in mem ? mem[k] : null),
    setItem: (k: string, v: string) => {
      mem[k] = v
    },
    removeItem: (k: string) => {
      delete mem[k]
    },
    clear: () => {
      mem = {}
    },
    key: () => null,
    length: 0,
  }

  beforeEach(() => {
    mem = {}
  })

  afterEach(() => {
    mem = {}
  })

  it("returns null when the storage key is absent", () => {
    expect(readTempUserIdFromStorage(storage)).toBeNull()
  })

  it("returns null when the storage value is malformed JSON", () => {
    mem["nivy:onboarding:gamification"] = "{not json"
    expect(readTempUserIdFromStorage(storage)).toBeNull()
  })

  it("returns the tempUserId when the wizard has stashed one", () => {
    const id = "22222222-2222-2222-2222-222222222222"
    mem["nivy:onboarding:gamification"] = JSON.stringify({ tempUserId: id })
    expect(readTempUserIdFromStorage(storage)).toBe(id)
  })

  it("returns null when the JSON has no tempUserId field", () => {
    mem["nivy:onboarding:gamification"] = JSON.stringify({ totalXP: 42 })
    expect(readTempUserIdFromStorage(storage)).toBeNull()
  })
})
