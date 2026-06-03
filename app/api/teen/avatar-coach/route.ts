/**
 * POST /api/teen/avatar-coach — TICKET-041 (Wave 3 / Wave C.2 v2), #210/#211.
 *
 * Chat coach "Niv" pour ado. v2 = boucle de chat courte.
 *
 * Contract (POST):
 *   body: { message: string }   // teen turn, 1..280 chars
 *   200:  flux NDJSON (1 objet JSON/ligne) :
 *           {type:'delta',text} | {type:'replace',text} | {type:'done',remainingTurns,cap}
 *   400:  { error }              // message invalide / trop long
 *   401:  { error }
 *   429:  { error, remainingTurns:0, cap }
 *   500:  { error }
 *
 * #210 — la réponse est streamée token-par-token (NDJSON) via le SDK Anthropic ;
 * post-filtre sécurité incrémental (coupe + remplace par SAFE_REDIRECT).
 * #211 — mémoire long terme injectée (getCoachMemoryLine) + extraction best-effort
 * des objectifs/faits après chaque vrai tour modèle.
 *
 * Persistence: chaque tour accepté écrit DEUX lignes avatar_messages :
 *   - teen turn : mood='question' (dismissed → jamais affiché comme greeting)
 *   - coach turn: mood='neutral'  (dismissed → n'écrase pas le greeting du jour)
 *
 * Cap: 20 tours/jour/teen (UTC), configurable via COACH_DAILY_TURN_CAP.
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { AIProviderFactory, type AIProviderType } from "@/lib/ai/providers/factory"
import { resolveModelForTask } from "@/lib/ai/content-generator"
import { supportsStreaming, supportsRunTools, type AIProviderMetadata } from "@/lib/ai/providers/base"
import { getCoachMemoryLine, extractAndPersistMemory } from "@/lib/ai/coach-memory"
import { buildCoachTools } from "@/lib/ai/coach-tools"

// #202 — le 5/jour codé en dur tuait tout usage « coach ». Configurable via env,
// défaut 20 (le routage Claude + caching de #210 réduit le coût marginal).
const DAILY_TURN_CAP = Number(process.env.COACH_DAILY_TURN_CAP) || 20
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

// #210 — la réponse du coach est streamée en NDJSON (1 objet JSON par ligne).
const NDJSON_HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-store",
} as const

function frame(obj: Record<string, unknown>): string {
  return JSON.stringify(obj) + "\n"
}

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
function buildSystemPrompt(coachName: string, teenFirstName: string, profileLine?: string): string {
  // #202 — contexte profil réel injecté (niveau, XP, coins, humeur, mémoire)
  // pour personnaliser. PII-safe : aucun vrai nom (on utilise le pseudo).
  const contextBlock = profileLine
    ? `\n\nCONTEXTE ${teenFirstName} (pour personnaliser, ne pas réciter mot à mot): ${profileLine}`
    : ""
  return `Tu es ${coachName}, le coach personnel virtuel de ${teenFirstName} (un ado marocain de 13 à 17 ans) sur l'app Nivy.${contextBlock}

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
  // the route surfaces a clean fallback below if neither key exists.
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

    const body = (await request.json().catch(() => null)) as { message?: unknown } | null
    const raw = typeof body?.message === "string" ? body.message.trim() : ""
    if (!raw) {
      return NextResponse.json({ error: "Message invalide" }, { status: 400 })
    }
    if (raw.length > MAX_INPUT_CHARS) {
      return NextResponse.json({ error: "Message trop long" }, { status: 400 })
    }

    // Daily cap.
    const used = await countTodayTurns(supabase, user.id)
    if (used >= DAILY_TURN_CAP) {
      return NextResponse.json(
        { error: "Limite quotidienne atteinte", remainingTurns: 0, cap: DAILY_TURN_CAP },
        { status: 429 },
      )
    }

    // Coach context — soft fallbacks if avatars row missing. PII-safe : on
    // identifie l'ado au modèle par son pseudo (jamais le vrai prénom).
    const { data: avatar } = await supabase
      .from("avatars")
      .select("teen_id, name, color, skin, mood")
      .eq("teen_id", user.id)
      .maybeSingle<AvatarRow>()
    const coachName = (avatar?.name || "Niv").trim() || "Niv"
    // Drift schéma corrigé : le pseudo vit sur `teens` (profiles n'expose plus
    // de colonne pseudo → 42703). PII-safe : pseudo, jamais le vrai prénom.
    const { data: pseudoRow, error: pseudoErr } = await supabase
      .from("teens")
      .select("pseudo")
      .eq("id", user.id)
      .maybeSingle()
    if (pseudoErr) {
      console.error("[avatar-coach] pseudo fetch error:", pseudoErr)
    }
    const teenFirstName = (pseudoRow?.pseudo as string | null | undefined)?.trim() || "champion"

    // #202 — profil réel léger pour personnaliser (PII-safe). Colonnes réelles de
    // teen_full_profile uniquement (l'ancien `streak`/`interests` n'existaient pas
    // → drift schéma corrigé : on lit level/total_xp/coins_balance).
    let profileLine: string | undefined
    let parentId: string | undefined
    try {
      const { data: prof } = await supabase
        .from("teen_full_profile")
        .select("level, total_xp, coins_balance, primary_parent_id")
        .eq("id", user.id)
        .maybeSingle<{
          level: number | null
          total_xp: number | null
          coins_balance: number | null
          primary_parent_id: string | null
        }>()
      if (prof) {
        profileLine = `Niveau ${prof.level ?? 1}, ${prof.total_xp ?? 0} XP, ${prof.coins_balance ?? 0} coins. Humeur : ${avatar?.mood || "neutral"}.`
        parentId = prof.primary_parent_id ?? undefined
      }
    } catch {
      // best-effort : pas de contexte si la lecture échoue.
    }

    // #211 — mémoire long terme : résumé durable + objectifs + faits retenus.
    const memoryLine = await getCoachMemoryLine(supabase, user.id)
    const contextLine = [profileLine, memoryLine].filter(Boolean).join(" — ") || undefined

    // Persist the teen turn first so the cap counter advances atomically.
    const nowIso = new Date().toISOString()
    await supabase.from("avatar_messages").insert({
      teen_id: user.id,
      message_text: raw,
      mood: "question",
      displayed_at: nowIso,
      dismissed_at: nowIso, // never re-surface as a greeting
    })

    const remaining = Math.max(0, DAILY_TURN_CAP - (used + 1))

    // Persist coach reply (dismissed so it never replaces a real greeting).
    const persistReply = async (text: string) => {
      const replyIso = new Date().toISOString()
      await supabase.from("avatar_messages").insert({
        teen_id: user.id,
        message_text: text,
        mood: "neutral",
        displayed_at: replyIso,
        dismissed_at: replyIso,
      })
    }

    // #210 — réponse atomique (input bloqué / pas de clé / provider sans
    // streaming / erreur) servie sur le MÊME contrat NDJSON que le streaming.
    const single = async (text: string, sourcedFromModel: boolean): Promise<Response> => {
      await persistReply(text)
      const enc = new TextEncoder()
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(enc.encode(frame({ type: "delta", text })))
          controller.enqueue(
            enc.encode(
              frame({ type: "done", remainingTurns: remaining, cap: DAILY_TURN_CAP, sourcedFromModel }),
            ),
          )
          controller.close()
        },
      })
      return new Response(stream, { headers: NDJSON_HEADERS })
    }

    // Server-side input deny check — short-circuit before any model call.
    if (DENY_PATTERNS.some((re) => re.test(raw))) {
      return single(SAFE_REDIRECT, false)
    }

    const providerType = pickProvider()
    const apiKey =
      providerType === "claude" ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY
    if (!apiKey) {
      return single(
        `Hé ${teenFirstName} ! Mon cerveau IA est en pause là. Reviens dans un instant 🙏`,
        false,
      )
    }

    // #210 — provider env-driven, modèle par tâche (chat = Sonnet). System stable
    // (sécurité + contexte) → prompt caching ; user prompt volatil.
    const provider = AIProviderFactory.getProvider(
      providerType,
      resolveModelForTask(providerType, "chat"),
    )
    const history = await fetchHistory(supabase, user.id, RECENT_HISTORY_PAIRS)
    // Drop the just-inserted teen turn (most recent) — added explicitly below.
    const transcript = history
      .slice(0, -1)
      .map((m) => `${m.role === "user" ? teenFirstName : coachName}: ${m.content}`)
      .join("\n")
    const userPrompt = transcript
      ? `Conversation récente:\n${transcript}\n\n${teenFirstName}: ${raw}\n\n${coachName}:`
      : `${teenFirstName}: ${raw}\n\n${coachName}:`
    const systemPrompt = buildSystemPrompt(coachName, teenFirstName, contextLine)

    const logCache = (meta?: AIProviderMetadata) => {
      if (!meta) return
      // #210 — trace de cache (vérif `cache_read_input_tokens > 0` en prod).
      console.warn("[avatar-coach] cache", {
        read: meta.cacheReadInputTokens ?? 0,
        creation: meta.cacheCreationInputTokens ?? 0,
        model: meta.model,
      })
    }

    // #212 — boucle d'outils agentiques (closed loop). ACTIVÉE PAR DÉFAUT dès que
    // le provider sait fermer la boucle (Claude / supportsRunTools) → « un tour de
    // chat peut agir » est le comportement par défaut. Opt-out explicite seulement
    // via COACH_TOOLS_ENABLED='false'. Jamais de tool-calling pour un provider qui
    // ne sait pas fermer la boucle. Tours outillés non-streamés : réponse finale
    // émise sur le même contrat NDJSON.
    if (
      process.env.COACH_TOOLS_ENABLED !== "false" &&
      providerType === "claude" &&
      supportsRunTools(provider)
    ) {
      const tools = buildCoachTools(supabase, { teenId: user.id, parentId })
      let reply = SAFE_REDIRECT
      let acted = false
      try {
        const r = await provider.runTools(systemPrompt, userPrompt, tools.defs, tools.execute)
        logCache(r.metadata)
        acted = r.actions.length > 0
        const succeeded = r.actions.some((a) => a.result.success)
        const cand = (r.content || "").trim().slice(0, MAX_REPLY_CHARS)
        if (cand && isReplySafe(cand)) {
          reply = cand
        } else if (acted) {
          // Pas de texte final du modèle : on relaie le message HONNÊTE du dernier
          // tool (succès OU échec) plutôt qu'une affirmation générique — une action
          // échouée ne doit pas se lire comme un succès (#212 « aucun faux succès »).
          const lastMsg = (r.actions[r.actions.length - 1]?.result.message || "")
            .trim()
            .slice(0, MAX_REPLY_CHARS)
          reply = lastMsg && isReplySafe(lastMsg)
            ? lastMsg
            : succeeded
              ? "C'est noté, je m'en occupe 👍"
              : SAFE_REDIRECT
        } else {
          reply = SAFE_REDIRECT
        }
      } catch (err) {
        console.error("[avatar-coach] tools error:", err)
        reply = `Petit souci de mon côté ${teenFirstName}. Réessaie ?`
      }
      if (reply !== SAFE_REDIRECT && isReplySafe(reply)) {
        await extractAndPersistMemory(supabase, user.id, raw, reply, providerType)
      }
      return single(reply, acted)
    }

    // Provider sans streaming (OpenAI) → 1 appel atomique, 1 frame NDJSON.
    if (!supportsStreaming(provider)) {
      let candidateReply = SAFE_REDIRECT
      let sourced = false
      try {
        const { content, metadata } = await provider.call(systemPrompt, userPrompt)
        logCache(metadata)
        const candidate = (content || "").trim().slice(0, MAX_REPLY_CHARS)
        if (candidate && isReplySafe(candidate)) {
          candidateReply = candidate
          sourced = true
        }
      } catch (err) {
        console.error("[avatar-coach] provider call failed:", err)
        candidateReply = `Petit souci de connexion de mon côté ${teenFirstName}. Réessaie dans une minute ?`
      }
      // #211 — extraction mémoire best-effort sur un vrai tour modèle.
      if (sourced) {
        await extractAndPersistMemory(supabase, user.id, raw, candidateReply, providerType)
      }
      return single(candidateReply, sourced)
    }

    // #210 — streaming token-par-token (NDJSON) + post-filtre sécurité incrémental.
    const enc = new TextEncoder()
    const streamBody = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (obj: Record<string, unknown>) => {
          try {
            controller.enqueue(enc.encode(frame(obj)))
          } catch {
            // client déconnecté — on continue côté serveur pour persister
          }
        }
        const abort = new AbortController()
        let buffer = ""
        let unsafe = false
        let truncated = false

        const onDelta = (text: string) => {
          if (unsafe || truncated) return
          const next = buffer + text
          // Garde-fou mineurs : dès que la réponse devient non-sûre, on coupe.
          if (!isReplySafe(next)) {
            unsafe = true
            abort.abort()
            return
          }
          if (next.length >= MAX_REPLY_CHARS) {
            const allowed = Math.max(0, MAX_REPLY_CHARS - buffer.length)
            const slice = text.slice(0, allowed)
            buffer = (buffer + slice).slice(0, MAX_REPLY_CHARS)
            truncated = true
            if (slice) send({ type: "delta", text: slice })
            abort.abort()
            return
          }
          buffer = next
          send({ type: "delta", text })
        }

        let meta: AIProviderMetadata | undefined
        try {
          const result = await provider.callStream(systemPrompt, userPrompt, onDelta, abort.signal)
          meta = result.metadata
          if (!unsafe && !truncated) {
            buffer = (result.content?.trim() || buffer).slice(0, MAX_REPLY_CHARS)
          }
        } catch (err) {
          // Une coupure volontaire (unsafe/truncated) lève un AbortError attendu.
          if (!unsafe && !truncated) {
            console.error("[avatar-coach] stream error:", err)
          }
        }

        logCache(meta)

        const hadText = buffer.trim().length > 0
        const finalReply = unsafe
          ? SAFE_REDIRECT
          : hadText
            ? buffer.trim()
            : `Petit souci de connexion de mon côté ${teenFirstName}. Réessaie dans une minute ?`
        if (unsafe) {
          send({ type: "replace", text: SAFE_REDIRECT })
        } else if (!hadText) {
          send({ type: "replace", text: finalReply })
        }

        await persistReply(finalReply)
        send({
          type: "done",
          remainingTurns: remaining,
          cap: DAILY_TURN_CAP,
          sourcedFromModel: !unsafe && hadText,
        })
        // #211 — extraction mémoire best-effort (après le 'done', invisible UX).
        if (!unsafe && hadText) {
          await extractAndPersistMemory(supabase, user.id, raw, finalReply, providerType)
        }
        controller.close()
      },
    })
    return new Response(streamBody, { headers: NDJSON_HEADERS })
  } catch (err) {
    console.error("[avatar-coach] POST error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
