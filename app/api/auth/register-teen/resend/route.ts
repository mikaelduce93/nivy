import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NextResponse } from "next/server"
import { z } from "zod"
import { withSupabaseTimeout } from "@/lib/supabase/wrapper"
import { getAppUrl } from "@/lib/config/app-config"
import { sendParentValidationEmail } from "@/lib/email/parent-validation"
import { ageFromDateOfBirth } from "@/lib/constants/age"

/**
 * POST /api/auth/register-teen/resend — #295
 *
 * Renvoie l'email de validation parentale d'une inscription ado déjà en
 * attente (le premier envoi a pu échouer : Resend non configuré / erreur SMTP).
 * Public/unauthenticated comme register-teen : la connaissance du
 * `registrationId` (uuid) suffit, on ne ré-émet rien de sensible et on réutilise
 * le `validation_token` existant (pas de régénération → le lien déjà reçu reste
 * valide).
 */
const bodySchema = z.object({ registrationId: z.string().uuid() })

export async function POST(request: Request) {
  try {
    const admin = createServiceRoleClient()
    const parsed = bodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Requête invalide" },
        { status: 400 }
      )
    }

    const { data: registration, error } = await withSupabaseTimeout(
      admin
        .from("pending_teen_registrations")
        .select("*")
        .eq("id", parsed.data.registrationId)
        .single(),
      `from('pending_teen_registrations').select()`,
      10000
    )

    if (error || !registration) {
      return NextResponse.json(
        { success: false, error: "Demande introuvable" },
        { status: 404 }
      )
    }

    if (registration.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Cette demande n'est plus en attente" },
        { status: 400 }
      )
    }

    if (new Date(registration.token_expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: "Le lien a expiré. Recommence l'inscription." },
        { status: 410 }
      )
    }

    const validationUrl = `${getAppUrl()}/auth/validate-teen?token=${registration.validation_token}`

    // No parent email on the registration → nothing to re-send; the teen must
    // share the link directly (QR/WhatsApp). Surface the link, not an error.
    if (!registration.parent_email) {
      return NextResponse.json({
        success: true,
        message: "Aucun email parent — partage le lien directement à ton parent.",
        data: { email_sent: false, validationUrl },
      })
    }

    // Re-resolve parent name (best-effort) for the greeting.
    const { data: existingParent } = await admin
      .from("profiles")
      .select("full_name")
      .eq("email", registration.parent_email)
      .maybeSingle()

    const emailSent = await sendParentValidationEmail({
      parentEmail: registration.parent_email,
      parentName: existingParent?.full_name ?? undefined,
      teenName: `${registration.teen_first_name} ${registration.teen_last_name}`,
      teenAge: ageFromDateOfBirth(registration.date_of_birth),
      validationUrl,
      expiresAt: new Date(registration.token_expires_at),
    })

    return NextResponse.json({
      success: true,
      message: emailSent
        ? "Email de validation renvoyé."
        : "L'email n'a pas pu être renvoyé (service email indisponible).",
      data: { email_sent: emailSent, validationUrl },
    })
  } catch (e) {
    console.error("register-teen/resend error:", e)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
