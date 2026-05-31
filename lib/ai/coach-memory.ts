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
