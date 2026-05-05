import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import crypto from "crypto"
import { withSupabaseTimeout } from "@/lib/supabase/wrapper"
import { getAppUrl, getServerAppConfig } from "@/lib/config/app-config"
import { resend, EMAIL_FROM, isResendConfigured } from "@/lib/resend"

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
    const supabase = await createClient()
    const body = await request.json()

    const {
      teenFirstName,
      teenLastName,
      dateOfBirth,
      parentEmail,
      parentPhone,
      teenEmail,
      teenPassword,
    } = body

    // Validate required fields
    if (!teenFirstName || !teenLastName || !dateOfBirth || !parentEmail || !parentPhone) {
      return NextResponse.json(
        { success: false, error: "Tous les champs sont requis" },
        { status: 400 }
      )
    }

    // Validate age (11-17)
    const birthDate = new Date(dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    if (age < 11 || age > 17) {
      return NextResponse.json(
        { success: false, error: "Tu dois avoir entre 11 et 17 ans" },
        { status: 400 }
      )
    }

    // Check if parent email exists
    const { data: existingParent } = await withSupabaseTimeout(
      supabase
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
      supabase
        .from("pending_teen_registrations")
        .insert({
          teen_first_name: teenFirstName,
          teen_last_name: teenLastName,
          teen_email: teenEmail?.toLowerCase() || null,
          teen_password_hash: teenPassword ? await hashPassword(teenPassword) : null,
          date_of_birth: dateOfBirth,
          parent_email: parentEmail.toLowerCase(),
          parent_phone: parentPhone,
          validation_token: validationToken,
          token_expires_at: tokenExpiry.toISOString(),
          status: "pending",
          existing_parent_id: existingParent?.id || null,
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

    // SMS: provider non integre. On ne pretend pas l'avoir envoye.
    const smsSent = false
    if (parentPhone) {
      console.warn(
        "[register-teen] SMS provider non configure. Aucun SMS envoye au parent",
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
        sms_available: false,
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

/**
 * Hash password (placeholder - use proper hashing in production)
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return Buffer.from(hash).toString("hex")
}

/**
 * Envoie l'email de validation au parent via Resend.
 * Retourne `false` (sans throw) si Resend n'est pas configure ou si l'envoi echoue.
 * Le caller doit logger et exposer `email_sent: false` plutot que pretendre le succes.
 */
async function sendParentValidationEmail({
  parentEmail,
  parentName,
  teenName,
  teenAge,
  validationUrl,
  expiresAt,
}: {
  parentEmail: string
  parentName?: string
  teenName: string
  teenAge: number
  validationUrl: string
  expiresAt: Date
}): Promise<boolean> {
  if (!isResendConfigured() || !resend) {
    console.warn(
      "[register-teen] Resend non configure (RESEND_API_KEY manquant) - email parent non envoye"
    )
    return false
  }

  const { brandName } = getServerAppConfig()
  const expiresStr = expiresAt.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
  const greeting = parentName ? `Bonjour ${parentName},` : "Bonjour,"

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa;">
      <div style="background: linear-gradient(135deg, #10b981, #14b8a6); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Validation parentale requise</h1>
      </div>
      <div style="background: white; padding: 32px;">
        <p style="color: #374151;">${greeting}</p>
        <p style="color: #374151;">
          <strong>${escapeHtml(teenName)}</strong> (${teenAge} ans) souhaite creer un compte sur ${escapeHtml(
            brandName
          )}.
        </p>
        <p style="color: #374151;">
          Pour finaliser son inscription, vous devez valider sa demande en cliquant sur le lien ci-dessous.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${validationUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Valider la demande
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          Ce lien expire le <strong>${expiresStr}</strong>. Si vous n'avez pas reconnu cette demande, ignorez simplement cet email.
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; word-break: break-all;">
          Lien direct: ${validationUrl}
        </p>
      </div>
      <div style="padding: 16px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">${escapeHtml(brandName)}</p>
      </div>
    </div>
  `

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: parentEmail,
      subject: `${teenName} souhaite rejoindre ${brandName}`,
      html,
    })
    if (error) {
      console.error("[register-teen] Resend error:", error)
      return false
    }
    return true
  } catch (error) {
    console.error("[register-teen] Email send exception:", error)
    return false
  }
}

/**
 * Echappement HTML minimal pour les variables interpolees dans le template email.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
