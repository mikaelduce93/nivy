import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"

type Style = "visual" | "auditory" | "kinesthetic" | "reading"
type Archetype = "leader" | "explorer" | "creator" | "socializer"

/**
 * POST /api/teen/onboarding/learning-style
 * Body: { answers: Style[] } — 4 answers (one per question), each is a Style.
 *       Optionally: { archetype: Archetype }
 *
 * Server scoring:
 *   - learning_style = mode of answers (most-frequent style; ties -> first seen)
 *   - archetype = derived from style mix when not explicitly provided.
 *
 * Skip allowed: empty/missing answers writes nothing.
 */
const STYLES: ReadonlyArray<Style> = [
  "visual",
  "auditory",
  "kinesthetic",
  "reading",
]
const ARCHETYPES: ReadonlyArray<Archetype> = [
  "leader",
  "explorer",
  "creator",
  "socializer",
]

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

function deriveArchetype(style: Style, answers: Style[]): Archetype {
  // Heuristic mapping — biased by dominant + secondary signals.
  // visual-heavy + kinesthetic -> explorer
  // kinesthetic-heavy -> leader
  // reading/visual mix -> creator
  // auditory-heavy -> socializer
  const counts: Record<Style, number> = {
    visual: 0,
    auditory: 0,
    kinesthetic: 0,
    reading: 0,
  }
  for (const a of answers) counts[a] += 1

  if (style === "kinesthetic") return "leader"
  if (style === "auditory") return "socializer"
  if (style === "reading") return "creator"
  // visual: tie-break by secondary
  if (counts.kinesthetic >= counts.reading && counts.kinesthetic >= counts.auditory) {
    return "explorer"
  }
  if (counts.reading >= counts.auditory) return "creator"
  return "socializer"
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

    const explicitArch =
      typeof body?.archetype === "string" &&
      (ARCHETYPES as ReadonlyArray<string>).includes(body.archetype)
        ? (body.archetype as Archetype)
        : null

    // Skip path
    if (answers.length === 0 && !explicitArch) {
      return NextResponse.json({ success: true, skipped: true })
    }

    const style = scoreStyle(answers)
    const archetype = explicitArch ?? (style ? deriveArchetype(style, answers) : null)

    const update: Record<string, string> = {}
    if (style) update.learning_style = style
    if (archetype) update.archetype = archetype

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
