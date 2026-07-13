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
 * #Welfare — 3 rideaux de sécurité mineurs : (1) DENY_PATTERNS regex synchrone,
 * (2) classifier sémantique Haiku (crisis=skip, distress=log+inject, ok=passe),
 * (3) post-filtre isReplySafe incrémental sur la sortie modèle.
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
import {
  classifyTeenMessage,
  logWelfareSignal,
  escalateCrisisToParent,
  WELFARE_CRISIS_REPLY,
} from "@/lib/ai/welfare-classifier"
import {
  SAFE_REDIRECT,
  isReplySafe,
  isInputBlocked,
} from "@/lib/ai/coach-safety"
import { logCoachTurn, buildTurnMetrics, type CoachTurnOutcome } from "@/lib/ai/coach-telemetry"
import {
  ARCHETYPE_LABEL_FR,
  LEARNING_STYLE_LABEL_FR,
  isArchetype,
  isLearningStyle,
} from "@/lib/constants/archetype"

// #202 — le 5/jour codé en dur tuait tout usage « coach ». Configurable via env,
// défaut 20 (le routage Claude + caching de #210 réduit le coût marginal).
const DAILY_TURN_CAP = Number(process.env.COACH_DAILY_TURN_CAP) || 20
const MAX_INPUT_CHARS = 280
const MAX_REPLY_CHARS = 600
const RECENT_HISTORY_PAIRS = 3 // last N user+assistant pairs to include as context

// #210 — la réponse du coach est streamée en NDJSON (1 objet JSON par ligne).
const NDJSON_HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-store",
} as const

function frame(obj: Record<string, unknown>): string {
  return JSON.stringify(obj) + "\n"
}

/**
 * The system prompt. Locked to French, age-appropriate, defers on hard topics.
 * Kept short to stay within tight token budgets — model receives recent
 * history as messages, not as system context.
 *
 * `welfareHint` (optionnel) : consigne additionnelle injectée par le classifier
 * welfare quand le message de l'ado a été classé "distress". Le niveau "crisis"
 * est géré en amont (skip modèle + WELFARE_CRISIS_REPLY).
 */
