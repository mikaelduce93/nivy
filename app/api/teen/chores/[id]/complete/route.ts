/**
 * POST /api/teen/chores/:id/complete
 *
 * Teen submits a completion. Optional photo evidence is uploaded separately
 * via <EvidenceUpload> to the PRIVATE Supabase Storage bucket
 * `chore-evidence` (TICKET-014). This route only persists the resulting
 * bucket-relative object path on `parent_chore_completions.evidence_url`
 * — never a full URL. The parent UI re-signs the path on demand with a
 * short-TTL signed-read URL (15 min).
 *
 * Body: { evidence_url?: string } where evidence_url is the storage path
 *       returned by the upload flow (shape: `<teen_id>/...`).
 *
 * Server-side validates that the chore is active and assigned to the
 * calling teen, and that the evidence_url is a bucket-relative path
 * scoped to the caller. RLS provides defence-in-depth.
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { recordSignalAsync } from "@/lib/analytics/signals"

interface CompleteBody {
  evidence_url?: string | null
}

/**
 * Validate that `value` is a bucket-relative storage path:
 *   - non-empty string within a sane length
 *   - does NOT look like a URL (no `scheme:` prefix)
 *   - does NOT start with a leading slash
 *   - no `..` traversal segments
 *   - first folder segment matches `<teenId>/` (matches storage RLS)
 *
 * Returns the cleaned path on success, or null if invalid.
 */
function normaliseEvidencePath(
  raw: string | null | undefined,
  teenId: string
): string | null {
  if (!raw || typeof raw !== "string") return null
  const trimmed = raw.trim()
  if (trimmed.length === 0 || trimmed.length > 1024) return null
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null // scheme://
  if (trimmed.startsWith("/")) return null
  if (trimmed.includes("..")) return null
  if (!trimmed.startsWith(`${teenId}/`)) return null
  return trimmed
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "teen") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const { id: choreId } = await params
    const body = (await request.json().catch(() => ({}))) as CompleteBody

    const supabase = await createClient()
    const teenId = userInfo.profileId

    // Validate the chore is active and assigned to this teen.
    // We also pull title for the personalization signal payload below
    // (parent_chores has no tags/category column today — title is the
    // only free-text affinity hint we can carry).
    const { data: chore } = await supabase
      .from("parent_chores")
      .select("id, teen_id, evidence_required, is_active, title, recurrence")
      .eq("id", choreId)
      .eq("teen_id", teenId)
      .maybeSingle()

    if (!chore || !chore.is_active) {
      return NextResponse.json(
        { success: false, error: "Corvée introuvable ou inactive" },
        { status: 404 }
      )
    }

    // Normalise / validate the evidence path. We never accept full URLs —
    // the parent UI re-signs the path on demand (TICKET-014).
    let evidencePath: string | null = null
    if (body.evidence_url != null && body.evidence_url !== "") {
      evidencePath = normaliseEvidencePath(body.evidence_url, teenId as string)
      if (!evidencePath) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Preuve invalide : un chemin de bucket relatif est attendu (pas une URL).",
          },
          { status: 400 }
        )
      }
    }

    if (chore.evidence_required && !evidencePath) {
      return NextResponse.json(
        { success: false, error: "Preuve photo requise" },
        { status: 400 }
      )
    }

    const { data: completion, error } = await supabase
      .from("parent_chore_completions")
      .insert({
        chore_id: choreId,
        teen_id: teenId,
        evidence_url: evidencePath,
        parent_verified: false,
      })
      .select("*")
      .single()

    if (error) {
      console.error("[teen/chores/complete] insert error:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // TICKET-033 — best-effort personalization signal for chore_completed.
    // The DB-level record_signal RPC enforces a fixed signal_type enum
    // (no chore-specific value), so we map the semantic event to 'complete'
    // against target_type='mission' (chores ARE the parent-mission surface)
    // and stash the richer label in metadata.signal_subtype.
    //
    // Tags come from chore category/title since parent_chores has no tags
    // column; weight is 0.8 — a chore completion is a strong but not
    // perfect-confidence interest signal (parents pick chores, teens just
    // execute), so we deliberately stay below the quiz-pass max of 1.0.
    // Tags: derive a low-resolution bucket from the recurrence cadence so
    // the recommender can at least segment "habitual" vs "one-off" chore
    // affinity even without a true taxonomy column.
    const choreTags: string[] = []
    const recurrence = (chore as { recurrence?: string | null }).recurrence
    if (typeof recurrence === "string" && recurrence.length > 0) {
      choreTags.push(`chore:${recurrence}`)
    }
    recordSignalAsync({
      teenId: teenId as string,
      signalType: "complete",
      targetType: "mission",
      targetId: choreId,
      weight: 0.8,
      metadata: {
        signal_subtype: "chore_completed",
        chore_title: (chore as { title?: string | null }).title ?? null,
        recurrence: recurrence ?? null,
        tags: choreTags,
        evidence_provided: Boolean(evidencePath),
      },
    })

    return NextResponse.json({ success: true, completion })
  } catch (err) {
    console.error("[teen/chores/complete] unexpected:", err)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
