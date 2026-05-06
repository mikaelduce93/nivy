import { expect, test } from "@playwright/test"

/**
 * Verifies the canonical-URL redirects declared in `next.config.mjs`.
 *
 * Each entry exercises a legacy path and asserts the browser ends up on the
 * canonical destination. We rely on Playwright's automatic follow-redirects
 * behaviour and inspect `page.url()` after navigation settles.
 */
const REDIRECT_CASES: Array<{ from: string; expect: RegExp }> = [
  { from: "/evenements", expect: /\/agenda(\/|$)/ },
  { from: "/fidelite", expect: /\/carte-vip(\/|$)/ },
  { from: "/ambassadeurs", expect: /\/devenir-ambassadeur(\/|$)/ },
  { from: "/dashboard", expect: /\/espace(\/|$)|\/auth\/login/ },
  { from: "/profile", expect: /\/espace(\/|$)|\/auth\/login/ },
  { from: "/mes-clubs", expect: /\/teen(\/|$)|\/auth\/login/ },
]

test.describe("legacy redirects", () => {
  for (const { from, expect: expectedUrl } of REDIRECT_CASES) {
    test(`redirects ${from} to its canonical path`, async ({ page }) => {
      await page.goto(from, { waitUntil: "domcontentloaded" })
      // Some redirects (dashboard/profile) may bounce through middleware to
      // /auth/login when no session is present — both outcomes are acceptable.
      await expect(page).toHaveURL(expectedUrl, { timeout: 15_000 })
      expect(page.url()).not.toContain(from)
    })
  }
})
