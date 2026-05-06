import { createClient } from "@supabase/supabase-js"

/**
 * Service-role Supabase client (SERVER ONLY).
 *
 * Canonical helper for any code that needs to bypass RLS (push-notification
 * triggers, system bots posting feed activity, migration runners, etc.).
 *
 * SOURCE OF TRUTH for service-role clients across the app. Do NOT call
 * `createClient(url, SUPABASE_SERVICE_ROLE_KEY)` directly anywhere else —
 * import this helper instead. Other Supabase entrypoints in this folder:
 *
 * - `client.ts`     — browser (anon) client.
 * - `server.ts`     — RSC / route-handler (anon) client with cookie-bound auth.
 * - `middleware.ts` — Next middleware that refreshes the user session.
 * - `wrapper.ts`    — timeout helpers around any Supabase promise.
 *
 * Use only in trusted server routes / scripts for maintenance tasks.
 */
export function createServiceRoleClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error("Supabase URL missing (SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL)")
  if (!serviceRoleKey) throw new Error("Supabase service role key missing (SUPABASE_SERVICE_ROLE_KEY)")

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}


