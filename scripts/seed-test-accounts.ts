/**
 * Idempotent seeder for the 2 critical Playwright test accounts.
 *
 * Creates (or no-ops if already present):
 *   - parent.test@teenclub.ma — profiles.role = 'parent'
 *   - teen.amine@teenclub.ma  — profiles.role = 'teen'
 *
 * Universal password: Test123! (per docs/TEST_ACCOUNTS.md).
 *
 * Run:  npx tsx scripts/seed-test-accounts.ts
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local. Refuses
 * to run against teensparty.ma production by default — set
 * SEED_ALLOW_PRODUCTION=1 to override (do not).
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

// Minimal .env.local loader — avoids adding dotenv as a dep.
try {
  const raw = readFileSync(".env.local", "utf8")
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
} catch (err) {
  console.error("Could not read .env.local:", err)
  process.exit(1)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

if (SUPABASE_URL.includes("teensparty.ma") && process.env.SEED_ALLOW_PRODUCTION !== "1") {
  console.error("Refusing to seed against a teensparty.ma URL without SEED_ALLOW_PRODUCTION=1")
  process.exit(1)
}

const ACCOUNTS = [
  {
    email: "parent.test@teenclub.ma",
    password: "Test123!",
    role: "parent" as const,
    fullName: "Parent Test Basique",
  },
  {
    email: "teen.amine@teenclub.ma",
    password: "Test123!",
    role: "teen" as const,
    fullName: "Amine Test",
  },
]

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function ensureAccount(account: (typeof ACCOUNTS)[number]) {
  console.log(`\n— ${account.email} (${account.role})`)

  // 1. Try to create the auth user. If they exist, fetch the id instead.
  let userId: string | null = null
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: { full_name: account.fullName, role: account.role },
  })

  if (createErr) {
    if (/already.*registered|already.*exists|duplicate/i.test(createErr.message)) {
      console.log(`  auth.users: already exists, fetching id…`)
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 })
      if (listErr) throw listErr
      const found = list.users.find((u) => u.email?.toLowerCase() === account.email.toLowerCase())
      if (!found) throw new Error(`could not find existing user ${account.email}`)
      userId = found.id
    } else {
      throw createErr
    }
  } else {
    userId = created.user?.id ?? null
    console.log(`  auth.users: CREATED ${userId}`)
  }

  if (!userId) throw new Error(`no userId for ${account.email}`)

  // 2. Upsert profiles row with the correct role.
  const { error: profileErr } = await admin
    .from("profiles")
    .upsert(
      {
        id: userId,
        email: account.email,
        full_name: account.fullName,
        role: account.role,
      },
      { onConflict: "id" },
    )

  if (profileErr) throw profileErr
  console.log(`  profiles: role=${account.role} OK`)

  return userId
}

async function main() {
  console.log(`Seeding test accounts against ${SUPABASE_URL}`)
  for (const account of ACCOUNTS) {
    await ensureAccount(account)
  }
  console.log("\nAll test accounts ready. Run with:\n  E2E_USE_SEEDED_DEFAULTS=1 npm run test:e2e\n")
}

main().catch((err) => {
  console.error("\nSeed failed:", err)
  process.exit(1)
})
