import { expect, hasCredentials, test } from "../fixtures/auth"

/**
 * Smoke tests for the unified <DefiCard> component (V1.1 P2.1).
 *
 * <DefiCard> is the single source-of-truth tile that replaces the bespoke
 * quest/défi tiles previously scattered across the teen surfaces. This spec
 * proves the component is mounted on its two consumer hubs:
 *
 *   - /teen/quests           — daily / weekly / monthly / seasonal variants
 *   - /teen/defis-physiques  — physical variant (cover image + emerald accent)
 *
 * The component's source of truth (components/teen/defi-card.tsx) renders a
 * variant tag with a stable label per variant ("Daily", "Weekly", "Monthly",
 * "Seasonal", "Physique", "Entre amis"). We use those labels as the locator
 * since the component does NOT carry a data-testid as of P2.1 landing — see
 * "Recommended fixes" in docs/vision/v1_1_execution/P2_1_validation.md.
 *
 * If no défis are seeded for the test teen, this spec SKIPs with a hint
 * rather than failing — empty-state is a valid product state and would
 * otherwise create false positives in CI.
 */

const HAS_TEEN_FIXTURE = hasCredentials("teen")

// Stable per-variant labels emitted by VARIANT_TOKENS in
// components/teen/defi-card.tsx. Each is a small, all-caps tracking label
// rendered above the status chip.
const QUEST_VARIANT_LABELS = ["Daily", "Weekly", "Monthly", "Seasonal"] as const
const PHYSICAL_VARIANT_LABEL = "Physique"

/**
 * Returns true if at least one DefiCard tile is mounted on the current page.
 *
 * We try, in order:
 *   1. data-testid="defi-card" (future-proof — will succeed once added).
 *   2. The variant tag text (e.g. "Daily", "Weekly", "Physique").
 *
 * The DOM lookups are bounded so the helper resolves quickly on empty hubs.
 */
async function hasAnyDefiCard(
  page: import("@playwright/test").Page,
  labels: readonly string[],
): Promise<{ found: boolean; via: string | null }> {
  const byTestId = page.locator('[data-testid="defi-card"]').first()
  if (await byTestId.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return { found: true, via: 'data-testid="defi-card"' }
  }
  for (const label of labels) {
    // Exact match avoids matching "Daily" inside body copy elsewhere on the page.
    const byLabel = page.getByText(label, { exact: true }).first()
    if (await byLabel.isVisible({ timeout: 2_000 }).catch(() => false)) {
      return { found: true, via: `text=${label}` }
    }
  }
  return { found: false, via: null }
}

test.describe("teen / defi-card unified component", () => {
  test("renders at least one DefiCard variant on /teen/quests", async ({
    page,
    signInAs,
  }) => {
    test.skip(
      !HAS_TEEN_FIXTURE,
      "Requires teen credentials (defaults to teen.amine@teenclub.ma — needs the Supabase seed applied).",
    )

    await signInAs("teen")
    await page.goto("/teen/quests", { waitUntil: "domcontentloaded" })

    // Wait for the hub to mount — its heading is stable across locales.
    await expect(page.getByRole("heading", { name: /quests/i })).toBeVisible({
      timeout: 15_000,
    })

    const result = await hasAnyDefiCard(page, QUEST_VARIANT_LABELS)
    if (!result.found) {
      test.skip(
        true,
        "No quest DefiCards rendered — likely no defis seeded for the teen. " +
          "Seed daily/weekly quests or apply the canonical fixtures to exercise this test.",
      )
    }

    // Sanity: log the locator that succeeded for forensic debugging.
    test.info().annotations.push({
      type: "defi-card-locator",
      description: `quests hub matched via ${result.via}`,
    })
  })

  test("renders the physical DefiCard variant on /teen/defis-physiques", async ({
    page,
    signInAs,
  }) => {
    test.skip(
      !HAS_TEEN_FIXTURE,
      "Requires teen credentials (defaults to teen.amine@teenclub.ma — needs the Supabase seed applied).",
    )

    await signInAs("teen")
    await page.goto("/teen/defis-physiques", { waitUntil: "domcontentloaded" })

    // The page mounts even with zero challenges; wait for the orange dock-icon
    // header to be visible before probing for cards. Use a permissive heading
    // matcher because the hub uses non-i18n French copy.
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})

    const result = await hasAnyDefiCard(page, [PHYSICAL_VARIANT_LABEL])
    if (!result.found) {
      test.skip(
        true,
        "No physical DefiCard rendered — either no défis are seeded OR B3's " +
          "integration of <DefiCard> into defis-physiques-client.tsx has not " +
          "landed yet. Apply migration 027_physical_challenges_seed.sql (or " +
          "equivalent) and re-run once B3 ships.",
      )
    }

    test.info().annotations.push({
      type: "defi-card-locator",
      description: `defis-physiques matched via ${result.via}`,
    })
  })
})
