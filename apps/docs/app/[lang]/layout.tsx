import type { ReactNode } from 'react'
import { I18nProvider } from 'fumadocs-ui/i18n'
import type { Locale } from '@/lib/i18n'

export default async function LangLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const locale = lang as Locale

  const translations = {
    en: {
      search: 'Search documentation...',
      toc: 'On this page',
      lastUpdate: 'Last updated on',
      searchNoResult: 'No results found',
      previousPage: 'Previous',
      nextPage: 'Next',
      chooseLanguage: 'Choose language',
    },
    'pt-BR': {
      search: 'Pesquisar documentação...',
      toc: 'Nesta página',
      lastUpdate: 'Última atualização em',
      searchNoResult: 'Nenhum resultado encontrado',
      previousPage: 'Anterior',
      nextPage: 'Próximo',
      chooseLanguage: 'Escolher idioma',
    },
  } as const

  return (
    <I18nProvider
      locale={locale}
      translations={translations[locale]}
    >
      {children}
    </I18nProvider>
  )
}
