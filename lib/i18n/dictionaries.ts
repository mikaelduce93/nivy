/**
 * NIVY - i18n dictionaries
 * ========================
 *
 * Static imports for the four message bundles. Dictionaries are JSON
 * imports so Next.js can statically analyse and bundle them; no async
 * loading, no FOUC, no runtime fetch. Total payload is small (< 15 KB
 * minified per locale today).
 *
 * V1 reality: only `fr` is populated end-to-end. `ar` is a fully empty
 * stub (mirrors the FR shape with `""` values) and `darija` / `en` are
 * partially populated. Missing keys fall back to French automatically
 * via `translate()` so a half-translated bundle still renders cleanly.
 */

import frMessages from '@/messages/fr.json'
import arMessages from '@/messages/ar.json'
import darijaMessages from '@/messages/darija.json'
import enMessages from '@/messages/en.json'
import type { Locale, Messages } from './types'

export const dictionaries: Record<Locale, Messages> = {
  fr: frMessages as Messages,
  ar: arMessages as unknown as Messages,
  darija: darijaMessages as unknown as Messages,
  en: enMessages as unknown as Messages,
}

/** Pick the dictionary for a given locale, falling back to French. */
export function getDictionary(locale: Locale): Messages {
  return dictionaries[locale] ?? dictionaries.fr
}
