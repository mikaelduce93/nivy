import { test as base, expect, type Page } from "@playwright/test"

/**
 * Auth fixture for Playwright E2E specs.
 *
 * Signs in via the public login form. CI-safe by default: gated tests SKIP
 * unless credentials are provided explicitly. Two opt-in modes:
 *
 *   1. Per-role env vars (recommended for CI):
 *        E2E_TEEN_EMAIL / E2E_TEEN_PASSWORD
 *        E2E_PARENT_EMAIL / E2E_PARENT_PASSWORD
 *        E2E_PARTNER_PENDING_EMAIL / E2E_PARTNER_PENDING_PASSWORD
 *
 *   2. Local seeded accounts (when developing against a local Supabase with
 *      the standard seed applied — see docs/TEST_ACCOUNTS.md):
 *        E2E_USE_SEEDED_DEFAULTS=1
 *      This unlocks the canonical accounts (teen.amine@teenclub.ma etc.)
 *      with the universal password Test123!.
 */

export type Role = "teen" | "parent" | "partner-pending"

type Credentials = { email: string; password: string }

const SEEDED_DEFAULTS: Record<Role, Credentials> = {
  teen: { email: "teen.amine@teenclub.ma", password: "Test123!" },
  parent: { email: "parent.test@teenclub.ma", password: "Test123!" },
  // No seeded "pending" partner in TEST_ACCOUNTS.md — the four seeded partners
  // are all approved. Always requires explicit env vars.
  "partner-pending": { email: "", password: "" },
}

const ALLOW_DEFAULTS = process.env.E2E_USE_SEEDED_DEFAULTS === "1"

function getCredentials(role: Role): Credentials | null {
  const envKey = role.toUpperCase().replace("-", "_")
  const envEmail = process.env[`E2E_${envKey}_EMAIL`]
  const envPwd = process.env[`E2E_${envKey}_PASSWORD`]
  if (envEmail && envPwd) return { email: envEmail, password: envPwd }
  if (ALLOW_DEFAULTS) {
    const d = SEEDED_DEFAULTS[role]
    if (d.email && d.password) return d
  }
  return null
}

export function hasCredentials(role: Role): boolean {
  return getCredentials(role) !== null
}

export async function signInWithRole(page: Page, role: Role): Promise<void> {
  const creds = getCredentials(role)
  if (!creds) {
    throw new Error(
      `No credentials available for role "${role}". Set E2E_${role.toUpperCase().replace("-", "_")}_EMAIL/PASSWORD ` +
        "or seed the corresponding default account from docs/TEST_ACCOUNTS.md.",
    )
  }

  await page.goto("/auth/login")
  await page.getByLabel("Email").fill(creds.email)
  await page.getByLabel("Mot de passe").fill(creds.password)
  await page.getByRole("button", { name: /se connecter/i }).click()

  // After successful login the app routes to /auth/redirect which dispatches
  // by role to /teen, /parent, /partner. Either intermediate or final URL is
  // an acceptable outcome — we just need to be off /auth/login.
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), {
    timeout: 20_000,
  })
}

type AuthFixtures = {
  signInAs: (role: Role) => Promise<void>
}

export const test = base.extend<AuthFixtures>({
  signInAs: async ({ page }, use) => {
    await use((role) => signInWithRole(page, role))
  },
})

export { expect }
