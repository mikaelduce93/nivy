/**
 * Wave 6C — Gamification Truth static guards.
 *
 * Each test attests one truth invariant from the audit (CANON-GAME-* and
 * the parallel token economy):
 *   1. /api/teen/quests/start no longer falls back to writing
 *      `quests.status` on the global content row (CANON-GAME-010).
 *   2. /api/teen/quests/complete no longer falls back to writing
 *      `quests.status` (CANON-GAME-011).
 *   3. The deprecated token economy route is fully REMOVED (Axe 3 / canon
 *      §5.1): app/api/teen/tokens/* and components/tokens/* are deleted,
 *      and migration 198 drops the token_* + daily_bonuses rails. The
 *      coin wallet (user_coins) is canonical. (Was Wave 6C 410-stub; the
 *      route is now gone, so these guards moved to the deletion itself.)
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
