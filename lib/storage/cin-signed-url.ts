/**
 * Wave 1B — Canonical helper for accessing CIN files in the private
 * `cin-scans` bucket via short-lived signed URLs.
 *
 * Per docs/canon/parent-control.locked.md and Wave 1B fix #5:
 *   - Parent self-view TTL: 5 min (300 s).
 *   - Admin KYC review TTL: 15 min (900 s).
 *   - Hard cap: 30 min (1800 s).
 *   - NEVER call `getPublicUrl` for CIN. CIN is private.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

export const CIN_BUCKET = "cin-scans"

// TTL ladders, in seconds. Hard-cap-clamped in `signCin`.
export const CIN_TTL_PARENT_SELF = 300 // 5 min
export const CIN_TTL_ADMIN_REVIEW = 900 // 15 min
export const CIN_TTL_HARD_CAP = 1800 // 30 min

export type CinViewer = "parent" | "admin"

/**
 * Generate a short-lived signed URL for a CIN storage path.
 * The path is the raw object name as stored in `cin-scans` (e.g.
 * `<parent_uuid>/cin-front-1746825600000.jpg`). Returns null on failure.
 */
export async function signCin(
  supabase: SupabaseClient,
  path: string,
  viewer: CinViewer
): Promise<string | null> {
  if (!path || typeof path !== "string") return null
  // Defensive: callers must pass storage paths, never URLs. If we get a URL
  // back (legacy), refuse to sign it — the migration script must run first.
  if (path.startsWith("http://") || path.startsWith("https://")) {
    console.warn(
      "[signCin] refused to sign a URL value — expected a storage path",
      { firstChars: path.slice(0, 32) }
    )
    return null
  }

  const ttl =
    viewer === "admin" ? CIN_TTL_ADMIN_REVIEW : CIN_TTL_PARENT_SELF
  const clamped = Math.min(ttl, CIN_TTL_HARD_CAP)

  const { data, error } = await supabase.storage
    .from(CIN_BUCKET)
    .createSignedUrl(path, clamped)
  if (error || !data?.signedUrl) {
    console.error("[signCin] createSignedUrl failed", { error })
    return null
  }
  return data.signedUrl
}
