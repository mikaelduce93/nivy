import { existsSync, readFileSync } from "node:fs"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Service-role DB fixture for E2E specs (#75).
 *
 * The cross-account specs (parent-topup, parent-approvals, partner-scan) need
 * to ARRANGE preconditions (pending approval row, signature state) and ASSERT
 * side effects (payment_transactions row count, parental_approvals.status,
 * user_notifications) that the JSON response alone can't prove. Playwright
 * specs run in Node, so they can talk to Supabase directly with the service
 * role — the same key the seed scripts use.
 *
 * CI-safe: when the service-role env is absent, getServiceClient() returns null
 * and the dependent tests `test.skip` instead of throwing. The unauthenticated
 * / negative-path tests in each spec never need this client and always run.
 */

// Mirror the seed scripts: lazily hydrate process.env from .env.local so a
// developer with a configured .env.local gets the DB-backed assertions for
// free, without exporting vars into the Playwright process by hand.
let envLoaded = false
function ensureEnvLoaded(): void {
  if (envLoaded) return
  envLoaded = true
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return
  if (!existsSync(".env.local")) return
  try {
    const raw = readFileSync(".env.local", "utf8")
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // Best-effort — a missing/locked .env.local just means the DB-backed
    // assertions skip.
  }
}

let cached: SupabaseClient | null | undefined

/** Returns a service-role client, or null when the env is not configured. */
export function getServiceClient(): SupabaseClient | null {
  if (cached !== undefined) return cached
  ensureEnvLoaded()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    cached = null
    return cached
  }
  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return cached
}

/** Resolve a profile id by email. Returns null when not found / no client. */
export async function getProfileIdByEmail(
  db: SupabaseClient,
  email: string,
): Promise<string | null> {
  const { data } = await db
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle()
  return (data?.id as string | undefined) ?? null
}
