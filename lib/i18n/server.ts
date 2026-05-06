/**
 * NIVY - server-side i18n helpers
 * ===============================
 *
 * For React Server Components and Route Handlers. Reads the locale
 * preference from the `nivy.locale` cookie set by the client provider.
 */

import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './types'
import { translate } from './translate'

/** Read the active locale from cookies (RSC-safe). */
export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  const raw = store.get(LOCALE_COOKIE)?.value
  return isLocale(raw) ? raw : DEFAULT_LOCALE
}

/** Get a server-side translator bound to the cookie-resolved locale. */
export async function getT() {
  const locale = await getLocale()
  return (key: string, params?: Record<string, string | number>) =>
    translate(locale, key, params)
}
