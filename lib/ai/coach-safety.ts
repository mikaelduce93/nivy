/**
 * #Safety — Filtres de sécurité du coach Niv (rideaux 1 et 3).
 *
 * Module DÉDIÉ et TESTABLE : extraction des `DENY_PATTERNS` + `SAFE_REDIRECT` +
 * `isReplySafe` qui vivaient en dur dans `app/api/teen/avatar-coach/route.ts`.
 * Permet à la suite red-team (`tests/unit/coach-safety-redteam.test.ts`) de les
 * exercer sans devoir mocker la route HTTP.
 *
 * Rideaux de sécurité (défense en profondeur) :
 *   1. `isInputBlocked()`  — regex synchrone AVANT le modèle (ce module)
 *   2. Classifier welfare  — sémantique Haiku (lib/ai/welfare-classifier.ts)
 *   3. `isReplySafe()`     — post-filtre incrémental sur la SORTIE modèle (ce module)
 *
 * Conservateur : on préfère les faux positifs (bloquer/rediriger à tort) aux
 * faux négatifs (laisser passer un contenu dangereux pour un mineur).
 *
 * Note : ces filtres sont COMPLÉMENTAIRES du classifier welfare. Le regex est
 * cheap et synchrone ; le classifier attrape les formes sémantiques douces que
 * le regex rate (détresse indirecte, idées noires exprimées autrement).
 */

/** Texte de redirection par défaut (sujets interdits / échec sécurité). */
export const SAFE_REDIRECT =
  "Hmm, ça c'est un sujet où je préfère pas te répondre tout seul. " +
  "Parles-en plutôt à ton parent ou à un mentor de confiance — ils sauront t'écouter et t'aider mieux que moi 💛"

/**
 * Rideau 1 — Thèmes hard-blocked (whitepaper §8 + audit-prelaunch 07).
 * Quand un message matche, on NE PASSE PAS le modèle : on renvoie SAFE_REDIRECT
 * immédiatement. Coût nul, latence nulle, sécurité certaine.
 */
export const DENY_PATTERNS: RegExp[] = [
  // drugs / alcohol — `drug` accepte le pluriel (drugs), idem joints/weeds rares.
  /\b(drogue|drugs?|cocaine|cocaïne|cannabis|weed|joint|hashich|mdma|ecstasy|alcool|alcohol|biere|bière|vodka|whisky)\b/i,
  // sex / sexual content
  /\b(sexe|sexuel|porno|porn|nudes?|sextape|prostitu|onanis|masturbation|chibre|zob|baiser une|baise(?:r)? avec)\b/i,
  // violence / self-harm
  /\b(suicide|me tuer|mourir|tuer (?:quelqu(?:'|’)un|ma|mon|le|la)|me (?:fl|fr)apper|automutil|me couper|cutting|harceler|tabasser|battre)\b/i,
  // politics / monarchy / sahara — V1 hard-blocked in MA context
  /\b(politique|election|élection|gouvernement|roi mohammed|monarchie|sahara occidental|polisario|makhzen)\b/i,
  // religion as topic
  /\b(islam|musulman|chrétien|chretien|juif|jewish|halal|haram|fatwa|coran|bible|torah|priere du)\b/i,
]

/** Vrai si le message de l'ado matche un thème hard-blocked (rideau 1, pré-modèle). */
export function isInputBlocked(message: string): boolean {
  if (!message) return false
  return DENY_PATTERNS.some((re) => re.test(message))
}

/**
 * Rideau 3 — Post-filtre sur la SORTIE du modèle. Trois contrôles :
 *  1. Re-matche les mêmes DENY_PATTERNS (le modèle peut se dérober malgré la
 *     consigne — on coupe net).
 *  2. Heuristique anti-anglais (V1 = FR only) : si > 25% de mots English-only,
 *     on rejette (le modèle a basculé de langue).
 *  3. Réponse vide → unsafe (on préfère un fallback qu'un blanc).
 *
 * Utilisé en incrémental pendant le stream : dès qu'un delta rend le buffer
 * unsafe, la route abort() le stream et substitue SAFE_REDIRECT.
 */
export function isReplySafe(text: string): boolean {
  // Empty / whitespace-only = unsafe (on préfère un fallback qu'un blanc).
  if (!text || text.trim().length === 0) return false
  for (const re of DENY_PATTERNS) if (re.test(text)) return false
  // Heuristique anti-anglais (V1 = FR only).
  const words = text.toLowerCase().match(/[a-zàâçéèêëîïôûùüÿñæœ]+/g) || []
  if (words.length >= 8) {
    const englishOnly = words.filter((w) =>
      /^(the|and|you|your|with|that|this|have|from|will|but|just|like|about|what|when|why|how)$/.test(w),
    ).length
    if (englishOnly / words.length > 0.25) return false
  }
  return true
}
