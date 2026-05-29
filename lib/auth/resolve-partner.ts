/**
 * Partner identity resolution — single source of truth (issue #37).
 *
 * The `partners` table has NO `user_id` column. A partner is linked to its
 * authenticated user ONLY via `partners.email == profiles.email`. (Employee-
 * level scoping is a separate convention: `partner_staff.user_id → partner_id`.)
 *
 * Use this helper everywhere "which partner is this user?" is resolved, so the
 * convention stays in one place and the old phantom `partners.user_id` /
 * `business_name` reads never creep back.
 */
type MinimalClient = { from: (table: string) => any }

export interface ResolvedPartner {
  id: string
  company_name: string | null
  partner_type: string | null
}

export async function resolvePartnerByEmail(
  client: MinimalClient,
  email: string | null | undefined,
): Promise<ResolvedPartner | null> {
  if (!email) return null
  const { data } = await client
    .from("partners")
    .select("id, company_name, partner_type")
    .eq("email", email)
    .maybeSingle()
  return (data as ResolvedPartner | null) ?? null
}
