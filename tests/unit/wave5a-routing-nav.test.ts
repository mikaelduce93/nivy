/**
 * Wave 5A — static guard for routing & navigation truth.
 *
 * 1. The dead `app/(dashboard)` route group + 3 dead nav components are
 *    actually deleted (no resurrection by accident).
 * 2. Mobile dock contains no links to routes that don't exist on disk.
 * 3. Legacy bare paths (/autorisations, /notifications, …) are now
 *    permanentRedirect stubs, not full pages.
 * 4. No `<Link href="/dashboard|/notifications|/profile/…|/mes-reservations|
 *    /mon-compte|/events…">` in app/ or components/ outside the canonical
 *    redirect stubs.
 */
import { describe, expect, it } from "vitest"
import { existsSync, readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"
import { execSync } from "node:child_process"

const ROOT = process.cwd()
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8")

function listAppComponentSources(): string[] {
  return execSync(
    'git ls-files "app/**/*.ts" "app/**/*.tsx" "components/**/*.ts" "components/**/*.tsx"',
    { encoding: "utf8", cwd: ROOT },
  )
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
}

describe("Wave 5A — dead surfaces are gone", () => {
  it("app/(dashboard) route group is removed", () => {
    expect(existsSync(resolve(ROOT, "app/(dashboard)"))).toBe(false)
  })
  it("components/dashboard/sidebar.tsx is removed", () => {
    expect(existsSync(resolve(ROOT, "components/dashboard/sidebar.tsx"))).toBe(false)
  })
  it("components/dashboard/header.tsx is removed", () => {
    expect(existsSync(resolve(ROOT, "components/dashboard/header.tsx"))).toBe(false)
  })
  it("components/layouts/app-sidebar.tsx is removed", () => {
    expect(existsSync(resolve(ROOT, "components/layouts/app-sidebar.tsx"))).toBe(false)
  })
  it("layouts barrel no longer re-exports AppSidebar", () => {
    const src = read("components/layouts/index.ts")
    expect(src).not.toMatch(/export\s*\{\s*AppSidebar\s*\}/)
  })
})

describe("Wave 5A — mobile dock points only at routes that exist", () => {
  const src = read("components/layouts/mobile-dock.tsx")
  const routesUsed = Array.from(src.matchAll(/href:\s*"(\/[^"]+)"/g)).map((m) => m[1]!)
  // Strip query/anchor, keep just the path.
  const paths = Array.from(new Set(routesUsed.map((r) => r.split("?")[0]!.split("#")[0]!)))

  it("emits at least 5 nav targets per role group", () => {
    expect(paths.length).toBeGreaterThan(15)
  })

  for (const p of [
    "/teen", "/teen/quests", "/teen/social", "/teen/wallet", "/teen/profile",
    "/partner", "/partner/offers", "/partner/events", "/partner/stats", "/partner/settings",
    "/admin", "/admin/evenements", "/admin/moderation", "/admin/analytics", "/admin/logs",
    "/ambassador", "/ambassador/referrals", "/ambassador/boutique", "/ambassador/withdrawals", "/ambassador/commissions",
    "/agenda", "/anniversaires", "/clubs",
  ]) {
    if (paths.includes(p)) {
      it(`mobile dock target ${p} exists on disk`, () => {
        const candidate = resolve(ROOT, "app", p.replace(/^\//, ""), "page.tsx")
        expect(existsSync(candidate), `expected ${candidate}`).toBe(true)
      })
    }
  }

  it("mobile dock no longer points at the old dead routes", () => {
    for (const dead of [
      "/admin/events",
      "/admin/users",
      "/admin/settings",
      "/partner/profile",
      "/ambassador/shop",
      "/ambassador/profile",
      "/gamification",
      "/espace",
    ]) {
      expect(paths, `${dead} must be gone from dock`).not.toContain(dead)
    }
  })
})

describe("Wave 5A — legacy bare paths are permanentRedirect stubs", () => {
  const stubs = [
    ["app/autorisations/page.tsx", "/parent/approvals"],
    ["app/autorisations/ajouter/page.tsx", "/parent/approvals"],
    ["app/notifications/page.tsx", "/auth/redirect"],
    ["app/notifications/preferences/page.tsx", "/auth/redirect"],
  ] as const
  for (const [path, target] of stubs) {
    it(`${path} is a permanentRedirect to ${target}`, () => {
      expect(existsSync(resolve(ROOT, path))).toBe(true)
      const src = read(path)
      // small file (redirect stub, not a real page)
      expect(statSync(resolve(ROOT, path)).size).toBeLessThan(800)
      expect(src).toMatch(/permanentRedirect\(/)
      expect(src).toContain(target)
    })
  }
})

describe("Wave 5A — no forbidden Link hrefs in app/ + components/", () => {
  const files = listAppComponentSources()

  function scan(re: RegExp, allowedFiles: RegExp[] = []): string[] {
    const hits: string[] = []
    for (const f of files) {
      if (allowedFiles.some((rx) => rx.test(f))) continue
      let src: string
      try {
        src = readFileSync(resolve(ROOT, f), "utf8")
      } catch {
        continue
      }
      if (re.test(stripComments(src))) hits.push(f)
    }
    return hits
  }

  it('no <Link href="/dashboard…">', () => {
    const hits = scan(/href\s*=\s*["']\/dashboard(\/[^"']*)?["']/)
    expect(hits, hits.join("\n") || "ok").toEqual([])
  })
  it('no <Link href="/notifications…"> outside app/notifications', () => {
    const hits = scan(/href\s*=\s*["']\/notifications(\/[^"']*)?["']/, [/app[\\/]notifications[\\/]/])
    expect(hits, hits.join("\n") || "ok").toEqual([])
  })
  it('no <Link href="/profile…">', () => {
    const hits = scan(/href\s*=\s*["']\/profile(\/[^"']*|["'])/)
    expect(hits, hits.join("\n") || "ok").toEqual([])
  })
  it('no <Link href="/mes-reservations…"> or "/mon-compte…">', () => {
    const hits = scan(/href\s*=\s*["']\/(mes-reservations|mon-compte)(\/[^"']*)?["']/)
    expect(hits, hits.join("\n") || "ok").toEqual([])
  })
  it('no <Link href="/autorisations…"> outside the redirect stub', () => {
    const hits = scan(/href\s*=\s*["']\/autorisations(\/[^"']*)?["']/, [/app[\\/]autorisations[\\/]/])
    expect(hits, hits.join("\n") || "ok").toEqual([])
  })
  it('no <Link href="/events…"> (canonical is /agenda…)', () => {
    const hits = scan(/href\s*=\s*["']\/events(\/[^"']*|["'])/)
    expect(hits, hits.join("\n") || "ok").toEqual([])
  })
})
