// drift-allow: game_sessions livrée par la mig 181 (train G4, agent DB parallèle) — régénérer db-relations.json après application. Le code gère déjà la table absente (fallback « Bientôt »).
/**
 * Mini-jeux G4 — helpers serveur (SPEC-G4 §7, §6.2)
 * =================================================
 *
 * Tout ce qui touche la DB des mini-jeux côté serveur vit ici :
 *
 * 1. Détection d'infra absente (pattern try/fallback maison) : la table
 *    `game_sessions` et les RPC `create_game_session_v2` / `submit_game_answer`
 *    / `complete_game_session` arrivent via les migrations 181/182 (train G4,
 *    agent parallèle). Tant qu'elles ne sont pas appliquées, la page
 *    `/teen/games` doit rester EXACTEMENT comme avant (« Bientôt »), zéro casse.
 *
 * 2. Compteurs « du jour » (jour Africa/Casablanca, §6.2-3) pour afficher
 *    honnêtement les plafonds §6.2-5 (3 sessions créditées / jeu / jour).
 *    L'AUTORITÉ des plafonds reste la RPC serveur — ici on ne fait qu'afficher.
 *
 * 3. Normalisation défensive du retour des RPC : quelle que soit la forme
 *    exacte du jsonb renvoyé par la mig 182, on re-strip les clés de réponse
 *    (`correct`, `explanation`, …) avant tout envoi au client (§3.4-1 :
 *    la bonne réponse ne quitte jamais le serveur avant soumission).
 */

import "server-only"

import { createClient } from "@/lib/supabase/server"
import { logDbError } from "@/lib/observability/log-db-error"
import {
  PLAYABLE_GAME_SLUGS,
  XP_SESSIONS_PER_DAY,
  type PlayableGameSlug,
} from "@/lib/games/catalog"
import { casablancaDayStartUtc } from "@/lib/games/day"
import type {
  SessionXpInfo,
  StrippedQuestion,
  StrippedStatement,
} from "@/lib/games/types"

/* ==========================================================================
   Classification d'erreurs Postgres / PostgREST
   ========================================================================== */

type DbErrorLike = { code?: string; message?: string } | null | undefined

/** Relation absente : migrations non appliquées (42P01 direct, PGRST205 via cache). */
export function isMissingRelation(error: DbErrorLike): boolean {
  if (!error) return false
  if (error.code === "42P01" || error.code === "PGRST205") return true
  const msg = error.message ?? ""
  return /does not exist|schema cache/i.test(msg) && /relation|table/i.test(msg)
}

/** Fonction absente : RPC de la mig 182 pas encore en base (42883 / PGRST202). */
export function isMissingFunction(error: DbErrorLike): boolean {
  if (!error) return false
  if (error.code === "42883" || error.code === "PGRST202") return true
  const msg = error.message ?? ""
  return /function/i.test(msg) && /does not exist|could not find/i.test(msg)
}

/** Cooldown catalogue (`mini_game_types.cooldown_minutes`) levé par la RPC. */
export function isCooldownError(error: DbErrorLike): boolean {
  if (!error) return false
  return /cooldown|patiente|trop t[oô]t/i.test(error.message ?? "")
}

export function extractRetryMinutes(error: DbErrorLike): number | undefined {
  const m = (error?.message ?? "").match(/(\d+)\s*min/i)
  return m ? Number(m[1]) : undefined
}

/* ==========================================================================
   Appel RPC tolérant aux variantes de signature (contrat mig 182)
   ==========================================================================
   La spec fixe les NOMS des RPC et la signature de `submit_game_answer`
   (§7.1) ; pour `create_game_session_v2` / `complete_game_session` les noms
   de paramètres exacts appartiennent à la migration (agent parallèle). On
   essaie les variantes plausibles dans l'ordre ; une signature inconnue
   (PGRST202) passe à la suivante, toute autre erreur est renvoyée telle
   quelle. Un seul endroit à ajuster si le contrat final diverge.
   ========================================================================== */

export interface RpcAttempt {
  data: unknown
  error: DbErrorLike
  /** true = aucune variante n'existe en base (migrations absentes). */
  missing: boolean
}

export async function rpcTryVariants(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fn: string,
  variants: Record<string, unknown>[],
): Promise<RpcAttempt> {
  let lastError: DbErrorLike = null
  for (const args of variants) {
    const { data, error } = await supabase.rpc(fn, args)
    if (!error) return { data, error: null, missing: false }
    lastError = error
    if (!isMissingFunction(error)) return { data: null, error, missing: false }
  }
  return { data: null, error: lastError, missing: true }
}

/* ==========================================================================
   Infra + compteurs du jour (affichage honnête des plafonds §6.2-5)
   ========================================================================== */

export interface GamesInfraSummary {
  /** false = mig 181 absente (ou lecture impossible) → tout reste « bientôt ». */
  available: boolean
  /** Sessions créditées en XP aujourd'hui, par slug (jour Casablanca). */
  creditedToday: Partial<Record<PlayableGameSlug, number>>
}

export async function getGamesInfraSummary(): Promise<GamesInfraSummary> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { available: false, creditedToday: {} }

    const dayStart = casablancaDayStartUtc().toISOString()
    const { data, error } = await supabase
      .from("game_sessions")
      .select("game_slug, xp_awarded")
      .eq("teen_id", user.id)
      .gte("started_at", dayStart)
      .gt("xp_awarded", 0)

    if (error) {
      // Table absente = état attendu tant que la mig 181 n'est pas appliquée :
      // fallback silencieux « bientôt » (pas une panne).
      if (!isMissingRelation(error)) {
        logDbError("games.getGamesInfraSummary", error)
      }
      return { available: false, creditedToday: {} }
    }

    const creditedToday: Partial<Record<PlayableGameSlug, number>> = {}
    for (const row of data ?? []) {
      const slug = row.game_slug as PlayableGameSlug
      if ((PLAYABLE_GAME_SLUGS as readonly string[]).includes(slug)) {
        creditedToday[slug] = (creditedToday[slug] ?? 0) + 1
      }
    }
    return { available: true, creditedToday }
  } catch (error) {
    logDbError("games.getGamesInfraSummary", error)
    return { available: false, creditedToday: {} }
  }
}

