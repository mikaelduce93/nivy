/**
 * V11 #302 — balance activation gate.
 *
 * Linking a parent↔teen does NOT make the teen's balance spendable on its own:
 * the canon requires an active `e_signatures` row (terms_accepted=true) for the
 * parent. Surfaces use this to show "solde activé" only conditionally and to
 * route a parent without a signature to /onboarding/parent/e-signature.
 *
 * Server-only — expects a service-role client.
 */
import "server-only"

type ServiceClient = { from: (table: string) => any }

export async function parentHasActiveSignature(
  sr: ServiceClient,
  parentId: string,
): Promise<boolean> {
  const { data } = await sr
    .from("e_signatures")
    .select("id")
    .eq("parent_id", parentId)
    .eq("terms_accepted", true)
    .limit(1)
    .maybeSingle()
  return Boolean(data)
}
