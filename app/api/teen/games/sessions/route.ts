import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { validateCsrfRequest } from "@/lib/security/csrf"
import { logDbError } from "@/lib/observability/log-db-error"
import { isPlayableSlug, PLAYABLE_GAME_SLUGS } from "@/lib/games/catalog"
import { MEMORY_SETS } from "@/lib/games/memory-sets"
import {
  buildXpInfo,
  extractMemoryLayout,
  extractQuestions,
  extractSessionId,
  extractStatements,
  extractRetryMinutes,
  getCreditedTodayForSlug,
  isCooldownError,
  isMissingRelation,
  rpcTryVariants,
} from "@/lib/games/server"
import type { StartSessionResponse } from "@/lib/games/types"

/**
 * POST /api/teen/games/sessions — démarre une session de mini-jeu (SPEC-G4 §7.1).
 *
 * Body: { slug: "quiz_rush" | "memory" | "vrai_faux" }
 *
 * Appelle la RPC `create_game_session_v2` (mig 182/183, SECURITY DEFINER) :
 * le serveur choisit le seed (questions de la banque modérée / layout memory,
 * M11) et applique le cooldown catalogue. Vrai/Faux (mig 183) : la RPC renvoie
 * des affirmations `statements` [{question, proposition}] — le flag de vérité
 * reste serveur. Le payload renvoyé au client est re-strippé ici (liste
 * blanche) — jamais de champ `correct`/`explanation` ni de flag de vérité.
 *
 * Migrations absentes (181/182 pas appliquées) → 503 `unavailable`, le client
 * retombe sur « bientôt » sans casser (pattern try/fallback maison).
 */

const bodySchema = z.object({
  slug: z.enum(PLAYABLE_GAME_SLUGS),
})

export async function POST(request: Request) {
  try {
    if (!(await validateCsrfRequest(request))) {
      return NextResponse.json({ ok: false, reason: "error", message: "CSRF" }, { status: 403 })
    }

    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "teen" || !userInfo.teenData?.id) {
      return NextResponse.json({ ok: false, reason: "error", message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const validation = bodySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { ok: false, reason: "error", message: "Jeu inconnu" },
        { status: 400 },
      )
    }
    const { slug } = validation.data
    if (!isPlayableSlug(slug)) {
      return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 503 })
    }

    const supabase = await createClient()
    // Signature fixée par la mig 182/183 — une seule variante (rpcTryVariants
    // ne sert qu'à détecter l'infra absente : PGRST202 ⇒ 503 « bientôt »).
    const attempt = await rpcTryVariants(supabase, "create_game_session_v2", [
      { p_game_slug: slug },
    ])

    if (attempt.missing || isMissingRelation(attempt.error)) {
      // État attendu tant que le train G4 (mig 181/182) n'est pas en base.
      return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 503 })
    }
    if (attempt.error) {
      if (isCooldownError(attempt.error)) {
        const res: StartSessionResponse = {
          ok: false,
          reason: "cooldown",
          retryMinutes: extractRetryMinutes(attempt.error),
        }
        return NextResponse.json(res, { status: 429 })
      }
      logDbError("api.games.sessions.create", attempt.error)
      return NextResponse.json({ ok: false, reason: "error" }, { status: 500 })
    }

    // Style RPC maison (mig 011/182) : jsonb { success:false, error } possible.
    const raw = attempt.data as Record<string, unknown> | string | null
    if (raw && typeof raw === "object" && raw.success === false) {
      const message = typeof raw.error === "string" ? raw.error : ""
      if (isCooldownError({ message })) {
        const res: StartSessionResponse = {
          ok: false,
          reason: "cooldown",
          retryMinutes: extractRetryMinutes({ message }),
        }
        return NextResponse.json(res, { status: 429 })
      }
      logDbError("api.games.sessions.create", { message })
      return NextResponse.json({ ok: false, reason: "error" }, { status: 400 })
    }

    const sessionId = extractSessionId(raw)
    if (!sessionId) {
      // Contrat RPC inattendu : on préfère un « bientôt » propre à un crash.
      logDbError("api.games.sessions.create", {
        message: "create_game_session_v2: session id introuvable dans le retour RPC",
      })
      return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 503 })
    }

    const { creditedToday } = await getCreditedTodayForSlug(slug)
    const base = { ok: true as const, sessionId, slug, xp: buildXpInfo(creditedToday) }

    if (slug === "quiz_rush") {
      const questions = extractQuestions(raw)
      if (!questions) {
        logDbError("api.games.sessions.create", {
          message: "quiz_rush: aucune question strippée dans le retour RPC",
        })
        return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 503 })
      }
      return NextResponse.json({ ...base, questions } satisfies StartSessionResponse)
    }

    if (slug === "vrai_faux") {
      const statements = extractStatements(raw)
      if (!statements) {
        logDbError("api.games.sessions.create", {
          message: "vrai_faux: aucune affirmation dans le retour RPC",
        })
        return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 503 })
      }
      return NextResponse.json({ ...base, statements } satisfies StartSessionResponse)
    }

    // Memory (§7.2, variante simplifiée) : le layout vient du seed serveur ;
    // s'il manque (forme de seed différente), on le génère ICI, côté serveur —
    // la validation finale étant une plausibilité (coups/durée), le layout
    // n'est pas une donnée de sécurité (exception M1 explicitement bornée).
    const { layout: seedLayout, setId: seedSetId } = extractMemoryLayout(raw)
    const layout = isValidMemoryLayout(seedLayout) ? seedLayout : shuffledMemoryLayout()
    const setId =
      seedSetId && MEMORY_SETS.some((s) => s.id === seedSetId)
        ? seedSetId
        : MEMORY_SETS[Math.floor(Math.random() * MEMORY_SETS.length)].id
    return NextResponse.json({ ...base, layout, setId } satisfies StartSessionResponse)
  } catch (error) {
    logDbError("api.games.sessions.create", error)
    return NextResponse.json({ ok: false, reason: "error" }, { status: 500 })
  }
}

/** 16 cartes = 8 paires (ids 0..7), chaque id exactement deux fois. */
function isValidMemoryLayout(layout: number[] | null): layout is number[] {
  if (!layout || layout.length !== 16) return false
  const counts = new Map<number, number>()
  for (const v of layout) {
    if (!Number.isInteger(v) || v < 0 || v > 7) return false
    counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  return counts.size === 8 && [...counts.values()].every((c) => c === 2)
}

function shuffledMemoryLayout(): number[] {
  const cards = [...Array(8).keys(), ...Array(8).keys()]
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }
  return cards
}
