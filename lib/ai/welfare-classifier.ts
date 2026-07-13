/**
 * #Welfare — Classifier de détresse pour messages d'ados (13-17).
 *
 * Rideau sémantique exécuté AVANT l'appel au modèle de chat principal. Trois
 * niveaux :
 *  - "crisis"  : signaux explicites (suicide, automutilation, abus) → on
 *                SAUTE le modèle, on renvoie un SAFE_REDIRECT renforcé, on
 *                journalise un signal `welfare_crisis`.
 *  - "distress": détresse exprimée sans urgence vitale → on laisse passer le
 *                modèle mais on injecte une consigne "empathique + adulte de
 *                confiance" dans le system prompt, et on journalise
 *                `welfare_distress`.
 *  - "ok"      : flux normal, pas de journalisation.
 *
 * Le DENY_PATTERNS regex (route.ts) reste le PREMIER rideau (synchrone, cheap).
 * Ce classifier est le DEUXIÈME rideau (sémantique, ~200ms Haiku). Défense en
 * profondeur : si l'un rate, l'autre attrape.
 *
 * PII-safe : le message brut n'est JAMAIS persisté. On ne stocke que le
 * `signal_type` + `metadata` agrégée (niveau + signaux détectés), jamais le
 * texte de l'ado. La table `behavioral_signals` est RLS-protégée.
 */

import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { AIProviderFactory, type AIProviderType } from "./providers/factory"
import { withTimeout } from "./coach-memory"

export type WelfareLevel = "ok" | "distress" | "crisis"

export interface WelfareResult {
  level: WelfareLevel
  /** 0..1 — confiance du classifieur (1.0 pour le fallback regex certain). */
  confidence: number
  /** Tags de signaux détectés, ex: ["self_harm", "suicidal_ideation"]. */
  signals: string[]
  /** Sortie brute du LLM pour audit (jamais persistée côté user). */
  raw?: string
}

/** Messages trop courts (≤ 2 mots) ne méritent pas un appel LLM. */
const MIN_WORDS_FOR_LLM = 3
/** Limite dure : on ne classifie que les 500 premiers chars (coût + latence). */
const MAX_CHARS_TO_CLASSIFY = 500
/** Budget temps pour l'appel Haiku (le fallback regex est synchrone). */
const WELFARE_LLM_TIMEOUT_MS = 3000

/**
 * Fallback regex synchrone — utilisé quand aucune clé API n'est configurée,
 * ou en secours d'une erreur/timeout LLM. Conservateur : privilégie les faux
 * positifs (mieux vaut logger distress à tort que rater une crise).
 *
 * Note : DENY_PATTERNS (route.ts) attrape déjà les formes explicites en amont.
 * Ici on cible les formes DOUCES/indirectes que les regex rate.
 */
