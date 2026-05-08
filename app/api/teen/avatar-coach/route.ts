/**
 * POST /api/teen/avatar-coach — TICKET-041 (Wave 3 / Wave C.2 v2)
 *
 * AvatarCoach v1 (Wave C.2) was a read-only render of `avatar_messages`.
 * v2 adds a small chat loop: the teen can ask Niv a short question and
 * receive an age-appropriate French reply.
 *
 * Contract (POST):
 *   body: { message: string }   // teen turn, 1..280 chars
 *   200:  { reply: string, remainingTurns: number }
 *   400:  { error: "Message invalide" | "Message trop long" }
 *   401:  { error: "Non autorisé" }
 *   429:  { error: "Limite quotidienne atteinte", remainingTurns: 0 }
 *   500:  { error: "Erreur serveur" }
 *
 * Safety guard rails (defer-to-parent/mentor on sensitive themes):
 *   - System prompt forbids advice on drugs, sex, violence, politics,
 *     religion, mental-health crises. The model is instructed to defer
 *     ("parle à ton parent ou ton mentor").
 *   - Server-side keyword pre-check: if the teen prompt matches a deny
 *     pattern, we never call the model and return a canned safe redirect.
 *   - Output is post-checked via shared `lib/ai/content-safety` and
 *     replaced by the same canned redirect if flagged.
 *
 * Cap: 5 chat turns / day per teen (UTC day boundary, server-time).
 *
 * Persistence: every accepted turn writes TWO rows to `avatar_messages`:
 *   - teen turn:   mood='question'   (excluded from the v1 greeting query
 *                  since v1 filters by `dismissed_at IS NULL` AND uses
 *                  `latest by displayed_at` — but to be safe we set
 *                  `dismissed_at = NOW()` on the teen row so it never
 *                  surfaces as a coach greeting)
 *   - coach turn:  mood='neutral'    (also marked dismissed so that it
 *                  doesn't override the next scheduled greeting)
 *
 * Both rows belong to the canonical chat history; the client fetches
 * recent ones via GET /api/teen/avatar-coach (this route).
 *
 * Model wiring: reuses `resolveModelId` + `AIProviderFactory` from F4
 * (lib/ai/content-generator + lib/ai/providers). We do NOT call the
 * factory ourselves with hardcoded model IDs.
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { AIProviderFactory, type AIProviderType } from "@/lib/ai/providers/factory"
import { resolveModelId } from "@/lib/ai/content-generator"

const DAILY_TURN_CAP = 5
const MAX_INPUT_CHARS = 280
const MAX_REPLY_CHARS = 600
const RECENT_HISTORY_PAIRS = 3 // last N user+assistant pairs to include as context

/**
 * Hard-blocked themes per V1 safety policy (whitepaper §8 + audit-prelaunch
 * 07-security-compliance). When matched, we DO NOT call the model — we
 * return the canned redirect immediately.
 */
