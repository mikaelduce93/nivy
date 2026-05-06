/**
 * NIVY - i18n dictionaries
 * ========================
 *
 * Static imports for the three message bundles. Dictionaries are JSON
 * imports so Next.js can statically analyse and bundle them; no async
 * loading, no FOUC, no runtime fetch. Total payload is small (< 10 KB
 * minified per locale today).
 */

import frMessages from '@/messages/fr.json'
import darijaMessages from '@/messages/darija.json'
import enMessages from '@/messages/en.json'
import type { Locale, Messages } from './types'

export const dictionaries: Record<Locale, Messages> = {
  fr: frMessages as Messages,
  darija: darijaMessages as Messages,
  en: enMessages as Messages,
}

/** Pick the dictionary for a given locale, falling back to French. */
export function getDictionary(locale: Locale): Messages {
  return dictionaries[locale] ?? dictionaries.fr
}
