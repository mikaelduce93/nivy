import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NextResponse } from "next/server"
import crypto from "crypto"
import { withSupabaseTimeout } from "@/lib/supabase/wrapper"
import { getAppUrl } from "@/lib/config/app-config"
import { sendParentValidationEmail } from "@/lib/email/parent-validation"
import { ageFromDateOfBirth, isTeenAge, TEEN_AGE_ERROR } from "@/lib/constants/age"
import { isArchetype } from "@/lib/constants/archetype"

/**
 * Register a teen account with parent validation
 *
 * Flow:
 * 1. Teen fills form with their info + parent email/phone
 * 2. Creates pending teen profile
 * 3. Creates parent validation token
 * 4. Sends email to parent with validation link
 * 5. Parent clicks link, creates account (or logs in), approves teen
 * 6. Teen account becomes active with parent relationship
 */
export async function POST(request: Request) {
  try {
    // #26 — pending_teen_registrations is RLS service-role-only (the token is
    // the secret). This is a public/unauthenticated route, so we use the
    // service-role client for the controlled lookup + insert after validating
    // the inputs (required fields + age 11-17) below.
    const admin = createServiceRoleClient()
    const body = await request.json()

    const {
      teenFirstName,
      teenLastName,
      dateOfBirth,
      parentEmail,
      parentPhone,
      teenEmail,
      archetype,
    } = body
    // #309 — "vibe de Niv" pick captured pre-account; persisted on the pending
    // row and copied to teens.archetype at parental validation.
    const archetypeValue: string | null = isArchetype(archetype) ? archetype : null
    // Wave-A audit: SHA-256 unsalted password hashing was insecure. We no
    // longer persist the teen's password here. The auth.users row + password
    // are provisioned via Supabase Auth admin createUser at the moment the
    // parent validates (app/api/auth/validate-teen). Any teenPassword sent
    // by the client is intentionally ignored.

    // Validate required fields. #311 — parentPhone is now OPTIONAL (no SMS is
    // sent, so requiring it collected unused PII). Email is the validation channel.
    if (!teenFirstName || !teenLastName || !dateOfBirth || !parentEmail) {
      return NextResponse.json(
        { success: false, error: "Prénom, nom, date de naissance et email du parent sont requis" },
        { status: 400 }
      )
    }

    // Validate age — single source of truth (#292): TEEN_MIN_AGE..TEEN_MAX_AGE.
    const age = ageFromDateOfBirth(dateOfBirth)

    if (!isTeenAge(age)) {
      return NextResponse.json(
        { success: false, error: TEEN_AGE_ERROR },
        { status: 400 }
      )
    }

    // Check if parent email exists
    const { data: existingParent } = await withSupabaseTimeout(
      admin
        .from("profiles")
        .select("id, role, full_name")
        .eq("email", parentEmail.toLowerCase())
        .single(),
      `from('profiles').select()`,
      10000
    )

    // Generate validation token
    const validationToken = crypto.randomBytes(32).toString("hex")
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Create pending teen registration
    const { data: pendingRegistration, error: regError } = await withSupabaseTimeout(
      admin
        .from("pending_teen_registrations")
        .insert({
          teen_first_name: teenFirstName,
          teen_last_name: teenLastName,
          teen_email: teenEmail?.toLowerCase() || null,
          teen_password_hash: null,
          date_of_birth: dateOfBirth,
          parent_email: parentEmail.toLowerCase(),
          parent_phone: parentPhone?.trim() || null,
          validation_token: validationToken,
          token_expires_at: tokenExpiry.toISOString(),
          status: "pending",
          existing_parent_id: existingParent?.id || null,
          archetype: archetypeValue,
        })
        .select()
        .single(),
      `from('pending_teen_registrations').insert()`,
      10000
    )

    if (regError) {
      console.error("Registration error:", regError)

      // Check for duplicate
      if (regError.code === "23505") {
        return NextResponse.json(
          { success: false, error: "Une demande est déjà en cours pour cet email parent" },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { success: false, error: "Erreur lors de l'inscription" },
        { status: 500 }
      )
    }

    // Build validation URL
    const appUrl = getAppUrl()
    const validationUrl = `${appUrl}/auth/validate-teen?token=${validationToken}`

    // Send email to parent (via Resend)
    const emailSent = await sendParentValidationEmail({
      parentEmail,
      parentName: existingParent?.full_name,
      teenName: `${teenFirstName} ${teenLastName}`,
      teenAge: age,
      validationUrl,
      expiresAt: tokenExpiry,
    })

    if (!emailSent) {
      // Log but don't fail - admin can resend
      console.warn(
        "[register-teen] Validation email NOT sent to:",
        parentEmail,
        "(Resend non configure ou erreur d'envoi)"
      )
    }

    // SMS not yet integrated. Tracked in TODO.
    // When integrating, use lib/sms/<provider>.ts and read TWILIO_*/MESSAGEBIRD_*
    // from getServerAppConfig(). For now we only check env presence to expose
    // sms_available honestly to the caller (no 500 if email succeeded).
    const smsAvailable = Boolean(
      process.env.TWILIO_ACCOUNT_SID || process.env.MESSAGEBIRD_ACCESS_KEY
    )
    const smsSent = false
    if (parentPhone) {
      console.warn(
        "[register-teen] SMS provider non integre (sms_available=" +
          smsAvailable +
          "). Aucun SMS envoye au parent",
        parentPhone.replace(/\d(?=\d{4})/g, "*")
      )
    }

    return NextResponse.json({
      success: true,
      message: emailSent
        ? "Demande envoyee. Le parent recevra un email de validation."
        : "Demande enregistree. L'email de validation n'a pas pu etre envoye automatiquement, contactez le support si besoin.",
      data: {
        registrationId: pendingRegistration.id,
        email_sent: emailSent,
        sms_sent: smsSent,
        sms_available: smsAvailable,
        expiresAt: tokenExpiry.toISOString(),
      },
    })
  } catch (error) {
    console.error("Register teen API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
