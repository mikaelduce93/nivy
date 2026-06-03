import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import {
  LEARNING_STYLES,
  deriveArchetypeFromStyle,
  isArchetype,
  type Archetype,
  type LearningStyle as Style,
} from "@/lib/constants/archetype"

/**
 * POST /api/teen/onboarding/learning-style
 * Body: { answers: Style[] } — 4 answers (one per question), each is a Style.
 *       Optionally: { archetype: Archetype }
 *
 * Server scoring:
 *   - learning_style = mode of answers (most-frequent style; ties -> first seen)
 *   - archetype = derived from style mix when not explicitly provided AND the
 *     teen has no archetype yet (#303: never overwrite the quiz/pre-auth pick).
 *
 * Archetype enum unified (#303) on the canonical 4 {creator, explorer,
 * competitor, social} — no more divergent {leader, socializer}.
 *
 * Skip allowed: empty/missing answers writes nothing.
 */
const STYLES: ReadonlyArray<Style> = LEARNING_STYLES

function scoreStyle(answers: Style[]): Style | null {
  if (answers.length === 0) return null
  const counts: Record<Style, number> = {
    visual: 0,
    auditory: 0,
    kinesthetic: 0,
    reading: 0,
  }
  for (const a of answers) counts[a] += 1
  let best: Style = answers[0]
  let bestCount = -1
  for (const s of STYLES) {
    if (counts[s] > bestCount) {
      bestCount = counts[s]
      best = s
    }
  }
  return best
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "teen") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const teenId = userInfo.profileId
    const body = await request.json().catch(() => ({}))
    const rawAnswers: unknown[] = Array.isArray(body?.answers) ? body.answers : []
    const answers: Style[] = rawAnswers
      .filter((a): a is Style =>
        typeof a === "string" && (STYLES as ReadonlyArray<string>).includes(a)
      )
      .slice(0, 8)

    const explicitArch: Archetype | null = isArchetype(body?.archetype) ? body.archetype : null

    // Skip path
    if (answers.length === 0 && !explicitArch) {
      return NextResponse.json({ success: true, skipped: true })
    }

    const style = scoreStyle(answers)

    const update: Record<string, string> = {}
    if (style) update.learning_style = style

    // #303 — never overwrite an existing archetype (quiz/pre-auth pick wins).
    // An explicit body.archetype always wins; otherwise we only derive-and-set
    // when the teen has no archetype yet.
    if (explicitArch) {
      update.archetype = explicitArch
    } else if (style) {
      const { data: current } = await supabase
        .from("teens")
        .select("archetype")
        .eq("id", teenId)
        .maybeSingle()
      if (!current?.archetype) {
        update.archetype = deriveArchetypeFromStyle(style, answers)
      }
    }
    const archetype = update.archetype ?? null

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: true, skipped: true })
    }

    const { error: updErr } = await supabase
      .from("teens")
      .update(update)
      .eq("id", teenId)

    if (updErr) {
      console.error("teens update error:", updErr)
      return NextResponse.json(
        { success: false, error: "Erreur d'enregistrement" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      learning_style: style,
      archetype,
    })
  } catch (error) {
    console.error("/api/teen/onboarding/learning-style error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
