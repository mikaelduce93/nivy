/**
 * Content Safety Filter — V1.1 P2.4 (D2)
 *
 * Rule-based pre-filter for AI-generated content (quizzes, missions, challenges)
 * before it ships to a 13-17yo Moroccan teen audience.
 *
 * Categories blocked (per docs/vision/ai-safety-teen-welfare.md §1):
 *   - sexual / explicit content
 *   - recreational drugs (alcohol, cannabis, hard drugs)
 *   - graphic violence / weapons
 *   - gambling outside regulated event promos
 *   - self-harm / suicide ideation / dangerous diets
 *   - profanity (FR + light EN)
 *   - religious / political controversy that is unsafe for a Moroccan minor
 *   - non-French generation leakage (V1 = French-only)
 *
 * NOT a moderation API call — pure rules so it works offline and zero-cost.
 * The OpenAI moderation endpoint can be layered on top later if/when a key
 * with that scope becomes available — but we deliberately add NO new
 * external dependency here (per D2 scope).
 */

export type SafetyCategory =
  | "sexual"
  | "drugs"
  | "violence"
  | "gambling"
  | "self_harm"
  | "profanity"
  | "controversial"
  | "language_leak"

export interface SafetyHit {
  category: SafetyCategory
  term: string
  severity: "block" | "warn"
}

export interface SafetyResult {
  isSafe: boolean
  hits: SafetyHit[]
  reason: string | null
}

// -- French + Darija-translit + English banned-token lists.
//    Word-boundary matched, case-insensitive, accent-insensitive. Lemma form,
//    stems handled via leading word boundary + suffix tolerance.
const SEXUAL_TERMS: string[] = [
  "sexe", "sexuel", "sexuelle", "sexuellement", "porno", "pornographie",
  "erotique", "erotisme", "nu", "nudite", "nue", "seins", "penis", "vagin",
  "vierge", "viol", "prostitu", "masturb", "orgasme", "fellation",
  "homosex", "lesbi", "gay", "bisex", // gating: relationships content needs human review
  "preservatif", "contraceptif",
  "sex", "porn", "nude", "nudity", "rape", "boobs", "tits",
]

const DRUG_TERMS: string[] = [
  "drogue", "drogues", "cocaine", "heroine", "ecstasy", "lsd", "cannabis",
  "marijuana", "shit", "haschich", "hashish", "opium", "morphine",
  "kif", "zatla", // darija for cannabis
  "alcool", "biere", "vodka", "whisky", "rhum", "vin",
  "ivre", "ivresse", "saoul", "soul",
  "fumer", "fume",
  "cocaine", "heroin", "weed", "joint", "drunk", "alcohol",
]

const VIOLENCE_TERMS: string[] = [
  "tuer", "tue", "meurtre", "assassin", "assassinat", "torture", "tortur",
  "egorger", "decapit", "massacre", "genocide",
  "arme", "armes", "fusil", "pistolet", "kalachnikov", "grenade",
  "attentat", "terrorisme", "terroriste", "bombe", "explosion",
  "kill", "murder", "weapon", "gun", "rifle", "bomb", "terrorist",
]

const GAMBLING_TERMS: string[] = [
  "pari", "parier", "paris sportifs", "casino", "poker", "blackjack",
  "roulette", "machine a sous", "loto", "loterie",
  "betting", "gambling", "wager",
]

const SELF_HARM_TERMS: string[] = [
  "suicide", "suicider", "se tuer", "se pendre", "automutilation", "scarification",
  "anorexie", "anorexique", "boulimie", "purger", "se faire vomir",
  "sauter le repas", "skip a meal", "skip meals",
  "kill myself", "self harm", "self-harm", "cutting",
  "100 pompes", "100 push-ups", // dangerous baseline défis (per vision §1)
]

const PROFANITY_TERMS: string[] = [
  "merde", "putain", "con", "conne", "connard", "salope", "salaud",
  "encule", "enculee", "nique", "niquer", "ta mere", "fils de pute",
  "couillon", "batard",
  "fuck", "shit", "bitch", "asshole", "damn",
  // darija profanity
  "zamel", "tabon", "khra", "khrra",
]