const DISTRESS_PATTERNS: RegExp[] = [
  // Détresse psychologique exprimée (sans mot-clé dur déjà attrapé par DENY).
  // Pas de \b ancré en début de groupe pour résister aux répétitions/concaténations.
  /(?:j['e ](?:en )?(?:peux|pourrai) plus|à quoi (?:ça |ca )?(?:sert|bon)|plus (?:envie|force) (?:de|d')|tout le monde me (?:déteste|deteste|laisse)|personne (?:ne )?(?:m['e ]|compren))/i,
  /(?:déprime|deprime|dégoût(?:é|e?s?)|degout(?:e|ee?)|inutile|sans (?:valeur|intérêt|interet)|vide (?:total|intérieur|interieur))/i,
  /(?:j(?:e )?(?:suis|me sens) (?:seul|seule|nul|nulle|perdu|perdue|fatigué|fatiguee) (?:de|à|a) (?:tout|ça|ca))/i,
  // Isolement / retrait
  /(?:personne (?:ne )?(?:parle|vient|invite)|toujours (?:seul|seule|exclu|exclue))/i,
  // Harcèlement exprimé (les insultes directes sont attrapées par DENY violence)
  /(?:on se moque|ils? me harcèlent|harcèlent|tapent sur|embêtent|embetent)/i,
]

const CRISIS_PATTERNS: RegExp[] = [
  // Idéation suicidaire — toutes les formulations courantes d'un ado (FR).
  // Conservative : tout énoncé lié à mourir/disparaître/finir = crisis.
  /(?:envie de (?:mourir|disparaî?tre|disparaitre|finir))/i,
  /(?:pens(?:é|e)s? à (?:mourir|disparaî?tre|disparaitre|finir|suicide))/i,
  /(?:veux?|voudrais|aimerais) (?:mourir|disparaî?tre|disparaitre|finir|en finir)/i,
  /(?:je vais|j'vais|vais) (?:mourir|disparaî?tre|disparaitre|finir|en finir)/i,
  /(?:plus (?:être|etre) là-bas|plus jamais là|en finir(?: avec tout| de tout)?|faire une bêtise|faire des bêtises|partir pour toujours)/i,
  // Automutilation auto-référée
  /(?:je (?:me )?(?:frappe|bless(?:e|er)?|coup(?:e|er)|brûl(?:e|er)|brul(?:e|er)))/i,
  /(?:je me suis (?:blessé|blessée|coupé|coupée|frappé|frappée))/i,
  // Abus subi — signal de crise (pas seulement distress)
  /(?:quelqu['e ]un me (?:touche|frappe|blesse)|on me (?:frappe|blesse|touche) (?:là|encore|tout le temps))/i,
]

/**
 * Classifie un message d'ado. Ne jette jamais — en cas d'échec LLM, retombe
 * sur le fallback regex. En cas d'erreur inattendue, retourne "ok" (le
 * DENY_PATTERNS en amont + le post-filtre isReplySafe restent actifs).
 */
export async function classifyTeenMessage(
  message: string,
  providerType: AIProviderType,
): Promise<WelfareResult> {
  const text = (message || "").trim()
  if (text.length === 0) return { level: "ok", confidence: 1, signals: [] }

  // Regex d'abord (synchrone, gratuit, certain) — attrape les formes explicites.
  const regexResult = classifyByRegex(text)
  if (regexResult) return regexResult

  // Trop court pour justifier un appel LLM → ok (le modèle principal gérera).
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length < MIN_WORDS_FOR_LLM) {
    return { level: "ok", confidence: 1, signals: [] }
  }

  // Tentative LLM (Haiku) pour la détection sémantique douce.
  const llmResult = await classifyByLlm(text, providerType).catch(() => null)
  if (llmResult) return llmResult

  // Échec LLM (pas de clé / timeout / erreur) → ok conservateur. DENY_PATTERNS
  // en amont + isReplySafe en aval restent les garde-fous principaux.
  return { level: "ok", confidence: 0, signals: [] }
}

/** Classification regex pure (synchrone, déterministe). */
function classifyByRegex(text: string): WelfareResult | null {
  for (const re of CRISIS_PATTERNS) {
    if (re.test(text)) {
      return { level: "crisis", confidence: 1, signals: ["crisis_pattern_match"] }
    }
  }
  for (const re of DISTRESS_PATTERNS) {
    if (re.test(text)) {
      return { level: "distress", confidence: 0.9, signals: ["distress_pattern_match"] }
    }
  }
  return null
}

/**
 * Classification sémantique via Haiku. System prompt strict JSON. On ne lui
 * envoie que le texte (jamais d'identifiant). Timeout dur 3s via withTimeout.
 */
async function classifyByLlm(
  text: string,
  providerType: AIProviderType,
): Promise<WelfareResult | null> {
  const apiKey =
    providerType === "claude" ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const model =
    providerType === "claude"
      ? process.env.CLAUDE_GREETING_MODEL || "claude-haiku-4-5"
      : process.env.OPENAI_MODEL_ID || "gpt-4o-mini"

  const provider = AIProviderFactory.getProvider(providerType, model)
  const system =
    "Tu es un classifieur de sécurité pour les messages d'un adolescent (13-17 ans, " +
    "contexte Maroc). Ton seul job : détecter la détresse psychologique. " +
    "Réponds UNIQUEMENT par un JSON strict, sans préambule ni markdown :\n" +
    '{"level":"ok|distress|crisis","signals":[]}\n\n' +
    "Niveaux :\n" +
    '- "crisis" : idées suicidaires explicites, intention de se blesser, abus subi, urgence vitale.\n' +
    '- "distress" : tristesse profonde, solitude exprimée, découragement, harcèlement vécu — SANS urgence vitale immédiate.\n' +
    '- "ok" : tout le reste (questions scolaires, jeu, quotidien, fatigues passagères normales).\n\n' +
    "signals : liste courte de tags en anglais (ex: self_harm, suicidal_ideation, bullying, " +
    "loneliness, depression). Tableau vide si ok. Sois prudent : un ado fatigué un soir = ok, " +
    "pas distress. Ne SURclassifie pas — le doute raisonnable = ok (les filtres en aval gèrent)."

  const user = `Message à classifier:\n${text.slice(0, MAX_CHARS_TO_CLASSIFY)}\n\nJSON:`

  const { content } = await withTimeout(provider.call(system, user), WELFARE_LLM_TIMEOUT_MS)
  return parseWelfareJson(content)
}

function parseWelfareJson(content: string): WelfareResult | null {
  const cleaned = (content || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim()
  const start = cleaned.indexOf("{")
  const end = cleaned.lastIndexOf("}")
  if (start < 0 || end < 0 || end <= start) return null

  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1)) as {
      level?: unknown
      signals?: unknown
    }
    const level = normalizeLevel(obj.level)
    if (!level) return null
    const signals = Array.isArray(obj.signals)
      ? obj.signals.filter((s): s is string => typeof s === "string").slice(0, 6)
      : []
    return { level, confidence: 0.8, signals, raw: content }
  } catch {
    // JSON invalide : on ne fait pas confiance au LLM, on retombe sur regex
    // (déjà essayé avant l'appel) → donc null = ok conservateur.
    return null
  }
}

function normalizeLevel(v: unknown): WelfareLevel | null {
  if (typeof v !== "string") return null
  const lower = v.toLowerCase().trim()
  if (lower === "crisis") return "crisis"
  if (lower === "distress") return "distress"
  if (lower === "ok") return "ok"
  return null
}

/**
 * Journalise un signal welfare dans `behavioral_signals`. PII-safe : le texte
 * du message n'est JAMAIS persisté — seulement le type, le niveau et les
 * signaux détectés. Best-effort : ne jette jamais.
 *
 * Insère via le client RLS du teen (jamais service-role) — le signal est
 * attribuable à l'auteur légitime. `target_type='welfare'` + `target_id=null`
 * (pas de ressource ciblée).
 */
export async function logWelfareSignal(
  supabase: SupabaseClient,
  teenId: string,
  level: Exclude<WelfareLevel, "ok">,
  signals: string[],
): Promise<void> {
  try {
    await supabase.from("behavioral_signals").insert({
      teen_id: teenId,
      signal_type: level === "crisis" ? "welfare_crisis" : "welfare_distress",
      target_type: "welfare",
      target_id: null,
      // weight sert à l'aggregate scoring ; on garde 0 pour ne pas polluer
      // le scoring d'engagement (les signals welfare sont un flux séparé).
      weight: 0,
      metadata: {
        level,
        signals,
        source: "coach_welfare_classifier",
        // Pas de texte, pas de contenu du message.
      },
    })
  } catch (err) {
    // Best-effort : on ne casse jamais le flux chat pour un échec de log.
    console.warn("[welfare] signal insert failed:", err)
  }
}

/**
 * #Escalade — Crée une alerte reviewable pour le parent sur détection crisis.
 *
 * CONSERVATIF & RÉVERSIBLE : on insère une ligne `parental_approvals`
 * (`action_type: "welfare_alert"`, `status: "pending"`) que le parent voit dans
 * sa surface de validation existante (page approvals / badge compteur). PAS
 * d'auto-push notification — un faux positif risquerait de paniquer un parent
 * à tort. L'alerte est reviewable : le parent la découvre à sa prochaine
 * connexion et peut la marquer "pris en charge".
 *
 * Si on n'a pas de `parentId` (profil incomplet), on ne fait rien — le signal
 * welfare est quand même loggé dans behavioral_signals (cf logWelfareSignal).
 *
 * PII-safe : aucun contenu du message dans `details`, seulement level + signals.
 *
 * TTL long (30 jours) : une alerte welfare ne doit PAS expirer comme une
 * approbation d'épargne (7j) — le parent doit pouvoir la consulter longtemps.
 *
 * Best-effort : ne jette jamais.
 */
const WELFARE_ALERT_TTL_MS = 30 * 24 * 60 * 60 * 1000

export async function escalateCrisisToParent(
  supabase: SupabaseClient,
  teenId: string,
  parentId: string | undefined,
  signals: string[],
): Promise<void> {
  if (!parentId) return // pas de parent connu → le signal welfare reste logged
  try {
    await supabase.from("parental_approvals").insert({
      parent_id: parentId,
      teen_id: teenId,
      action_type: "welfare_alert",
      resource_type: "welfare",
      resource_id: null,
      amount: null,
      details: {
        level: "crisis",
        signals,
        source: "coach_welfare_classifier",
        // Pas de contenu du message, pas de détails cliniques.
        // Le parent sait qu'une alerte a été levée, il initie le dialogue.
        guidance:
          "Niv a détecté un signal de détresse. Parlez à votre enfant dans un " +
          "calme, sans l'interroger sur le contenu de ses messages. Si besoin, " +
          "SOS Amitié Maroc : 05 22 22 22 22.",
      },
      status: "pending",
      expires_at: new Date(Date.now() + WELFARE_ALERT_TTL_MS).toISOString(),
    })
  } catch (err) {
    // Best-effort : le signal behavioral_signals reste la source de vérité.
    console.warn("[welfare] parent escalation failed:", err)
  }
}

/**
 * SAFE_REDIRECT renforcé pour le niveau crisis : empathie + ligne d'écoute MA
 * + nudge parent explicite. Remplace la réponse modèle sur détection crise.
 */
export const WELFARE_CRISIS_REPLY =
  "Je t'entends, et ce que tu ressens compte vraiment 💛 Tu n'es pas seul(e). " +
  "Ce genre de moment mérite un vrai humain à tes côtés : parle-en à ton parent, " +
  "ou à un adulte de confiance, dès que possible. Au Maroc, tu peux aussi appeler " +
  "'SOS Amitié' au 05 22 22 22 22 (écoute gratuite et anonyme). " +
  "Je reste là si tu veux écrire, mais eux pourront t'aider bien mieux que moi."
