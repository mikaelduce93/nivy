import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import crypto from "crypto"
import { withSupabaseTimeout } from "@/lib/supabase/wrapper"

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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const validationUrl = `${appUrl}/auth/validate-teen?token=${validationToken}`

    // Send email to parent
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
      console.warn("Failed to send validation email to:", parentEmail)
    }

    // Send SMS notification if phone is provided
    if (parentPhone) {
      await sendParentSMS({
        phone: parentPhone,
        teenName: teenFirstName,
        validationUrl,
      }).catch(console.error)
    }

    return NextResponse.json({
      success: true,
      message: "Demande d'inscription envoyée",
      data: {
        registrationId: pendingRegistration.id,
        parentEmailSent: emailSent,
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
 * Send validation email to parent
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
  try {
    // Use your email service (Resend, SendGrid, etc.)
    // For now, log and return true
    console.log(`[Email] Sending parent validation to ${parentEmail}`)
    console.log(`[Email] Teen: ${teenName} (${teenAge} ans)`)
    console.log(`[Email] Validation URL: ${validationUrl}`)
    console.log(`[Email] Expires: ${expiresAt.toLocaleDateString("fr-FR")}`)

    // TODO: Implement actual email sending
    // Example with Resend:
    // await resend.emails.send({
    //   from: "Teens Party <noreply@teensparty.ma>",
    //   to: parentEmail,
    //   subject: `${teenName} souhaite rejoindre Teens Party`,
    //   html: generateParentValidationEmailHtml({ parentName, teenName, teenAge, validationUrl, expiresAt }),
    // })

    return true
  } catch (error) {
    console.error("Email send error:", error)
    return false
  }
}

/**
 * Send SMS to parent
 */
async function sendParentSMS({
  phone,
  teenName,
  validationUrl,
}: {
  phone: string
  teenName: string
  validationUrl: string
}): Promise<boolean> {
  try {
    // Format phone for Morocco
    const formattedPhone = phone.replace(/\s/g, "")

    console.log(`[SMS] Sending to ${formattedPhone}`)
    console.log(`[SMS] Message: ${teenName} souhaite rejoindre Teens Party. Validez: ${validationUrl}`)

    // TODO: Implement SMS sending (Twilio, InfoBip, etc.)
    return true
  } catch (error) {
    console.error("SMS send error:", error)
    return false
  }
}
