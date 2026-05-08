/**
 * NIVY - i18n types
 * =================
 *
 * Locale identifiers and message bundle shape for the multilingual stack:
 *   - fr     : French (default — primary parent-facing language, V1 only locale shipped)
 *   - ar     : Modern Standard Arabic (MSA), formal — RTL
 *   - darija : Moroccan Arabic vernacular in Latin script (street-tone, teen-coded)
 *   - en     : English (international fallback)
 *
 * V1 policy
 * ---------
 * Per founder Q2 decision the user-facing experience is FR-only. The other
 * locale bundles exist as scaffolding so adding AR / Darija / EN is a matter
 * of populating JSON files (and flipping `I18N_ENABLE_NON_FR=true`) — never
 * a code refactor.
 */

import type frMessages from '@/messages/fr.json'

export type Locale = 'fr' | 'ar' | 'darija' | 'en'

/**
 * All locales the runtime knows how to load. Surfaced in the locale switcher
 * regardless of activation status; the switcher itself decides which entries
 * are selectable based on `I18N_ENABLE_NON_FR`.
 */
export const SUPPORTED_LOCALES: readonly Locale[] = ['fr', 'ar', 'darija', 'en'] as const
export const DEFAULT_LOCALE: Locale = 'fr'

/**
 * Locales that are RTL. `ar` (MSA) is RTL; Darija ships in Latin script in
 * V1 so it stays LTR (revisit if the founder ever wants Arabic-script Darija).
 */
export const RTL_LOCALES: readonly Locale[] = ['ar'] as const

export function isRtlLocale(locale: Locale): boolean {
  return (RTL_LOCALES as readonly string[]).includes(locale)
}

/** Cookie name used by both server (RSC) and client to remember locale choice. */
export const LOCALE_COOKIE = 'nivy.locale'
/** localStorage key (mirrors the cookie for instant client-side reads). */
export const LOCALE_STORAGE_KEY = 'nivy.locale'

/** The canonical message shape, derived from the French dictionary at compile time. */
export type Messages = typeof frMessages

/** Function signature returned by `useT()` and `getT()`. */
export type Translator = (key: string, params?: Record<string, string | number>) => string

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

/**
 * Human-readable labels for the locale switcher. Each label is written in
 * its own language so a non-native speaker can recognise it without needing
 * the rest of the UI translated.
 */
export const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'Français',
  ar: 'العربية',
  darija: 'Darija',
  en: 'English',
}

/**
 * BCP-47 / IETF tags for the `<html lang>` attribute. Darija has no single
 * canonical tag; we use `ar-MA` (Moroccan Arabic) as the closest match.
 */
export const LOCALE_HTML_LANG: Record<Locale, string> = {
  fr: 'fr',
  ar: 'ar',
  darija: 'ar-MA',
  en: 'en',
}
