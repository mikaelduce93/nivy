import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { withSecurity } from "@/lib/security/api-middleware"

export const POST = withSecurity(async (request: NextRequest) => {
  try {
    const formData = await request.formData()
    
    const childId = formData.get("childId") as string
    const eventId = formData.get("eventId") as string
    const bookingId = formData.get("bookingId") as string
    const signatureData = formData.get("signatureData") as string
    const signatureHash = formData.get("signatureHash") as string
    const parentFullName = formData.get("parentFullName") as string
    const parentCin = formData.get("parentCin") as string
    const photoConsent = formData.get("photoConsent") === "true"
    const medicalConsent = formData.get("medicalConsent") === "true"
    const cinFront = formData.get("cinFront") as File
    const cinBack = formData.get("cinBack") as File

    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const uploadCinFile = async (file: File, type: "front" | "back") => {
      const fileName = `${user.id}/cin-${type}-${Date.now()}.jpg`
      const { data, error } = await supabase.storage
        .from("documents")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        })

      if (error) throw error

      const { data: publicData } = supabase.storage
        .from("documents")
        .getPublicUrl(fileName)

      return publicData.publicUrl
    }

    const cinFrontUrl = await uploadCinFile(cinFront, "front")
    const cinBackUrl = await uploadCinFile(cinBack, "back")

    const ip = request.headers.get("x-forwarded-for") || 
               request.headers.get("x-real-ip") || 
               "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    const { data: signature, error: signatureError } = await supabase
      .from("e_signatures")
      .insert({
        parent_id: user.id,
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
      .select()
      .single()

    if (signatureError) throw signatureError

    if (bookingId) {
      await supabase
        .from("bookings")
        .update({
          no_photo_consent: !photoConsent,
        })
        .eq("id", bookingId)
    }

    await supabase.from("documents").insert([
      {
        parent_id: user.id,
        child_id: childId || null,
        document_type: "identity",
        file_name: `CIN_recto_${parentFullName}`,
        file_url: cinFrontUrl,
        mime_type: "image/jpeg",
        description: "Carte d'identité nationale - Recto",
      },
      {
        parent_id: user.id,
        child_id: childId || null,
        document_type: "identity",
        file_name: `CIN_verso_${parentFullName}`,
        file_url: cinBackUrl,
        mime_type: "image/jpeg",
        description: "Carte d'identité nationale - Verso",
      },
    ])

    return NextResponse.json({
      success: true,
      signatureId: signature.id,
      message: "Signature enregistrée avec succès",
    })
  } catch (error) {
    console.error("[v0] E-signature creation error:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement de la signature" },
      { status: 500 }
    )
  }
}, { rateLimit: 'api' })
