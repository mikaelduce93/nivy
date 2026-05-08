import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"

/**
 * POST /api/onboarding/profile
 * Body: { learning_style?: string | null, archetype?: string | null }
 *
 * TICKET-032 — Onboarding learning_style + archetype capture.
 *
 * Companion to TICKET-031's /api/onboarding/interests. Pre-auth picks made
 * in components/onboarding/teen-setup-step.tsx are stored in localStorage
 * (key: teen_onboarding_profile_preview) and replayed here once the teen
 * has signed in and the parent has approved the account.
 *
 * Validation rules:
 *   - Authenticated teen only (RLS still applies, but we double-check role)
 *   - learning_style ∈ {visual, auditory, kinesthetic, reading} (or null to skip)
 *   - archetype ∈ {creator, explorer, competitor, social} (or null to skip)
 *   - both fields optional; sending neither returns success+skipped:true
 *
 * Persistence: UPDATE teens SET learning_style=?, archetype=? WHERE id=teenId
 *   - Both columns are TEXT and nullable; we only set the keys provided so
 *     a partial submit (e.g. learning_style only) does not nuke an existing
 *     archetype value, and vice-versa.
 *
 * Returns: { success, learning_style, archetype, skipped? }
 */

const LEARNING_STYLES = ["visual", "auditory", "kinesthetic", "reading"] as const
type LearningStyle = (typeof LEARNING_STYLES)[number]

const ARCHETYPES = ["creator", "explorer", "competitor", "social"] as const
type Archetype = (typeof ARCHETYPES)[number]

function isLearningStyle(v: unknown): v is LearningStyle {
  return typeof v === "string" && (LEARNING_STYLES as ReadonlyArray<string>).includes(v)
}

function isArchetype(v: unknown): v is Archetype {
  return typeof v === "string" && (ARCHETYPES as ReadonlyArray<string>).includes(v)
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

    // Allow null explicitly (means "I want to clear this field"); allow
    // undefined (means "don't touch this field"). Anything else gets
    // validated against the closed set.
    const rawStyle = body?.learning_style
    const rawArch = body?.archetype

    const update: Record<string, string | null> = {}

    if (rawStyle !== undefined) {
      if (rawStyle === null) {
        update.learning_style = null
      } else if (isLearningStyle(rawStyle)) {
        update.learning_style = rawStyle
      } else {
        return NextResponse.json(
          {
            success: false,
            error: `learning_style invalide — attendu: ${LEARNING_STYLES.join(", ")}`,
          },
          { status: 400 }
        )
      }
    }

    if (rawArch !== undefined) {
      if (rawArch === null) {
        update.archetype = null
      } else if (isArchetype(rawArch)) {
        update.archetype = rawArch
      } else {
        return NextResponse.json(
          {
            success: false,
            error: `archetype invalide — attendu: ${ARCHETYPES.join(", ")}`,
          },
          { status: 400 }
        )
      }
    }

    // Skip path — neither field provided.
    if (Object.keys(update).length === 0) {
      return NextResponse.json({
        success: true,
        skipped: true,
        learning_style: null,
        archetype: null,
      })
    }

    const { error: updErr } = await supabase
      .from("teens")
      .update(update)
      .eq("id", teenId)

    if (updErr) {
      console.error("[onboarding/profile] teens update error:", updErr)
      return NextResponse.json(
        { success: false, error: "Erreur d'enregistrement" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      learning_style: update.learning_style ?? null,
      archetype: update.archetype ?? null,
    })
  } catch (error) {
    console.error("/api/onboarding/profile error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
