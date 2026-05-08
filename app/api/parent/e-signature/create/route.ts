import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"

/**
 * POST /api/parent/e-signature/create
 *
 * Wave 1B — CIN privacy fix.
 *   - CIN images upload to the PRIVATE `cin-scans` bucket (NOT `documents`).
 *   - DB stores STORAGE PATH only — never a public URL.
 *   - `getPublicUrl()` is never called for CIN. Use `createSignedUrl` with a
 *     short TTL when retrieving.
 *
 * Per docs/canon/parent-control.locked.md and
 * docs/compliance/08-parent-control-compliance.md.
 *
 * The endpoint is parent-role-gated via the session cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "parent") {
      return NextResponse.json(
        { ok: false, error: "Non autorisé — rôle parent requis" },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // --- Duplicate guard: return existing signature if already signed ---
    const { data: existing } = await supabase
      .from("e_signatures")
      .select("id, signed_at")
      .eq("parent_id", userInfo.profileId)
      .eq("terms_accepted", true)
      .order("signed_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    // Parse the multipart form
    const formData = await request.formData()

    const childId = (formData.get("childId") as string) || null
    const eventId = (formData.get("eventId") as string) || null
    const bookingId = (formData.get("bookingId") as string) || null
    const signatureHash = formData.get("signatureHash") as string
    const parentFullName = formData.get("parentFullName") as string
    const parentCin = formData.get("parentCin") as string
    const cinFront = formData.get("cinFront") as File | null
    const cinBack = formData.get("cinBack") as File | null

    if (!signatureHash || !parentFullName || !parentCin) {
      return NextResponse.json(
        { ok: false, error: "Données de signature incomplètes" },
        { status: 400 }
      )
    }

    if (!cinFront || !cinBack) {
      return NextResponse.json(
        { ok: false, error: "Les deux faces de la CIN sont requises" },
        { status: 400 }
      )
    }

    // --- Upload CIN images to PRIVATE bucket `cin-scans` ----------------
    // We deliberately store only the storage PATH, never a URL. Signed URLs
    // are generated on-demand by the read endpoints with short TTLs (<= 30
    // min hard cap). NEVER call getPublicUrl() on this bucket.
    const uploadCinFile = async (file: File, side: "front" | "back") => {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase()
      // Path lives in the parent's own folder so storage RLS
      // ({auth.uid()}/...) gates writes to self only.
      const path = `${userInfo.profileId}/cin-${side}-${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from("cin-scans")
        .upload(path, file, { cacheControl: "3600", upsert: false })

      if (error) throw error
      return path
    }

    let cinFrontPath: string
    let cinBackPath: string
    try {
      cinFrontPath = await uploadCinFile(cinFront, "front")
      cinBackPath = await uploadCinFile(cinBack, "back")
    } catch (uploadErr) {
      console.error(
        "[parent/e-signature/create] CIN upload to private bucket failed:",
        uploadErr
      )
      return NextResponse.json(
        { ok: false, error: "Erreur lors du téléversement de la CIN" },
        { status: 500 }
      )
    }

    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    // We persist the FRONT path in the canonical `cin_url` column (the column
    // is misnamed historically — it stores a storage path, not a URL). The
    // back path is recorded in the `documents` table below for audit.
    const { data: signature, error: insertError } = await supabase
      .from("e_signatures")
      .insert({
        parent_id: userInfo.profileId,
        child_id: childId || null,
        event_id: eventId || null,
        booking_id: bookingId || null,
        signature_hash: signatureHash,
        parent_full_name: parentFullName,
        parent_cin: parentCin,
        cin_url: cinFrontPath,
        ip_address: ip,
        user_agent: userAgent,
        terms_accepted: true,
      })
      .select("id, signed_at")
      .single()

    if (insertError) {
      console.error("[parent/e-signature/create] DB insert error:", insertError)
      if (existing) {
        return NextResponse.json({
          ok: true,
          id: existing.id,
          alreadySigned: true,
        })
      }
      return NextResponse.json(
        { ok: false, error: "Erreur lors de l'enregistrement de la signature" },
        { status: 500 }
      )
    }

    // Documents audit log — also stores PATHS, not URLs. The dashboard
    // generates short-lived signed URLs at view time.
    await supabase.from("documents").insert([
      {
        parent_id: userInfo.profileId,
        child_id: childId || null,
        document_type: "identity",
        file_name: `CIN_recto_${parentFullName}`,
        file_url: cinFrontPath, // legacy column name; value is a private path
        mime_type: cinFront.type || "image/jpeg",
        description: "Carte d'identité nationale - Recto (private bucket)",
      },
      {
        parent_id: userInfo.profileId,
        child_id: childId || null,
        document_type: "identity",
        file_name: `CIN_verso_${parentFullName}`,
        file_url: cinBackPath,
        mime_type: cinBack.type || "image/jpeg",
        description: "Carte d'identité nationale - Verso (private bucket)",
      },
    ])

    return NextResponse.json({
      ok: true,
      id: signature.id,
      signedAt: signature.signed_at,
    })
  } catch (err) {
    console.error("[parent/e-signature/create] Unexpected error:", err)
    return NextResponse.json(
      { ok: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
