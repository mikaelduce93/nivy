import { Resend } from "resend"

/**
 * Resend client - Optionnel
 * 
 * Si RESEND_API_KEY n'est pas configuré, les emails ne seront pas envoyés
 * mais l'application continuera de fonctionner.
 */
export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export const EMAIL_FROM = "Teens Party Morocco <notifications@teensparty.ma>"
export const SUPPORT_EMAIL = "support@teensparty.ma"

/**
 * Vérifie si Resend est configuré
 */
export function isResendConfigured(): boolean {
  return resend !== null && !!process.env.RESEND_API_KEY
}
