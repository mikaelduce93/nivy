import { getServerAppConfig } from "@/lib/config/app-config"
import { resend, EMAIL_FROM, isResendConfigured } from "@/lib/resend"
import { escapeHtml } from "@/lib/email/parent-validation"

/**
 * Envoie à l'ado son lien d'accès (magic-link) après validation parentale (#291).
 *
 * Avant ce helper, `admin.auth.admin.generateLink` produisait bien un
 * `action_link` mais il était renvoyé dans le JSON puis jeté (« forward to teen
 * out-of-band ») : le compte existait mais restait INACCESSIBLE. On envoie
 * désormais ce lien à l'email de l'ado collecté à l'inscription.
 *
 * Retourne `false` (sans throw) si Resend n'est pas configuré ou si l'envoi
 * échoue ; le caller logge et expose l'état réel.
 */
export async function sendTeenMagicLinkEmail({
  teenEmail,
  teenName,
  actionLink,
}: {
  teenEmail: string
  teenName: string
  actionLink: string
}): Promise<boolean> {
  if (!isResendConfigured() || !resend) {
    console.warn(
      "[teen-access-email] Resend non configuré (RESEND_API_KEY manquant) - lien d'accès ado non envoyé"
    )
    return false
  }

  const { brandName } = getServerAppConfig()
  const firstName = teenName.split(" ")[0] || teenName

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa;">
      <div style="background: linear-gradient(135deg, #ec4899, #f43f5e); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Ton compte ${escapeHtml(brandName)} est prêt 🎉</h1>
      </div>
      <div style="background: white; padding: 32px;">
        <p style="color: #374151;">Salut ${escapeHtml(firstName)},</p>
        <p style="color: #374151;">
          Tes parents ont validé ton inscription. Clique sur le bouton ci-dessous pour te connecter
          et activer ton compte.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${actionLink}" style="display: inline-block; background: #ec4899; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Me connecter
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          Ce lien est personnel : ne le partage avec personne.
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; word-break: break-all;">
          Lien direct: ${actionLink}
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
      to: teenEmail,
      subject: `Ton compte ${brandName} est activé — connecte-toi`,
      html,
    })
    if (error) {
      console.error("[teen-access-email] Resend error:", error)
      return false
    }
    return true
  } catch (error) {
    console.error("[teen-access-email] Email send exception:", error)
    return false
  }
}
