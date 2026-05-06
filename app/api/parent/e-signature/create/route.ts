import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"

/**
 * POST /api/parent/e-signature/create
 *
 * Creates an e-signature record for the authenticated parent.
 * Accepts multipart/form-data with CIN images, signature canvas data,
 * and consent flags.
 *
 * The endpoint is parent-role-gated via the session (no CSRF token
 * required — the Supabase auth cookie is the proof of identity for
 * multipart uploads that cannot carry a custom header cross-domain).
 *
 * On duplicate signature (same parent, terms_accepted = true already
 * present) the existing row id is returned with ok: true so the
 * client-side flow continues without error.
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
      .select("id, created_at")
      .eq("parent_id", userInfo.profileId)
      .eq("terms_accepted", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    // Parse the multipart form
    const formData = await request.formData()

    const childId = (formData.get("childId") as string) || null
    const eventId = (formData.get("eventId") as string) || null
    const bookingId = (formData.get("bookingId") as string) || null
    const signatureData = formData.get("signatureData") as string
    const signatureHash = formData.get("signatureHash") as string
    const parentFullName = formData.get("parentFullName") as string
    const parentCin = formData.get("parentCin") as string
    const photoConsent = formData.get("photoConsent") === "true"
    const medicalConsent = formData.get("medicalConsent") === "true"
    const cinFront = formData.get("cinFront") as File | null
    const cinBack = formData.get("cinBack") as File | null

    if (!signatureData || !parentFullName || !parentCin) {
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

    // --- Upload CIN images ---
    const uploadCinFile = async (file: File, side: "front" | "back") => {
      const ext = file.name.split(".").pop() || "jpg"
      const fileName = `${userInfo.profileId}/cin-${side}-${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from("documents")
        .upload(fileName, file, { cacheControl: "3600", upsert: false })

      if (error) throw error

      const { data: publicData } = supabase.storage
        .from("documents")
        .getPublicUrl(fileName)

      return publicData.publicUrl
    }

    const cinFrontUrl = await uploadCinFile(cinFront, "front")
    const cinBackUrl = await uploadCinFile(cinBack, "back")

    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    // If duplicate, insert a renewal row (allows re-signing with fresh CIN).
    // The status endpoint always picks the most recent row, so no upsert needed.
    const { data: signature, error: insertError } = await supabase
      .from("e_signatures")
      .insert({
        parent_id: userInfo.profileId,
        child_id: childId || null,
        event_id: eventId || null,
        booking_id: bookingId || null,
        signature_data: signatureData,
        signature_hash: signatureHash,
        parent_full_name: parentFullName,
        parent_cin: parentCin,
        cin_front_url: cinFrontUrl,
        cin_back_url: cinBackUrl,
        photo_consent: photoConsent,
        medical_consent: medicalConsent,
        terms_accepted: true,
        ip_address: ip,
        user_agent: userAgent,
      })
      .select("id, created_at")
      .single()

    if (insertError) {
      console.error("[parent/e-signature/create] DB insert error:", insertError)
      // If there is already a valid signature (insert failed due to constraint),
      // return the existing record so the flow continues.
      if (existing) {
        return NextResponse.json({ ok: true, id: existing.id, alreadySigned: true })
      }
      return NextResponse.json(
        { ok: false, error: "Erreur lors de l'enregistrement de la signature" },
        { status: 500 }
      )
    }

    // Log CIN documents in the documents table for parent dashboard visibility.
    await supabase.from("documents").insert([
      {
        parent_id: userInfo.profileId,
        child_id: childId || null,
        document_type: "identity",
        file_name: `CIN_recto_${parentFullName}`,
        file_url: cinFrontUrl,
        mime_type: cinFront.type || "image/jpeg",
        description: "Carte d'identité nationale - Recto",
      },
      {
        parent_id: userInfo.profileId,
        child_id: childId || null,
        document_type: "identity",
        file_name: `CIN_verso_${parentFullName}`,
        file_url: cinBackUrl,
        mime_type: cinBack.type || "image/jpeg",
        description: "Carte d'identité nationale - Verso",
      },
    ])

    return NextResponse.json({
      ok: true,
      id: signature.id,
      signedAt: signature.created_at,
    })
  } catch (err) {
    console.error("[parent/e-signature/create] Unexpected error:", err)
    return NextResponse.json(
      { ok: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