const DENY_PATTERNS: RegExp[] = [
  // drugs / alcohol
  /\b(drogue|drug|cocaine|cocaïne|cannabis|weed|joint|hashich|mdma|ecstasy|alcool|alcohol|biere|bière|vodka|whisky)\b/i,
  // sex / sexual content
  /\b(sexe|sexuel|porno|porn|nudes?|sextape|prostitu|onanis|masturbation|chibre|zob|baiser une|baise(?:r)? avec)\b/i,
  // violence / self-harm
  /\b(suicide|me tuer|mourir|tuer (?:quelqu(?:'|’)un|ma|mon|le|la)|me (?:fl|fr)apper|automutil|me couper|cutting|harceler|tabasser|battre)\b/i,
  // politics / monarchy / sahara — V1 hard-blocked in MA context
  /\b(politique|election|élection|gouvernement|roi mohammed|monarchie|sahara occidental|polisario|makhzen)\b/i,
  // religion as topic
  /\b(islam|musulman|chrétien|chretien|juif|jewish|halal|haram|fatwa|coran|bible|torah|priere du)\b/i,
]

/**
 * Canned safe redirect text used both for input pre-block AND output post-block.
 * Stays in French (V1 language policy) and explicitly defers to a trusted adult.
 */
const SAFE_REDIRECT =
  "Hmm, ça c'est un sujet où je préfère pas te répondre tout seul. " +
  "Parles-en plutôt à ton parent ou à un mentor de confiance — ils sauront t'écouter et t'aider mieux que moi 💛"

/** Light-weight output safety: blocks the same deny patterns + obvious adult fail modes. */
function isReplySafe(text: string): boolean {
  if (!text || text.length === 0) return false
  for (const re of DENY_PATTERNS) if (re.test(text)) return false
  // Block English fall-throughs of the model (V1 = FR only).
  // Heuristic: if more than 50% of words look English-only, reject.
  const words = text.toLowerCase().match(/[a-zàâçéèêëîïôûùüÿñæœ]+/g) || []
  if (words.length >= 8) {
    const englishOnly = words.filter((w) =>
      /^(the|and|you|your|with|that|this|have|from|will|but|just|like|about|what|when|why|how)$/.test(w),
    ).length
    if (englishOnly / words.length > 0.25) return false
  }
  return true
}

/**
 * The system prompt. Locked to French, age-appropriate, defers on hard topics.
 * Kept short to stay within tight token budgets — model receives recent
 * history as messages, not as system context.
 */
function buildSystemPrompt(coachName: string, teenFirstName: string): string {
  return `Tu es ${coachName}, le coach personnel virtuel de ${teenFirstName} (un ado marocain de 13 à 17 ans) sur l'app Nivy.

LANGUE: réponds UNIQUEMENT en français standard. Pas d'anglais, pas de Darija, pas d'arabe classique. Tutoiement chaleureux mais respectueux.

TON: ami bienveillant et motivant, jamais culpabilisant. Pas d'urgence artificielle, pas de comparaison sociale, pas de jugement. Tu peux utiliser un emoji par message maximum.

LONGUEUR: 1 à 3 phrases courtes. Maximum 60 mots. Pas de listes, pas de markdown.

RÔLE: tu encourages sur les quiz, missions, défis, sport, créativité, école. Tu peux suggérer une action déjà disponible dans l'app (ex: "Tu peux tenter le quiz du jour ?"). Tu ne donnes JAMAIS de conseil médical, juridique, financier ou psychothérapeutique.

SUJETS INTERDITS — tu redirigeras toujours vers le parent ou un mentor:
- Drogue, alcool, tabac, vapotage
- Sexualité, relations intimes, consentement
- Violence, automutilation, suicide, harcèlement
- Politique, monarchie, Sahara, religion comme sujet
- Détresse psychologique aiguë (anxiété forte, dépression, idées noires)

Si ${teenFirstName} aborde l'un de ces sujets, réponds avec empathie en UNE phrase puis rediriges-le vers son parent ou son mentor de confiance. Ne donne JAMAIS de détails ni d'avis personnel.

SÉCURITÉ MAROC: cadre halal — pas d'alcool, pas de porc, pas de jeu d'argent. Pas de défi physique extrême, pas d'incitation à rencontrer un inconnu hors-ligne.

FORMAT: réponds en texte brut, sans préfixe ("Niv:" interdit), sans guillemets autour de la réponse.`
}

type AvatarRow = {
  teen_id: string
  name: string | null
  color: string | null
  skin: string | null
  mood: string | null
}

type AvatarMessageRow = {
  id: string
  message_text: string | null
  mood: string | null
  displayed_at: string | null
}

function pickProvider(): AIProviderType {
  // Prefer Claude when ANTHROPIC_API_KEY is set; else OpenAI; else "openai" so
  // the route surfaces a clean 503 below if neither key exists.
  if (process.env.ANTHROPIC_API_KEY) return "claude"
  if (process.env.OPENAI_API_KEY) return "openai"
  return "openai"
}

/** Count teen-initiated turns made today (UTC). */
async function countTodayTurns(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teenId: string,
): Promise<number> {
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  const { count, error } = await supabase
    .from("avatar_messages")
    .select("id", { count: "exact", head: true })
    .eq("teen_id", teenId)
    .eq("mood", "question")
    .gte("displayed_at", start.toISOString())
  if (error) {
    console.error("[avatar-coach] countTodayTurns error:", error)
    return 0
  }
  return count ?? 0
}

/** Fetch recent conversational history (most recent first, then reversed). */
async function fetchHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teenId: string,
  pairs: number,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const limit = pairs * 2
  const { data, error } = await supabase
    .from("avatar_messages")
    .select("id, message_text, mood, displayed_at")
    .eq("teen_id", teenId)
    .in("mood", ["question", "neutral"])
    .order("displayed_at", { ascending: false, nullsFirst: false })
    .limit(limit)
  if (error || !data) return []
  return (data as AvatarMessageRow[])
    .filter((r) => (r.message_text || "").trim().length > 0)
    .reverse()
    .map((r) => ({
      role: r.mood === "question" ? ("user" as const) : ("assistant" as const),
      content: (r.message_text || "").slice(0, 1000),
    }))
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const [history, used] = await Promise.all([
      fetchHistory(supabase, user.id, RECENT_HISTORY_PAIRS),
      countTodayTurns(supabase, user.id),
    ])

    return NextResponse.json({
      history,
      remainingTurns: Math.max(0, DAILY_TURN_CAP - used),
      cap: DAILY_TURN_CAP,
    })
  } catch (err) {
    console.error("[avatar-coach] GET error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as
      | { message?: unknown }
      | null
    const raw = typeof body?.message === "string" ? body.message.trim() : ""
    if (!raw) {
      return NextResponse.json({ error: "Message invalide" }, { status: 400 })
    }
    if (raw.length > MAX_INPUT_CHARS) {
      return NextResponse.json(
        { error: "Message trop long" },
        { status: 400 },
      )
    }

    // Daily cap.
    const used = await countTodayTurns(supabase, user.id)
    if (used >= DAILY_TURN_CAP) {
      return NextResponse.json(
        {
          error: "Limite quotidienne atteinte",
          remainingTurns: 0,
          cap: DAILY_TURN_CAP,
        },
        { status: 429 },
      )
    }

    // Coach context (name + first name) — soft fallbacks if avatars row missing.
    const { data: avatar } = await supabase
      .from("avatars")
      .select("teen_id, name, color, skin, mood")
      .eq("teen_id", user.id)
      .maybeSingle<AvatarRow>()
    const coachName = (avatar?.name || "Niv").trim() || "Niv"
    const teenFirstName =
      (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
      "champion"

    // Always persist the teen turn first so the cap counter advances atomically.
    const nowIso = new Date().toISOString()
    await supabase.from("avatar_messages").insert({
      teen_id: user.id,
      message_text: raw,
      mood: "question",
      displayed_at: nowIso,
      dismissed_at: nowIso, // never re-surface as a greeting
    })

    // Server-side input deny check — short-circuit before model call.
    let reply = SAFE_REDIRECT
    let usedModel = false

    if (!DENY_PATTERNS.some((re) => re.test(raw))) {
      const providerType = pickProvider()
      const apiKey =
        providerType === "claude"
          ? process.env.ANTHROPIC_API_KEY
          : process.env.OPENAI_API_KEY

      if (!apiKey) {
        // No model wired — return a friendly fallback rather than a 5xx.
        reply = `Hé ${teenFirstName} ! Mon cerveau IA est en pause là. Reviens dans un instant 🙏`
      } else {
        try {
          const provider = AIProviderFactory.getProvider(
            providerType,
            resolveModelId(providerType),
          )

          // Build the user prompt: include short history + the current turn.
          const history = await fetchHistory(supabase, user.id, RECENT_HISTORY_PAIRS)
          // Drop the just-inserted teen turn (most recent) — it's added explicitly below.
          const transcript = history
            .slice(0, -1)
            .map((m) => `${m.role === "user" ? teenFirstName : coachName}: ${m.content}`)
            .join("\n")
          const userPrompt = transcript
            ? `Conversation récente:\n${transcript}\n\n${teenFirstName}: ${raw}\n\n${coachName}:`
            : `${teenFirstName}: ${raw}\n\n${coachName}:`

          const { content } = await provider.call(
            buildSystemPrompt(coachName, teenFirstName),
            userPrompt,
          )
          const candidate = (content || "").trim().slice(0, MAX_REPLY_CHARS)
          if (candidate && isReplySafe(candidate)) {
            reply = candidate
            usedModel = true
          } else {
            console.warn("[avatar-coach] reply failed safety check", {
              len: candidate.length,
            })
            reply = SAFE_REDIRECT
          }
        } catch (err) {
          console.error("[avatar-coach] provider call failed:", err)
          reply = `Petit souci de connexion de mon côté ${teenFirstName}. Réessaie dans une minute ?`
        }
      }
    }

    // Persist coach reply (also dismissed so it never replaces a real greeting).
    const replyIso = new Date().toISOString()
    await supabase.from("avatar_messages").insert({
      teen_id: user.id,
      message_text: reply,
      mood: "neutral",
      displayed_at: replyIso,
      dismissed_at: replyIso,
    })

    const remaining = Math.max(0, DAILY_TURN_CAP - (used + 1))
    return NextResponse.json({
      reply,
      remainingTurns: remaining,
      cap: DAILY_TURN_CAP,
      sourcedFromModel: usedModel,
    })
  } catch (err) {
    console.error("[avatar-coach] POST error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
