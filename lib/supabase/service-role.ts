import { createClient } from "@supabase/supabase-js"

/**
 * Service-role Supabase client (SERVER ONLY).
 * Use only in trusted server routes for maintenance tasks.
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


