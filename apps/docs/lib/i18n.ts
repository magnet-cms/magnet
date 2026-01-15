import { defineI18n } from 'fumadocs-core/i18n'

export const i18n = defineI18n({
  defaultLanguage: 'en',
  languages: ['en', 'pt-BR'],
})

export type Locale = 'en' | 'pt-BR'

export function getLanguageLabel(locale: Locale): string {
  const labels: Record<Locale, string> = {
    en: 'English',
    'pt-BR': 'Português (Brasil)',
  }
  return labels[locale]
}