function buildSystemPrompt(
  coachName: string,
  teenFirstName: string,
  profileLine?: string,
  welfareHint?: string,
): string {
  // #202 — contexte profil réel injecté (niveau, XP, coins, humeur, mémoire)
  // pour personnaliser. PII-safe : aucun vrai nom (on utilise le pseudo).
  const contextBlock = profileLine
    ? `\n\nCONTEXTE ${teenFirstName} (pour personnaliser, ne pas réciter mot à mot): ${profileLine}`
    : ""
  // #Welfare — consigne "distress" : le modèle garde sa réponse mais adopte
  // un ton plus empathique et propose explicitement un adulte de confiance.
  const welfareBlock = welfareHint ? `\n\n${welfareHint}` : ""
  return `Tu es ${coachName}, le coach personnel virtuel de ${teenFirstName} (un ado marocain de 13 à 17 ans) sur l'app Nivy.${contextBlock}${welfareBlock}

LANGUE: réponds UNIQUEMENT en français standard. Pas d'anglais, pas de Darija, pas d'arabe classique. Tutoiement chaleureux mais respectueux.

TON: ami bienveillant et motivant, jamais culpabilisant. Pas d'urgence artificielle, pas de comparaison sociale, pas de jugement. Tu peux utiliser un emoji par message maximum.

LONGUEUR: 1 à 3 phrases courtes. Maximum 60 mots. Pas de listes, pas de markdown.

RÔLE: tu encourages sur les quiz, missions, défis, sport, créativité, école. Tu peux suggérer une action déjà disponible dans l'app (ex: "Tu peux tenter le quiz du jour ?"). Tu ne donnes JAMAIS de conseil médical, juridique, financier ou psychothérapeutique.

PERSONNALISATION: si le CONTEXTE indique un profil (créateur/explorateur/compétiteur/social) ou un mode d'apprentissage (visuel/auditif/kinesthésique/lecture), adapte discrètement ton angle et tes suggestions — sans jamais réciter ces étiquettes à l'ado.

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
    // #Telemetry — début du tour (pour calcul latence dans buildTurnMetrics).
    const startTime = Date.now()
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
      .select("pseudo, learning_style, archetype")
      .eq("id", user.id)
      .maybeSingle()
    if (pseudoErr) {
      console.error("[avatar-coach] pseudo fetch error:", pseudoErr)
    }
    const teenFirstName = (pseudoRow?.pseudo as string | null | undefined)?.trim() || "champion"

    // #303 — persona (archetype + learning style) injectée dans le contexte du
    // coach pour adapter le ton/format. Données mortes auparavant.
    const personaBits: string[] = []
    if (isArchetype(pseudoRow?.archetype)) {
      personaBits.push(`profil ${ARCHETYPE_LABEL_FR[pseudoRow.archetype]}`)
    }
    if (isLearningStyle(pseudoRow?.learning_style)) {
      personaBits.push(`apprend mieux en mode ${LEARNING_STYLE_LABEL_FR[pseudoRow.learning_style]}`)
    }
    const personaLine = personaBits.length ? `Persona : ${personaBits.join(", ")}.` : undefined

    // #202 — profil réel léger pour personnaliser (PII-safe). Colonnes réelles de
    // teen_full_profile (level/total_xp/parent). I1 — le solde est lu depuis la
    // source canonique user_coins.balance (plus frais que teen_full_profile.coins_balance,
    // qui peut présenter un snapshot retardé juste après un top-up/lock).
    let profileLine: string | undefined
    let parentId: string | undefined
    try {
      const [profRes, coinsRes] = await Promise.all([
        supabase
          .from("teen_full_profile")
          .select("level, total_xp, primary_parent_id")
          .eq("id", user.id)
          .maybeSingle<{
            level: number | null
            total_xp: number | null
            primary_parent_id: string | null
          }>(),
        supabase
          .from("user_coins")
          .select("balance")
          .eq("teen_id", user.id)
          .maybeSingle<{ balance: number | null }>(),
      ])
      const prof = profRes.data
      if (prof) {
        profileLine = `Niveau ${prof.level ?? 1}, ${prof.total_xp ?? 0} XP, ${coinsRes.data?.balance ?? 0} coins. Humeur : ${avatar?.mood || "neutral"}.`
        parentId = prof.primary_parent_id ?? undefined
      }
    } catch {
      // best-effort : pas de contexte si la lecture échoue.
    }

    // #211 — mémoire long terme : résumé durable + objectifs + faits retenus.
    const memoryLine = await getCoachMemoryLine(supabase, user.id)
    const contextLine =
      [profileLine, personaLine, memoryLine].filter(Boolean).join(" — ") || undefined

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
    // #Telemetry — chaque sortie single logge l'outcome (sauf si omis pour les
    // chemins où le stream done logge déjà séparément).
    const single = async (
      text: string,
      sourcedFromModel: boolean,
      outcome?: CoachTurnOutcome,
      meta?: AIProviderMetadata,
    ): Promise<Response> => {
      await persistReply(text)
      if (outcome) {
        logCoachTurn(
          buildTurnMetrics({
            teenId: user.id,
            provider: pickProvider(),
            meta,
            startTime,
            outcome,
            inputChars: raw.length,
            outputChars: text.length,
            remainingTurns: remaining,
          }),
        )
      }
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
    if (isInputBlocked(raw)) {
      return single(SAFE_REDIRECT, false, "blocked_input")
    }

    const providerType = pickProvider()
    const apiKey =
      providerType === "claude" ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY
    if (!apiKey) {
      return single(
        `Hé ${teenFirstName} ! Mon cerveau IA est en pause là. Reviens dans un instant 🙏`,
        false,
        "no_api_key",
      )
    }

    // #Welfare — 2e rideau sémantique (après DENY_PATTERNS regex, avant le
    // modèle principal). Crisis = skip modèle + réponse renforcée + log.
    // Distress = log + consigne empathique injectée au modèle. ok = flux normal.
    // PII-safe : aucun texte persisté, seulement niveau + signaux agrégés.
    let welfareHint: string | undefined
    try {
      const welfare = await classifyTeenMessage(raw, providerType)
      if (welfare.level === "crisis") {
        await logWelfareSignal(supabase, user.id, "crisis", welfare.signals)
        // #Escalade — alerte reviewable pour le parent (conservatif : pas
        // d'auto-push, le parent découvre l'alerte à sa prochaine connexion).
        await escalateCrisisToParent(supabase, user.id, parentId, welfare.signals)
        // Skip modèle : économie + sécurité. La réponse est canonique et
        // débranchable en un seul endroit.
        return single(WELFARE_CRISIS_REPLY, false, "welfare_crisis")
      }
      if (welfare.level === "distress") {
        await logWelfareSignal(supabase, user.id, "distress", welfare.signals)
        welfareHint =
          `ATTENTION (ne jamais réciter cette étiquette à l'ado) : le message de ${teenFirstName} ` +
          `semble traduire une détresse (tristesse, solitude, découragement). Adopte un ton ` +
          `particulièrement chaleureux et empathique, valide ce qu'il/elle ressent, et propose ` +
          `d'en parler à un parent ou un adulte de confiance. Reste dans ton rôle de coach : ` +
          `pas de diagnostic, pas de thérapie — juste de l'écoute et une redirection douce.`
      }
    } catch (err) {
      // Best-effort : le classifier ne doit JAMAIS casser le chat. Les
      // garde-fous regex (DENY_PATTERNS) + post-filtre (isReplySafe) restent.
      console.warn("[avatar-coach] welfare classifier failed:", err)
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
    const systemPrompt = buildSystemPrompt(coachName, teenFirstName, contextLine, welfareHint)

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
      let toolMeta: AIProviderMetadata | undefined
      try {
        const r = await provider.runTools(systemPrompt, userPrompt, tools.defs, tools.execute)
        toolMeta = r.metadata
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
      return single(reply, acted, acted ? "tool_action" : "ok", toolMeta)
    }

    // Provider sans streaming (OpenAI) → 1 appel atomique, 1 frame NDJSON.
    if (!supportsStreaming(provider)) {
      let candidateReply = SAFE_REDIRECT
      let sourced = false
      let callMeta: AIProviderMetadata | undefined
      try {
        const { content, metadata } = await provider.call(systemPrompt, userPrompt)
        callMeta = metadata
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
      return single(candidateReply, sourced, sourced ? "ok" : "error", callMeta)
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
        // #Telemetry — logge le tour streamé. Outcome :
        //   unsafe → blocked_output (rideau 3 a coupé)
        //   !hadText → error (stream vide / échec provider)
        //   sinon → ok
        const streamOutcome: CoachTurnOutcome = unsafe
          ? "blocked_output"
          : hadText
            ? "ok"
            : "error"
        logCoachTurn(
          buildTurnMetrics({
            teenId: user.id,
            provider: providerType,
            meta,
            startTime,
            outcome: streamOutcome,
            inputChars: raw.length,
            outputChars: finalReply.length,
            remainingTurns: remaining,
          }),
        )
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
