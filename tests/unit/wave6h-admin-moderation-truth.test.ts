/**
 * Wave 6H — Admin moderation truth static guards.
 *
 * Closes 4 truth-violations across the moderation surface:
 *   1. /decision user_reports filter typo (`pending` → `open`); silent
 *      catch on user_reports sync error.
 *   2. Legacy /approve had inline admin_roles check (drift risk),
 *      raw audit_log insert (no fail-loud), 400 on already_reviewed,
 *      parallel content-table map missing partner_offer.
 *   3. Same family of issues on legacy /reject.
 *   4. GET inbox used inline admin_roles instead of canonical
 *      `requireAdminPermission`.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = process.cwd()
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8")
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

const DECISION = "app/api/admin/moderation/[id]/decision/route.ts"
const APPROVE = "app/api/admin/moderation/[id]/approve/route.ts"
const REJECT = "app/api/admin/moderation/[id]/reject/route.ts"
const INBOX = "app/api/admin/moderation/route.ts"
const ADAPTERS = "lib/admin/moderation-adapters.ts"

describe("Wave 6H — /decision user_reports sync truth", () => {
  const src = stripComments(read(DECISION))

  it("filters user_reports on canonical status='open' (NOT 'pending')", () => {
    expect(src).toMatch(/from\(["']user_reports["']\)[\s\S]{0,400}\.eq\(\s*["']status["']\s*,\s*["']open["']\s*\)/)
    expect(src).not.toMatch(/from\(["']user_reports["']\)[\s\S]{0,400}\.eq\(\s*["']status["']\s*,\s*["']pending["']\s*\)/)
  })

  it("surfaces user_reports sync error (no silent catch)", () => {
    expect(src).toMatch(/reportsErr[\s\S]{0,400}status:\s*500/)
  })

  it("audit via canonical logAdminAction (throws on failure)", () => {
    expect(src).toMatch(/logAdminAction/)
  })

  it("warn/suspend remain 409 unsupported_action via adapter (no fake user-targeted action)", () => {
    // The adapter file returns null for warn/suspend; the route maps
    // null → 409 unsupported_action.
    const adapterSrc = stripComments(read(ADAPTERS))
    expect(adapterSrc).toMatch(/case\s+["']warn["']:[\s\S]{0,40}case\s+["']suspend["']:[\s\S]{0,40}return\s+null/)
    expect(src).toMatch(/unsupported_action[\s\S]{0,400}status:\s*409/)
  })

  it("already_reviewed returns 409", () => {
    expect(src).toMatch(/already_reviewed[\s\S]{0,200}status:\s*409/)
  })

  it("not_found returns 404", () => {
    expect(src).toMatch(/error:\s*["']not_found["'][\s\S]{0,80}status:\s*404/)
  })
})

describe("Wave 6H — legacy /approve hardened to canon", () => {
  const src = stripComments(read(APPROVE))

  it("uses canonical requireAdminPermission (not inline admin_roles read)", () => {
    expect(src).toMatch(/requireAdminPermission\(\s*["']content\.view["']\s*\)/)
    expect(src).not.toMatch(/from\(["']admin_roles["']\)/)
  })

  it("uses canonical logAdminAction (not raw audit_log insert)", () => {
    expect(src).toMatch(/logAdminAction\(/)
    expect(src).not.toMatch(/from\(["']audit_log["']\)\s*\.\s*insert/)
  })

  it("uses canonical adapterFor (not parallel CONTENT_TABLES map)", () => {
    expect(src).toMatch(/adapterFor\(/)
    expect(src).not.toMatch(/APPROVED_STATUS_BY_CONTENT_TYPE|CONTENT_TABLES/)
  })

  it("already_reviewed returns 409 (was 400)", () => {
    expect(src).toMatch(/already_reviewed[\s\S]{0,200}status:\s*409/)
    expect(src).not.toMatch(/already_reviewed[\s\S]{0,200}status:\s*400/)
  })

  it("user_reports sync filters status='open' AND surfaces error", () => {
    expect(src).toMatch(/from\(["']user_reports["']\)[\s\S]{0,400}\.eq\(\s*["']status["']\s*,\s*["']open["']\s*\)/)
    expect(src).toMatch(/reportsErr[\s\S]{0,400}status:\s*500/)
  })
})

describe("Wave 6H — legacy /reject hardened to canon", () => {
  const src = stripComments(read(REJECT))

  it("uses canonical requireAdminPermission", () => {
    expect(src).toMatch(/requireAdminPermission\(\s*["']content\.view["']\s*\)/)
    expect(src).not.toMatch(/from\(["']admin_roles["']\)/)
  })

  it("uses canonical logAdminAction", () => {
    expect(src).toMatch(/logAdminAction\(/)
    expect(src).not.toMatch(/from\(["']audit_log["']\)\s*\.\s*insert/)
  })

  it("uses canonical adapterFor", () => {
    expect(src).toMatch(/adapterFor\(/)
    expect(src).not.toMatch(/CONTENT_TABLES/)
  })

  it("already_reviewed returns 409 (was 400)", () => {
    expect(src).toMatch(/already_reviewed[\s\S]{0,200}status:\s*409/)
  })

  it("reason required (≤ 1000 chars)", () => {
    expect(src).toMatch(/reason_required/)
    expect(src).toMatch(/reason\.length\s*>\s*1000/)
  })

  it("user_reports sync filters status='open' AND surfaces error", () => {
    expect(src).toMatch(/from\(["']user_reports["']\)[\s\S]{0,400}\.eq\(\s*["']status["']\s*,\s*["']open["']\s*\)/)
    expect(src).toMatch(/reportsErr[\s\S]{0,400}status:\s*500/)
  })
})

describe("Wave 6H — moderation inbox GET uses canonical permission helper", () => {
  const src = stripComments(read(INBOX))

  it("uses requireAdminPermission (no inline admin_roles read)", () => {
    expect(src).toMatch(/requireAdminPermission\(\s*["']content\.view["']\s*\)/)
    expect(src).not.toMatch(/from\(["']admin_roles["']\)\s*\.\s*select/)
  })
})

describe("Wave 6H — adapters retain Wave 4A canonical content types", () => {
  const src = stripComments(read(ADAPTERS))

  it("ships feed_post / marketplace_listing / partner_offer adapters", () => {
    expect(src).toMatch(/feed_post:\s*FEED_POST_ADAPTER/)
    expect(src).toMatch(/marketplace_listing:\s*MARKETPLACE_LISTING_ADAPTER/)
    expect(src).toMatch(/partner_offer:\s*PARTNER_OFFER_ADAPTER/)
  })

  it("warn + suspend return null in every adapter (no fake user-targeted effect)", () => {
    // Three occurrences (one per adapter), each `case "warn":\n case "suspend":\n return null`.
    const matches = src.match(/case\s+["']warn["']:\s*case\s+["']suspend["']:\s*return\s+null/g)
    expect(matches?.length ?? 0).toBeGreaterThanOrEqual(3)
  })

  it("DECISIONS_REQUIRING_REASON includes delete + warn + suspend", () => {
    expect(src).toMatch(/DECISIONS_REQUIRING_REASON[\s\S]{0,200}delete[\s\S]{0,80}warn[\s\S]{0,80}suspend/)
  })
})
