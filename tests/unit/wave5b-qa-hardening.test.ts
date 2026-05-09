/**
 * Wave 5B — static guards for closed-beta QA hardening.
 *
 * 1. Every role tree has its own error.tsx (no orphan crash → bare 500).
 * 2. The smoke-routes script exists, is wired into npm scripts, and
 *    enumerates the canonical Wave 5A redirect stubs so a regression
 *    is caught.
 */
import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = process.cwd()
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8")

describe("Wave 5B — every role has its own error boundary", () => {
  for (const role of ["teen", "parent", "partner", "admin", "ambassador", "mentor"]) {
    it(`app/${role}/error.tsx exists`, () => {
      expect(existsSync(resolve(ROOT, "app", role, "error.tsx")), `missing app/${role}/error.tsx`).toBe(true)
    })
  }
  it("root error boundary exists", () => {
    expect(existsSync(resolve(ROOT, "app/error.tsx"))).toBe(true)
  })
  it("global error boundary exists", () => {
    expect(existsSync(resolve(ROOT, "app/global-error.tsx"))).toBe(true)
  })
})

describe("Wave 5B — smoke-routes script wiring", () => {
  it("scripts/smoke-routes.mjs exists", () => {
    expect(existsSync(resolve(ROOT, "scripts/smoke-routes.mjs"))).toBe(true)
  })

  it("npm script `smoke` points at the smoke-routes script", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts?: Record<string, string> }
    expect(pkg.scripts?.smoke).toBe("node scripts/smoke-routes.mjs")
  })

  it("smoke script covers Wave 5A redirect stubs", () => {
    const src = read("scripts/smoke-routes.mjs")
    for (const stub of [
      "/autorisations",
      "/autorisations/ajouter",
      "/notifications",
      "/notifications/preferences",
      "/gamification",
    ]) {
      expect(src, `smoke must probe ${stub}`).toContain(`"${stub}"`)
    }
  })

  it("smoke script covers all 5 role homes", () => {
    const src = read("scripts/smoke-routes.mjs")
    for (const home of ["/teen", "/parent", "/partner", "/admin", "/ambassador"]) {
      expect(src, `smoke must probe ${home}`).toContain(`"${home}"`)
    }
  })

  it("smoke script verifies redirect Location targets", () => {
    const src = read("scripts/smoke-routes.mjs")
    expect(src).toContain("expectLocationPrefix")
    expect(src).toContain("/parent/approvals")
    expect(src).toContain("/auth/redirect")
  })
})
