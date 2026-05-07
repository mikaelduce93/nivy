/**
 * POST /api/teen/evidence/sign-upload
 *
 * Issues a one-shot signed upload URL for a private storage bucket so the
 * client can upload directly to Supabase Storage without holding the service-
 * role key. Used by <EvidenceUpload>.
 *
 * Security model
 * ---------------
 *   - Caller must be authenticated and have role=teen.
 *   - The caller must own the resource the evidence is being attached to
 *     (chore assignment / challenge progress). Verified via SELECT under
 *     the calling user's RLS context.
 *   - Path is always prefixed with `auth.uid()::text/` regardless of any
 *     `ownerId` supplied by the client. The pre-deployed bucket policies
 *     enforce the same prefix as defence-in-depth (Wave A audit).
 *
 * Request body
 *   {
 *     bucket: 'defi-proofs' | 'kyc-documents',
 *     resourceType: 'chore_completion' | 'defi_proof',
 *     resourceId: string,                     // FK target
 *     ext?: string,                           // file extension hint
 *     contentType?: string,                   // mime hint (validated)
 *     size?: number                           // bytes hint (validated)
 *   }
 *
 * Response
 *   { success: true, path: string, token: string }
 */

import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"

const ALLOWED_BUCKETS = new Set(["defi-proofs", "kyc-documents"])
const ALLOWED_RESOURCE_TYPES = new Set(["chore_completion", "defi_proof"])
const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "application/pdf", // for kyc-documents
])
const MAX_BYTES = 25 * 1024 * 1024 // 25 MB hard cap server-side

interface Body {
  bucket?: string
  resourceType?: string
  resourceId?: string
  ext?: string
  contentType?: string
  size?: number
}

function safeExt(raw: string | undefined): string {
  const v = (raw || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5)
  return v || "bin"
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
    const { bucket, resourceType, resourceId, ext, contentType, size } = body

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
    if (!resourceId || typeof resourceId !== "string") {
      return NextResponse.json(
        { success: false, error: "resourceId requis" },
        { status: 400 }
      )
    }
    if (contentType && !ALLOWED_MIMES.has(contentType)) {
      return NextResponse.json(
        { success: false, error: "Type de fichier non supporté" },
        { status: 400 }
      )
    }
    if (typeof size === "number" && size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: "Fichier trop lourd" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const teenId = userInfo.profileId // == auth.uid()

    // ---- Verify resource ownership (defence-in-depth atop RLS) ----
    if (resourceType === "chore_completion") {
      const { data: chore } = await supabase
        .from("parent_chores")
        .select("id, teen_id, is_active")
        .eq("id", resourceId)
        .eq("teen_id", teenId)
        .maybeSingle()
      if (!chore || !chore.is_active) {
        return NextResponse.json(
          { success: false, error: "Corvée introuvable ou inactive" },
          { status: 404 }
        )
      }
    } else if (resourceType === "defi_proof") {
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
    }

    // ---- Build storage path: auth.uid()/<resourceType>/<uuid>.<ext> ----
    // Always force the prefix to the authenticated user's id — the bucket
    // policies enforce the same constraint, but we never trust client input.
    const objectName = `${teenId}/${resourceType}/${randomUUID()}.${safeExt(ext)}`

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(objectName)

    if (error || !data?.token) {
      console.error("[evidence/sign-upload] createSignedUploadUrl failed", error)
      return NextResponse.json(
        { success: false, error: error?.message || "Signature impossible" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      path: data.path,
      token: data.token,
    })
  } catch (err) {
    console.error("[evidence/sign-upload] unexpected", err)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
