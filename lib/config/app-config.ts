/**
 * App Configuration - URLs, Emails, Phones, Social Base URL
 *
 * Source unique pour tous les domaines, contacts et URLs de partage.
 * Ce module est utilisable cote client ET serveur (les valeurs publiques
 * proviennent uniquement de variables `NEXT_PUBLIC_*`).
 *
 * Usage:
 * ```ts
 * import { getPublicAppConfig } from "@/lib/config/app-config"
 * const { appUrl, supportEmail } = getPublicAppConfig()
 * ```
 */

export interface PublicAppConfig {
  /** URL canonique de l'application (sans slash final) */
  appUrl: string
  /** URL utilisee pour les liens de partage social/referral (peut differ d'appUrl) */
  socialBaseUrl: string
  /** Email de support general */
  supportEmail: string
  /** Email de contact (legal/com) */
  contactEmail: string
  /** Email de confidentialite/RGPD */
  privacyEmail: string
  /** Email expediteur pour notifications (no-reply) */
  notificationsEmail: string
  /** Email dedie aux partenaires (commerciaux/B2B). Defaut: contactEmail. */
  partnersEmail: string
  /** Numero WhatsApp principal (format international, sans `+`) */
  whatsappPhone: string
  /** Numero de telephone de support (format affichage international) */
  supportPhone: string
  /** Brand name */
  brandName: string
}

export interface ServerAppConfig extends PublicAppConfig {
  /** Cle API Resend (server-only) */
  resendApiKey?: string
  /** Email expediteur formate "Brand <email>" pour Resend */
  emailFrom: string
  /** Supabase URL (NEXT_PUBLIC_) */
  supabaseUrl: string
  /** Supabase anon key (NEXT_PUBLIC_) */
  supabaseAnonKey: string
  /** Supabase service role (server-only) */
  supabaseServiceRoleKey?: string
  /** Project ID Supabase (extrait de l'URL ou via variable dediee) */
  supabaseProjectId?: string
}

const DEFAULT_SUPPORT_EMAIL = "support@teensparty.ma"
const DEFAULT_CONTACT_EMAIL = "contact@teensparty.ma"
const DEFAULT_PRIVACY_EMAIL = "privacy@teensparty.ma"
const DEFAULT_NOTIFICATIONS_EMAIL = "notifications@teensparty.ma"
const DEFAULT_WHATSAPP_PHONE = "212600000000"
const DEFAULT_SUPPORT_PHONE = "+212 6 00 00 00 00"
const DEFAULT_BRAND_NAME = "Teens Party Morocco"

/**
 * Resout l'URL de l'application avec validation production-stricte.
 *
 * - production: NEXT_PUBLIC_APP_URL est obligatoire. Sinon, throw.
 * - development/test: defaut a http://localhost:3000.
 */
function resolveAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (raw) {
    return raw.replace(/\/+$/, "")
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[app-config] NEXT_PUBLIC_APP_URL est requis en production. " +
        "Configurez-le dans vos variables d'environnement (ex: https://teensparty.ma)."
    )
  }
  return "http://localhost:3000"
}

function resolveSocialBaseUrl(appUrl: string): string {
  const raw = process.env.NEXT_PUBLIC_SOCIAL_BASE_URL?.trim()
  if (raw) {
    return raw.replace(/\/+$/, "")
  }
  return appUrl
}

/**
 * Extrait l'identifiant de projet Supabase depuis l'URL
 * (https://<project-id>.supabase.co).
 */
function extractSupabaseProjectId(): string | undefined {
  const explicit = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID?.trim()
  if (explicit) return explicit

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!url) return undefined
  const match = url.match(/^https?:\/\/([^.]+)\.supabase\.co/i)
  return match?.[1]
}

/**
 * Configuration publique (safe pour le client).
 * Lit uniquement des variables `NEXT_PUBLIC_*`.
 */
export function getPublicAppConfig(): PublicAppConfig {
  const appUrl = resolveAppUrl()
  const contactEmail =
    process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || DEFAULT_CONTACT_EMAIL
  return {
    appUrl,
    socialBaseUrl: resolveSocialBaseUrl(appUrl),
    supportEmail:
      process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || DEFAULT_SUPPORT_EMAIL,
    contactEmail,
    privacyEmail:
      process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim() || DEFAULT_PRIVACY_EMAIL,
    notificationsEmail:
      process.env.NEXT_PUBLIC_NOTIFICATIONS_EMAIL?.trim() ||
      DEFAULT_NOTIFICATIONS_EMAIL,
    partnersEmail:
      process.env.NEXT_PUBLIC_PARTNERS_EMAIL?.trim() || contactEmail,
    whatsappPhone:
      process.env.NEXT_PUBLIC_WHATSAPP_PHONE?.trim() || DEFAULT_WHATSAPP_PHONE,
    supportPhone:
      process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim() || DEFAULT_SUPPORT_PHONE,
    brandName: process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || DEFAULT_BRAND_NAME,
  }
}

/**
 * Configuration serveur. Etend la config publique avec les secrets.
 * NE JAMAIS appeler depuis un composant client.
 */
export function getServerAppConfig(): ServerAppConfig {
  const publicConfig = getPublicAppConfig()
  const notificationsEmail = publicConfig.notificationsEmail
  const emailFromOverride = process.env.RESEND_FROM_EMAIL?.trim()
  const emailFrom =
    emailFromOverride && emailFromOverride.includes("<")
      ? emailFromOverride
      : `${publicConfig.brandName} <${emailFromOverride || notificationsEmail}>`

  return {
    ...publicConfig,
    resendApiKey: process.env.RESEND_API_KEY,
    emailFrom,
    supabaseUrl:
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      "",
    supabaseAnonKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseProjectId: extractSupabaseProjectId(),
  }
}

/**
 * Helper rapide pour les composants/serveurs ayant uniquement besoin de l'URL.
 * Utilise les memes regles que `getPublicAppConfig`.
 */
export function getAppUrl(): string {
  return resolveAppUrl()
}

/**
 * Helper rapide pour les liens de partage (referral, deep links).
 */
export function getSocialBaseUrl(): string {
  return resolveSocialBaseUrl(resolveAppUrl())
}
