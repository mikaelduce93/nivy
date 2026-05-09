/**
 * Wave 3A.5 — partner sidebar contract.
 *
 * Verifies:
 *   1. Pending partner sees ONLY Dashboard, KYC, Support.
 *   2. Active retail partner sees Scanner.
 *   3. Active food partner sees Menu + Commandes (NOT Scanner).
 *   4. Active event_organizer sees Évènements.
 *   5. Every emitted href starts with /partner/.
 */
import { describe, expect, it, vi } from "vitest"
import { renderToString } from "react-dom/server"
import { PartnerSidebar } from "@/components/dashboard/partner/sidebar"

vi.mock("next/navigation", () => ({
  usePathname: () => "/partner",
}))

function visibleHrefs(html: string): string[] {
  // Pull every href out of the rendered HTML.
  return Array.from(html.matchAll(/href="([^"]+)"/g)).map((m) => m[1])
}

describe("PartnerSidebar (Wave 3A.5 nav contract)", () => {
  it("pending partner sees only Dashboard / KYC / Support", () => {
    const html = renderToString(
      <PartnerSidebar partnerType="retail" partnerStatus="pending" />,
    )
    const hrefs = visibleHrefs(html)
    expect(hrefs).toEqual(expect.arrayContaining(["/partner", "/partner/kyc", "/partner/support"]))
    expect(hrefs).not.toContain("/partner/offers")
    expect(hrefs).not.toContain("/partner/scanner")
    expect(hrefs).not.toContain("/partner/restaurant/menu")
  })

  it("active retail partner sees Scanner", () => {
    const html = renderToString(
      <PartnerSidebar partnerType="retail" partnerStatus="active" />,
    )
    const hrefs = visibleHrefs(html)
    expect(hrefs).toContain("/partner/scanner")
    expect(hrefs).toContain("/partner/offers")
    expect(hrefs).not.toContain("/partner/restaurant/menu")
  })

  it("active food partner sees Menu + Commandes (NOT Scanner)", () => {
    const html = renderToString(
      <PartnerSidebar partnerType="food" partnerStatus="active" />,
    )
    const hrefs = visibleHrefs(html)
    expect(hrefs).toContain("/partner/restaurant/menu")
    expect(hrefs).toContain("/partner/restaurant/orders")
    expect(hrefs).not.toContain("/partner/scanner")
  })

  it("active event_organizer sees Évènements", () => {
    const html = renderToString(
      <PartnerSidebar partnerType="event_organizer" partnerStatus="active" />,
    )
    const hrefs = visibleHrefs(html)
    expect(hrefs).toContain("/partner/events")
  })

  it("every emitted href starts with /partner/", () => {
    const html = renderToString(
      <PartnerSidebar partnerType="retail" partnerStatus="active" />,
    )
    const hrefs = visibleHrefs(html)
    expect(hrefs.length).toBeGreaterThan(0)
    for (const h of hrefs) {
      expect(h.startsWith("/partner")).toBe(true)
    }
  })
})
