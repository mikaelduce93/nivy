/**
 * Wave 6A — /clubs must query the canonical `sport_clubs` table, not the
 * deprecated `public.clubs` (which doesn't exist in the prod schema and
 * surfaces as PGRST205 at runtime).
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = process.cwd()
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8")
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

describe("Wave 6A — /clubs canonical table", () => {
  const src = stripComments(read("app/clubs/page.tsx"))

  it("queries sport_clubs", () => {
    expect(src).toMatch(/\.from\(["']sport_clubs["']\)/)
  })

  it("never queries the deprecated `clubs` table", () => {
    expect(src).not.toMatch(/\.from\(["']clubs["']\)/)
  })

  it("filters on is_active = true (no soft-deleted / draft rows)", () => {
    expect(src).toMatch(/\.eq\(["']is_active["']\s*,\s*true\)/)
  })

  it("does not synthesise a fake slug for sport_clubs rows", () => {
    // The detail page isn't wired to sport_clubs yet (Wave 6A explicit
    // out-of-scope). The list must therefore not invent slugs that
    // would link to a silent 404.
    expect(src).toMatch(/slug:\s*undefined/)
  })

  it("does not invent fake fields (capacity, enrolled_count, schedule, price_per_session, age_*)", () => {
    // sport_clubs has none of these; the page must not fake them with
    // placeholders or hardcoded numbers.
    for (const ghost of ["capacity", "enrolled_count", "schedule:", "price_per_session:", "age_min:", "age_max:"]) {
      expect(src, `must not surface ${ghost} from sport_clubs`).not.toContain(ghost)
    }
  })
})

describe("Wave 6A — clubs-list-client guards the slug-less case", () => {
  const src = stripComments(read("components/features/clubs/clubs-list-client.tsx"))

  it("Club.slug is optional", () => {
    expect(src).toMatch(/slug\?\s*:\s*string/)
  })

  it("CTA is gated on club.slug existing (no broken-link CTA)", () => {
    // Either `club.slug ? <Link …> : …` or equivalent guard.
    expect(src).toMatch(/club\.slug\s*\?[\s\S]{0,200}<Link/)
  })
})
