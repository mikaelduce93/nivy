/**
 * #211 Coach Niv — greeting génératif.
 *
 * Génère un message d'accueil court et contextualisé (humeur, série de jours,
 * quiz du jour, objectifs) via le provider LLM (Haiku côté Claude). Best-effort :
 * renvoie null si le provider échoue ou n'est pas configuré, pour que l'appelant
 * (cron evolve-teen-profiles) retombe sur un template codé en dur. Aucune PII en
 * entrée — les objectifs sont déjà scrubbés à l'écriture (coach_goals).
 */

import type { BaseAIProvider } from "./providers/base"
import { withTimeout } from "./coach-memory"

export type GreetingMood = "happy" | "tired" | "focused" | "neutral"

export interface GreetingContext {
  mood: GreetingMood
  streak: number
  passedQuizToday: boolean
  goals: string[]
}

const GREETING_SYSTEM =
  "Tu es Niv, le coach d'une app pour ados (13-17 ans) au Maroc. Écris UN message " +
  "d'accueil court (≤ 160 caractères), en français, tutoiement, ton chaleureux et " +
  "motivant, au plus 1 emoji. Aucun nom propre ni donnée personnelle. Adapte-toi au " +
  "contexte (humeur, série de jours, quiz du jour, objectifs). Réponds par le seul " +
  "message, sans guillemets ni préambule."

const MOOD_LABEL: Record<GreetingMood, string> = {
  happy: "de bonne humeur (a réussi un quiz aujourd'hui)",
  tired: "série de jours cassée, à relancer en douceur",
  focused: "concentré, en bonne série",
  neutral: "neutre",
}

export async function generateCoachGreeting(
  provider: BaseAIProvider,
  ctx: GreetingContext,
): Promise<string | null> {
  try {
    const user =
      `Humeur: ${MOOD_LABEL[ctx.mood]}\n` +
      `Série actuelle: ${ctx.streak} jour(s)\n` +
      `Quiz du jour réussi: ${ctx.passedQuizToday ? "oui" : "non"}\n` +
      `Objectifs en cours: ${ctx.goals.length ? ctx.goals.join(" ; ") : "(aucun)"}\n\n` +
      "Message d'accueil:"
    const { content } = await withTimeout(provider.call(GREETING_SYSTEM, user))
    const text = (content || "").replace(/^["']+|["']+$/g, "").trim().slice(0, 200)
    return text || null
  } catch {
    return null
  }
}
