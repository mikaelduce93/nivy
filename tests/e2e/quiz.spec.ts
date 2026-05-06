import { expect, test } from "@playwright/test"

/**
 * Smoke tests for the teen quiz solo flow.
 *
 * The quiz hub is gated behind a teen-role session — without an authenticated
 * Supabase session the page bounces through `/auth/redirect` to `/auth/login`.
 *
 * TODO(seed): introduce a Playwright auth fixture that signs in a seeded teen
 * (e.g. tests/fixtures/auth/teen.ts) and reuse it here. Once that fixture
 * exists, drop the `test.skip` guards below and exercise the full hub →
 * runner → submit flow against a deterministic quiz id.
 */

const HAS_TEEN_FIXTURE = Boolean(process.env.E2E_TEEN_EMAIL && process.env.E2E_TEEN_PASSWORD)

test.describe("teen / quiz hub", () => {
  test("redirects unauthenticated visitors away from /teen/quiz", async ({ page }) => {
    const response = await page.goto("/teen/quiz", { waitUntil: "domcontentloaded" })
    const status = response?.status() ?? 200
    expect([200, 307, 308]).toContain(status)
    // Either we end up on login or on auth/redirect — never on the gated hub.
    await expect(page).toHaveURL(/\/auth\/(login|redirect)/, { timeout: 15_000 })
  })

  test("shows the quiz hub, lists categories and lets the teen open one", async ({ page }) => {
    test.skip(
      !HAS_TEEN_FIXTURE,
      "Requires E2E_TEEN_EMAIL/E2E_TEEN_PASSWORD env vars + a seeded teen with at least one published quiz. " +
        "TODO: wire tests/fixtures/auth/teen.ts to sign in via the Supabase test project, then remove this skip.",
    )

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

  test("daily quiz card links to the runner when present", async ({ page }) => {
    test.skip(
      !HAS_TEEN_FIXTURE,
      "Requires a seeded teen + at least one quiz tagged as 'daily'. " +
        "TODO: ensure the daily-quiz selector returns a row for the test teen.",
    )

    await page.goto("/teen/quiz")

    const daily = page.getByTestId("daily-quiz-card")
    if (!(await daily.isVisible().catch(() => false))) {
      test.skip(true, "No daily quiz seeded for the test teen — see TODO above.")
    }

    const cta = daily.getByRole("button", { name: /commencer|rejouer/i })
    await expect(cta).toBeVisible()
  })
})
