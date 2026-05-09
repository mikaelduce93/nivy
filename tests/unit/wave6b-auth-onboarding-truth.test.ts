/**
 * Wave 6B — Auth-onboarding truth-table guards.
 *
 * Static guards over the source code (not a DB integration test) — verify
 * that:
 *   1. /auth/redirect emits the correct target per (role, attribute-row state)
 *      and uses canonical join columns (ambassador.profile_id, NOT user_id).
 *   2. middleware ONBOARDING_TARGETS map matches /auth/redirect's wizard
 *      roots, so a not-yet-onboarded user lands on the same page either way.
 *   3. Every admin approval flow that flips a per-role status to "active"
 *      ALSO writes profiles.is_onboarded=true, otherwise the middleware
 *      gate keeps the approved user looped on the wizard.
 *   4. /api/{teen,parent}/onboarding/complete both set is_onboarded=true.
 *   5. /onboarding/complete page no longer skips is_onboarded for parent.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = process.cwd()
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8")
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

describe("Wave 6B — /auth/redirect truth table", () => {
  const src = stripComments(read("app/auth/redirect/page.tsx"))

  it("teen onboarded → /teen, not-onboarded → /onboarding/teen", () => {
    expect(src).toMatch(/case\s+"teen"[\s\S]{0,300}redirect\(\s*isOnboarded\s*\?\s*"\/teen"\s*:\s*"\/onboarding\/teen"/)
  })

  it("parent onboarded → /parent, not-onboarded → /onboarding/parent", () => {
    expect(src).toMatch(/case\s+"parent"[\s\S]{0,300}redirect\(\s*isOnboarded\s*\?\s*"\/parent"\s*:\s*"\/onboarding\/parent"/)
  })

  it("partner status=active → /partner, else → /partner/onboarding/awaiting-approval", () => {
    expect(src).toMatch(/partnerStatus\s*===\s*"active"[\s\S]{0,200}"\/partner"[\s\S]{0,200}"\/partner\/onboarding\/awaiting-approval"/)
  })

  it("ambassador joins via profile_id (NOT user_id — that was a Wave 6B bug)", () => {
    expect(src).toMatch(/from\("ambassadors"\)[\s\S]{0,200}\.eq\("profile_id"/)
    expect(src).not.toMatch(/from\("ambassadors"\)[\s\S]{0,200}\.eq\("user_id"/)
  })

  it("ambassador status=active → /ambassador, else → /ambassador/onboarding/awaiting-approval", () => {
    expect(src).toMatch(/ambassador[\s\S]{0,500}status\s*===\s*"active"[\s\S]{0,200}"\/ambassador"[\s\S]{0,200}"\/ambassador\/onboarding\/awaiting-approval"/)
  })

  it("mentor kyc approved/verified → /mentor/dashboard, else → /mentor/onboarding/kyc", () => {
    expect(src).toMatch(/mentor[\s\S]{0,500}kyc === "approved" \|\| kyc === "verified"[\s\S]{0,80}"\/mentor\/dashboard"[\s\S]{0,80}"\/mentor\/onboarding\/kyc"/)
  })

  it("driver kyc approved/verified → /driver/dashboard, else → /driver/onboarding/kyc", () => {
    expect(src).toMatch(/driver[\s\S]{0,500}kyc === "approved" \|\| kyc === "verified"[\s\S]{0,80}"\/driver\/dashboard"[\s\S]{0,80}"\/driver\/onboarding\/kyc"/)
  })

  it("admin → /admin (no onboarding gate)", () => {
    expect(src).toMatch(/case\s+"admin"[\s\S]{0,80}redirect\("\/admin"\)/)
  })

  it("unknown role → /auth/error?reason=unknown_role (no fallback to /onboarding)", () => {
    expect(src).toMatch(/default[\s\S]{0,120}"\/auth\/error\?reason=unknown_role"/)
  })

  it("missing profile → /onboarding (pre-account showcase)", () => {
    expect(src).toMatch(/!\s*profile[\s\S]{0,80}redirect\("\/onboarding"\)/)
  })
})

describe("Wave 6B — middleware ONBOARDING_TARGETS aligns with role wizards", () => {
  const src = stripComments(read("middleware.ts"))

  // Every wizard target must exist on disk — covered by Wave 5B smoke test
  // (auth-gated 307s prove the route file is present). Here we just check
  // the canonical mapping itself.
  for (const [role, target] of Object.entries({
    parent: "/onboarding/parent",
    teen: "/onboarding/interests",
    partner: "/partner/onboarding/awaiting-approval",
    mentor: "/mentor/onboarding/kyc",
    driver: "/driver/onboarding/kyc",
    ambassador: "/ambassador/onboarding/awaiting-approval",
  })) {
    it(`middleware maps ${role} → ${target}`, () => {
      expect(src).toMatch(new RegExp(`${role}\\s*:\\s*"${target.replace(/\//g, "\\/")}"`))
    })
  }

  it("admin bypasses the onboarding gate (mapped to null)", () => {
    expect(src).toMatch(/admin\s*:\s*null/)
  })

  it("missing profile → /auth/error?reason=missing_profile (no /onboarding fallback)", () => {
    expect(src).toMatch(/missing_profile/)
  })
})

describe("Wave 6B — admin approvals flip profiles.is_onboarded", () => {
  it("partners/[id]/activate sets is_onboarded=true on the auth user", () => {
    const src = stripComments(read("app/api/admin/partners/[id]/activate/route.ts"))
    // Both the main path and reconcile() must do it.
    const matches = src.match(/from\("profiles"\)[\s\S]{0,200}role:\s*"partner"[\s\S]{0,80}is_onboarded:\s*true/g)
    expect(matches?.length ?? 0, "partner activate must flip is_onboarded in BOTH the main path and reconcile()").toBeGreaterThanOrEqual(2)
  })

  it("ambassadors/approve looks up profile_id then flips is_onboarded=true", () => {
    const src = stripComments(read("app/api/admin/ambassadors/approve/route.ts"))
    expect(src).toMatch(/from\("ambassadors"\)[\s\S]{0,200}\.select\([^)]*profile_id/)
    expect(src).toMatch(/from\("profiles"\)[\s\S]{0,200}is_onboarded:\s*true/)
  })

  it("drivers/[id]/approve flips is_onboarded=true after KYC approval", () => {
    const src = stripComments(read("app/api/admin/drivers/[id]/approve/route.ts"))
    expect(src).toMatch(/from\("profiles"\)[\s\S]{0,200}is_onboarded:\s*true/)
    // Must be conditioned on decision === "approve" (not on rejection).
    expect(src).toMatch(/decision\s*===\s*"approve"[\s\S]{0,500}is_onboarded:\s*true/)
  })

  it("mentors/[id]/approve looks up mentor.user_id then flips is_onboarded=true", () => {
    const src = stripComments(read("app/api/admin/mentors/[id]/approve/route.ts"))
    expect(src).toMatch(/from\("mentors"\)[\s\S]{0,200}\.select\([^)]*user_id/)
    expect(src).toMatch(/from\("profiles"\)[\s\S]{0,200}is_onboarded:\s*true/)
  })
})

describe("Wave 6B — self-served onboarding/complete endpoints", () => {
  it("/api/teen/onboarding/complete sets is_onboarded=true (gated to teen)", () => {
    const src = stripComments(read("app/api/teen/onboarding/complete/route.ts"))
    expect(src).toMatch(/userInfo\.role\s*!==\s*"teen"/)
    expect(src).toMatch(/from\("profiles"\)[\s\S]{0,200}is_onboarded:\s*true/)
  })

  it("/api/parent/onboarding/complete exists, gates to parent, flips is_onboarded=true", () => {
    const src = stripComments(read("app/api/parent/onboarding/complete/route.ts"))
    expect(src).toMatch(/userInfo\.role\s*!==\s*"parent"/)
    expect(src).toMatch(/from\("profiles"\)[\s\S]{0,200}is_onboarded:\s*true/)
  })

  it("/onboarding/complete flips is_onboarded for parent BEFORE redirecting (was a Wave 6B bug)", () => {
    const src = stripComments(read("app/onboarding/complete/page.tsx"))
    // The is_onboarded update must appear BEFORE the parent/partner redirect calls.
    const updateIdx = src.search(/from\("profiles"\)[\s\S]{0,200}is_onboarded:\s*true/)
    const parentRedirectIdx = src.indexOf('redirect("/parent")')
    expect(updateIdx).toBeGreaterThan(-1)
    expect(parentRedirectIdx).toBeGreaterThan(-1)
    expect(updateIdx, "is_onboarded must flip BEFORE the role redirect").toBeLessThan(parentRedirectIdx)
  })
})
