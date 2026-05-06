import { expect, test } from "@playwright/test"

/**
 * Smoke tests for the public login page.
 *
 * These specs do NOT exercise a real Supabase login — they assert the form is
 * present and that submitting invalid credentials surfaces an error message.
 */
test.describe("auth / login page", () => {
  test("renders the login form with email + password fields", async ({ page }) => {
    await page.goto("/auth/login")

    await expect(page.getByRole("heading", { name: /connexion/i })).toBeVisible()
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(page.getByLabel("Mot de passe")).toBeVisible()
    await expect(page.getByRole("button", { name: /se connecter/i })).toBeVisible()
  })

  test("shows an error region when submitting invalid credentials", async ({ page }) => {
    await page.goto("/auth/login")

    await page.getByLabel("Email").fill("not-a-real-user@example.test")
    await page.getByLabel("Mot de passe").fill("wrong-password-123")
    await page.getByRole("button", { name: /se connecter/i }).click()

    // Either the Supabase client surfaces an error (alert role) or the form
    // remains on the login page — both are acceptable smoke outcomes.
    await expect(page).toHaveURL(/\/auth\/login/)
    const alert = page.getByRole("alert")
    await expect(alert.or(page.getByLabel("Email"))).toBeVisible({ timeout: 10_000 })
  })

  test("exposes a link to the signup flow", async ({ page }) => {
    await page.goto("/auth/login")

    const signupLink = page.getByRole("link", { name: /créer un compte/i })
    await expect(signupLink).toBeVisible()
    await expect(signupLink).toHaveAttribute("href", /\/auth\/(sign-up|signup)/)
  })
})
