import { Resend } from "resend"
import { getServerAppConfig } from "@/lib/config/app-config"

const SERVER_CONFIG = getServerAppConfig()

/**
 * Resend client - Optionnel
 *
 * Si RESEND_API_KEY n'est pas configuré, les emails ne seront pas envoyés
 * mais l'application continuera de fonctionner.
 */
export const resend = SERVER_CONFIG.resendApiKey
  ? new Resend(SERVER_CONFIG.resendApiKey)
  : null

/** Adresse expediteur formatee "Brand <email>" pour Resend. */
export const EMAIL_FROM = SERVER_CONFIG.emailFrom

/** Email de support utilisateur. */
export const SUPPORT_EMAIL = SERVER_CONFIG.supportEmail

/**
 * Vérifie si Resend est configuré
 */
export function isResendConfigured(): boolean {
  return resend !== null && !!SERVER_CONFIG.resendApiKey
}
