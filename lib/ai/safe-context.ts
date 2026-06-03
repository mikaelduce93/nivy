/**
 * Wave 1B — PII scrubber for AI prompts.
 *
 * Per docs/canon/personalization-ai.locked.md (FORBIDDEN: full_name in
 * prompts) and docs/compliance/11-personalization-ai-compliance.md.
 *
 * Anything that may leak teen identity to a third-party LLM provider
 * (OpenAI, Anthropic) MUST go through `safeAiContext` before serialization.
 *
 * Allow-list:
 *   - pseudo            (NOT full_name / first_name / last_name)
 *   - age_bucket        (computed from date_of_birth, never the raw DOB)
 *   - role
 *   - city              (coarse only — no street/quartier)
 *   - interests, goals  (free-form tags)
 *   - archetype, level, total_xp
 *   - non-PII activity counters
 *
 * Forbidden fields (always dropped):
 *   full_name, first_name, last_name, email, phone, date_of_birth,
 *   cin, parent_cin, address, street, quartier, postal_code, lat/lng,
 *   any *_url / *_path field that could leak a private storage location.
 */

/**
 * #211 — Scrub des PII dans un texte libre de mémoire coach avant persistance
 * (coach_facts / coach_goals / coach_conversation_summaries). Complément de
 * `scrubPii` (objets) : retire email + téléphone et borne la longueur. Vit ici,
 * dans le module PII canonique ; ré-exporté par lib/ai/coach-memory.ts.
 */
export function scrubMemoryText(text: string): string {
  return (text || "")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/(\+?\d[\d\s().-]{7,}\d)/g, "[tel]")
    .slice(0, 500)
    .trim()
}

export type AgeBucket = "13-14" | "15-16" | "17" | "unknown"

export interface SafeAiContext {
  pseudo: string | null
  age_bucket: AgeBucket
  role?: string
  city?: string | null
  interests?: string[]
  goals?: string[]
  archetype?: string | null
  level?: number | null
  total_xp?: number | null
  // Counters / non-PII activity stats — explicit allow-list only.
  active_quests_count?: number
  current_streak?: number | null
  online_friends_count?: number
}

const FORBIDDEN_KEYS = new Set([
  "full_name",
  "first_name",
  "last_name",
  "email",
  "phone",
  "phone_number",
  "date_of_birth",
  "dob",
  "cin",
  "parent_cin",
  "address",
  "street",
  "quartier",
  "postal_code",
  "lat",
  "lng",
  "latitude",
  "longitude",
  "ip_address",
  "user_agent",
])

export function ageBucket(dateOfBirth: string | null | undefined): AgeBucket {
  if (!dateOfBirth) return "unknown"
  const dob = new Date(dateOfBirth)
  if (Number.isNaN(dob.getTime())) return "unknown"
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const m = now.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1
  if (age <= 14) return "13-14"
  if (age <= 16) return "15-16"
  if (age === 17) return "17"
  return "unknown"
}

interface ProfileLike {
  pseudo?: string | null
  username?: string | null
  date_of_birth?: string | null
  role?: string | null
  city?: string | null
  interests?: string[]
  goals?: string[]
  archetype?: string | null
}

interface GamificationLike {
  level?: number | null
  total_xp?: number | null
  current_streak?: number | null
}

/**
 * Build a PII-free projection of a teen profile suitable for inclusion in an
 * LLM prompt. Anything not in the allow-list is dropped.
 */
export function safeAiContext(input: {
  profile?: ProfileLike | null
  gamification?: GamificationLike | null
  activeQuestsCount?: number
  onlineFriendsCount?: number
}): SafeAiContext {
  const profile = input.profile ?? {}
  const gam = input.gamification ?? {}
  return {
    pseudo: profile.pseudo ?? profile.username ?? null,
    age_bucket: ageBucket(profile.date_of_birth ?? null),
    role: profile.role ?? undefined,
    city: profile.city ?? null,
    interests: Array.isArray(profile.interests) ? profile.interests : [],
    goals: Array.isArray(profile.goals) ? profile.goals : [],
    archetype: profile.archetype ?? null,
    level: gam.level ?? null,
    total_xp: gam.total_xp ?? null,
    current_streak: gam.current_streak ?? null,
    active_quests_count: input.activeQuestsCount ?? 0,
    online_friends_count: input.onlineFriendsCount ?? 0,
  }
}

/**
 * Children context for the parent agent. NEVER includes children full names —
 * only the children's pseudos and coarse counters.
 */
export interface SafeChildContext {
  child_id: string
  pseudo: string | null
  age_bucket: AgeBucket
  level: number | null
}

export function safeChildContext(input: {
  child_id: string
  pseudo?: string | null
  username?: string | null
  date_of_birth?: string | null
  level?: number | null
}): SafeChildContext {
  return {
    child_id: input.child_id,
    pseudo: input.pseudo ?? input.username ?? null,
    age_bucket: ageBucket(input.date_of_birth ?? null),
    level: input.level ?? null,
  }
}

/**
 * Defense-in-depth: deep-scrub any object before JSON-stringify-ing it into a
 * prompt. Removes forbidden keys recursively and replaces them with '[redacted]'
 * markers in dev to make the redaction visible during review.
 */
export function scrubPii<T>(value: T): T {
  if (value == null) return value
  if (Array.isArray(value)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return value.map((v) => scrubPii(v)) as any
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_KEYS.has(k.toLowerCase())) continue
      out[k] = scrubPii(v)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return out as any
  }
  return value
}
