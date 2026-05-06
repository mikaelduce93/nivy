import { expect, hasCredentials, test } from "../fixtures/auth"

/**
 * Smoke tests for the canonical wallet shop (/teen/wallet?tab=shop) and the
 * legacy URL redirects that converge on it after the rewards-currency-unifier
 * migration (see docs/economy.md).
 *
 * Auth is provided by signInAs("teen") — see tests/fixtures/auth.ts.
 */

const HAS_TEEN_FIXTURE = hasCredentials("teen")

const LEGACY_SHOP_URLS = ["/xp-shop", "/gamification/boutique", "/teen/rewards"] as const

test.describe("teen / wallet shop", () => {
  for (const legacy of LEGACY_SHOP_URLS) {
    test(`legacy URL ${legacy} resolves to the canonical /teen/wallet?tab=shop`, async ({
      page,
    }) => {
      const response = await page.goto(legacy, { waitUntil: "domcontentloaded" })
      const status = response?.status() ?? 200
      // After the server redirect() chain we may end on the wallet (when
      // authenticated), or on /auth/login when no session is present. Both are
      // valid — the load-bearing assertion is that we did NOT stay on the
      // legacy path.
      expect([200, 307, 308]).toContain(status)
      expect(page.url()).not.toContain(legacy)
      await expect(page).toHaveURL(
        /\/teen\/wallet\?tab=shop|\/auth\/login|\/auth\/redirect/,
        { timeout: 15_000 },
      )
    })
  }

  test("renders the shop tab with reward cards and an XP balance", async ({ page, signInAs }) => {
    test.skip(
      !HAS_TEEN_FIXTURE,
      "Requires teen credentials + seeded reward_categories / get_shop_rewards rows.",
    )

    await signInAs("teen")
    await page.goto("/teen/wallet?tab=shop")

    // Header from wallet-hub-client.tsx
    await expect(page.getByRole("heading", { name: /wallet/i })).toBeVisible({ timeout: 15_000 })

    // The 3-currency display: XP / coins / DH credit.
    await expect(page.getByText(/\bXP\b/).first()).toBeVisible()

    // Shop tab should be selected — assert at least one reward card or empty
    // state is rendered. We accept either to avoid coupling to seed contents.
    const rewardCards = page.getByRole("button", { name: /échanger|acheter|réserver/i })
    const emptyState = page.getByText(/aucune récompense|bientôt/i)
    await expect(rewardCards.first().or(emptyState)).toBeVisible({ timeout: 15_000 })
  })

  test("clicking a reward triggers a confirmation step", async ({ page, signInAs }) => {
    test.skip(
      !HAS_TEEN_FIXTURE,
      "Requires teen fixture + at least one purchasable reward (xp_cost <= seeded teen XP).",
    )

    await signInAs("teen")
    await page.goto("/teen/wallet?tab=shop")

    const purchasable = page
      .getByRole("button", { name: /échanger|acheter|réserver/i })
      .first()

    if (!(await purchasable.isVisible().catch(() => false))) {
      test.skip(true, "No purchasable reward visible for the seeded teen — see TODO above.")
    }

    await purchasable.click()

    // The shop action wires through `purchaseReward`; we expect either a
    // confirmation dialog (role=dialog) or a sonner toast — either is OK for
    // this golden-path smoke.
    const dialog = page.getByRole("dialog")
    const toast = page.locator('[data-sonner-toast]')
    await expect(dialog.or(toast)).toBeVisible({ timeout: 10_000 })
  })
})
