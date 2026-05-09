#!/usr/bin/env node
/**
 * check-env-presence.mjs — secrets presence audit (NEVER prints values).
 *
 * Reports PRESENT / MISSING / EMPTY for each required env key without
 * exposing the value. Used by:
 *   - CI smoke test (pre-deploy gate).
 *   - Local dev sanity check.
 *   - The "rotate secrets" final pre-launch verification.
 *
 * Usage:
 *   node --env-file=.env.local scripts/check-env-presence.mjs
 *   node --env-file=.env.local scripts/check-env-presence.mjs --strict   # exit 1 if any MISSING
 *
 * Output rules (hard guarantees — DO NOT relax):
 *   - Never logs the value of any env var.
 *   - Never logs filenames containing secrets (no `.env.local` echo).
 *   - Never logs anything that could be confused for a value (no length,
 *     no first-N chars, no checksum, no fingerprint).
 *   - Per key, prints exactly one of: PRESENT | MISSING | EMPTY.
 *   - On PRESENT, the value field is the literal string "[REDACTED]".
 *
 * If you need to verify a secret looks right, do it in the dashboard,
 * not here. This script's contract is binary, not introspective.
 */

const REQUIRED = [
  // Public — safe to confirm presence; still reported as [REDACTED].
  { key: "NEXT_PUBLIC_APP_URL", group: "public", desc: "App URL" },
  { key: "NEXT_PUBLIC_SUPABASE_URL", group: "public", desc: "Supabase project URL" },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", group: "public", desc: "Supabase anon key" },

  // Server — secret. Rotation pending per docs/compliance/security-debt.md.
  { key: "SUPABASE_SERVICE_ROLE_KEY", group: "secret", desc: "Supabase service role" },
  { key: "OPENAI_API_KEY", group: "secret", desc: "OpenAI API key" },
  { key: "CRON_SECRET", group: "secret", desc: "Vercel cron bearer secret" },

  // Server — non-rotation-blocking config.
  { key: "ENABLE_ADMIN_SQL_CONSOLE", group: "config", desc: "Admin SQL console flag" },
  { key: "PSP_AUTO_TOPUP_ENABLED", group: "config", desc: "Auto top-up flag (canon F5)" },
  { key: "NEXT_PUBLIC_PSP_AUTO_TOPUP_ENABLED", group: "config", desc: "Auto top-up flag (public)" },
  { key: "CLAUDE_MODEL_ID", group: "config", desc: "Claude model id" },
  { key: "OPENAI_MODEL_ID", group: "config", desc: "OpenAI model id" },
]

const strict = process.argv.includes("--strict")

const results = REQUIRED.map(({ key, group, desc }) => {
  const raw = process.env[key]
  let status
  if (raw === undefined) status = "MISSING"
  else if (raw.length === 0) status = "EMPTY"
  else status = "PRESENT"
  return { key, group, desc, status }
})

const COLS = {
  status: 8,
  group: 7,
  key: 36,
}

console.log("Env presence audit (NEVER prints values)")
console.log(
  `${"STATUS".padEnd(COLS.status)} ${"GROUP".padEnd(COLS.group)} ${"KEY".padEnd(COLS.key)} VALUE       DESCRIPTION`,
)
console.log("-".repeat(96))

for (const r of results) {
  const value = r.status === "PRESENT" ? "[REDACTED]" : r.status === "EMPTY" ? "[EMPTY]" : "[—]"
  console.log(
    `${r.status.padEnd(COLS.status)} ${r.group.padEnd(COLS.group)} ${r.key.padEnd(COLS.key)} ${value.padEnd(11)} ${r.desc}`,
  )
}

const missing = results.filter((r) => r.status === "MISSING")
const empty = results.filter((r) => r.status === "EMPTY")
const missingSecrets = missing.filter((r) => r.group === "secret")

console.log("")
console.log(
  `summary: ${results.length - missing.length - empty.length} present / ${empty.length} empty / ${missing.length} missing`,
)

if (missing.length || empty.length) {
  console.log("")
  console.log("Note: this script never prints values. To rotate or set a key,")
  console.log("use the dashboard (Supabase / OpenAI / Vercel) — see")
  console.log("docs/compliance/security-debt.md.")
}

if (strict && (missing.length > 0 || missingSecrets.length > 0)) {
  process.exit(1)
}
process.exit(0)
