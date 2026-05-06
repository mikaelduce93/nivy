'use client'

/**
 * NIVY - React i18n context (client-side)
 * =======================================
 *
 * Wraps the app with a locale value + setter. Persists user choice to
 * localStorage AND a cookie so server components can read the same
 * preference on subsequent navigations.
 *
 * Mounted from `app/layout.tsx`. Reads the initial locale from a server
 * prop (cookie) so the first paint matches the eventual hydrated state
 * — no flicker between French and Darija on a refresh.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  isLocale,
  type Locale,
  type Translator,
} from './types'
import { translate } from './translate'

interface I18nContextValue {
  locale: Locale
  setLocale: (next: Locale) => void
  t: Translator
}

const I18nContext = createContext<I18nContextValue | null>(null)

function writeCookie(locale: Locale) {
  if (typeof document === 'undefined') return
  // 1 year, root path, lax (works for normal browsing)
  const oneYear = 60 * 60 * 24 * 365
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${oneYear}; samesite=lax`
}

interface I18nProviderProps {
  initialLocale?: Locale
  children: React.ReactNode
}

export function I18nProvider({ initialLocale, children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE)

  // Hydrate from localStorage on first client render — covers the case
  // where the cookie wasn't sent (e.g. local dev with strict cookie blockers).
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
      if (isLocale(stored) && stored !== locale) {
        setLocaleState(stored)
      }
    } catch {
      // localStorage may throw in private mode — silently ignore.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    writeCookie(next)
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, next)
      } catch {
        // ignore quota errors
      }
    }
  }, [])

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
    }),
    [locale, setLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/**
 * Read the active locale + a translator. Always returns a working
 * translator even if no provider is mounted (uses the default locale)
 * so isolated tests / story shells don't crash.
 */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (ctx) return ctx
  return {
    locale: DEFAULT_LOCALE,
    setLocale: () => {
      /* no-op outside a provider */
    },
    t: (key, params) => translate(DEFAULT_LOCALE, key, params),
  }
}

export function useT(): Translator {
  return useI18n().t
}

export function useLocale(): Locale {
  return useI18n().locale
}

export function useSetLocale(): (next: Locale) => void {
  return useI18n().setLocale
}
