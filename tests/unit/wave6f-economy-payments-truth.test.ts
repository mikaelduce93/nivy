/**
 * Wave 6F — Economy-payments truth static guards.
 *
 * Verifies the closures from this wave:
 *   1. CMI user-redirect callback rejects unsigned and bad-HASH responses
 *      (was previously trusting the browser query string).
 *   2. CMI callback is idempotent on payment_transactions inserts (was
 *      duplicating rows on user "back" + refresh).
 *   3. CMI initiate + callback no longer redirect to legacy
 *      /mes-reservations (forbidden bare path per Wave 5A).
 *   4. Wave 1B closures intact: /api/parent/topup keeps idempotency,
 *      e-signature gate, parent-teen link verification, no auto-topup.
 *   5. Wave 1B + 2B closures intact: /api/teen/shop stays 410-stubbed;
 *      the deprecated /api/teen/tokens route is fully removed (Axe 3 /
 *      canon §5.1, migration 198); CMI server-to-server webhook keeps
 *      HASH gate.
 *   6. Founder F5 not violated: no auto-topup implementation exists in
 *      production code (PSP webhook stays env-gated).
 */
import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = process.cwd()
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8")
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

describe("Wave 6F — CMI user-redirect callback HASH gate", () => {
  const src = stripComments(read("app/api/payments/cmi/callback/route.ts"))

  it("rejects callback when params.HASH is missing", () => {
    expect(src).toMatch(/!\s*params\.HASH[\s\S]{0,400}cmi_unsigned/)
  })

  it("rejects callback when verifyCallbackHash returns false", () => {
    expect(src).toMatch(/!\s*cmiGateway\.verifyCallbackHash\(params\)[\s\S]{0,400}cmi_signature_mismatch/)
  })

  it("HASH check happens BEFORE parseCallback / DB writes", () => {
    const hashIdx = src.search(/cmiGateway\.verifyCallbackHash\(params\)/)
    const parseIdx = src.search(/cmiGateway\.parseCallback\(params\)/)
    const updateIdx = src.search(/from\("bookings"\)\s*\.\s*update/)
    expect(hashIdx).toBeGreaterThan(-1)
    expect(parseIdx).toBeGreaterThan(-1)
    expect(updateIdx).toBeGreaterThan(-1)
    expect(hashIdx, "HASH gate must precede parseCallback").toBeLessThan(parseIdx)
    expect(hashIdx, "HASH gate must precede DB updates").toBeLessThan(updateIdx)
  })
})

describe("Wave 6F — CMI callback idempotency", () => {
  const src = stripComments(read("app/api/payments/cmi/callback/route.ts"))

  it("checks for existing payment_transactions row before inserting on success", () => {
    expect(src).toMatch(/from\("payment_transactions"\)\s*\.\s*select[\s\S]{0,200}provider_transaction_id/)
    expect(src).toMatch(/!\s*existingTx[\s\S]{0,300}from\("payment_transactions"\)\s*\.\s*insert/)
  })

  it("only flips booking to paid if not already paid", () => {
    expect(src).toMatch(/booking\.payment_status\s*!==\s*["']paid["'][\s\S]{0,500}from\("bookings"\)\s*\.\s*update/)
  })
})

describe("Wave 6F — CMI flow drops legacy /mes-reservations redirects", () => {
  for (const path of [
    "app/api/payments/cmi/callback/route.ts",
    "app/api/payments/cmi/initiate/route.ts",
  ]) {
    it(`${path} no longer redirects to /mes-reservations`, () => {
      const src = stripComments(read(path))
      expect(src).not.toMatch(/\/mes-reservations/)
    })
  }
})

describe("Wave 6F — Wave 1B closures intact", () => {
  it("/api/parent/topup retains idempotency, e-signature gate, parent-teen link, manual provider", () => {
    const src = stripComments(read("app/api/parent/topup/route.ts"))
    expect(src).toMatch(/client_idempotency_key/)
    expect(src).toMatch(/e_signatures/)
    expect(src).toMatch(/parent_teen_links/)
    expect(src).toMatch(/p_provider:\s*["']manual["']/)
    // Idempotent replay branch returns previous payment.
    expect(src).toMatch(/idempotent_replay/)
  })

  it("/api/parent/topup uses canonical top_up_teen RPC (not direct user_coins write)", () => {
    const src = stripComments(read("app/api/parent/topup/route.ts"))
    expect(src).toMatch(/rpc\(\s*["']top_up_teen["']/)
    // Defence-in-depth: never write user_coins directly from this route.
    expect(src).not.toMatch(/from\(["']user_coins["']\)\s*\.\s*(?:update|insert|upsert)/)
  })

  it("/api/teen/shop stays 410", () => {
    const src = stripComments(read("app/api/teen/shop/route.ts"))
    expect(src).toMatch(/status:\s*410/)
  })

  it("/api/teen/tokens route is fully removed (Axe 3 / canon §5.1)", () => {
    // Migration 198 drops the token_* + daily_bonuses rails; the route
    // directory itself is deleted. The route must NOT exist.
    const path = resolve(ROOT, "app/api/teen/tokens/route.ts")
    expect(existsSync(path), `${path} should not exist after Axe 3 cleanup`).toBe(false)
  })
})

describe("Wave 6F — CMI server-to-server webhook HASH gate not regressed", () => {
  const src = stripComments(read("app/api/payments/cmi/webhook/route.ts"))

  it("rejects unsigned webhook (missing HASH)", () => {
    expect(src).toMatch(/!\s*params\.HASH/)
    expect(src).toMatch(/Missing HASH/)
  })

  it("rejects bad HASH", () => {
    expect(src).toMatch(/verifyCallbackHash/)
    expect(src).toMatch(/Invalid HASH/)
  })

  it("idempotent on already-paid bookings", () => {
    expect(src).toMatch(/booking\.payment_status\s*!==\s*["']paid["']/)
  })
})

describe("Wave 6F — F5 (manual top-up only) not violated in app code", () => {
  it("/api/parent/topup does NOT call any auto-topup / PSP path", () => {
    const src = stripComments(read("app/api/parent/topup/route.ts"))
    expect(src).not.toMatch(/auto[_-]?topup/i)
    // Provider is hardcoded to manual.
    expect(src).toMatch(/p_provider:\s*["']manual["']/)
  })

  it("Cash Plus PSP webhook stays env-gated (won't credit until founder flips PSP_AUTO_TOPUP_ENABLED)", () => {
    const src = stripComments(read("app/api/webhooks/cashplus/route.ts"))
    expect(src).toMatch(/processTopupEvent/)
    // Env-gating happens inside lib/payments/psp-webhook.ts; the route must
    // still pull through that helper, not write user_coins directly.
    expect(src).not.toMatch(/from\(["']user_coins["']\)\s*\.\s*(?:update|insert|upsert)/)
  })
})
