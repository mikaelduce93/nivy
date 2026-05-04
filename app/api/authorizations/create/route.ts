import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { withSecurity } from "@/lib/security/api-middleware"

export const POST = withSecurity(async (request: NextRequest) => {
  try {
    const data = await request.json()
    const supabase = await createClient()

    const {
      parentId,
      childId,
      eventId,
      authorizationType,
      authorizedPersonName,
      authorizedPersonPhone,
      authorizedPersonRelation,
      photoConsent,
      medicalConsent,
      pickupConsent,
      parentSignature,
      cinFrontUrl,
      cinBackUrl,
      ipAddress,
      userAgent,
    } = data

    if (!parentId || !childId || !eventId) {
      return NextResponse.json(
        { error: "Données manquantes" },
        { status: 400 }
      )
    }

    if (!parentSignature || !cinFrontUrl || !cinBackUrl) {
      return NextResponse.json(
        { error: "Signature et CIN obligatoires" },
        { status: 400 }
      )
    }

    if (!photoConsent || !medicalConsent) {
      return NextResponse.json(
        { error: "Consentements obligatoires manquants" },
        { status: 400 }
      )
    }

    const dataToHash = `${parentId}-${childId}-${eventId}-${Date.now()}`
    const signatureHash = crypto
      .createHash("sha256")
      .update(dataToHash)
      .digest("hex")

    const { data: authorization, error } = await supabase
      .from("authorizations")
      .insert({
        parent_id: parentId,
        child_id: childId,
        event_id: eventId,
        authorization_type: authorizationType,
        authorized_person_name: authorizedPersonName || null,
        authorized_person_phone: authorizedPersonPhone || null,
        authorized_person_relation: authorizedPersonRelation || null,
        photo_consent: photoConsent,
        medical_consent: medicalConsent,
        pickup_consent: pickupConsent,
        parent_signature_url: parentSignature,
        cin_front_url: cinFrontUrl,
        cin_back_url: cinBackUrl,
        signature_hash: signatureHash,
        ip_address: ipAddress,
        user_agent: userAgent,
        is_valid: true,
        signed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, authorization })
  } catch (error) {
    console.error("[v0] Authorization creation error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création de l'autorisation" },
      { status: 500 }
    )
  }
}, { rateLimit: 'booking' })
