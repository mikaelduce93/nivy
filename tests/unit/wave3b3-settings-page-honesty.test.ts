/**
 * Wave 3B.3 — /partner/settings page no longer carries the canon D2 mock.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8")
}

describe("/partner/settings (canon D2 fix)", () => {
  const page = read("app/partner/settings/page.tsx")
  const form = read("app/partner/settings/partner-settings-form.tsx")

  it("no hardcoded 'Ma Boutique' default", () => {
    expect(page).not.toMatch(/Ma\s*Boutique/i)
    expect(form).not.toMatch(/defaultValue=["']Ma Boutique["']/)
  })

  it("no 'Boutique de vêtements' canon-D2-flagged copy", () => {
    expect(page + form).not.toMatch(/Boutique de vêtements/i)
  })

  it("no 'contact@maboutique.ma' canon-D2-flagged default", () => {
    expect(page + form).not.toMatch(/contact@maboutique\.ma/i)
  })

  it("page is a server component (uses getUserRole)", () => {
    expect(page).toMatch(/getUserRole/)
  })

  it("form patches /api/partner/settings", () => {
    expect(form).toMatch(/\/api\/partner\/settings/)
    expect(form).toMatch(/method:\s*["']PATCH["']/)
  })

  it("form does not allow editing partner_type / status / email", () => {
    // The state hooks on the form must NOT include these.
    expect(form).not.toMatch(/setPartnerType\b/)
    expect(form).not.toMatch(/setStatus\b/)
    expect(form).not.toMatch(/setEmail\b/)
  })
})

describe("/partner/dashboard duplicate fix (canon D6)", () => {
  it("redirects to /partner", () => {
    const src = read("app/partner/dashboard/page.tsx")
    expect(src).toMatch(/permanentRedirect\(["']\/partner["']\)/)
  })
})
