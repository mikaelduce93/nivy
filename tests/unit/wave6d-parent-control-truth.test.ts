/**
 * Wave 6D — Parent-control truth static guards.
 */
import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = process.cwd()
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8")
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

describe("Wave 6D — /parent/teens/[id] honest detail page", () => {
  it("page exists (was a silent 404 from /parent/teens cards before Wave 6D)", () => {
    expect(existsSync(resolve(ROOT, "app/parent/teens/[id]/page.tsx"))).toBe(true)
  })

  const src = stripComments(read("app/parent/teens/[id]/page.tsx"))

  it("scopes the lookup to parent_id = caller (defence-in-depth on top of RLS)", () => {
    expect(src).toMatch(/from\("parent_teens_overview"\)/)
    expect(src).toMatch(/\.eq\("parent_id"/)
    expect(src).toMatch(/\.eq\("teen_id"/)
  })

  it("calls notFound() when teen is missing or not linked (no leak of other parents' teens)", () => {
    expect(src).toMatch(/notFound\(\)/)
  })

  it("does NOT synthesise capacity / enrolled_count / fake recent activity", () => {
    for (const ghost of ["capacity:", "enrolled_count:", "recent_activity:", "favorite_events:"]) {
      expect(src, `must not surface fake ${ghost}`).not.toContain(ghost)
    }
  })
})

describe("Wave 6D — /parent/notifications mark-read truth", () => {
  const pageSrc = stripComments(read("app/parent/notifications/page.tsx"))
  const rowSrc = stripComments(read("components/parent/notification-row.tsx"))

  it("page no longer advertises fake auto-mark behaviour", () => {
    // The previous 'Marquage automatique au clic' hint was a lie — there
    // was no mark-read action wired. Wave 6D both ships the action and
    // removes the hint string.
    expect(pageSrc).not.toMatch(/Marquage automatique au clic/)
  })

  it("rows are interactive and call the canonical mark-read endpoint", () => {
    expect(rowSrc).toMatch(/onActivate/)
    expect(rowSrc).toMatch(/\/api\/parent\/notifications\/mark-read/)
  })

  it("mark-read API exists, gates to parent role, scopes by user_id, writes user_notifications", () => {
    const api = stripComments(read("app/api/parent/notifications/mark-read/route.ts"))
    expect(api).toMatch(/userInfo\.role\s*!==\s*"parent"/)
    expect(api).toMatch(/from\("user_notifications"\)/)
    expect(api).toMatch(/\.eq\("user_id",\s*userInfo\.profileId\)/)
  })

  it("mark-all-read API exists, gates to parent role, scopes by user_id, writes user_notifications", () => {
    const api = stripComments(read("app/api/parent/notifications/mark-all-read/route.ts"))
    expect(api).toMatch(/userInfo\.role\s*!==\s*"parent"/)
    expect(api).toMatch(/from\("user_notifications"\)/)
    expect(api).toMatch(/\.eq\("user_id",\s*userInfo\.profileId\)/)
  })
})

describe("Wave 6D — dead /api/notifications/{mark-read,mark-all-read} are 410", () => {
  for (const path of [
    "app/api/notifications/mark-read/route.ts",
    "app/api/notifications/mark-all-read/route.ts",
  ]) {
    it(`${path} is a 410 stub`, () => {
      const src = stripComments(read(path))
      expect(src).toMatch(/status:\s*410/)
      // Must NOT write to the deprecated `notifications` table anymore.
      expect(src).not.toMatch(/from\("notifications"\)\s*\.\s*update/)
    })
  }
})

describe("Wave 6D — /api/parent/* defence-in-depth role gates", () => {
  it("/api/parent/mentor-sessions GET checks userInfo.role === 'parent' (was RLS-only)", () => {
    const src = stripComments(read("app/api/parent/mentor-sessions/route.ts"))
    expect(src).toMatch(/userInfo\.role\s*!==\s*"parent"/)
  })

  it("every /api/parent/* route checks role or auth (sweep)", () => {
    // Crude but useful: every parent route must reference at least one of
    // the canonical auth helpers / admin gates / approval RPC names.
    const fs = require("node:fs") as typeof import("node:fs")
    function* walk(dir: string): Generator<string> {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = `${dir}/${ent.name}`
        if (ent.isDirectory()) yield* walk(p)
        else if (ent.name === "route.ts") yield p
      }
    }
    const offenders: string[] = []
    for (const f of walk(resolve(ROOT, "app/api/parent"))) {
      const src = readFileSync(f, "utf8")
      const stripped = stripComments(src)
      const guarded =
        /getUserRole|admin_roles|parent_approve_|approve_ride|parent_id\s*:\s*user/.test(stripped) ||
        // Some routes resolve auth via supabase.auth.getUser then early-return.
        /supabase\.auth\.getUser/.test(stripped)
      if (!guarded) offenders.push(f.replace(`${ROOT}/`, ""))
    }
    expect(offenders, offenders.join("\n") || "ok").toEqual([])
  })
})
