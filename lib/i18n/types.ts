/**
 * NIVY - i18n types
 * =================
 *
 * Locale identifiers and message bundle shape for the trilingual stack:
 *   - fr     : French (default — primary parent-facing language)
 *   - darija : Moroccan Arabic vernacular in Latin script (street-tone, teen-coded)
 *   - en     : English (international fallback)
 */

import type frMessages from '@/messages/fr.json'

export type Locale = 'fr' | 'darija' | 'en'

export const SUPPORTED_LOCALES: readonly Locale[] = ['fr', 'darija', 'en'] as const
export const DEFAULT_LOCALE: Locale = 'fr'

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
