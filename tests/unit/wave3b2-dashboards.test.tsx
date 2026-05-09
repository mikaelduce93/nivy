/**
 * Wave 3B.2 — type-aware partner dashboards.
 *
 * Verifies:
 *   1. New routes exist on disk.
 *   2. Type-aware sidebar surfaces the right items per partner_type and
 *      withholds them otherwise.
 *   3. driver and mentor never appear under /partner/* sidebar (they have
 *      their own workspaces under /driver/* and /mentor/* respectively).
 *   4. Pending partner sees the limited nav (Dashboard / KYC / Support).
 *   5. New dashboards never contain fabricated revenue / orders / payout copy.
 */
import { describe, expect, it, vi } from "vitest"
import { renderToString } from "react-dom/server"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { PartnerSidebar } from "@/components/dashboard/partner/sidebar"

vi.mock("next/navigation", () => ({
  usePathname: () => "/partner",
}))

const NEW_PAGES = [
  "app/partner/talent/page.tsx",
  "app/partner/talent/bookings/page.tsx",
  "app/partner/creator/page.tsx",
  "app/partner/creator/briefs/page.tsx",
  "app/driver/rides/page.tsx",
  "app/driver/earnings/page.tsx",
  "app/mentor/availability/page.tsx",
] as const

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8")
}
function visibleHrefs(html: string): string[] {
  return Array.from(html.matchAll(/href="([^"]+)"/g)).map((m) => m[1])
}

describe("Wave 3B.2 dashboards", () => {
  for (const path of NEW_PAGES) {
    it(`${path} exists`, () => {
      expect(existsSync(resolve(process.cwd(), path))).toBe(true)
    })
  }

  describe("PartnerSidebar — type-aware extension for new archetypes", () => {
    it("event_talent sees Talent + Bookings", () => {
      const html = renderToString(
        <PartnerSidebar partnerType="event_talent" partnerStatus="active" />,
      )
      const hrefs = visibleHrefs(html)
      expect(hrefs).toContain("/partner/talent")
      expect(hrefs).toContain("/partner/talent/bookings")
      // event_talent is NOT a scanner archetype.
      expect(hrefs).not.toContain("/partner/scanner")
    })

    it("creator sees Créateur + Briefs", () => {
      const html = renderToString(
        <PartnerSidebar partnerType="creator" partnerStatus="active" />,
      )
      const hrefs = visibleHrefs(html)
      expect(hrefs).toContain("/partner/creator")
      expect(hrefs).toContain("/partner/creator/briefs")
      expect(hrefs).not.toContain("/partner/scanner")
    })

    it("event_organizer keeps Évènements", () => {
      const html = renderToString(
        <PartnerSidebar partnerType="event_organizer" partnerStatus="active" />,
      )
      const hrefs = visibleHrefs(html)
      expect(hrefs).toContain("/partner/events")
    })

    it("food keeps Menu + Commandes (NOT talent / creator)", () => {
      const html = renderToString(
        <PartnerSidebar partnerType="food" partnerStatus="active" />,
      )
      const hrefs = visibleHrefs(html)
      expect(hrefs).toContain("/partner/restaurant/menu")
      expect(hrefs).not.toContain("/partner/talent")
      expect(hrefs).not.toContain("/partner/creator")
    })

    it("retail does NOT see talent / creator / events", () => {
      const html = renderToString(
        <PartnerSidebar partnerType="retail" partnerStatus="active" />,
      )
      const hrefs = visibleHrefs(html)
      expect(hrefs).toContain("/partner/scanner")
      expect(hrefs).not.toContain("/partner/talent")
      expect(hrefs).not.toContain("/partner/creator")
      expect(hrefs).not.toContain("/partner/events")
    })

    it("driver/mentor never appear under partner sidebar (no /driver or /mentor links)", () => {
      // Iterate every partner_type — none of them should ever link to a
      // driver-workspace or mentor-workspace route.
      for (const t of ["retail", "venue", "club", "education", "food", "event_talent", "event_organizer", "creator"] as const) {
        const html = renderToString(
          <PartnerSidebar partnerType={t} partnerStatus="active" />,
        )
        const hrefs = visibleHrefs(html)
        for (const h of hrefs) {
          expect(h.startsWith("/driver"), `${t} sidebar must not link to /driver/*`).toBe(false)
          expect(h.startsWith("/mentor"), `${t} sidebar must not link to /mentor/*`).toBe(false)
        }
      }
    })

    it("pending partner has limited nav (Dashboard / KYC / Support)", () => {
      const html = renderToString(
        <PartnerSidebar partnerType="event_talent" partnerStatus="pending" />,
      )
      const hrefs = visibleHrefs(html)
      expect(hrefs).toEqual(
        expect.arrayContaining(["/partner", "/partner/kyc", "/partner/support"]),
      )
      expect(hrefs).not.toContain("/partner/talent")
      expect(hrefs).not.toContain("/partner/creator")
      expect(hrefs).not.toContain("/partner/scanner")
    })
  })

  describe("Honesty: no fake revenue / orders / payouts in new pages", () => {
    const FORBIDDEN_PHRASES: Array<{ re: RegExp; reason: string }> = [
      { re: /['"`]\d{2,}\s*DH['"`]/, reason: "hardcoded DH amount in a string literal" },
      { re: /Revenu\s*total\s*:\s*['"]\s*\d/i, reason: "hardcoded revenue total" },
      { re: /Payé\s*:\s*['"]\s*[A-Za-z0-9]/, reason: "hardcoded paid status" },
    ]
    for (const path of NEW_PAGES) {
      it(`${path} contains no fabricated DH amount / revenue / payout copy`, () => {
        const src = read(path)
        for (const { re, reason } of FORBIDDEN_PHRASES) {
          expect(src, `${path}: ${reason}`).not.toMatch(re)
        }
      })
    }

    it("driver earnings page surfaces 'net & commission non encore détaillés' truthful warning", () => {
      const src = read("app/driver/earnings/page.tsx")
      expect(src).toMatch(/non encore détaillés|module.*paiement.*chauffeur/i)
    })

    it("creator briefs page surfaces 'module en cours de mise en place' truthful state", () => {
      const src = read("app/partner/creator/briefs/page.tsx")
      expect(src).toMatch(/cours de mise en place/i)
    })
  })
})
