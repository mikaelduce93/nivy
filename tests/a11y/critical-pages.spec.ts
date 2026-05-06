import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

/**
 * Accessibility scans for the critical public pages.
 *
 * We fail the build only on `serious` and `critical` violations to keep the
 * smoke suite actionable; minor/moderate findings still surface in the report.
 *
 * Pages requiring authentication (e.g. /teen, /parent dashboards) are scanned
 * via separate suites that seed a session — they're omitted here so the
 * smoke suite can run without supabase credentials.
 */
const PAGES_TO_SCAN: Array<{ path: string; label: string }> = [
  { path: "/", label: "home" },
  { path: "/auth/login", label: "auth-login" },
  { path: "/auth/sign-up", label: "auth-sign-up" },
  { path: "/aide", label: "help-center" },
  { path: "/agenda", label: "agenda" },
  { path: "/carte-vip", label: "carte-vip" },
  { path: "/devenir-partenaire", label: "become-partner" },
]

test.describe("accessibility / critical pages", () => {
  for (const { path, label } of PAGES_TO_SCAN) {
    test(`a11y scan: ${label} (${path})`, async ({ page }, testInfo) => {
      await page.goto(path, { waitUntil: "domcontentloaded" })

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        // Disable rules tied to dev-only artefacts (e.g. Next.js dev overlay)
        // that would otherwise spam the report without being actionable.
        .disableRules(["region"])
        .analyze()

      // Attach the full violations payload to the HTML report for triage.
      await testInfo.attach(`axe-${label}.json`, {
        body: JSON.stringify(results.violations, null, 2),
        contentType: "application/json",
      })

      const blocking = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      )

      expect(
        blocking,
        `Critical/serious a11y violations on ${path}: ${blocking
          .map((v) => `${v.id} (${v.impact})`)
          .join(", ")}`,
      ).toEqual([])
    })
  }
})
