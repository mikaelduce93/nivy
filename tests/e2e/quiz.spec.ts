import { expect, hasCredentials, test } from "../fixtures/auth"

/**
 * Smoke tests for the teen quiz solo flow.
 *
 * The quiz hub is gated behind a teen-role session. Sign-in is handled by the
 * `signInAs("teen")` fixture (see tests/fixtures/auth.ts) which signs in via
 * the public login form using seeded test accounts (defaults to
 * teen.amine@teenclub.ma — see docs/TEST_ACCOUNTS.md).
 */

const HAS_TEEN_FIXTURE = hasCredentials("teen")

test.describe("teen / quiz hub", () => {
  test("redirects unauthenticated visitors away from /teen/quiz", async ({ page }) => {
    const response = await page.goto("/teen/quiz", { waitUntil: "domcontentloaded" })
    const status = response?.status() ?? 200
    expect([200, 307, 308]).toContain(status)
    // Either we end up on login or on auth/redirect — never on the gated hub.
    await expect(page).toHaveURL(/\/auth\/(login|redirect)/, { timeout: 15_000 })
  })

  test("shows the quiz hub, lists categories and lets the teen open one", async ({ page, signInAs }) => {
    test.skip(
      !HAS_TEEN_FIXTURE,
      "Requires teen credentials (defaults to teen.amine@teenclub.ma — needs the Supabase seed applied).",
    )

    await signInAs("teen")
    await page.goto("/teen/quiz")

    // The hub header from quiz-hub-client.tsx.
    await expect(page.getByRole("heading", { name: /^quiz$/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole("heading", { name: /catégories/i })).toBeVisible()

    // The hub root carries this data-testid.
    await expect(page.getByTestId("teen-quiz-hub")).toBeVisible()

    // Click the first category card (data-testid="quiz-category-<id>").
    const firstCategory = page.locator('[data-testid^="quiz-category-"]').first()
    await expect(firstCategory).toBeVisible()
    await firstCategory.click()

    // After selecting a subject the client renders the quiz list with cards
    // carrying data-testid="quiz-card-<id>". Click the first one.
    const firstQuiz = page.locator('[data-testid^="quiz-card-"]').first()
    await expect(firstQuiz).toBeVisible({ timeout: 10_000 })
    await firstQuiz.click()

    // The quiz runner route is /teen/quiz/<id> — assert we navigated there.
    await expect(page).toHaveURL(/\/teen\/quiz\/[0-9a-f-]+/i, { timeout: 15_000 })

    // The runner UI exposes a question heading + answer choices. We assert at
    // least one button-shaped answer is reachable rather than coupling to
    // specific question text.
    const answerButtons = page.getByRole("button")
    await expect(answerButtons.first()).toBeVisible({ timeout: 15_000 })
  })

  test("daily quiz card links to the runner when present", async ({ page, signInAs }) => {
    test.skip(
      !HAS_TEEN_FIXTURE,
      "Requires a seeded teen + at least one quiz tagged as 'daily'.",
    )

    await signInAs("teen")
    await page.goto("/teen/quiz")

    const daily = page.getByTestId("daily-quiz-card")
    if (!(await daily.isVisible().catch(() => false))) {
      test.skip(true, "No daily quiz seeded for the test teen — see TODO above.")
    }

    const cta = daily.getByRole("button", { name: /commencer|rejouer/i })
    await expect(cta).toBeVisible()
  })
})
