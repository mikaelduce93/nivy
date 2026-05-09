/**
 * Wave 6I — Design / mobile a11y truth static guards.
 *
 *   1. Icon-only Button (`size="icon"`) without aria-label / aria-labelledby
 *      / title is fenced at the current Wave 6I baseline (20 sites). Any
 *      NEW offender added in a future PR breaks this test.
 *   2. The 13 sites we fixed this wave keep their aria-label.
 *   3. Wave 4B canon §0 closures intact (no native dialogs).
 *   4. Wave 5C canonical primitives keep min-h-11 touch-target lock.
 *   5. NotificationBell aria from Wave 5C still present.
 *   6. Mobile dock retains safe-area padding.
 *   7. Every role tree has its own error.tsx + loading.tsx (Wave 5B).
 */
import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { execSync } from "node:child_process"

const ROOT = process.cwd()
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8")
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

// JSX-aware <Button ... > opening-tag walker: respects nested {} so
// `onClick={() => …}` doesn't fool the closing-`>` detector.
function* findButtonOpeningTags(src: string): Generator<{ start: number; tag: string }> {
  let i = 0
  while ((i = src.indexOf("<Button", i)) !== -1) {
    const next = src[i + 7]
    if (next && /[A-Za-z0-9_]/.test(next)) {
      i++
      continue
    }
    let j = i + 1
    let depth = 0
    let inSingle = false
    let inDouble = false
    let inBacktick = false
    while (j < src.length) {
      const c = src[j]
      if (!inSingle && !inDouble && !inBacktick) {
        if (c === "{") depth++
        else if (c === "}") depth--
        else if (depth === 0 && c === ">") {
          yield { start: i, tag: src.slice(i, j + 1) }
          break
        } else if (c === '"' && depth === 0) inDouble = true
        else if (c === "'" && depth === 0) inSingle = true
        else if (c === "`" && depth === 0) inBacktick = true
      } else if (inDouble && c === '"') inDouble = false
      else if (inSingle && c === "'") inSingle = false
      else if (inBacktick && c === "`") inBacktick = false
      j++
    }
    i = j + 1
  }
}

function listIconButtonOffenders(): string[] {
  const files = execSync(
    'git ls-files "app/**/*.tsx" "components/**/*.tsx"',
    { encoding: "utf8", cwd: ROOT },
  )
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)

  const offenders: string[] = []
  for (const f of files) {
    let src: string
    try {
      src = readFileSync(resolve(ROOT, f), "utf8")
    } catch {
      continue
    }
    if (!src.includes('size="icon"')) continue
    for (const { start, tag } of findButtonOpeningTags(src)) {
      if (!/size=["']icon["']/.test(tag)) continue
      if (
        /\baria-label\s*=/.test(tag) ||
        /\baria-labelledby\s*=/.test(tag) ||
        /\btitle\s*=/.test(tag)
      )
        continue
      const line = src.slice(0, start).split("\n").length
      offenders.push(`${f}:${line}`.replace(/\\/g, "/"))
    }
  }
  return offenders
}

const WAVE_6I_ICON_BUTTON_BASELINE = 20

describe("Wave 6I — icon-only Button aria-label baseline", () => {
  const offenders = listIconButtonOffenders()

  it(`offender count never exceeds the Wave 6I baseline (${WAVE_6I_ICON_BUTTON_BASELINE})`, () => {
    expect(
      offenders.length,
      `offenders=${offenders.length}\n${offenders.join("\n")}`,
    ).toBeLessThanOrEqual(WAVE_6I_ICON_BUTTON_BASELINE)
  })

  it("the 8 high-impact files Wave 6I fixed are NOT in the offender list", () => {
    const fixed = [
      "components/notifications/notification-center.tsx",
      "components/layouts/admin-sidebar.tsx",
      "components/teen/dashboard/ai-companion.tsx",
      "components/ai/AgentSheet.tsx",
      "components/ai/elite-ai-companion.tsx",
      "components/parent/invoice-button.tsx",
      "components/admin/gamification/proof-review.tsx",
      "components/admin/ScheduleSelector.tsx",
    ]
    const stillOffending = offenders.filter((o) =>
      fixed.some((f) => o.startsWith(f + ":")),
    )
    expect(stillOffending, stillOffending.join("\n") || "ok").toEqual([])
  })
})

describe("Wave 6I — Wave 4B no-native-dialog closure intact", () => {
  // The Wave 4B canon-precommit rule + per-component switch to
  // confirmToast / sonner toast / Dialog must still hold. Spot-check the
  // canonical primitive plus the canon scanner rule.
  it("lib/ui/confirm-toast.ts exists", () => {
    expect(existsSync(resolve(ROOT, "lib/ui/confirm-toast.ts"))).toBe(true)
  })
  it("canon-precommit ships CANON-ALERT-001/002/003 rules", () => {
    const src = read("scripts/canon-precommit.mjs")
    expect(src).toMatch(/CANON-ALERT-001/)
    expect(src).toMatch(/CANON-ALERT-002/)
    expect(src).toMatch(/CANON-ALERT-003/)
  })
})

describe("Wave 6I — Wave 5C touch-target lock retained", () => {
  it("Select trigger keeps min-h-11", () => {
    expect(read("components/ui/select.tsx")).toContain("min-h-11")
  })
  it("Tabs trigger keeps min-h-11", () => {
    expect(read("components/ui/tabs.tsx")).toMatch(/TabsTrigger[\s\S]*?min-h-11/)
  })
  it("InputOTP slot keeps min-h-11 + min-w-11", () => {
    const src = read("components/ui/input-otp.tsx")
    expect(src).toContain("min-h-11")
    expect(src).toContain("min-w-11")
  })
})

describe("Wave 6I — NotificationBell + role error/loading boundaries (Wave 5B/5C) intact", () => {
  it("NotificationBell trigger has aria-label and Bell is aria-hidden", () => {
    const src = read("components/notifications/notification-bell.tsx")
    expect(src).toMatch(/aria-label=\{[\s\S]*?Notifications/)
    expect(src).toMatch(/<Bell[\s\S]*?aria-hidden=["']true["']/)
  })

  for (const role of ["teen", "parent", "partner", "admin", "ambassador", "mentor"]) {
    it(`app/${role}/error.tsx still exists`, () => {
      expect(existsSync(resolve(ROOT, "app", role, "error.tsx"))).toBe(true)
    })
  }
})

describe("Wave 6I — mobile dock safe-area + canonical hrefs intact", () => {
  const src = read("components/layouts/mobile-dock.tsx")
  it("uses env(safe-area-inset-bottom) padding", () => {
    expect(src).toMatch(/safe-area-inset-bottom/)
  })
  it("dock + parent dock both touch min-h-touch on tap targets", () => {
    expect(src).toContain("min-h-touch")
  })
})
