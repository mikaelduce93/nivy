/**
 * Geolocation consent for minors (loi 09-08/CNDP) — single source of truth.
 *
 * A parent may read a teen's location (ride GPS, event presence) ONLY when:
 *   1. the parent SIGNED the parental authorization WITH location consent
 *      (e_signatures.location_consent = true — opt-in baseline), AND
 *   2. the parent has NOT revoked it for that specific teen
 *      (parent_teen_links.location_revoked = false — per-teen opt-out), AND
 *   3. an active parent_teen_links row exists for (parent, teen).
 *
 * Server-only — pass a service-role or the parent's authenticated client.
 */
import "server-only"

type DbClient = { from: (table: string) => any }

/** True if the parent has a signed authorization granting location consent. */
export async function parentSignedLocationConsent(
  client: DbClient,
  parentId: string,
): Promise<boolean> {
  const { data } = await client
    .from("e_signatures")
    .select("id")
    .eq("parent_id", parentId)
    .eq("terms_accepted", true)
    .eq("location_consent", true)
    .limit(1)
    .maybeSingle()
  return Boolean(data)
}

/** Effective per-teen location permission (baseline signed AND not revoked). */
export async function teenLocationAllowed(
  client: DbClient,
  parentId: string,
  teenId: string,
): Promise<boolean> {
  if (!(await parentSignedLocationConsent(client, parentId))) return false
  const { data: link } = await client
    .from("parent_teen_links")
    .select("location_revoked")
    .eq("parent_id", parentId)
    .eq("teen_id", teenId)
    .eq("status", "active")
    .maybeSingle()
  if (!link) return false
  return link.location_revoked !== true
}

/**
 * For a set of linked teen ids, return the subset the parent may currently
 * locate (signed baseline AND not per-teen revoked). Used by the live
 * dashboard to show location only for consented teens.
 */
export async function allowedTeenIdsForLocation(
  client: DbClient,
  parentId: string,
  teenIds: string[],
): Promise<Set<string>> {
  if (teenIds.length === 0) return new Set()
  if (!(await parentSignedLocationConsent(client, parentId))) return new Set()
  const { data } = await client
    .from("parent_teen_links")
    .select("teen_id, location_revoked")
    .eq("parent_id", parentId)
    .eq("status", "active")
    .in("teen_id", teenIds)
  const allowed = new Set<string>()
  for (const row of (data ?? []) as { teen_id: string; location_revoked: boolean }[]) {
    if (row.location_revoked !== true) allowed.add(row.teen_id)
  }
  return allowed
}
