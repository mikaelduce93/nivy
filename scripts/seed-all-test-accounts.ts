/**
 * Idempotent seeder for ALL Nivy test accounts (15 comptes, 6 rôles).
 *
 * Mot de passe universel : Test123!
 *
 * Run:  npx tsx scripts/seed-all-test-accounts.ts
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Refuses to run against teensparty.ma production unless SEED_ALLOW_PRODUCTION=1.
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

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
  console.error("Refusing to seed against teensparty.ma without SEED_ALLOW_PRODUCTION=1")
  process.exit(1)
}

type Role = "parent" | "teen" | "ambassador" | "admin" | "partner" | "mentor"
type AdminSubrole = "admin" | "moderator" | "support"

interface Account {
  email: string
  password: string
  role: Role
  fullName: string
  adminSubrole?: AdminSubrole
}

const PASSWORD = "Test123!"

const ACCOUNTS: Account[] = [
  // Parents (4)
  { email: "parent.test@teenclub.ma",     password: PASSWORD, role: "parent", fullName: "Parent Test Basique" },
  { email: "parent.silver@teenclub.ma",   password: PASSWORD, role: "parent", fullName: "Parent VIP Silver" },
  { email: "parent.gold@teenclub.ma",     password: PASSWORD, role: "parent", fullName: "Parent VIP Gold" },
  { email: "parent.platinum@teenclub.ma", password: PASSWORD, role: "parent", fullName: "Parent VIP Platinum" },

  // Teens (2)
  { email: "teen.amine@teenclub.ma",      password: PASSWORD, role: "teen", fullName: "Amine Test" },
  { email: "teen.sara@teenclub.ma",       password: PASSWORD, role: "teen", fullName: "Sara Test Pro" },

  // Ambassador (1)
  { email: "ambassador.test@teenclub.ma", password: PASSWORD, role: "ambassador", fullName: "Ambassador Test" },

  // Admins (3) — profiles.role='admin' + admin_roles entry per subrole
  { email: "admin.test@teenclub.ma",      password: PASSWORD, role: "admin", fullName: "Admin Test",     adminSubrole: "admin" },
  { email: "moderator.test@teenclub.ma",  password: PASSWORD, role: "admin", fullName: "Moderator Test", adminSubrole: "moderator" },
  { email: "support.test@teenclub.ma",    password: PASSWORD, role: "admin", fullName: "Support Test",   adminSubrole: "support" },

  // Partners (4)
  { email: "retail.partner@teenclub.ma",    password: PASSWORD, role: "partner", fullName: "TechStore Morocco" },
  { email: "venue.partner@teenclub.ma",     password: PASSWORD, role: "partner", fullName: "Le Rooftop Teen" },
  { email: "club.partner@teenclub.ma",      password: PASSWORD, role: "partner", fullName: "Teen Fitness Academy" },
  { email: "education.partner@teenclub.ma", password: PASSWORD, role: "partner", fullName: "Code Academy Junior" },

  // Mentor (1) — bonus, since /mentor/* routes exist
  { email: "mentor.test@teenclub.ma", password: PASSWORD, role: "mentor", fullName: "Mentor Test" },
]

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function ensureAccount(account: Account) {
  process.stdout.write(`  ${account.email.padEnd(38)} `)

  let userId: string | null = null
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: { full_name: account.fullName, role: account.role },
  })

  if (createErr) {
    if (/already.*registered|already.*exists|duplicate/i.test(createErr.message)) {
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 })
      if (listErr) throw listErr
      const found = list.users.find((u) => u.email?.toLowerCase() === account.email.toLowerCase())
      if (!found) throw new Error(`could not find existing user ${account.email}`)
      userId = found.id
      process.stdout.write("[exists] ")
    } else {
      throw createErr
    }
  } else {
    userId = created.user?.id ?? null
    process.stdout.write("[CREATED] ")
  }

  if (!userId) throw new Error(`no userId for ${account.email}`)

  const { data: existing, error: selectErr } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle()
  if (selectErr) throw selectErr

  if (!existing) {
    const { error: insertErr } = await admin.from("profiles").insert({
      id: userId,
      email: account.email,
      full_name: account.fullName,
      role: account.role,
    })
    if (insertErr) throw insertErr
    process.stdout.write(`role=${account.role}(new)`)
  } else if (existing.role !== account.role) {
    // Direct SQL update via RPC to bypass the broken total_xp trigger
    const { error: rpcErr } = await admin.rpc("set_profile_role_admin", {
      p_profile_id: userId,
      p_role: account.role,
    })
    if (rpcErr) {
      // Fallback: try plain update; if trigger fails, surface the issue
      const { error: updErr } = await admin
        .from("profiles")
        .update({ role: account.role, full_name: account.fullName })
        .eq("id", userId)
      if (updErr) {
        process.stdout.write(`role=${existing.role}(stuck: ${updErr.message.slice(0, 60)})`)
      } else {
        process.stdout.write(`role=${account.role}(updated)`)
      }
    } else {
      process.stdout.write(`role=${account.role}(via rpc)`)
    }
  } else {
    process.stdout.write(`role=${account.role}(ok)`)
  }

  if (account.adminSubrole) {
    const { data: existingRole } = await admin
      .from("admin_roles")
      .select("role")
      .eq("profile_id", userId)
      .maybeSingle()

    if (!existingRole) {
      const { error: insErr } = await admin
        .from("admin_roles")
        .insert({ profile_id: userId, role: account.adminSubrole })
      if (insErr) process.stdout.write(` (admin_roles ins fail: ${insErr.message.slice(0, 50)})`)
      else process.stdout.write(` admin_role=${account.adminSubrole}(new)`)
    } else if (existingRole.role !== account.adminSubrole) {
      const { error: updErr } = await admin
        .from("admin_roles")
        .update({ role: account.adminSubrole })
        .eq("profile_id", userId)
      if (updErr) process.stdout.write(` (admin_roles upd fail: ${updErr.message.slice(0, 50)})`)
      else process.stdout.write(` admin_role=${account.adminSubrole}(updated)`)
    } else {
      process.stdout.write(` admin_role=${account.adminSubrole}(ok)`)
    }
  }

  process.stdout.write("\n")
  return userId
}

async function main() {
  console.log(`Seeding ${ACCOUNTS.length} test accounts against ${SUPABASE_URL}\n`)

  let ok = 0
  let fail = 0
  for (const account of ACCOUNTS) {
    try {
      await ensureAccount(account)
      ok++
    } catch (err) {
      fail++
      const msg = err instanceof Error ? err.message : (err && typeof err === "object" ? JSON.stringify(err) : String(err))
      console.error(`  ${account.email}: FAILED — ${msg}`)
    }
  }

  console.log(`\n${ok}/${ACCOUNTS.length} accounts ready (${fail} failed).`)
  console.log("\nMot de passe universel : Test123!")
  console.log("Voir docs/TEST_ACCOUNTS.md pour la liste complète.")
}

main().catch((err) => {
  console.error("\nSeed failed:", err)
  process.exit(1)
})
