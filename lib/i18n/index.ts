/**
 * NIVY - i18n public surface
 * ==========================
 *
 * Single import point for the i18n stack:
 *
 *   - Client:  import { useT, useLocale, useSetLocale, I18nProvider } from '@/lib/i18n'
 *   - Server:  import { getT, getLocale } from '@/lib/i18n/server'
 *
 * The provider lives in `app/layout.tsx`; everything else is consumed
 * through the `useT` hook (client) or `getT` (server) for symmetry.
 */

export {
  I18nProvider,
  useI18n,
  useT,
  useLocale,
  useSetLocale,
} from './provider'

export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  isLocale,
} from './types'

export type { Locale, Messages, Translator } from './types'

export { translate, makeTranslator } from './translate'
