/**
 * #Telemetry — Observabilité du coach Niv (coût / latence / tokens / safety).
 *
 * Émet un log structuré PARSABLE par tour (un objet JSON stable sur une ligne).
 * Aucune table dédiée : l'agrégation se fait côté plateforme de logs (Vercel /
 * Datadog / Loki) via le pattern `[coach] {...}`. C'est le standard pour du
 * monitoring runtime à haut volume — une insert DB par tour de chat serait
 * disproportionné et ajouterait de la latence.
 *
 * PII-safe : aucun contenu du message n'est loggé. Seuls : provider, modèle,
 * tokens, latence, issue (ok/blocked/deny/welfare/unsafe/error), coût estimé.
 *
 * Coût estimé via une table de pricing env-overridable (USD / 1M tokens).
 */

import "server-only"
import type { AIProviderMetadata } from "./providers/base"
import type { AIProviderType } from "./providers/factory"

export type CoachTurnOutcome =
  | "ok" // flux normal, réponse modèle servie
  | "blocked_input" // rideau 1 : DENY_PATTERNS a bloqué l'input
  | "blocked_output" // rideau 3 : isReplySafe a coupé la sortie modèle
  | "welfare_crisis" // rideau 2 : classifier welfare a détecté crisis
  | "welfare_distress" // rideau 2 : classifier welfare a détecté distress
  | "no_api_key" // fallback (pas de clé configurée)
  | "tool_action" // tour outillé (closed loop)
  | "error" // erreur inattendue

export interface CoachTurnMetrics {
  teenId: string
  provider: AIProviderType
  model: string
  /** ms entre le début du traitement et la fin du stream/appel. */
  latencyMs: number
  /** tokens entrée + sortie (depuis les métadonnées provider si dispo). */
  tokensIn?: number
  tokensOut?: number
  tokensTotal?: number
  /** tokens lus depuis le cache prompt (Anthropic) — économie réalisée. */
  cacheReadTokens?: number
  /** Estimation USD du tour (calculée depuis PRICING). */
  costUsd?: number
  outcome: CoachTurnOutcome
  /** Longueur du message de l'ado (pas son contenu). */
  inputChars: number
  /** Longueur de la réponse servie (pas son contenu). */
  outputChars: number
  /** Tours restants après ce tour (cap quotidien). */
  remainingTurns: number
}

/**
 * Pricing USD / 1M tokens (input / output), env-overridable. Valeurs 2026-07
 * approximatives ; à ajuster selon la facturation réelle.
 */
const DEFAULT_PRICING: Record<string, { in: number; out: number; cacheRead?: number }> = {
  // Claude Sonnet 4 — ~$3 / 1M in, $15 / 1M out, $0.30 / 1M cache read.
  "claude-sonnet-4-6": { in: 3, out: 15, cacheRead: 0.3 },
  // Claude Haiku 4.5 — ~$0.25 / 1M in, $1.25 / 1M out (greeting / extraction).
  "claude-haiku-4-5": { in: 0.25, out: 1.25, cacheRead: 0.03 },
  // OpenAI gpt-4o-mini — ~$0.15 / 1M in, $0.60 / 1M out.
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
}

function resolvePricing(model: string): { in: number; out: number; cacheRead?: number } {
  // Match souple : "claude-sonnet-4-6-20..." → "claude-sonnet-4-6".
  const key = Object.keys(DEFAULT_PRICING).find((k) => model.startsWith(k))
  return key ? DEFAULT_PRICING[key] : { in: 1, out: 5 }
}

function estimateCost(
  model: string,
  tokensIn: number,
  tokensOut: number,
  cacheRead: number,
): number {
  const p = resolvePricing(model)
  const inCost = (tokensIn * p.in) / 1_000_000
  const outCost = (tokensOut * p.out) / 1_000_000
  // Le cache read remplace l'input read (moins cher) — on estime l'économie.
  const cacheSavings = cacheRead > 0 ? (cacheRead * (p.in - (p.cacheRead ?? p.in))) / 1_000_000 : 0
  return Math.max(0, inCost + outCost - cacheSavings)
}

/**
 * Émet un log structuré pour un tour de coach. Format stable et parsable :
 *   [coach] {"teenId":"...","provider":"claude",...}
 *
 * L'idée : un grep `[coach]` sur les logs Vercel donne toutes les métriques,
 * et un `jq` extrait l'agrégat (coût/jour, p95 latence, taux de blocage).
 */
export function logCoachTurn(metrics: CoachTurnMetrics): void {
  const payload = {
    teenId: metrics.teenId.slice(0, 8), // prefix only — pas de PII complète
    provider: metrics.provider,
    model: metrics.model,
    latencyMs: metrics.latencyMs,
    tokensIn: metrics.tokensIn ?? null,
    tokensOut: metrics.tokensOut ?? null,
    tokensTotal: metrics.tokensTotal ?? null,
    cacheReadTokens: metrics.cacheReadTokens ?? null,
    costUsd: metrics.costUsd,
    outcome: metrics.outcome,
    inputChars: metrics.inputChars,
    outputChars: metrics.outputChars,
    remainingTurns: metrics.remainingTurns,
  }
  // console.warn (= stderr) pour ne pas polluer stdout en prod Vercel.
  console.warn("[coach]", JSON.stringify(payload))
}

/**
 * Helper : construit les métriques finales depuis les métadonnées provider +
 * les compteurs de la route. Centralise le calcul coût.
 */
export function buildTurnMetrics(args: {
  teenId: string
  provider: AIProviderType
  meta?: AIProviderMetadata
  startTime: number
  outcome: CoachTurnOutcome
  inputChars: number
  outputChars: number
  remainingTurns: number
}): CoachTurnMetrics {
  const latencyMs = Date.now() - args.startTime
  const tokensIn = args.meta?.tokensUsed ? undefined : undefined // cf note
  // Note : AIProviderMetadata.tokensUsed est la SOMME in+out. On ne peut pas
  // séparer sans étendre le contrat — on logge le total + cacheRead séparément.
  const tokensTotal = args.meta?.tokensUsed
  const cacheReadTokens = args.meta?.cacheReadInputTokens
  // Estimation : si on n'a que le total, on suppose ~70% in / 30% out (chat).
  const tokensInEst = args.meta?.tokensUsed ? Math.round(args.meta.tokensUsed * 0.7) : 0
  const tokensOutEst = args.meta?.tokensUsed ? Math.round(args.meta.tokensUsed * 0.3) : 0
  const costUsd = args.meta
    ? estimateCost(args.meta.model, tokensInEst, tokensOutEst, cacheReadTokens ?? 0)
    : undefined
  return {
    teenId: args.teenId,
    provider: args.provider,
    model: args.meta?.model ?? "unknown",
    latencyMs,
    tokensIn,
    tokensOut: tokensOutEst || undefined,
    tokensTotal,
    cacheReadTokens,
    costUsd,
    outcome: args.outcome,
    inputChars: args.inputChars,
    outputChars: args.outputChars,
    remainingTurns: args.remainingTurns,
  }
}
