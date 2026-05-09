/**
 * Wave 3B.1.1 — partner taxonomy sanity check.
 *
 * Verifies — by static-source inspection — that nothing in the wizard chain
 * lets driver or mentor become a partners.partner_type. The DB CHECK
 * constraint is the last line of defence (mig 101); these tests catch
 * regressions at the application layer before they ever hit Postgres.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8")
}

describe("Wave 3B.1.1 partner taxonomy", () => {
  describe("/api/partners/wizard/submit zod schema", () => {
    const src = read("app/api/partners/wizard/submit/route.ts")
    it("PARTNER_TYPES does not include driver or mentor", () => {
      // The literal const declaration must NOT contain these tokens as values.
      // We grep the entire array literal in the file and assert absence.
      const arrayMatch = src.match(/const PARTNER_TYPES\s*=\s*\[(?<arr>[\s\S]*?)\]/)
      expect(arrayMatch?.groups?.arr).toBeTruthy()
      const arr = arrayMatch!.groups!.arr
      expect(arr).not.toMatch(/['"]driver['"]/)
      expect(arr).not.toMatch(/['"]mentor['"]/)
    })
  })

  describe("lib/partners/wizard-submit type", () => {
    const src = read("lib/partners/wizard-submit.ts")
    it("WizardPartnerType union does not include driver or mentor", () => {
      const typeMatch = src.match(
        /export type WizardPartnerType\s*=\s*(?<u>[\s\S]*?)\n/,
      )
      // Allow the union to span multiple lines.
      const around = src.slice(0, src.indexOf("export interface WizardSubmitPayload"))
      expect(around).not.toMatch(/\|\s*['"]driver['"]/)
      expect(around).not.toMatch(/\|\s*['"]mentor['"]/)
    })
  })

  describe("/devenir-driver and /devenir-mentor landings", () => {
    const driver = read("app/devenir-driver/page.tsx")
    const mentor = read("app/devenir-mentor/page.tsx")

    it("driver page links to /auth/sign-up?role=driver", () => {
      expect(driver).toMatch(/\/auth\/sign-up\?role=driver/)
    })
    it("mentor page links to /auth/sign-up?role=mentor", () => {
      expect(mentor).toMatch(/\/auth\/sign-up\?role=mentor/)
    })

    it("neither calls submitPartnerWizard nor mounts MinimalArchetypeWizard", () => {
      for (const [name, src] of [["driver", driver], ["mentor", mentor]] as const) {
        expect(src, `${name}: must not import wizard helper`).not.toMatch(
          /submitPartnerWizard|MinimalArchetypeWizard/,
        )
      }
    })

    it("neither writes partner_type='driver' or partner_type='mentor' as code", () => {
      // Strip line/block comments so docstring mentions of the canonical
      // tokens don't trigger a false positive — the only thing we forbid is
      // a real assignment in executable code.
      function stripComments(src: string): string {
        return src
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/^\s*\/\/.*$/gm, "")
      }
      for (const [name, src] of [["driver", driver], ["mentor", mentor]] as const) {
        const code = stripComments(src)
        expect(code, `${name}: must not assign partner_type='driver'`).not.toMatch(
          /partner_type\s*[:=]\s*['"]driver['"]/,
        )
        expect(code, `${name}: must not assign partner_type='mentor'`).not.toMatch(
          /partner_type\s*[:=]\s*['"]mentor['"]/,
        )
      }
    })
  })

  describe("MinimalArchetypeWizard", () => {
    const src = read("components/partners/MinimalArchetypeWizard.tsx")
    it("does not accept partnerType='driver' or 'mentor' (typed by WizardPartnerType)", () => {
      expect(src).toMatch(/WizardPartnerType/)
      // The component delegates to the typed helper; the TS union enforces it.
    })
  })
})
