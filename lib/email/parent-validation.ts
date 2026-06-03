import { getServerAppConfig } from "@/lib/config/app-config"
import { resend, EMAIL_FROM, isResendConfigured } from "@/lib/resend"

/**
 * Envoie l'email de validation parentale (lien d'approbation de l'inscription
 * ado). Extrait de register-teen (#295) pour être réutilisé par l'endpoint de
 * renvoi (`/api/auth/register-teen/resend`).
 *
 * Retourne `false` (sans throw) si Resend n'est pas configuré ou si l'envoi
 * échoue : le caller doit logger et exposer `email_sent: false` plutôt que de
 * prétendre le succès.
 */
export async function sendParentValidationEmail({
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
      "[parent-validation-email] Resend non configuré (RESEND_API_KEY manquant) - email parent non envoyé"
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
      console.error("[parent-validation-email] Resend error:", error)
      return false
    }
    return true
  } catch (error) {
    console.error("[parent-validation-email] Email send exception:", error)
    return false
  }
}

/** Échappement HTML minimal pour les variables interpolées dans le template. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
