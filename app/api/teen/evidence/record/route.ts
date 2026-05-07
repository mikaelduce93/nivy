/**
 * POST /api/teen/evidence/record
 *
 * Companion to /api/teen/evidence/sign-upload. Once the client has uploaded
 * the file to the signed URL, it calls this route with the storage path so
 * we persist a reference on the canonical resource row.
 *
 * Canonical column mapping
 * ------------------------
 *   chore_completion → INSERT into parent_chore_completions(evidence_url)
 *                       (resourceId = parent_chores.id; teen submits a new completion)
 *   defi_proof        → UPDATE teen_physical_challenge_progress.proof_url
 *                       (resourceId = teen_physical_challenge_progress.id)
 *
 * Note: there is no `chore_completions.evidence_url` column — Wave 2's
 * canonical table is `parent_chore_completions` (see app/api/teen/chores/[id]/complete).
 * Likewise there is no `defi_proofs` table; defi proof lives on
 * `teen_physical_challenge_progress.proof_url`.
 *
 * Security
 *   - Auth-gated (role=teen).
 *   - Path must start with the caller's auth.uid() (matches storage RLS).
 *   - Resource ownership re-verified before write.
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"

const ALLOWED_BUCKETS = new Set(["defi-proofs", "kyc-documents"])
const ALLOWED_RESOURCE_TYPES = new Set(["chore_completion", "defi_proof"])

interface Body {
  bucket?: string
  path?: string
  resourceType?: string
  resourceId?: string
}

export async function POST(request: Request) {
  try {
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "teen") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as Body
    const { bucket, path, resourceType, resourceId } = body

    if (!bucket || !ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json(
        { success: false, error: "Bucket invalide" },
        { status: 400 }
      )
    }
    if (!resourceType || !ALLOWED_RESOURCE_TYPES.has(resourceType)) {
      return NextResponse.json(
        { success: false, error: "Type de ressource invalide" },
        { status: 400 }
      )
    }
    if (!resourceId || !path || typeof path !== "string") {
      return NextResponse.json(
        { success: false, error: "path et resourceId requis" },
        { status: 400 }
      )
    }

    const teenId = userInfo.profileId

    // Path must begin with `<teen_id>/` to satisfy bucket RLS.
    if (!path.startsWith(`${teenId}/`)) {
      return NextResponse.json(
        { success: false, error: "Chemin invalide pour cet utilisateur" },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // ---- chore_completion → parent_chore_completions.evidence_url ----
    if (resourceType === "chore_completion") {
      const { data: chore } = await supabase
        .from("parent_chores")
        .select("id, teen_id, evidence_required, is_active")
        .eq("id", resourceId)
        .eq("teen_id", teenId)
        .maybeSingle()
      if (!chore || !chore.is_active) {
        return NextResponse.json(
          { success: false, error: "Corvée introuvable ou inactive" },
          { status: 404 }
        )
      }

      const { data: completion, error } = await supabase
        .from("parent_chore_completions")
        .insert({
          chore_id: resourceId,
          teen_id: teenId,
          evidence_url: path,
          parent_verified: false,
        })
        .select("id, evidence_url")
        .single()

      if (error) {
        console.error("[evidence/record] chore_completion insert failed", error)
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        resource: { type: "chore_completion", id: completion.id },
        path,
      })
    }

    // ---- defi_proof → teen_physical_challenge_progress.proof_url ----
    if (resourceType === "defi_proof") {
      const { data: progress } = await supabase
        .from("teen_physical_challenge_progress")
        .select("id, teen_id")
        .eq("id", resourceId)
        .eq("teen_id", teenId)
        .maybeSingle()
      if (!progress) {
        return NextResponse.json(
          { success: false, error: "Défi introuvable" },
          { status: 404 }
        )
      }

      const { error } = await supabase
        .from("teen_physical_challenge_progress")
        .update({
          proof_url: path,
          proof_type: path.endsWith(".mp4") ? "video" : "photo",
          updated_at: new Date().toISOString(),
        })
        .eq("id", resourceId)
        .eq("teen_id", teenId)

      if (error) {
        console.error("[evidence/record] defi_proof update failed", error)
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        resource: { type: "defi_proof", id: resourceId },
        path,
      })
    }

    return NextResponse.json(
      { success: false, error: "Type non géré" },
      { status: 400 }
    )
  } catch (err) {
    console.error("[evidence/record] unexpected", err)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
