import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"

/**
 * POST /api/onboarding/interests
 * Body: { tags: string[] }
 *
 * TICKET-031 — canonical onboarding interest-capture endpoint.
 *
 * Validation rules:
 *   - Authenticated teen only (RLS still applies, but we double-check role)
 *   - tags must be a non-empty array (min 3 by default, configurable
 *     via env NIVY_ONBOARDING_INTERESTS_MIN, capped at 10)
 *   - tags must all exist in interest_taxonomy where is_active=true
 *   - duplicate tags within the body are de-duped
 *
 * Persistence:
 *   - Upsert into teen_interests with onConflict='teen_id,tag'
 *     (PK is (teen_id, tag) — see DB schema)
 *   - weight=1.0, declared_at=now()
 *   - Sets teens.is_onboarded=true once interests are captured (best-effort).
 *
 * Returns: { success, count, accepted, rejected }
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
    const skip = body?.skip === true

    // Configurable minimum (default 3, hard max 10 per spec §10 Step A)
    const minSelected = Math.max(
      1,
      Math.min(
        10,
        Number.parseInt(process.env.NIVY_ONBOARDING_INTERESTS_MIN ?? "3", 10) ||
          3
      )
    )
    const maxSelected = 10

    const tags: string[] = Array.from(
      new Set(
        rawTags
          .filter((t: unknown): t is string => typeof t === "string")
          .map((t: string) => t.trim())
          .filter((t: string) => t.length > 0)
      )
    )

    // Skip path — no rows inserted, no error (cold-start gets worse but
    // teens are not blocked from completing onboarding).
    if (skip || tags.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        accepted: [],
        rejected: [],
        skipped: true,
      })
    }

    if (tags.length < minSelected) {
      return NextResponse.json(
        {
          success: false,
          error: `Choisis au moins ${minSelected} centre${minSelected > 1 ? "s" : ""} d'intérêt`,
        },
        { status: 400 }
      )
    }

    if (tags.length > maxSelected) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${maxSelected} centres d'intérêt`,
        },
        { status: 400 }
      )
    }

    // Validate tags against the 50-tag taxonomy (closed set per
    // personalization-engine.md §3 / Appendix A).
    const { data: validTagRows, error: taxoErr } = await supabase
      .from("interest_taxonomy")
      .select("tag")
      .in("tag", tags)
      .eq("is_active", true)

    if (taxoErr) {
      console.error("[onboarding/interests] taxonomy lookup error:", taxoErr)
      return NextResponse.json(
        { success: false, error: "Erreur de validation" },
        { status: 500 }
      )
    }

    const validSet = new Set((validTagRows ?? []).map((r) => r.tag as string))
    const accepted = tags.filter((t) => validSet.has(t))
    const rejected = tags.filter((t) => !validSet.has(t))

    if (accepted.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Aucun tag valide — seules les valeurs du taxonomy officiel sont acceptées",
          rejected,
        },
        { status: 400 }
      )
    }

    if (accepted.length < minSelected) {
      return NextResponse.json(
        {
          success: false,
          error: `${rejected.length} tag${rejected.length > 1 ? "s" : ""} invalide${rejected.length > 1 ? "s" : ""} — il en reste ${accepted.length}, minimum ${minSelected}`,
          rejected,
        },
        { status: 400 }
      )
    }

    // Upsert — PK is (teen_id, tag), so onConflict refreshes weight/declared_at
    // for re-onboarding without nuking historical signal-derived weights for
    // tags the teen keeps. Tags removed from the new selection stay in the
    // table (weight not zeroed) — they will simply decay via the personalization
    // cron. Trade-off: avoids destroying behavioral signal data.
    const nowIso = new Date().toISOString()
    const rows = accepted.map((tag) => ({
      teen_id: teenId,
      tag,
      weight: 1.0,
      declared_at: nowIso,
    }))

    const { error: upsertErr } = await supabase
      .from("teen_interests")
      .upsert(rows, { onConflict: "teen_id,tag" })

    if (upsertErr) {
      console.error("[onboarding/interests] upsert error:", upsertErr)
      return NextResponse.json(
        { success: false, error: "Erreur d'enregistrement" },
        { status: 500 }
      )
    }

    // Best-effort: mark teen as onboarded. The /onboarding/complete route
    // is the canonical place to flip this, but doing it here too is safe:
    // it's idempotent and the recommender can start scoring immediately.
    // (No `profile.onboarding_step` column exists in the live schema —
    // see TICKETS.md TICKET-032 for the next step.)
    const { error: teenErr } = await supabase
      .from("teens")
      .update({ is_onboarded: true })
      .eq("id", teenId)

    if (teenErr) {
      // Non-fatal — log only.
      console.warn(
        "[onboarding/interests] teens.is_onboarded update warning:",
        teenErr.message
      )
    }

    return NextResponse.json({
      success: true,
      count: rows.length,
      accepted,
      rejected,
    })
  } catch (error) {
    console.error("/api/onboarding/interests error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
