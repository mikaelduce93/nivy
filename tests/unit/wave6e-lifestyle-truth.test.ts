/**
 * Wave 6E — Lifestyle Truth static guards.
 *
 * Closes the lifestyle/supply remediation that Wave 6A started:
 * eliminate every remaining caller of the deprecated `public.clubs`
 * table, ensure no link points at a detail surface that doesn't exist,
 * and verify the marketplace closures from Wave 4C are intact.
 */
import { describe, expect, it } from "vitest"
import { existsSync, readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = process.cwd()
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8")
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

const LEGACY_CLUBS_PATTERN = /\.from\(\s*['"]clubs['"]\s*\)/

describe("Wave 6E — `from('clubs')` is gone from app + lib + components", () => {
  // Each file MUST be free of the legacy pattern after Wave 6E.
  const files = [
    "app/clubs/page.tsx",
    "app/clubs/[slug]/page.tsx",
    "app/admin/clubs/page.tsx",
    "app/admin/clubs/creer/page.tsx",
    "app/admin/clubs/[id]/supprimer/page.tsx",
    "app/sitemap.ts",
    "components/search/search-modal.tsx",
    "lib/server/data-fetching.ts",
  ]
  for (const f of files) {
    it(`${f} no longer queries the deprecated 'clubs' table`, () => {
      const src = stripComments(read(f))
      expect(src).not.toMatch(LEGACY_CLUBS_PATTERN)
    })
  }
})

describe("Wave 6E — /clubs/[slug] is a permanentRedirect to /clubs", () => {
  const path = "app/clubs/[slug]/page.tsx"
  it("is a small redirect stub (< 2 KB — still tiny vs. real pages)", () => {
    expect(existsSync(resolve(ROOT, path))).toBe(true)
    expect(statSync(resolve(ROOT, path)).size).toBeLessThan(2048)
  })
  it("calls permanentRedirect('/clubs')", () => {
    const src = read(path)
    expect(src).toMatch(/permanentRedirect\(\s*["']\/clubs["']\s*\)/)
  })
})

describe("Wave 6E — /admin/clubs tree is permanentRedirect to /admin", () => {
  for (const path of [
    "app/admin/clubs/page.tsx",
    "app/admin/clubs/creer/page.tsx",
    "app/admin/clubs/[id]/supprimer/page.tsx",
  ]) {
    it(`${path} is a small redirect stub`, () => {
      expect(existsSync(resolve(ROOT, path))).toBe(true)
      expect(statSync(resolve(ROOT, path)).size).toBeLessThan(2048)
      const src = read(path)
      expect(src).toMatch(/permanentRedirect\(\s*["']\/admin["']\s*\)/)
    })
  }

  it("admin sidebar no longer links to /admin/clubs", () => {
    const src = stripComments(read("components/layouts/admin-sidebar.tsx"))
    expect(src).not.toMatch(/href:\s*['"]\/admin\/clubs['"]/)
  })
})

describe("Wave 6E — sitemap drops dead /clubs/[slug] URLs", () => {
  const src = stripComments(read("app/sitemap.ts"))
  it("does not query the legacy clubs table", () => {
    expect(src).not.toMatch(LEGACY_CLUBS_PATTERN)
  })
  it("does not emit /clubs/${slug} URLs anywhere", () => {
    expect(src).not.toMatch(/\/clubs\/\$\{[^}]*slug/)
  })
  it("/clubs index URL is still in the static list", () => {
    expect(src).toMatch(/\/clubs(?:`|"|')/)
  })
})

describe("Wave 6E — search modal no longer surfaces clubs", () => {
  const src = stripComments(read("components/search/search-modal.tsx"))
  it("no `from('clubs')` query", () => {
    expect(src).not.toMatch(LEGACY_CLUBS_PATTERN)
  })
  it("no /clubs/${id} or /clubs/${slug} link in search results", () => {
    expect(src).not.toMatch(/href:\s*`\/clubs\/\$\{/)
  })
})

describe("Wave 6E — data-fetching exports no longer back legacy clubs", () => {
  const src = stripComments(read("lib/server/data-fetching.ts"))
  it("getClubs export removed", () => {
    expect(src).not.toMatch(/export\s+const\s+getClubs\b/)
  })
  it("getClubBySlug export removed", () => {
    expect(src).not.toMatch(/export\s+const\s+getClubBySlug\b/)
  })
  it("getAdminStats no longer counts the deprecated clubs table", () => {
    expect(src).not.toMatch(/clubsCount/)
    expect(src).not.toMatch(LEGACY_CLUBS_PATTERN)
  })
})

describe("Wave 6E — marketplace Wave 4C closures not regressed", () => {
  const src = stripComments(read("app/api/marketplace/listings/[id]/route.ts"))
  it("GET / PATCH / DELETE all present", () => {
    expect(src).toMatch(/export\s+async\s+function\s+GET\b/)
    expect(src).toMatch(/export\s+async\s+function\s+PATCH\b/)
    expect(src).toMatch(/export\s+async\s+function\s+DELETE\b/)
  })
  it("non-active listings remain gated to seller + admin (Wave 4C)", () => {
    expect(src).toMatch(/PUBLIC_VISIBLE_STATUSES/)
  })
})

describe("Wave 6E — bookings/agenda do not synthesize fake supply", () => {
  it("/api/bookings/create starts bookings as pending_payment (Wave 4C)", () => {
    const src = stripComments(read("app/api/bookings/create/route.ts"))
    expect(src).toMatch(/payment_status:\s*["']pending["']/)
    expect(src).toMatch(/status:\s*["']pending_payment["']/)
  })
})
