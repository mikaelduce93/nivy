import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"

/**
 * POST /api/teen/onboarding/interests
 * Body: { tags: string[] } — 0 to 10 interest tags from interest_taxonomy
 *
 * Writes 5-10 rows to teen_interests with weight=1.0.
 * Skip flow allowed: empty array writes nothing (bias toward completion).
 */
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
    const rawTags = Array.isArray(body?.tags) ? body.tags : []
    const tags: string[] = Array.from(
      new Set(
        rawTags
          .filter((t: unknown): t is string => typeof t === "string")
          .map((t: string) => t.trim())
          .filter((t: string) => t.length > 0)
      )
    )

    if (tags.length > 10) {
      return NextResponse.json(
        { success: false, error: "Maximum 10 centres d'intérêt" },
        { status: 400 }
      )
    }

    // Skip path — write nothing, just continue
    if (tags.length === 0) {
      return NextResponse.json({ success: true, count: 0, skipped: true })
    }

    if (tags.length < 5) {
      return NextResponse.json(
        { success: false, error: "Choisis au moins 5 centres d'intérêt (ou passe l'étape)" },
        { status: 400 }
      )
    }

    // Validate tags against taxonomy
    const { data: validTags, error: taxoErr } = await supabase
      .from("interest_taxonomy")
      .select("tag")
      .in("tag", tags)
      .eq("is_active", true)

    if (taxoErr) {
      console.error("interest_taxonomy lookup error:", taxoErr)
      return NextResponse.json(
        { success: false, error: "Erreur de validation" },
        { status: 500 }
      )
    }

    const validSet = new Set((validTags ?? []).map((r) => r.tag as string))
    const filtered = tags.filter((t) => validSet.has(t))

    if (filtered.length === 0) {
      return NextResponse.json(
        { success: false, error: "Aucun tag valide" },
        { status: 400 }
      )
    }

    // Replace existing declared interests for this teen (idempotent re-onboarding)
    const { error: delErr } = await supabase
      .from("teen_interests")
      .delete()
      .eq("teen_id", teenId)

    if (delErr) {
      console.error("teen_interests delete error:", delErr)
    }

    const rows = filtered.map((tag) => ({
      teen_id: teenId,
      tag,
      weight: 1.0,
      declared_at: new Date().toISOString(),
    }))

    const { error: insErr } = await supabase.from("teen_interests").insert(rows)

    if (insErr) {
      console.error("teen_interests insert error:", insErr)
      return NextResponse.json(
        { success: false, error: "Erreur d'enregistrement" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, count: rows.length })
  } catch (error) {
    console.error("/api/teen/onboarding/interests error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
