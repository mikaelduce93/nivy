/**
 * #211 Coach Niv — mémoire long terme.
 *
 * Lecture/écriture de la mémoire durable du coach (tables `coach_profile`,
 * `coach_goals`, `coach_facts`, `coach_conversation_summaries` — migration 119).
 * Toute écriture passe par `scrubMemoryText` (minimisation PII mineurs).
 *
 * Sous RLS : un teen ne lit/écrit que ses propres lignes (teen_id = auth.uid()).
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { AIProviderFactory, type AIProviderType } from "./providers/factory"
import type { BaseAIProvider } from "./providers/base"
import { scrubMemoryText } from "./safe-context"

// #211 — `scrubMemoryText` vit dans le module PII canonique (lib/ai/safe-context).
// Ré-exporté ici pour les consommateurs historiques de coach-memory.
export { scrubMemoryText }

/** Borne dure par appel LLM (le SDK Anthropic a un timeout par défaut de 10 min
 *  + 2 retries) : sans ça, le budget temps du cron ne plafonne que le DÉMARRAGE
 *  d'un appel, pas sa durée. Un appel lent peut alors dépasser la limite
 *  d'exécution de la fonction Vercel. */
const COACH_LLM_TIMEOUT_MS = 8000

/**
 * #211 — Promise.race avec un timeout dur. Le timer est nettoyé dès que `p` se
 * règle (pas de rejection orpheline). Sur timeout, rejette → l'appelant retombe
 * sur son fallback (template greeting / skip compaction).
 */
export function withTimeout<T>(p: Promise<T>, ms: number = COACH_LLM_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("coach_llm_timeout")), ms)
  })
  return Promise.race([
    p.finally(() => clearTimeout(timer)),
    timeout,
  ])
}

export interface CoachMemory {
  summary: string
  goals: string[]
  facts: string[]
}

/**
 * Lit la mémoire du teen et renvoie une ligne de contexte prête à injecter dans
 * le system prompt (vide si rien). Best-effort : ne jette jamais.
 */
export async function getCoachMemoryLine(
  supabase: SupabaseClient,
  teenId: string,
): Promise<string | undefined> {
  try {
    const [{ data: profile }, { data: goals }, { data: facts }] = await Promise.all([
      supabase.from("coach_profile").select("long_summary").eq("teen_id", teenId).maybeSingle<{ long_summary: string | null }>(),
      supabase.from("coach_goals").select("goal").eq("teen_id", teenId).eq("status", "active").limit(3),
      supabase.from("coach_facts").select("fact").eq("teen_id", teenId).order("created_at", { ascending: false }).limit(5),
    ])

    const parts: string[] = []
    const summary = profile?.long_summary?.trim()
    if (summary) parts.push(`Ce que tu sais de lui/elle : ${summary}`)
    const goalList = (goals || []).map((g: { goal: string }) => g.goal).filter(Boolean)
    if (goalList.length) parts.push(`Objectifs en cours : ${goalList.join(" ; ")}`)
    const factList = (facts || []).map((f: { fact: string }) => f.fact).filter(Boolean)
    if (factList.length) parts.push(`À retenir : ${factList.join(" ; ")}`)

    return parts.length ? parts.join(". ") : undefined
  } catch {
    return undefined
  }
}

/**
 * #Transparency — Lit la mémoire brute du teen pour l'UI « Ce que Niv retient
 * de toi » (RGPD/CNDP droit d'accès). Contrairement à getCoachMemoryLine (qui
 * flattening en une string pour le prompt), celle-ci renvoie la STRUCTURE pour
 * un affichage grouped (résumé / objectifs / faits). Best-effort : ne jette jamais.
 */
export interface CoachMemoryForDisplay {
  summary: string | null
  goals: Array<{ id: string; goal: string; status: string }>
  facts: Array<{ id: string; fact: string; createdAt: string | null }>
  /** true si la mémoire est vide (pour afficher un empty state propre). */
  isEmpty: boolean
}