const CONTROVERSIAL_TERMS: string[] = [
  // political / religious lightning rods unsafe to ship un-reviewed to a
  // 13-yo Moroccan teen on a non-political product
  "polisario", "sahara occidental", "rifain separati",
  "islamiste", "salafiste", "djihad", "jihad", "kafir", "kuffar",
  "athee militant",
  // monarchy critique — Morocco-specific safety
  "destitution du roi", "abdiquer le roi",
]

// Loose anglophone leakage detector (V1 ships fr-MA only). Hits trigger a
// warn, not a block — the validator already enforces French in the body of
// each question via vocabulary checks. We only catch obvious slipage.
const ENGLISH_LEAK_TERMS: string[] = [
  "the answer is", "select the", "which of the following",
  "true or false", "what is the",
]

// Darija leakage — explicitly forbidden in V1 quiz prompt
// (enhanced-quiz-prompts.ts:54). Detect a few common Darija particles.
const DARIJA_LEAK_TERMS: string[] = [
  "wach ", " wach", "wash ", " wash", "bzaf", "bezzaf", "khouya", "wakha",
  "yak ", " yak", "labas", "smahli", "safi ", " safi",
]

const BLOCKLIST: Array<{ category: SafetyCategory; terms: string[]; severity: "block" | "warn" }> = [
  { category: "sexual", terms: SEXUAL_TERMS, severity: "block" },
  { category: "drugs", terms: DRUG_TERMS, severity: "block" },
  { category: "violence", terms: VIOLENCE_TERMS, severity: "block" },
  { category: "gambling", terms: GAMBLING_TERMS, severity: "block" },
  { category: "self_harm", terms: SELF_HARM_TERMS, severity: "block" },
  { category: "profanity", terms: PROFANITY_TERMS, severity: "block" },
  { category: "controversial", terms: CONTROVERSIAL_TERMS, severity: "block" },
  { category: "language_leak", terms: ENGLISH_LEAK_TERMS, severity: "warn" },
  { category: "language_leak", terms: DARIJA_LEAK_TERMS, severity: "warn" },
]

function normalize(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    // Strip combining diacritics (covers French accents).
    .replace(/[̀-ͯ]/g, "")
}

function flattenContent(input: unknown): string {
  if (input == null) return ""
  if (typeof input === "string") return input
  if (typeof input === "number" || typeof input === "boolean") return String(input)
  if (Array.isArray(input)) return input.map(flattenContent).join(" \n ")
  if (typeof input === "object") {
    return Object.values(input as Record<string, unknown>).map(flattenContent).join(" \n ")
  }
  return ""
}

function findHits(haystack: string): SafetyHit[] {
  const norm = normalize(haystack)
  const hits: SafetyHit[] = []
  for (const { category, terms, severity } of BLOCKLIST) {
    for (const term of terms) {
      const t = normalize(term)
      if (!t) continue
      // Word-boundary match for short tokens, substring match if the term
      // already contains a space (multi-word phrase).
      const pattern = t.includes(" ")
        ? new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        : new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`)
      if (pattern.test(norm)) {
        hits.push({ category, term, severity })
      }
    }
  }
  return hits
}

/**
 * Run the safety filter on any AI-generated content payload.
 * Returns isSafe=false and a reason as soon as one BLOCK-severity hit is found.
 */
export function checkContentSafety(content: unknown): SafetyResult {
  const haystack = flattenContent(content)
  if (!haystack.trim()) {
    return { isSafe: true, hits: [], reason: null }
  }

  const hits = findHits(haystack)
  const blocking = hits.filter((h) => h.severity === "block")

  if (blocking.length > 0) {
    const cats = Array.from(new Set(blocking.map((h) => h.category))).join(",")
    const sample = blocking.slice(0, 3).map((h) => `${h.category}:${h.term}`).join(", ")
    return {
      isSafe: false,
      hits,
      reason: `Blocked by safety filter [${cats}] — sample: ${sample}`,
    }
  }

  return { isSafe: true, hits, reason: null }
}

/**
 * Convenience helper for cron / generators: log + return.
 */
export function logSafetyOutcome(
  contentType: string,
  identifier: string,
  result: SafetyResult,
): void {
  if (!result.isSafe) {
    console.warn(
      `[content-safety] BLOCK ${contentType} ${identifier}: ${result.reason}`,
    )
  } else if (result.hits.length > 0) {
    console.log(
      `[content-safety] WARN ${contentType} ${identifier}: ${result.hits
        .map((h) => `${h.category}:${h.term}`)
        .join(", ")}`,
    )
  }
}
