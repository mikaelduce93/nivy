/**
 * Wave 3A.5 — partner forms now post to canonical wizard endpoint.
 *
 * Verifies via static-source inspection:
 *   1. None of the 4 forms still POST to /api/partners/register.
 *   2. All 4 forms import the canonical submitPartnerWizard helper.
 *   3. PartnerPasswordPanel is rendered in all 4.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const FORMS = [
  "components/partners/RetailPartnerForm.tsx",
  "components/partners/VenuePartnerForm.tsx",
  "components/partners/ClubPartnerForm.tsx",
  "components/partners/EducationPartnerForm.tsx",
] as const

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8")
}

describe("partner wizard form wiring", () => {
  for (const form of FORMS) {
    describe(form, () => {
      const src = read(form)

      it("does NOT POST to legacy /api/partners/register", () => {
        expect(src).not.toMatch(/['"]\/api\/partners\/register['"]/)
      })

      it("imports submitPartnerWizard from canonical helper", () => {
        expect(src).toMatch(/submitPartnerWizard/)
        expect(src).toMatch(/@\/lib\/partners\/wizard-submit/)
      })

      it("renders PartnerPasswordPanel", () => {
        expect(src).toMatch(/<PartnerPasswordPanel/)
      })

      it("does not call alert() on submit failure", () => {
        // alert() in canon §0 ESLint guard; sonner toast canonical replacement.
        expect(src).not.toMatch(/window\.alert\s*\(/)
        expect(src).not.toMatch(/^\s*alert\s*\(/m)
      })
    })
  }
})