export async function getCoachMemoryForDisplay(
  supabase: SupabaseClient,
  teenId: string,
): Promise<CoachMemoryForDisplay> {
  const empty: CoachMemoryForDisplay = { summary: null, goals: [], facts: [], isEmpty: true }
  try {
    const [{ data: profile }, { data: goals }, { data: facts }] = await Promise.all([
      supabase
        .from("coach_profile")
        .select("long_summary")
        .eq("teen_id", teenId)
        .maybeSingle<{ long_summary: string | null }>(),
      supabase
        .from("coach_goals")
        .select("id, goal, status")
        .eq("teen_id", teenId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("coach_facts")
        .select("id, fact, created_at")
        .eq("teen_id", teenId)
        .order("created_at", { ascending: false })
        .limit(20),
    ])
    const goalList = (goals || []) as Array<{ id: string; goal: string; status: string }>
    const factRows = (facts || []) as Array<{ id: string; fact: string; created_at: string | null }>
    const summary = profile?.long_summary?.trim() || null
    return {
      summary,
      goals: goalList,
      facts: factRows.map((f) => ({ id: f.id, fact: f.fact, createdAt: f.created_at })),
      isEmpty: !summary && goalList.length === 0 && factRows.length === 0,
    }
  } catch {
    return empty
  }
}

/**
 * #Transparency — Efface toute la mémoire du teen (RGPD/CNDP droit d'effacement).
 * Supprime coach_profile, coach_goals, coach_facts, coach_conversation_summaries.
 * Best-effort : renvoie false si une suppression échoue (partial), true si tout ok.
 */
export async function clearCoachMemory(
  supabase: SupabaseClient,
  teenId: string,
): Promise<boolean> {
  try {
    const [profile, goals, facts, summaries] = await Promise.all([
      supabase.from("coach_profile").delete().eq("teen_id", teenId),
      supabase.from("coach_goals").delete().eq("teen_id", teenId),
      supabase.from("coach_facts").delete().eq("teen_id", teenId),
      supabase.from("coach_conversation_summaries").delete().eq("teen_id", teenId),
    ])
    return !profile.error && !goals.error && !facts.error && !summaries.error
  } catch {
    return false
  }
}

/** Persiste un fait durable (best-effort). */
export async function recordCoachFact(
  supabase: SupabaseClient,
  teenId: string,
  fact: string,
): Promise<void> {
  const clean = scrubMemoryText(fact)
  if (!clean) return
  try {
    await supabase.from("coach_facts").insert({ teen_id: teenId, fact: clean })
  } catch {
    // best-effort
  }
}

/** Met à jour le résumé long du teen (best-effort). */
export async function upsertCoachSummary(
  supabase: SupabaseClient,
  teenId: string,
  summary: string,
): Promise<void> {
  const clean = scrubMemoryText(summary)
  try {
    await supabase
      .from("coach_profile")
      .upsert({ teen_id: teenId, long_summary: clean, updated_at: new Date().toISOString() }, { onConflict: "teen_id" })
  } catch {
    // best-effort
  }
}

/** Persiste un objectif actif (best-effort, dédupliqué). */
export async function recordCoachGoal(
  supabase: SupabaseClient,
  teenId: string,
  goal: string,
): Promise<void> {
  const clean = scrubMemoryText(goal)
  if (!clean) return
  try {
    const { data: existing } = await supabase
      .from("coach_goals")
      .select("id")
      .eq("teen_id", teenId)
      .eq("status", "active")
      .eq("goal", clean)
      .limit(1)
    if (existing && existing.length) return
    await supabase.from("coach_goals").insert({ teen_id: teenId, goal: clean, status: "active" })
  } catch {
    // best-effort
  }
}

/**
 * #211 — extraction LLM légère de la mémoire durable à partir d'un tour de chat.
 * Persiste objectifs + faits (PII-scrubbés). Best-effort : ne jette jamais et
 * ne fait RIEN si aucune clé n'est configurée (le coach reste fonctionnel).
 */
export async function extractAndPersistMemory(
  supabase: SupabaseClient,
  teenId: string,
  userText: string,
  replyText: string,
  providerType: AIProviderType,
): Promise<void> {
  try {
    const apiKey =
      providerType === "claude" ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY
    if (!apiKey) return
    const model =
      providerType === "claude"
        ? process.env.CLAUDE_GREETING_MODEL || "claude-haiku-4-5"
        : process.env.OPENAI_MODEL_ID || "gpt-4o-mini"
    const provider = AIProviderFactory.getProvider(providerType, model)
    const system =
      "Tu extrais la mémoire durable d'un coach pour ado. Réponds UNIQUEMENT en JSON " +
      '{"facts":[],"goals":[]} (français, 0 à 3 items courts chacun). ' +
      "\"goals\" = objectifs explicites de l'ado (ex: progresser en maths). " +
      "\"facts\" = préférences/infos durables utiles au coaching (ex: aime le foot). " +
      "Aucune donnée personnelle (ni nom, ni téléphone, ni adresse). Si rien d'utile, renvoie des tableaux vides."
    const user = `Échange:\nAdo: ${userText}\nCoach: ${replyText}\n\nJSON:`
    const { content } = await provider.call(system, user)
    const parsed = safeParseMemory(content)
    if (!parsed) return
    for (const g of parsed.goals.slice(0, 3)) await recordCoachGoal(supabase, teenId, g)
    for (const f of parsed.facts.slice(0, 3)) await recordCoachFact(supabase, teenId, f)
  } catch {
    // best-effort
  }
}

/**
 * #211 — Résout le provider pour les tâches « greeting » / résumé du coach
 * (Haiku côté Claude). Préfère Claude si ANTHROPIC_API_KEY, sinon OpenAI, sinon
 * null (l'appelant retombe alors sur un fallback — jamais d'échec dur).
 */
export function pickCoachProvider(): BaseAIProvider | null {
  if (process.env.ANTHROPIC_API_KEY) {
    return AIProviderFactory.getProvider(
      "claude",
      process.env.CLAUDE_GREETING_MODEL || "claude-haiku-4-5",
    )
  }
  if (process.env.OPENAI_API_KEY) {
    return AIProviderFactory.getProvider(
      "openai",
      process.env.OPENAI_MODEL_ID || "gpt-4o-mini",
    )
  }
  return null
}

/**
 * #211 — Compaction mémoire : résume objectifs + faits durables d'un teen en
 * une ligne durable (`coach_profile.long_summary`) et journalise un
 * `coach_conversation_summaries`. Borne la croissance de la mémoire (la purge
 * mig 121 supprime l'ancien). Best-effort : renvoie false sans jeter si rien à
 * compacter ou en cas d'erreur. PII-scrubbée à l'écriture.
 */
export async function compactCoachMemory(
  supabase: SupabaseClient,
  teenId: string,
  provider: BaseAIProvider,
): Promise<boolean> {
  try {
    const [{ data: goals }, { data: facts }] = await Promise.all([
      supabase.from("coach_goals").select("goal").eq("teen_id", teenId).eq("status", "active").limit(10),
      supabase.from("coach_facts").select("fact").eq("teen_id", teenId).order("created_at", { ascending: false }).limit(20),
    ])
    const goalList = (goals || []).map((g: { goal: string }) => g.goal).filter(Boolean)
    const factList = (facts || []).map((f: { fact: string }) => f.fact).filter(Boolean)
    if (!goalList.length && !factList.length) return false

    const system =
      "Tu compactes la mémoire durable d'un coach pour ado en UN résumé court " +
      "(≤ 300 caractères, français, 3e personne, factuel). Garde objectifs + " +
      "préférences durables utiles au coaching. Aucune donnée personnelle (ni nom, " +
      "ni téléphone, ni adresse). Réponds par le seul résumé, sans préambule."
    const user =
      `Objectifs: ${goalList.join(" ; ") || "(aucun)"}\n` +
      `Faits: ${factList.join(" ; ") || "(aucun)"}\n\nRésumé:`
    const { content } = await withTimeout(provider.call(system, user))
    const summary = scrubMemoryText(content)
    if (!summary) return false

    await upsertCoachSummary(supabase, teenId, summary)
    await supabase.from("coach_conversation_summaries").insert({ teen_id: teenId, summary })
    return true
  } catch {
    return false
  }
}

function safeParseMemory(text: string): { facts: string[]; goals: string[] } | null {
  try {
    const cleaned = (text || "").replace(/```json/gi, "").replace(/```/g, "").trim()
    const start = cleaned.indexOf("{")
    const end = cleaned.lastIndexOf("}")
    if (start < 0 || end < 0 || end <= start) return null
    const obj = JSON.parse(cleaned.slice(start, end + 1)) as {
      facts?: unknown
      goals?: unknown
    }
    const facts = Array.isArray(obj.facts) ? obj.facts.filter((x): x is string => typeof x === "string") : []
    const goals = Array.isArray(obj.goals) ? obj.goals.filter((x): x is string => typeof x === "string") : []
    return { facts, goals }
  } catch {
    return null
  }
}
