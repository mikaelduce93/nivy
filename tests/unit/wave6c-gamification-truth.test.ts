/**
 * Wave 6C — Gamification Truth static guards.
 *
 * Each test attests one truth invariant from the audit (CANON-GAME-* and
 * the parallel token economy):
 *   1. /api/teen/quests/start no longer falls back to writing
 *      `quests.status` on the global content row (CANON-GAME-010).
 *   2. /api/teen/quests/complete no longer falls back to writing
 *      `quests.status` (CANON-GAME-011).
 *   3. /api/teen/tokens POST is fully deprecated (410). No phantom
 *      RPCs (`spend_tokens`, `transfer_tokens`, `add_tokens_to_user`,
 *      `claim_daily_bonus`) remain. No `notifications` direct write.
 *   4. The canonical XP grant in /api/teen/quests/complete carries the
 *      required source_category + source_id + description so the audit
 *      ledger has a real reason for every credit.
 *   5. /api/teen/shop stays gone (Wave 1B closure not regressed).
 */
import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = process.cwd()
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8")
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

describe("Wave 6C — quest start/complete no longer corrupt the catalogue", () => {
  it("/api/teen/quests/start does NOT write quests.status (CANON-GAME-010)", () => {
    const src = stripComments(read("app/api/teen/quests/start/route.ts"))
    expect(src).not.toMatch(/from\(['"]quests['"]\)[\s\S]{0,80}\.update\(\s*\{[\s\S]{0,80}status:/)
  })

  it("/api/teen/quests/start surfaces a 500 if quest_progress upsert fails (no fake success)", () => {
    const src = stripComments(read("app/api/teen/quests/start/route.ts"))
    expect(src).toMatch(/progressError[\s\S]{0,300}status:\s*500/)
  })

  it("/api/teen/quests/complete does NOT write quests.status (CANON-GAME-011)", () => {
    const src = stripComments(read("app/api/teen/quests/complete/route.ts"))
    // The status: 'completed' literal must not be written against the global
    // catalogue. The canonical sport-challenge route also writes a status,
    // but it's against `daily_challenges`, not `quests` — that one is fine.
    expect(src).not.toMatch(/from\(['"]quests['"]\)[\s\S]{0,80}\.update\(\s*\{[\s\S]{0,80}status:\s*['"]completed['"]/)
  })

  it("/api/teen/quests/complete surfaces a 500 if quest_progress upsert fails", () => {
    const src = stripComments(read("app/api/teen/quests/complete/route.ts"))
    // Look for the error path inside the quest branch.
    expect(src).toMatch(/progressError[\s\S]{0,400}status:\s*500/)
  })
})

describe("Wave 6C — XP grants carry full audit reason", () => {
  it("/api/teen/quests/complete uses canonical add_xp_to_user with source_category + source_id + description", () => {
    const src = stripComments(read("app/api/teen/quests/complete/route.ts"))
    expect(src).toMatch(/rpc\(\s*['"]add_xp_to_user['"]/)
    expect(src).toMatch(/p_source_category:/)
    expect(src).toMatch(/p_source_id:/)
    expect(src).toMatch(/p_description:/)
    // No silent catch-and-fake-success; XP RPC error must surface.
    expect(src).toMatch(/xpError[\s\S]{0,300}status:\s*500/)
  })

  it("no phantom XP RPC names remain in app code (canon §8 deprecated rails)", () => {
    // We reuse the canon scanner's regex idea, but localised to this file
    // path so the test stays a tight static guard rather than a repo-wide
    // grep (the canon scanner already covers that).
    for (const f of [
      "app/api/teen/quests/start/route.ts",
      "app/api/teen/quests/complete/route.ts",
      "app/api/teen/tokens/route.ts",
    ]) {
      const src = stripComments(read(f))
      for (const phantom of ["add_user_xp", "deduct_user_xp", "get_user_xp"]) {
        expect(src, `${f} must not call phantom RPC ${phantom}`).not.toMatch(
          new RegExp(`\\bsupabase\\.rpc\\(['"]${phantom}['"]`),
        )
      }
    }
  })
})

describe("Wave 6C — /api/teen/tokens POST is deprecated (410)", () => {
  const src = stripComments(read("app/api/teen/tokens/route.ts"))

  it("POST returns 410 with deprecation guidance — no phantom RPC, no notifications write", () => {
    // The early-return short-circuit exists.
    expect(src).toMatch(/function\s+deprecated\s*\([\s\S]{0,400}status:\s*410/)
    // POST handler returns it.
    expect(src).toMatch(/export\s+async\s+function\s+POST[\s\S]{0,400}return\s+deprecated/)
  })

  it("no phantom token RPCs remain in the file", () => {
    for (const phantom of [
      "spend_tokens",
      "transfer_tokens",
      "add_tokens_to_user",
      "claim_daily_bonus",
      "exchange_tokens",
    ]) {
      expect(src, `tokens route must not call phantom RPC ${phantom}`).not.toMatch(
        new RegExp(`\\bsupabase\\.rpc\\(['"]${phantom}['"]`),
      )
    }
  })

  it("no direct write to deprecated `notifications` table", () => {
    expect(src).not.toMatch(/from\(['"]notifications['"]\)\s*\.\s*insert/)
  })

  it("no read/write of deprecated token_rewards / token_redemptions in mutation paths", () => {
    expect(src).not.toMatch(/from\(['"]token_redemptions['"]\)\s*\.\s*insert/)
    // token_rewards reads in GET stay allowed; we only check writes/updates.
    expect(src).not.toMatch(/from\(['"]token_rewards['"]\)\s*\.\s*update/)
  })
})

describe("Wave 6C — /api/teen/shop deprecation not regressed", () => {
  it("file exists and returns 410 from both GET and POST", () => {
    const path = resolve(ROOT, "app/api/teen/shop/route.ts")
    expect(existsSync(path)).toBe(true)
    const src = stripComments(read("app/api/teen/shop/route.ts"))
    expect(src).toMatch(/status:\s*410/)
    expect(src).toMatch(/export\s+async\s+function\s+GET/)
    expect(src).toMatch(/export\s+async\s+function\s+POST/)
  })
})
