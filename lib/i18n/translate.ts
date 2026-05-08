/**
 * NIVY - core translation helper
 * ==============================
 *
 * Resolves a dotted key (e.g. `auth.login.title`) against a dictionary,
 * with safe fallback to the French bundle if the key is missing in the
 * active locale. Templating uses `{name}` placeholders, swapped from the
 * second argument.
 *
 * Designed to run on both server and client without any runtime deps.
 */

import { dictionaries } from './dictionaries'
import { DEFAULT_LOCALE, type Locale, type Messages } from './types'

function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === 'object' && segment in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[segment]
    }
    return undefined
  }, obj)
}

function format(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name]
    return value === undefined || value === null ? match : String(value)
  })
}

/**
 * Resolve a translation for `key` in `locale`, falling back to the
 * default locale and finally to the key itself if nothing matches.
 *
 * Never throws — keeps the UI rendering even if a dictionary entry was
 * forgotten. Missing keys log a warning in dev to flag the gap.
 */
export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE]
  const value = getByPath(dict, key)

  // Treat empty strings as "not yet translated" — V1 ships with empty
  // stub bundles (ar / darija / en) that translators fill incrementally.
  // Falling through to the FR value keeps the UI legible during partial
  // rollouts instead of rendering blank labels.
  if (typeof value === 'string' && value.length > 0) {
    return format(value, params)
  }

  // Fallback: try French bundle if we weren't already there
  if (locale !== DEFAULT_LOCALE) {
    const fallback = getByPath(dictionaries[DEFAULT_LOCALE], key)
    if (typeof fallback === 'string' && fallback.length > 0) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(`[i18n] Missing translation for "${key}" in locale "${locale}"`)
      }
      return format(fallback, params)
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(`[i18n] Missing translation key "${key}"`)
  }
  return key
}

/** Build a translator bound to a single locale. */
export function makeTranslator(locale: Locale) {
  return (key: string, params?: Record<string, string | number>) => translate(locale, key, params)
}

export type { Messages }