/** Nombre de sessions créditées aujourd'hui pour UN jeu (page de jeu). */
export async function getCreditedTodayForSlug(slug: PlayableGameSlug): Promise<{
  available: boolean
  creditedToday: number
}> {
  const summary = await getGamesInfraSummary()
  return {
    available: summary.available,
    creditedToday: summary.creditedToday[slug] ?? 0,
  }
}

export function buildXpInfo(creditedToday: number): SessionXpInfo {
  return {
    creditedToday,
    capPerDay: XP_SESSIONS_PER_DAY,
    training: creditedToday >= XP_SESSIONS_PER_DAY,
  }
}

/* ==========================================================================
   Catalogue : lignes `mini_game_types` des slugs jouables (sans filtre
   is_active — une ligne désactivée par l'admin repasse le jeu en « bientôt »)
   ========================================================================== */

export interface PlayableCatalogRow {
  slug: string
  name: string | null
  description: string | null
  base_xp: number | null
  cooldown_minutes: number | null
  is_active: boolean
}

export async function getPlayableCatalogRows(): Promise<PlayableCatalogRow[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("mini_game_types")
      .select("slug, name, description, base_xp, cooldown_minutes, is_active")
      .in("slug", [...PLAYABLE_GAME_SLUGS])
    if (error) {
      logDbError("games.getPlayableCatalogRows", error)
      return []
    }
    return data ?? []
  } catch (error) {
    logDbError("games.getPlayableCatalogRows", error)
    return []
  }
}

/* ==========================================================================
   Normalisation défensive des payloads RPC (jamais de clé de réponse au client)
   ========================================================================== */

// NB : les extracteurs ci-dessous copient les champs en LISTE BLANCHE
// (question/options/proposition/layout) — les clés de réponse (`correct`,
// `explanation`, `is_true`, …) ne peuvent structurellement pas transiter,
// même si la RPC en renvoyait par erreur (M2/§3.4-1).

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function firstArray(...candidates: unknown[]): unknown[] | null {
  for (const c of candidates) if (Array.isArray(c) && c.length > 0) return c
  return null
}

export function extractSessionId(raw: unknown): string | null {
  if (typeof raw === "string" && raw.length > 0) return raw
  const obj = asRecord(raw)
  if (!obj) return null
  const session = asRecord(obj.session)
  const candidate =
    obj.session_id ?? obj.sessionId ?? session?.id ?? obj.id ?? null
  return typeof candidate === "string" ? candidate : null
}

function payloadContainer(raw: unknown): Record<string, unknown> {
  const obj = asRecord(raw) ?? {}
  const session = asRecord(obj.session) ?? {}
  return {
    ...obj,
    ...(asRecord(obj.seed) ?? {}),
    ...(asRecord(obj.payload) ?? {}),
    ...(asRecord(session.seed) ?? {}),
  }
}

/** Quiz Rush — questions strippées : ne copie QUE question + options. */
export function extractQuestions(raw: unknown): StrippedQuestion[] | null {
  const c = payloadContainer(raw)
  const arr = firstArray(c.questions, c.items, raw)
  if (!arr) return null
  const out: StrippedQuestion[] = []
  for (const entry of arr) {
    const item = asRecord(entry)
    if (!item) continue
    const question = item.question ?? item.text ?? item.q
    const options = Array.isArray(item.options) ? item.options : null
    if (typeof question === "string" && options && options.length >= 2) {
      out.push({ question, options: options.map(String) })
    }
  }
  return out.length > 0 ? out : null
}

/**
 * Vrai/Faux — affirmations. Contrat final (mig 183) : la RPC renvoie
 * `statements` = [{index, question, proposition}] — `proposition` est UNE
 * option tirée serveur (~50/50 correcte/incorrecte), le flag de vérité reste
 * serveur (dérivé du seed en DEFINER à la soumission). Copie en liste
 * blanche : ne copie JAMAIS le champ de vérité, même si la RPC en renvoyait
 * un par erreur.
 */
export function extractStatements(raw: unknown): StrippedStatement[] | null {
  const c = payloadContainer(raw)
  const arr = firstArray(c.statements)
  if (!arr) return null
  const out: StrippedStatement[] = []
  for (const entry of arr) {
    const item = asRecord(entry)
    if (!item) continue
    const { question, proposition } = item
    if (typeof question === "string" && question.length > 0) {
      out.push({
        question,
        proposition: typeof proposition === "string" ? proposition : "",
      })
    }
  }
  return out.length > 0 ? out : null
}

/** Memory — layout serveur (16 ids de paire) + set d'emojis éventuel. */
export function extractMemoryLayout(raw: unknown): {
  layout: number[] | null
  setId: string | null
} {
  const c = payloadContainer(raw)
  const layoutRaw = firstArray(c.layout, c.cards, c.board)
  const layout =
    layoutRaw && layoutRaw.every((v) => typeof v === "number")
      ? (layoutRaw as number[])
      : null
  const setId =
    typeof c.set === "string"
      ? c.set
      : typeof c.set_id === "string"
        ? c.set_id
        : typeof c.emoji_set === "string"
          ? c.emoji_set
          : null
  return { layout, setId }
}
