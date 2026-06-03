import "server-only"
import { logDbError } from "@/lib/observability/log-db-error"

export type TeenIdentity = { pseudo: string | null; avatar_url: string | null; level: number }

/**
 * Résout {pseudo, avatar_url, level} pour une liste d'ids utilisateur.
 *
 * Beaucoup de tables (crew_*, challenge_*, special_challenge_*) ont une FK
 * `user_id -> profiles`, mais `profiles` ne porte plus `pseudo`/`level` (drift V7 :
 * profiles = identité auth seulement). Lire `profiles.pseudo`/`.level` lève 42703, et
 * un embed PostgREST `teens:user_id(...)` est impossible (aucune FK vers teens).
 *
 * On résout donc applicativement depuis les sources réelles :
 *   pseudo = COALESCE(teens.pseudo, profiles.full_name)
 *   avatar = COALESCE(teens.avatar_url, profiles.avatar_url)
 *   level  = user_xp.current_level (défaut 1)
 *
 * `supabase` : un client Supabase serveur (typé `any` pour rester découplé du caller).
 */
export async function resolveTeenIdentities(
  supabase: any,
  ids: (string | null | undefined)[]
): Promise<Map<string, TeenIdentity>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))]
  const map = new Map<string, TeenIdentity>()
  if (!unique.length) return map

  const [teensRes, xpRes, profRes] = await Promise.all([
    supabase.from("teens").select("id, pseudo, avatar_url").in("id", unique),
    supabase.from("user_xp").select("teen_id, current_level").in("teen_id", unique),
    supabase.from("profiles").select("id, full_name, avatar_url").in("id", unique),
  ])
  if (teensRes.error) logDbError("resolveTeenIdentities.teens", teensRes.error)
  if (xpRes.error) logDbError("resolveTeenIdentities.user_xp", xpRes.error)
  if (profRes.error) logDbError("resolveTeenIdentities.profiles", profRes.error)

  const teenById = new Map<string, any>((teensRes.data || []).map((t: any) => [t.id, t]))
  const levelById = new Map<string, number>((xpRes.data || []).map((x: any) => [x.teen_id, x.current_level]))
  const profById = new Map<string, any>((profRes.data || []).map((p: any) => [p.id, p]))

  for (const id of unique) {
    const t = teenById.get(id)
    const p = profById.get(id)
    map.set(id, {
      pseudo: t?.pseudo || p?.full_name || null,
      avatar_url: t?.avatar_url || p?.avatar_url || null,
      level: levelById.get(id) ?? 1,
    })
  }
  return map
}
