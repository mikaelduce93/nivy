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

/** Retire les PII évidentes avant de persister un texte de mémoire (mineurs). */
export function scrubMemoryText(text: string): string {
  return (text || "")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/(\+?\d[\d\s().-]{7,}\d)/g, "[tel]")
    .slice(0, 500)
    .trim()
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
