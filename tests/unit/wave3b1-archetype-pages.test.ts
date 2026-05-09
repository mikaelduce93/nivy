/**
 * Wave 3B.1 — partner archetype intake pages exist + canonical wiring.
 *
 * Verifies via static-source inspection that the new archetype landings:
 *   1. Exist as page.tsx files.
 *   2. Partner-table-backed archetypes use the canonical
 *      MinimalArchetypeWizard (which posts to /api/partners/wizard/submit).
 *   3. None of the new pages POST to the legacy /api/partners/register.
 *   4. None of the new pages call supabase.auth.signUp directly.
 *   5. Influencer pages are permanentRedirect to ambassadeur (canon F3).
 *   6. First-class roles (mentor, driver, coach, teacher) link to the
 *      canonical sign-up or canonical partner wizard, never the legacy one.
 *   7. /partenaires/merci no longer fabricates a placebo random reference.
 */
import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const PAGES = {
  food: "app/devenir-restaurant/page.tsx",
  dj: "app/devenir-dj/page.tsx",
  organisateur: "app/devenir-organisateur/page.tsx",
  createur: "app/devenir-createur/page.tsx",
  anniv_host: "app/devenir-anniv-host/page.tsx",
  mentor: "app/devenir-mentor/page.tsx",
  driver: "app/devenir-driver/page.tsx",
  coach: "app/devenir-coach/page.tsx",
  teacher: "app/devenir-teacher/page.tsx",
  influenceur: "app/devenir-influenceur/page.tsx",
  influenceur_candidature: "app/devenir-influenceur/candidature/page.tsx",
  merci: "app/partenaires/merci/page.tsx",
}

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8")
}

describe("Wave 3B.1 archetype intake pages", () => {
  for (const [name, path] of Object.entries(PAGES)) {
    it(`${name} page exists`, () => {
      expect(existsSync(resolve(process.cwd(), path))).toBe(true)
    })
  }

  it("partner-table-backed pages use MinimalArchetypeWizard (canonical wizard funnel)", () => {
    for (const key of ["food", "dj", "organisateur", "createur"] as const) {
      const src = read(PAGES[key])
      expect(src, `${key}: must import MinimalArchetypeWizard`).toMatch(
        /MinimalArchetypeWizard/,
      )
    }
  })

  it("anniv-host wires to venue with accepts_birthday metadata + offers retail/venue links", () => {
    const src = read(PAGES.anniv_host)
    expect(src).toMatch(/MinimalArchetypeWizard/)
    expect(src).toMatch(/accepts_birthday/)
    expect(src).toMatch(/devenir-restaurant/)
    expect(src).toMatch(/devenir-partenaire/)
  })

  it("first-class role landings (mentor, driver) link to canonical sign-up with role hint", () => {
    expect(read(PAGES.mentor)).toMatch(/\/auth\/sign-up\?role=mentor/)
    expect(read(PAGES.driver)).toMatch(/\/auth\/sign-up\?role=driver/)
  })

  it("first-class role landings do NOT post to /api/partners/wizard/submit", () => {
    for (const key of ["mentor", "driver", "coach", "teacher"] as const) {
      const src = read(PAGES[key])
      expect(src, `${key}: must not import wizard helper`).not.toMatch(
        /submitPartnerWizard|MinimalArchetypeWizard/,
      )
    }
  })

  it("coach + teacher landings point at canonical /devenir-partenaire (NOT a fake direct funnel)", () => {
    expect(read(PAGES.coach)).toMatch(/\/devenir-partenaire/)
    expect(read(PAGES.teacher)).toMatch(/\/devenir-partenaire/)
  })

  it("influencer pages permanentRedirect to ambassadeur (canon F3)", () => {
    const root = read(PAGES.influenceur)
    const cand = read(PAGES.influenceur_candidature)
    expect(root).toMatch(/permanentRedirect\(["']\/devenir-ambassadeur["']\)/)
    expect(cand).toMatch(/permanentRedirect\(["']\/devenir-ambassadeur\/candidature["']\)/)
  })

  it("no archetype landing posts to legacy /api/partners/register", () => {
    for (const [name, path] of Object.entries(PAGES)) {
      const src = read(path)
      expect(
        src,
        `${name}: must not POST to /api/partners/register`,
      ).not.toMatch(/['"]\/api\/partners\/register['"]/)
    }
  })

  it("no archetype landing calls supabase.auth.signUp from the client", () => {
    for (const [name, path] of Object.entries(PAGES)) {
      const src = read(path)
      expect(src, `${name}: must not call auth.signUp`).not.toMatch(
        /\bsupabase\s*\.\s*auth\s*\.\s*signUp\s*\(/,
      )
    }
  })

  it("no archetype landing promises immediate login", () => {
    for (const key of ["food", "dj", "organisateur", "createur", "mentor", "driver"] as const) {
      const src = read(PAGES[key])
      // We accept the marketing words but require either "activation" or
      // "review" or "validation" copy somewhere on the page.
      expect(src).toMatch(/activation|revue|validation|admin/i)
    }
  })

  it("/partenaires/merci reads ?ref= from query params (no random placebo)", () => {
    const src = read(PAGES.merci)
    expect(src).toMatch(/useSearchParams/)
    expect(src).toMatch(/searchParams\.get\(['"]ref['"]\)/)
    // Old placebo path called window.crypto.randomUUID() to fabricate a
    // reference. We accept the rule mentioning the old name in a docstring,
    // but no live call site — that's what the canon §2.1 invariant forbids.
    expect(src).not.toMatch(/window\.crypto/)
    expect(src).not.toMatch(/c\.randomUUID/)
  })
})
