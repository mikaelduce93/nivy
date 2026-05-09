/**
 * Wave 6J — Gamification truth static guards.
 *
 *   1. Quest complete is idempotent: a replay never re-grants XP.
 *   2. Direct XP writes (users.xp / profiles.xp / teen_profiles.xp /
 *      user_xp.total_xp) are forbidden in app code — XP only moves via
 *      add_xp_to_user RPC. Confirms canon §7 from a fresh sweep.
 *   3. Wave 6C closures intact: no quests.status direct write,
 *      /api/teen/tokens POST stays 410, /api/teen/shop stays 410.
 *   4. Leaderboard reads canonical user_xp + falls back to honest
 *      "unavailable" on error (no fake rankings).
 */
import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = process.cwd()
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8")
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

const COMPLETE = "app/api/teen/quests/complete/route.ts"

describe("Wave 6J — quest complete idempotency (no double XP on replay)", () => {
  const src = stripComments(read(COMPLETE))

  it("pre-checks quest_progress.status before granting XP", () => {
    expect(src).toMatch(/from\(['"]quest_progress['"]\)\s*\.\s*select\(['"]status['"]\)/)
    expect(src).toMatch(/existingProgress\?\.status\s*===\s*['"]completed['"]/)
  })

  it("uses an `alreadyCompleted` flag to gate the XP grant", () => {
    expect(src).toMatch(/let\s+alreadyCompleted\s*=\s*false/)
    expect(src).toMatch(/!\s*alreadyCompleted[\s\S]{0,300}rpc\(['"]add_xp_to_user['"]/)
  })

  it("daily_challenges branch also pre-checks status='completed'", () => {
    expect(src).toMatch(/from\(['"]daily_challenges['"]\)[\s\S]{0,400}status[\s\S]{0,400}===\s*['"]completed['"]/)
  })

  it("returns idempotent_replay flag + xpEarned: <0|granted>", () => {
    expect(src).toMatch(/idempotent_replay:\s*alreadyCompleted/)
    expect(src).toMatch(/xpEarned:\s*xpAwarded/)
  })

  it("only inserts activity feed row on fresh completion (no double log)", () => {
    expect(src).toMatch(/!\s*alreadyCompleted[\s\S]{0,400}from\(['"]activities['"]\)\s*\.\s*insert/)
  })

  it("XP grant still uses canonical RPC with full source metadata", () => {
    expect(src).toMatch(/rpc\(['"]add_xp_to_user['"]/)
    expect(src).toMatch(/p_source_category:\s*['"]quest['"]/)
    expect(src).toMatch(/p_source_id:\s*questId/)
    expect(src).toMatch(/p_description:/)
  })

  it("XP RPC error returns 500 (no silent fake-success)", () => {
    expect(src).toMatch(/xpError[\s\S]{0,200}status:\s*500/)
  })
})

describe("Wave 6J — no direct XP writes anywhere in app/", () => {
  const ROUTES = ["app/api", "app/teen", "app/parent", "app/admin", "app/partner", "app/ambassador", "app/mentor"]

  function* walk(dir: string): Generator<string> {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${ent.name}`
      if (ent.isDirectory()) yield* walk(p)
      else if (/\.(ts|tsx)$/.test(ent.name)) yield p
    }
  }

  // Direct XP writes are forbidden. Allowed XP movements: add_xp_to_user RPC,
  // award_creator_xp RPC. Anything else writing total_xp / user_xp counter /
  // profiles.xp / users.xp is a phantom path.
  const FORBIDDEN_XP_WRITE = [
    /\.from\(['"]users['"]\)\s*\.\s*update\([^)]*\bxp\s*:/,
    /\.from\(['"]profiles['"]\)\s*\.\s*update\([^)]*\bxp\s*:/,
    /\.from\(['"]teen_profiles['"]\)\s*\.\s*update\([^)]*\bxp\s*:/,
    /\.from\(['"]user_xp['"]\)\s*\.\s*update\([^)]*total_xp\s*:/,
    /\.from\(['"]user_xp['"]\)\s*\.\s*upsert\([^)]*total_xp\s*:/,
  ]

  // Wave 6J — explicit allow-list. XP-as-currency consumption (the
  // hybrid-payment + XP-only payment rails) writes user_xp.total_xp
  // directly today. Whether XP-spending should be a canonical RPC
  // (`spend_teen_xp`-style) is a founder decision; those routes are
  // out of Wave 6J scope. The allow-list freezes the current count
  // so any NEW direct-write surface fails the test.
  const ALLOW = new Set([
    "app/api/payments/xp/route.ts",
    "app/api/payments/hybrid/route.ts",
  ])

  it("zero direct XP writes in app code (outside the XP-as-currency allow-list)", () => {
    const offenders: string[] = []
    for (const root of ROUTES) {
      let exists = false
      try {
        exists = statSync(resolve(ROOT, root)).isDirectory()
      } catch {
        continue
      }
      if (!exists) continue
      for (const f of walk(resolve(ROOT, root))) {
        // Normalize Windows backslashes + strip the absolute prefix so
        // the relative path matches the allow-list keys exactly.
        const normalized = f.replace(/\\/g, "/")
        const rootNorm = ROOT.replace(/\\/g, "/")
        const rel = normalized.startsWith(rootNorm + "/")
          ? normalized.slice(rootNorm.length + 1)
          : normalized
        if (ALLOW.has(rel)) continue
        let src: string
        try {
          src = readFileSync(f, "utf8")
        } catch {
          continue
        }
        const stripped = stripComments(src)
        for (const re of FORBIDDEN_XP_WRITE) {
          if (re.test(stripped)) {
            offenders.push(`${rel} :: ${re.source}`)
            break
          }
        }
      }
    }
    expect(offenders, offenders.join("\n") || "ok").toEqual([])
  })
})

describe("Wave 6J — Wave 6C closures still intact", () => {
  it("/api/teen/quests/start does NOT write quests.status directly", () => {
    const src = stripComments(read("app/api/teen/quests/start/route.ts"))
    expect(src).not.toMatch(/from\(['"]quests['"]\)\s*\.\s*update\(\s*\{[\s\S]{0,80}status:/)
  })

  it("/api/teen/quests/complete does NOT write quests.status directly", () => {
    const src = stripComments(read(COMPLETE))
    expect(src).not.toMatch(/from\(['"]quests['"]\)\s*\.\s*update\(\s*\{[\s\S]{0,80}status:\s*['"]completed['"]/)
  })

  it("/api/teen/tokens POST stays 410", () => {
    const src = stripComments(read("app/api/teen/tokens/route.ts"))
    expect(src).toMatch(/function\s+deprecated[\s\S]{0,400}status:\s*410/)
  })

  it("/api/teen/shop stays 410", () => {
    const src = stripComments(read("app/api/teen/shop/route.ts"))
    expect(src).toMatch(/status:\s*410/)
  })

  it("no token_redemptions / token_rewards writes in /api/teen/tokens", () => {
    const src = stripComments(read("app/api/teen/tokens/route.ts"))
    expect(src).not.toMatch(/from\(['"]token_redemptions['"]\)\s*\.\s*insert/)
    expect(src).not.toMatch(/from\(['"]token_rewards['"]\)\s*\.\s*update/)
  })
})

describe("Wave 6J — leaderboard truth (no fake rankings)", () => {
  const src = stripComments(read("app/api/teen/leaderboard/route.ts"))

  it("reads canonical user_xp (not deprecated tables)", () => {
    expect(src).toMatch(/from\(['"]user_xp['"]\)/)
  })

  it("falls back to status='unavailable' on error (no fake rankings)", () => {
    expect(src).toMatch(/status:\s*['"]unavailable['"]/)
    expect(src).toMatch(/rankings:\s*\[\]/)
  })

  it("no hardcoded mock rank/progression constants", () => {
    // Sanity: no "rank: 1" / "rank: 2" sprinkled as fake data.
    expect(src).not.toMatch(/rank:\s*1\s*,\s*\n[\s\S]{0,40}rank:\s*2/)
  })
})
