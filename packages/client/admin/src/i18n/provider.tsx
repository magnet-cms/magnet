import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react'
import { IntlProvider } from 'react-intl'

import enMessages from './messages/en.json'

const LOCALE_STORAGE_KEY = 'magnet-admin-locale'
const DEFAULT_LOCALE = 'en'
const SUPPORTED_LOCALES = ['en', 'pt-BR', 'es'] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

interface LocaleContextValue {
  locale: SupportedLocale
  setLocale: (locale: SupportedLocale) => void
  supportedLocales: readonly string[]
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

/**
 * Hook to access the current locale and change it.
 * Used by the locale switcher in settings.
 */
export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within an AppIntlProvider')
  }
  return context
}

/**
 * Detect the best locale from browser settings.
 */
function detectBrowserLocale(): SupportedLocale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE

  const languages = navigator.languages ?? [navigator.language]
  for (const lang of languages) {
    // Exact match first
    if (SUPPORTED_LOCALES.includes(lang as SupportedLocale)) {
      return lang as SupportedLocale
    }
    // Base language match (e.g., 'pt' matches 'pt-BR')
    const base = lang.split('-')[0] ?? ''
    const match = SUPPORTED_LOCALES.find((l) => l.startsWith(base))
    if (match) return match
  }

  return DEFAULT_LOCALE
}

/**
 * Load locale from localStorage.
 */
function getStoredLocale(): SupportedLocale | null {
  if (typeof localStorage === 'undefined') return null
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
    return stored as SupportedLocale
  }
  return null
}

/**
 * Lazy-load messages for a non-English locale.
 */
async function loadMessages(locale: SupportedLocale): Promise<Record<string, string>> {
  if (locale === 'en') return enMessages

  try {
    const module = await import(`./messages/${locale}.json`)
    const overrides = module.default as Record<string, string>
    return { ...enMessages, ...overrides }
  } catch {
    // Fall back to English if locale file fails to load
    return enMessages
  }
}

export interface AppIntlProviderProps {
  /** Override locale (from MagnetAdmin prop) */
  locale?: string
  /** Override messages (from MagnetAdmin prop) */
  messages?: Record<string, string>
  children: ReactNode
}

/**
 * Provides react-intl's IntlProvider and a locale context for the entire admin app.
 *
 * Locale resolution order: prop → localStorage → navigator.language → 'en'
 * Non-English locales are lazy-loaded to avoid bundle bloat.
 */
export function AppIntlProvider({
  locale: localeProp,
  messages: messagesProp,
  children,
}: AppIntlProviderProps) {
  const resolvedInitialLocale =
    (localeProp as SupportedLocale) || getStoredLocale() || detectBrowserLocale()

  const [locale, setLocaleState] = useState<SupportedLocale>(resolvedInitialLocale)
  const [loadedMessages, setLoadedMessages] = useState<Record<string, string>>(
    locale === 'en' ? enMessages : enMessages,
  )

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
    }
  }, [])

  // Load messages when locale changes
  useEffect(() => {
    if (messagesProp) {
      setLoadedMessages(messagesProp)
      return
    }

    let cancelled = false
    loadMessages(locale).then((msgs) => {
      if (!cancelled) {
        setLoadedMessages(msgs)
      }
    })
    return () => {
      cancelled = true
    }
  }, [locale, messagesProp])

  // Sync with prop changes
  useEffect(() => {
    if (localeProp && SUPPORTED_LOCALES.includes(localeProp as SupportedLocale)) {
      setLocaleState(localeProp as SupportedLocale)
    }
  }, [localeProp])

  const contextValue: LocaleContextValue = {
    locale,
    setLocale,
    supportedLocales: SUPPORTED_LOCALES,
  }

  return (
    <LocaleContext.Provider value={contextValue}>
      <IntlProvider
        locale={locale}
        defaultLocale={DEFAULT_LOCALE}
        messages={messagesProp ?? loadedMessages}
        onError={(err) => {
          // Suppress missing translation warnings in development
          if (err.code === 'MISSING_TRANSLATION') return
          console.error(err)
        }}
      >
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  )
}
